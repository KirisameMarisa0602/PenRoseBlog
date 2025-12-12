package com.kirisamemarisa.blog.model;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.persistence.*;

@Entity
@Table(name = "user_profile")
public class UserProfile {
    private static final Logger logger = LoggerFactory.getLogger(UserProfile.class);
    @Id
    @Column(name = "user_id")
    private Long id;

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 50, nullable = false)
    private String nickname;

    @Column(name = "avatar_url", length = 255)
    private String avatarUrl;

    @Column(name = "background_url", length = 255)
    private String backgroundUrl;

    @Column(length = 50)
    private String signature;

    @Column(length = 300)
    private String bio;

    @Column(length = 200)
    private String tags;

    @Column(length = 20)
    private String qq;

    @Column(length = 50)
    private String wechat;

    @Column(name = "qq_qr_code", length = 255)
    private String qqQrCode;

    @Column(name = "wechat_qr_code", length = 255)
    private String wechatQrCode;

    @Column(name = "github_link", length = 255)
    private String githubLink;

    @Column(name = "bilibili_link", length = 255)
    private String bilibiliLink;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
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

    public String getGender() {
        return user != null ? user.getGender() : null;
    }
}
