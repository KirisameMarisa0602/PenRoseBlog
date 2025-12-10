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

    public String getGender() {
        return user != null ? user.getGender() : null;
    }
}
