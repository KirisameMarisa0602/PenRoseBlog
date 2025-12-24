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
        return chat(userMessage, null);
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

        ResponseEntity<Map<String, Object>> response;
        try {
            response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    new ParameterizedTypeReference<>() {
                    });
        } catch (org.springframework.web.client.RestClientResponseException ex) {
            throw new RuntimeException(
                    "AI Provider Error: " + ex.getStatusCode().value() + " " + ex.getResponseBodyAsString(), ex);
        }

        return extractContentFromResponse(response);
    }

    public Flux<String> chatStream(String userMessage, String systemPrompt, String overrideModel) {
        String base = getBaseUrlForModel(overrideModel);
        String url = base + "/chat/completions";
        String model = (overrideModel != null && !overrideModel.isBlank()) ? overrideModel
                : properties.getModelOrDefault();
        String apiKey = getApiKeyForModel(overrideModel);
        if (apiKey == null || apiKey.isBlank()) {
            return Flux.error(new IllegalStateException(
                    "AI api key is not configured. Set spring.ai.openai.api-key or set env var."));
        }

        java.util.List<Map<String, Object>> messages = new java.util.ArrayList<>();
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            messages.add(Map.of("role", "system", "content", systemPrompt));
        }
        messages.add(Map.of("role", "user", "content", userMessage));

        Map<String, Object> body = Map.of(
                "model", model,
                "stream", true,
                "messages", messages);

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
                .bodyToFlux(String.class)
                .onErrorResume(e -> {
                    if (e instanceof org.springframework.web.reactive.function.client.WebClientResponseException wcre) {
                        return Flux.error(new RuntimeException(
                                "Upstream stream error: " + wcre.getStatusCode() + " " + wcre.getResponseBodyAsString(),
                                e));
                    }
                    return Flux.error(new RuntimeException("Upstream stream error: " + e.getMessage(), e));
                })
                .takeUntil(s -> s != null && s.contains("[DONE]"))
                .flatMap(this::extractDeltaTextSafely)
                .filter(s -> s != null && !s.isEmpty());
    }

    private Flux<String> extractDeltaTextSafely(String raw) {
        try {
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
                    String piece = ch.path("delta").path("content").asText(null);
                    if (piece == null || piece.isEmpty()) {
                        piece = ch.path("text").asText(null);
                    }
                    if (piece == null || piece.isEmpty()) {
                        piece = ch.path("message").path("content").asText(null);
                    }
                    if (piece != null && !piece.isEmpty() && !"null".equals(piece)) {
                        tokens.add(piece);
                    }
                }
                return Flux.fromIterable(tokens);
            }
            return Flux.empty();
        } catch (Exception e) {
            return Flux.just(raw);
        }
    }

    public String chatWithAttachments(String userMessage, java.util.List<java.util.Map<String, Object>> attachments) {
        return chatWithAttachments(userMessage, attachments, null);
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

        ResponseEntity<Map<String, Object>> response;
        try {
            response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    new ParameterizedTypeReference<>() {
                    });
        } catch (org.springframework.web.client.RestClientResponseException ex) {
            throw new RuntimeException(
                    "AI Provider Error: " + ex.getStatusCode().value() + " " + ex.getResponseBodyAsString(), ex);
        }

        return extractContentFromResponse(response);
    }

    private String extractContentFromResponse(ResponseEntity<Map<String, Object>> response) {
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
            Object msg = respBody.get("message");
            return msg == null ? "" : String.valueOf(msg);
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

    private String getApiKeyForModel(String overrideModel) {
        String configured = properties.getEffectiveApiKey();
        String m = overrideModel == null ? null : overrideModel.toLowerCase();
        if (m != null) {
            if (m.startsWith("gpt-")) {
                String openai = System.getenv("OPENAI_API_KEY");
                if (openai != null && !openai.isBlank())
                    return openai;
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
            int comma = dataUrl.indexOf(',');
            if (comma < 0)
                return null;
            String base64 = dataUrl.substring(comma + 1);
            byte[] bytes = Base64.getDecoder().decode(base64.getBytes(StandardCharsets.UTF_8));
            try (InputStream is = new ByteArrayInputStream(bytes)) {
                AutoDetectParser parser = new AutoDetectParser();
                ContentHandler handler = new BodyContentHandler(-1);
                Metadata metadata = new Metadata();
                if (mime != null && !mime.isBlank())
                    metadata.set(Metadata.CONTENT_TYPE, mime);
                ParseContext context = new ParseContext();
                parser.parse(is, handler, metadata, context);
                String txt = handler.toString();
                if (txt != null) {
                    txt = txt.trim();
                    int max = 8000;
                    if (txt.length() > max)
                        txt = txt.substring(0, max);
                }
                return txt;
            }
        } catch (Exception e) {
            return null;
        }
    }

    public void streamChat(String userMessage, String systemPrompt, String overrideModel,
            org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter) {
        String url = properties.getNormalizedApiBaseUrl() + "/chat/completions";
        String model = (overrideModel != null && !overrideModel.isBlank()) ? overrideModel
                : properties.getModelOrDefault();
        String apiKey = properties.getEffectiveApiKey();

        java.util.List<Map<String, Object>> messages = new java.util.ArrayList<>();
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            messages.add(Map.of("role", "system", "content", systemPrompt));
        }
        messages.add(Map.of("role", "user", "content", userMessage));

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", messages,
                "stream", true);

        webClient.post()
                .uri(url)
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(String.class)
                .subscribe(
                        chunk -> {
                            if (chunk == null)
                                return;
                            // Split by newline to handle multiple SSE events in one chunk
                            String[] lines = chunk.split("\\r?\\n");
                            for (String line : lines) {
                                try {
                                    String data = line.trim();
                                    if (data.isEmpty())
                                        continue;

                                    if (data.startsWith("data:")) {
                                        data = data.substring(5).trim();
                                    }

                                    if (data.equals("[DONE]")) {
                                        emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter
                                                .event().data("[DONE]"));
                                        continue;
                                    }

                                    JsonNode node = objectMapper.readTree(data);
                                    if (node.has("choices") && node.get("choices").isArray()
                                            && node.get("choices").size() > 0) {
                                        JsonNode choice = node.get("choices").get(0);
                                        if (choice.has("delta") && choice.get("delta").has("content")) {
                                            String content = choice.get("delta").get("content").asText(null);
                                            if (content != null && !"null".equals(content)) {
                                                emitter.send(content);
                                            }
                                        }
                                    }
                                } catch (Exception e) {
                                    // ignore parse errors for keep-alive or invalid lines
                                }
                            }
                        },
                        error -> {
                            emitter.completeWithError(error);
                        },
                        () -> {
                            emitter.complete();
                        });
    }
}
