package com.kirisamemarisa.blog.ai;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import org.apache.tika.metadata.Metadata;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.sax.BodyContentHandler;
import org.xml.sax.ContentHandler;
import java.io.ByteArrayInputStream;
import java.io.InputStream;

// JSON parsing for streaming chunks
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AiClientService {
    private final AiProperties properties;
    private final RestTemplate restTemplate;
    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiClientService(AiProperties properties, RestTemplate restTemplate, WebClient aiWebClient) {
        this.properties = properties;
        this.restTemplate = restTemplate;
        this.webClient = aiWebClient;
    }

    public String chat(String userMessage) {
        String url = properties.getNormalizedApiBaseUrl() + "/chat/completions";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.add("User-Agent", "blog-ai-client/1.0");
        String apiKey = properties.getEffectiveApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "AI api key is not configured. Set spring.ai.openai.api-key or set env var.");
        }
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = Map.of(
                "model", properties.getModelOrDefault(),
                "messages", List.of(Map.of("role", "user", "content", userMessage)));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map<String, Object>> response = null;
        RuntimeException lastEx = null;
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                response = restTemplate.exchange(
                        url,
                        HttpMethod.POST,
                        request,
                        new ParameterizedTypeReference<>() {
                        });
                lastEx = null;
                break;
            } catch (org.springframework.web.client.ResourceAccessException ex) {
                lastEx = ex;
                // quick backoff before a single retry
                try {
                    Thread.sleep(150L * attempt);
                } catch (InterruptedException ignored) {
                }
            }
        }
        if (lastEx != null)
            throw lastEx;

        Map<String, Object> respBody = response != null ? response.getBody() : null;
        if (respBody == null)
            return null;

        // Try to extract assistant content from response structure similar to OpenAI
        Object choicesObj = respBody.get("choices");
        if (choicesObj instanceof List<?> choices && !choices.isEmpty()) {
            Object first = choices.get(0);
            if (first instanceof Map<?, ?> firstMap) {
                Object message = firstMap.get("message");
                if (message instanceof Map<?, ?> msgMap) {
                    Object content = msgMap.get("content");
                    if (content != null)
                        return content.toString();
                }
                // older OpenAI responses put text directly
                Object text = firstMap.get("text");
                if (text != null)
                    return text.toString();
            }
        }

        // Fallback: search for a 'message' in top-level keys
        if (respBody.containsKey("message")) {
            return String.valueOf(respBody.get("message"));
        }

        try {
            return objectMapper.writeValueAsString(respBody);
        } catch (Exception e) {
            return respBody.toString();
        }
    }

    public String chat(String userMessage, String overrideModel) {
        String base = getBaseUrlForModel(overrideModel);
        String url = base + "/chat/completions";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.add("User-Agent", "blog-ai-client/1.0");
        String apiKey = getApiKeyForModel(overrideModel);
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "AI api key is not configured. Set spring.ai.openai.api-key or set env var.");
        }
        headers.setBearerAuth(apiKey);

        String model = (overrideModel != null && !overrideModel.isBlank()) ? overrideModel
                : properties.getModelOrDefault();
        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(Map.of("role", "user", "content", userMessage)));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                request,
                new ParameterizedTypeReference<>() {
                });

        Map<String, Object> respBody = response != null ? response.getBody() : null;
        if (respBody == null)
            return null;
        Object choicesObj = respBody.get("choices");
        if (choicesObj instanceof List<?> choices && !choices.isEmpty()) {
            Object first = choices.get(0);
            if (first instanceof Map<?, ?> firstMap) {
                Object message = firstMap.get("message");
                if (message instanceof Map<?, ?> msgMap) {
                    Object content = msgMap.get("content");
                    if (content != null)
                        return content.toString();
                }
                Object text = firstMap.get("text");
                if (text != null)
                    return text.toString();
            }
        }
        if (respBody.containsKey("message")) {
            return String.valueOf(respBody.get("message"));
        }
        try {
            return objectMapper.writeValueAsString(respBody);
        } catch (Exception e) {
            return respBody.toString();
        }
    }

    /**
     * True upstream streaming using OpenAI-compatible SSE (data: {json} lines).
     * Returns a Flux of text deltas (tokens/chunks) as they arrive.
     */
    public Flux<String> chatStream(String userMessage, String overrideModel) {
        String base = getBaseUrlForModel(overrideModel);
        String url = base + "/chat/completions";
        String model = (overrideModel != null && !overrideModel.isBlank()) ? overrideModel
                : properties.getModelOrDefault();
        String apiKey = getApiKeyForModel(overrideModel);
        if (apiKey == null || apiKey.isBlank()) {
            return Flux.error(new IllegalStateException(
                    "AI api key is not configured. Set spring.ai.openai.api-key or set env var."));
        }

        Map<String, Object> body = Map.of(
                "model", model,
                "stream", true,
                "messages", List.of(Map.of("role", "user", "content", userMessage)));

        return webClient.post()
                .uri(url)
                .headers(h -> {
                    h.setContentType(MediaType.APPLICATION_JSON);
                    h.setAccept(List.of(MediaType.TEXT_EVENT_STREAM));
                    h.setBearerAuth(apiKey);
                    h.add("User-Agent", "blog-ai-client/1.0");
                })
                .bodyValue(body)
                .retrieve()
                // For SSE, WebClient decodes each event's data as String by default
                .bodyToFlux(String.class)
                .onErrorResume(e -> Flux.error(new RuntimeException("Upstream stream error: " + e.getMessage(), e)))
                .takeUntil(s -> s != null && s.contains("[DONE]"))
                .filter(s -> s != null && !s.isBlank() && !"[DONE]".equals(s.trim()))
                .flatMap(this::extractDeltaTextSafely)
                .filter(s -> s != null && !s.isEmpty());
    }

    private Flux<String> extractDeltaTextSafely(String raw) {
        try {
            // Accept either plain JSON or lines prefixed with "data:"
            String payload = raw;
            if (payload.startsWith("data:")) {
                payload = payload.substring(5).trim();
            }
            if (payload.isEmpty())
                return Flux.empty();
            JsonNode root = objectMapper.readTree(payload);
            JsonNode choices = root.path("choices");
            if (choices.isArray()) {
                java.util.List<String> tokens = new java.util.ArrayList<>();
                for (JsonNode ch : choices) {
                    // OpenAI streaming shape: choices[].delta.content
                    String piece = ch.path("delta").path("content").asText(null);
                    if (piece == null || piece.isEmpty()) {
                        // Some providers use choices[].text
                        piece = ch.path("text").asText(null);
                    }
                    if (piece == null || piece.isEmpty()) {
                        // Some use choices[].message.content (non-streaming chunk fallback)
                        piece = ch.path("message").path("content").asText(null);
                    }
                    if (piece != null && !piece.isEmpty()) {
                        tokens.add(piece);
                    }
                }
                return Flux.fromIterable(tokens);
            }
            return Flux.empty();
        } catch (Exception e) {
            // In case the server sends plain text deltas (rare), fall back to raw
            return Flux.just(raw);
        }
    }

    /**
     * Send a multimodal chat with attachments.
     * attachments entries may contain:
     * - mime: e.g. image/png, text/plain
     * - dataUrl: data URL for images (data:image/png;base64,...)
     * - text: inline text content for textual attachments
     * - name: optional filename
     */
    public String chatWithAttachments(String userMessage, java.util.List<java.util.Map<String, Object>> attachments) {
        String url = properties.getNormalizedApiBaseUrl() +
                "/chat/completions";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.add("User-Agent", "blog-ai-client/1.0");
        String apiKey = properties.getEffectiveApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "AI api key is not configured. Set spring.ai.openai.api-key or set env var.");
        }
        headers.setBearerAuth(apiKey);

        // Build OpenAI-compatible content array
        java.util.List<java.util.Map<String, Object>> contentParts = new java.util.ArrayList<>();
        contentParts.add(java.util.Map.of("type", "text", "text", userMessage));
        if (attachments != null) {
            for (java.util.Map<String, Object> att : attachments) {
                String mime = String.valueOf(att.getOrDefault("mime", ""));
                if (mime.startsWith("image/")) {
                    // Prefer image_url with data URL (supported by many OpenAI-compatible APIs)
                    String dataUrl = String.valueOf(att.getOrDefault("dataUrl", ""));
                    if (!dataUrl.isBlank()) {
                        contentParts.add(java.util.Map.of(
                                "type", "image_url",
                                "image_url", java.util.Map.of("url", dataUrl)));
                    }
                } else {
                    Object textObj = att.get("text");
                    String text = textObj == null ? null : String.valueOf(textObj);
                    if (text == null || text.isBlank()) {
                        // Try to extract text from dataUrl (PDF/DOCX/etc.)
                        String dataUrl = String.valueOf(att.getOrDefault("dataUrl", ""));
                        text = extractTextFromDataUrl(dataUrl, mime);
                    }
                    if (text != null && !text.isBlank()) {
                        contentParts.add(java.util.Map.of("type", "text", "text", text));
                    }
                }
            }
        }

        Map<String, Object> body = Map.of(
                "model", properties.getModelOrDefault(),
                "messages", List.of(Map.of("role", "user", "content", contentParts)));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                request,
                new ParameterizedTypeReference<>() {
                });

        Map<String, Object> respBody = response != null ? response.getBody() : null;
        if (respBody == null)
            return null;
        Object choicesObj = respBody.get("choices");
        if (choicesObj instanceof List<?> choices && !choices.isEmpty()) {
            Object first = choices.get(0);
            if (first instanceof Map<?, ?> firstMap) {
                Object message = firstMap.get("message");
                if (message instanceof Map<?, ?> msgMap) {
                    Object content = msgMap.get("content");
                    if (content != null)
                        return content.toString();
                }
                Object text = firstMap.get("text");
                if (text != null)
                    return text.toString();
            }
        }
        if (respBody.containsKey("message")) {
            return String.valueOf(respBody.get("message"));
        }
        return respBody.toString();
    }

    public String chatWithAttachments(String userMessage, java.util.List<java.util.Map<String, Object>> attachments,
            String overrideModel) {
        String base = getBaseUrlForModel(overrideModel);
        String url = base + "/chat/completions";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.add("User-Agent", "blog-ai-client/1.0");
        String apiKey = getApiKeyForModel(overrideModel);
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "AI api key is not configured. Set spring.ai.openai.api-key or set env var.");
        }
        headers.setBearerAuth(apiKey);

        java.util.List<java.util.Map<String, Object>> contentParts = new java.util.ArrayList<>();
        contentParts.add(java.util.Map.of("type", "text", "text", userMessage));
        if (attachments != null) {
            for (java.util.Map<String, Object> att : attachments) {
                String mime = String.valueOf(att.getOrDefault("mime", ""));
                if (mime.startsWith("image/")) {
                    String dataUrl = String.valueOf(att.getOrDefault("dataUrl", ""));
                    if (!dataUrl.isBlank()) {
                        contentParts.add(java.util.Map.of(
                                "type", "image_url",
                                "image_url", java.util.Map.of("url", dataUrl)));
                    }
                } else {
                    Object textObj = att.get("text");
                    String text = textObj == null ? null : String.valueOf(textObj);
                    if (text == null || text.isBlank()) {
                        String dataUrl = String.valueOf(att.getOrDefault("dataUrl", ""));
                        text = extractTextFromDataUrl(dataUrl, mime);
                    }
                    if (text != null && !text.isBlank()) {
                        contentParts.add(java.util.Map.of("type", "text", "text", text));
                    }
                }
            }
        }

        String model = (overrideModel != null && !overrideModel.isBlank()) ? overrideModel
                : properties.getModelOrDefault();
        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(Map.of("role", "user", "content", contentParts)));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                request,
                new ParameterizedTypeReference<>() {
                });

        Map<String, Object> respBody = response != null ? response.getBody() : null;
        if (respBody == null)
            return null;
        Object choicesObj = respBody.get("choices");
        if (choicesObj instanceof List<?> choices && !choices.isEmpty()) {
            Object first = choices.get(0);
            if (first instanceof Map<?, ?> firstMap) {
                Object message = firstMap.get("message");
                if (message instanceof Map<?, ?> msgMap) {
                    Object content = msgMap.get("content");
                    if (content != null)
                        return content.toString();
                }
                Object text = firstMap.get("text");
                if (text != null)
                    return text.toString();
            }
        }
        if (respBody.containsKey("message")) {
            return String.valueOf(respBody.get("message"));
        }
        try {
            return objectMapper.writeValueAsString(respBody);
        } catch (Exception e) {
            return respBody.toString();
        }
    }

    private String getBaseUrlForModel(String overrideModel) {
        String candidate = properties.getNormalizedApiBaseUrl();
        String m = overrideModel == null ? null : overrideModel.toLowerCase();
        if (m != null) {
            if (m.startsWith("gpt-")) {
                return normalizeBase("https://api.openai.com/v1");
            }
            if (m.startsWith("deepseek")) {
                return normalizeBase("https://api.deepseek.com/v1");
            }
        }
        return candidate;
    }

    /**
     * Pick API key based on the target model/provider.
     * - If overrideModel starts with "gpt-": prefer OPENAI_API_KEY
     * - If overrideModel starts with "deepseek": prefer DEEPSEEK_API_KEY
     * - Otherwise: use configured spring.ai.openai.api-key or environment fallbacks
     */
    private String getApiKeyForModel(String overrideModel) {
        String configured = properties.getEffectiveApiKey();
        String m = overrideModel == null ? null : overrideModel.toLowerCase();
        if (m != null) {
            if (m.startsWith("gpt-")) {
                String openai = System.getenv("OPENAI_API_KEY");
                if (openai != null && !openai.isBlank())
                    return openai;
                // If configured key is actually an OpenAI key, use it; else fall back
                return configured;
            }
            if (m.startsWith("deepseek")) {
                String deeps = System.getenv("DEEPSEEK_API_KEY");
                if (deeps != null && !deeps.isBlank())
                    return deeps;
                return configured;
            }
        }
        return configured;
    }

    private String normalizeBase(String base) {
        if (base == null || base.isBlank())
            return properties.getNormalizedApiBaseUrl();
        String b = base.trim();
        if (b.endsWith("/"))
            b = b.substring(0, b.length() - 1);
        try {
            java.net.URL u = new java.net.URL(b);
            String path = u.getPath();
            if (path == null || path.isEmpty() || "/".equals(path)) {
                b = b + "/v1";
            }
        } catch (Exception ignored) {
        }
        return b;
    }

    private String extractTextFromDataUrl(String dataUrl, String mime) {
        try {
            if (dataUrl == null || dataUrl.isBlank())
                return null;
            // dataUrl format: data:<mime>;base64,<payload>
            int comma = dataUrl.indexOf(',');
            if (comma < 0)
                return null;
            String base64 = dataUrl.substring(comma + 1);
            byte[] bytes = Base64.getDecoder().decode(base64.getBytes(StandardCharsets.UTF_8));
            try (InputStream is = new ByteArrayInputStream(bytes)) {
                // Use Tika to detect and parse
                AutoDetectParser parser = new AutoDetectParser();
                ContentHandler handler = new BodyContentHandler(-1); // no length limit
                Metadata metadata = new Metadata();
                if (mime != null && !mime.isBlank())
                    metadata.set(Metadata.CONTENT_TYPE, mime);
                ParseContext context = new ParseContext();
                parser.parse(is, handler, metadata, context);
                String txt = handler.toString();
                if (txt != null) {
                    // Trim and cap to reasonable size to avoid overly long prompt
                    txt = txt.trim();
                    int max = 8000; // characters cap
                    if (txt.length() > max)
                        txt = txt.substring(0, max);
                }
                return txt;
            }
        } catch (Exception e) {
            return null;
        }
    }
}
