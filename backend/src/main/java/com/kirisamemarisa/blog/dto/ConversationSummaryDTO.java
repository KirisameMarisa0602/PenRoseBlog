package com.kirisamemarisa.blog.dto;

import java.time.Instant;

public class ConversationSummaryDTO {
    private Long otherId;
    private String nickname;
    private String avatarUrl;
    private String lastMessage;
    private Instant lastAt;
    private long unreadCount;

    public Long getOtherId() {
        return otherId;
    }

    public void setOtherId(Long otherId) {
        this.otherId = otherId;
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

    public String getLastMessage() {
        return lastMessage;
    }

    public void setLastMessage(String lastMessage) {
        this.lastMessage = lastMessage;
    }

    public Instant getLastAt() {
        return lastAt;
    }

    public void setLastAt(Instant lastAt) {
        this.lastAt = lastAt;
    }

    public long getUnreadCount() {
        return unreadCount;
    }

    public void setUnreadCount(long unreadCount) {
        this.unreadCount = unreadCount;
    }
}
