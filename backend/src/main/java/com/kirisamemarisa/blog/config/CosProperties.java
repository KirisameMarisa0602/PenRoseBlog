package com.kirisamemarisa.blog.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "cos")
public class CosProperties {
    private String secretId;
    private String secretKey;
    private String region;
    private String bucketName;
    private String cdnUrl;
    /**
     * 是否开启全球加速 (Transfer Acceleration)
     * 需要在腾讯云控制台开启该功能
     */
    private boolean enableAccelerate = false;

    public String getSecretId() {
        return secretId;
    }

    public void setSecretId(String secretId) {
        this.secretId = secretId;
    }

    public String getSecretKey() {
        return secretKey;
    }

    public void setSecretKey(String secretKey) {
        this.secretKey = secretKey;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public String getBucketName() {
        return bucketName;
    }

    public void setBucketName(String bucketName) {
        this.bucketName = bucketName;
    }

    public String getCdnUrl() {
        return cdnUrl;
    }

    public void setCdnUrl(String cdnUrl) {
        this.cdnUrl = cdnUrl;
    }

    public boolean isEnableAccelerate() {
        return enableAccelerate;
    }

    public void setEnableAccelerate(boolean enableAccelerate) {
        this.enableAccelerate = enableAccelerate;
    }
}
