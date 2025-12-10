package com.kirisamemarisa.blog.dto;

public class UserSimpleDTO {
    private Long id;
    private String nickname;
    private String avatarUrl;

    public UserSimpleDTO() {}
    public UserSimpleDTO(Long id, String nickname, String avatarUrl) {
        this.id = id;
        this.nickname = nickname;
        this.avatarUrl = avatarUrl;
    }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
}

