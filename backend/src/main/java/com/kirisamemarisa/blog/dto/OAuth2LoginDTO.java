package com.kirisamemarisa.blog.dto;

import jakarta.validation.constraints.NotBlank;

public class OAuth2LoginDTO {
    @NotBlank(message = "授权码不能为空")
    private String code;

    @NotBlank(message = "登录提供者不能为空")
    private String provider; // QQ or WECHAT

    private String state; // Optional CSRF token

    // Getters and Setters
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
}
