package com.kirisamemarisa.blog.dto;

import com.kirisamemarisa.blog.model.PrivateMessage.MessageType;
import java.time.Instant;

/**
 * 私信基础 DTO，现增加 blogPreview 字段用于展示转发博客的预览信息。
 */
public class PrivateMessageDTO {
    private Long id;
    private Long senderId;
    private Long receiverId;
    private String text;
    private String mediaUrl;
    private MessageType type;
    private Instant createdAt;
    // additional fields for frontend display
    private String senderNickname;
    private String senderAvatarUrl;
    private String receiverNickname;
    private String receiverAvatarUrl;

    // NEW: 如果 text 中是站内博客链接，这里填充对应的预览
    private BlogPreviewDTO blogPreview; // NEW
    private boolean recalled;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public Long getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(Long receiverId) {
        this.receiverId = receiverId;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getMediaUrl() {
        return mediaUrl;
    }

    public void setMediaUrl(String mediaUrl) {
        this.mediaUrl = mediaUrl;
    }

    public MessageType getType() {
        return type;
    }

    public void setType(MessageType type) {
        this.type = type;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getSenderNickname() {
        return senderNickname;
    }

    public void setSenderNickname(String senderNickname) {
        this.senderNickname = senderNickname;
    }

    public String getSenderAvatarUrl() {
        return senderAvatarUrl;
    }

    public void setSenderAvatarUrl(String senderAvatarUrl) {
        this.senderAvatarUrl = senderAvatarUrl;
    }

    public String getReceiverNickname() {
        return receiverNickname;
    }

    public void setReceiverNickname(String receiverNickname) {
        this.receiverNickname = receiverNickname;
    }

    public String getReceiverAvatarUrl() {
        return receiverAvatarUrl;
    }

    public void setReceiverAvatarUrl(String receiverAvatarUrl) {
        this.receiverAvatarUrl = receiverAvatarUrl;
    }

    public BlogPreviewDTO getBlogPreview() {
        return blogPreview;
    }

    public void setBlogPreview(BlogPreviewDTO blogPreview) {
        this.blogPreview = blogPreview;
    }

    public boolean isRecalled() {
        return recalled;
    }

    public void setRecalled(boolean recalled) {
        this.recalled = recalled;
    }
}