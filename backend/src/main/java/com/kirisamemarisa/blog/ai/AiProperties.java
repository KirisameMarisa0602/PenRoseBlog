package com.kirisamemarisa.blog.ai;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "spring.ai.openai")
public class AiProperties {
    /** API key used for Authorization: Bearer <key> */
    private String apiKey;

    /** Model name to use, e.g. gpt-4o-mini or deepseek-chat-1 */
    private String model;

    /**
     * Base URL of the OpenAI-compatible API, e.g. api.openai.com/v1 or a DeepSeek
     * endpoint
     */
    // remove default so that binding from application.properties always overrides
    private String apiBaseUrl;

    /** Optional provider hint (e.g. "openai" or "deepseek"). Not required. */
    private String provider;

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getApiBaseUrl() {
        return apiBaseUrl;
    }

    public void setApiBaseUrl(String apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    /**
     * Return the effective API key. Priority:
     * 1) property bound value (spring.ai.openai.api-key)
     * 2) environment variable DEEPSEEK_API_KEY
     * 3) environment variable OPENAI_API_KEY
     * 4) null if none available
     */
    public String getEffectiveApiKey() {
        if (this.apiKey != null && !this.apiKey.isBlank()) {
            return this.apiKey;
        }
        String deeps = System.getenv("DEEPSEEK_API_KEY");
        if (deeps != null && !deeps.isBlank())
            return deeps;
        String openai = System.getenv("OPENAI_API_KEY");
        if (openai != null && !openai.isBlank())
            return openai;
        return null;
    }

    /**
     * Return model or a sensible default if not configured.
     */
    public String getModelOrDefault() {
        return (this.model == null || this.model.isBlank()) ? "gpt-4o-mini" : this.model;
    }

    /**
     * Return apiBaseUrl trimmed (no trailing slash) or default if blank.
     * Priority:
     * 1) bound property spring.ai.openai.api-base-url
     * 2) environment variable SPRING_AI_OPENAI_API_BASE_URL
     * 3) default https://api.openai.com/v1
     */
    public String getNormalizedApiBaseUrl() {
        String base = this.apiBaseUrl;
        if (base == null || base.isBlank()) {
            // try environment variable fallback (common naming)
            base = System.getenv("SPRING_AI_OPENAI_API_BASE_URL");
        }
        if (base == null || base.isBlank()) {
            base = "https://api.openai.com/v1";
        }
        String b = base.trim();
        if (b.endsWith("/"))
            b = b.substring(0, b.length() - 1);
        // If the URL has no path (e.g. https://api.deepseek.com), append /v1 to be
        // OpenAI-compatible.
        try {
            java.net.URL u = new java.net.URL(b);
            String path = u.getPath();
            if (path == null || path.isEmpty() || "/".equals(path)) {
                b = b + "/v1";
            }
        } catch (Exception ignored) {
            /* keep as-is if malformed */ }
        return b;
    }

    @Override
    public String toString() {
        return "AiProperties{" +
                "provider='" + provider + '\'' +
                ", model='" + model + '\'' +
                ", apiBaseUrl='" + apiBaseUrl + '\'' +
                ", apiKeyPresent=" + (getEffectiveApiKey() != null) +
                '}';
    }

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(AiProperties.class);

    @PostConstruct
    public void postConstructLog() {
        // Do not print actual apiKey value to avoid leaking secrets
        logger.info("[AiProperties] raw apiBaseUrl={}, normalizedApiBaseUrl={}, model={}, apiKeyPresent={}", 
            apiBaseUrl, getNormalizedApiBaseUrl(), model, (getEffectiveApiKey() != null));
    }
}
