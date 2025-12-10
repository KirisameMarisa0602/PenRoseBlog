package com.kirisamemarisa.blog.dto;

public class LoginResponseDTO {
    private String token;
    private Long userId;
    private String nickname;
    private String avatarUrl;
    private String backgroundUrl;
    private String gender;

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public String getBackgroundUrl() { return backgroundUrl; }
    public void setBackgroundUrl(String backgroundUrl) { this.backgroundUrl = backgroundUrl; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
}

