package com.kirisamemarisa.blog.dto;

import jakarta.validation.constraints.NotBlank;

public class UserProfileDTO {
    private Long id;

    @NotBlank(message = "昵称不能为空")
    private String nickname;
    private String avatarUrl;
    private String backgroundUrl;
    private String gender;
    private String signature;
    private String bio;
    private String tags;
    private String qq;
    private String wechat;
    private String qqQrCode;
    private String wechatQrCode;
    private String githubLink;
    private String bilibiliLink;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getBackgroundUrl() {
        return backgroundUrl;
    }

    public void setBackgroundUrl(String backgroundUrl) {
        this.backgroundUrl = backgroundUrl;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getSignature() {
        return signature;
    }

    public void setSignature(String signature) {
        this.signature = signature;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getTags() {
        return tags;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public String getQq() {
        return qq;
    }

    public void setQq(String qq) {
        this.qq = qq;
    }

    public String getWechat() {
        return wechat;
    }

    public void setWechat(String wechat) {
        this.wechat = wechat;
    }

    public String getQqQrCode() {
        return qqQrCode;
    }

    public void setQqQrCode(String qqQrCode) {
        this.qqQrCode = qqQrCode;
    }

    public String getWechatQrCode() {
        return wechatQrCode;
    }

    public void setWechatQrCode(String wechatQrCode) {
        this.wechatQrCode = wechatQrCode;
    }

    public String getGithubLink() {
        return githubLink;
    }

    public void setGithubLink(String githubLink) {
        this.githubLink = githubLink;
    }

    public String getBilibiliLink() {
        return bilibiliLink;
    }

    public void setBilibiliLink(String bilibiliLink) {
        this.bilibiliLink = bilibiliLink;
    }
}
