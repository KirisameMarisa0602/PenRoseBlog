package com.kirisamemarisa.blog.dto;

import jakarta.validation.constraints.NotBlank;

public class UserProfileDTO {
    private Long id;

    @NotBlank(message = "昵称不能为空")
    private String nickname;
    private String avatarUrl;
    private String backgroundUrl;
    private String gender;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getBackgroundUrl() { return backgroundUrl; }
    public void setBackgroundUrl(String backgroundUrl) { this.backgroundUrl = backgroundUrl; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
}
