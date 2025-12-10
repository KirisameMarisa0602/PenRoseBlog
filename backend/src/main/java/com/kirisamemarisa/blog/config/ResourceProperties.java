package com.kirisamemarisa.blog.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "resource")
public class ResourceProperties {

    // 通用静态资源根目录（例如 file:D:/Projects/selfprojects/blog/sources/）
    private String sourcesLocation;

    // 头像、背景与博客资源（application.properties 中已配置为 file: 前缀）
    private String avatarLocation;
    private String backgroundLocation;
    private String blogpostcoverLocation;
    private String blogpostcontentLocation;

    // 私信媒体资源
    private String messageMediaLocation = "D:/Projects/selfprojects/blog/sources/messages/";
    private String messageMediaAccessPrefix = "/files/messages";

    public String getSourcesLocation() {
        return sourcesLocation;
    }

    public void setSourcesLocation(String sourcesLocation) {
        this.sourcesLocation = sourcesLocation;
    }

    public String getAvatarLocation() {
        return avatarLocation;
    }

    public void setAvatarLocation(String avatarLocation) {
        this.avatarLocation = avatarLocation;
    }

    public String getBackgroundLocation() {
        return backgroundLocation;
    }

    public void setBackgroundLocation(String backgroundLocation) {
        this.backgroundLocation = backgroundLocation;
    }

    public String getBlogpostcoverLocation() {
        return blogpostcoverLocation;
    }

    public void setBlogpostcoverLocation(String blogpostcoverLocation) {
        this.blogpostcoverLocation = blogpostcoverLocation;
    }

    public String getBlogpostcontentLocation() {
        return blogpostcontentLocation;
    }

    public void setBlogpostcontentLocation(String blogpostcontentLocation) {
        this.blogpostcontentLocation = blogpostcontentLocation;
    }

    public String getMessageMediaLocation() {
        return messageMediaLocation;
    }

    public void setMessageMediaLocation(String messageMediaLocation) {
        this.messageMediaLocation = messageMediaLocation;
    }

    public String getMessageMediaAccessPrefix() {
        return messageMediaAccessPrefix;
    }

    public void setMessageMediaAccessPrefix(String messageMediaAccessPrefix) {
        this.messageMediaAccessPrefix = messageMediaAccessPrefix;
    }
}
