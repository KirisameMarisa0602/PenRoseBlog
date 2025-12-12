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
                // 头像、背景
                registry.addResourceHandler("/avatar/**")
                                .addResourceLocations(resourceProperties.getAvatarLocation())
                                .setCachePeriod(2592000);
                registry.addResourceHandler("/background/**")
                                .addResourceLocations(resourceProperties.getBackgroundLocation())
                                .setCachePeriod(2592000);
                registry.addResourceHandler("/profile/**")
                                .addResourceLocations(resourceProperties.getProfileLocation())
                                .setCachePeriod(2592000);

                // 博客文章封面/正文
                registry.addResourceHandler("/sources/blogpostcover/**")
                                .addResourceLocations(resourceProperties.getBlogpostcoverLocation())
                                .setCachePeriod(2592000);
                registry.addResourceHandler("/sources/blogpostcontent/**")
                                .addResourceLocations(resourceProperties.getBlogpostcontentLocation())
                                .setCachePeriod(2592000);

                // 整个 sources 目录
                registry.addResourceHandler("/sources/**")
                                .addResourceLocations(resourceProperties.getSourcesLocation())
                                .setCachePeriod(2592000);

                // 私信媒体静态资源映射：/files/messages/** -> file:<messageMediaLocation>
                String messageMediaAccessPrefix = resourceProperties.getMessageMediaAccessPrefix();
                String messageMediaLocation = resourceProperties.getMessageMediaLocation();

                String handlerPattern = messageMediaAccessPrefix.endsWith("/**")
                                ? messageMediaAccessPrefix
                                : (messageMediaAccessPrefix.endsWith("/") ? messageMediaAccessPrefix + "**"
                                                : messageMediaAccessPrefix + "/**");
                String locationPath = messageMediaLocation.startsWith("file:") ? messageMediaLocation
                                : ("file:" + messageMediaLocation);
                registry.addResourceHandler(handlerPattern)
                                .addResourceLocations(locationPath)
                                .setCachePeriod(3600);
        }
}
