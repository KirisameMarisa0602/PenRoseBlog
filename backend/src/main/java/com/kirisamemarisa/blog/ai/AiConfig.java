package com.kirisamemarisa.blog.ai;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class AiConfig {

    @Bean
    public RestTemplate aiRestTemplate() {
        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory();
        factory.setConnectTimeout(90_000);
        factory.setConnectionRequestTimeout(90_000);
        factory.setReadTimeout(120_000);
        return new RestTemplate(factory);
    }

    @Bean
    public WebClient aiWebClient(AiProperties properties) {
        // Increase buffer sizes to handle streamed tokens without truncation
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(cfg -> cfg.defaultCodecs().maxInMemorySize(4 * 1024 * 1024))
                .build();
        return WebClient.builder()
                .exchangeStrategies(strategies)
                // Note: baseUrl kept empty because we vary providers per model.
                .build();
    }
}
