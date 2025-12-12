package com.kirisamemarisa.blog.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

        private final ResourceProperties resourceProperties;

        public WebConfig(ResourceProperties resourceProperties) {
                this.resourceProperties = resourceProperties;
        }

        @Override
        public void addResourceHandlers(ResourceHandlerRegistry registry) {
                // 静态资源已由 Nginx 直接代理，后端不再负责映射
                // 且已迁移至腾讯云COS，不再需要本地资源映射
        }
}
