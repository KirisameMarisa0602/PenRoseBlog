package com.kirisamemarisa.blog.dto;

import java.time.Instant;

/**
 * 业务层使用的通知 DTO。
 * 所有通知类型（博客点赞、评论、回复、私信等）均通过该 DTO 统一发送。
 */
public class NotificationDTO {
    // e.g., FRIEND_REQUEST, FRIEND_REQUEST_RESPONSE,
    // PRIVATE_MESSAGE, POST_LIKE, COMMENT_LIKE, REPLY_LIKE, COMMENT_REPLY
    private String type;
    private Long requestId;
    private Long senderId;
    private Long receiverId;
    private String message;
    private String status;
    private Instant createdAt;

    // 可选的业务 ID，方便前端跳转
    // 例如：评论 ID / 回复 ID / 文章 ID / 私信 ID 等
    private Long referenceId;
    private Long referenceExtraId;

    // 冗余发送者信息，避免前端二次查询
    private String senderNickname;
    private String senderAvatarUrl;

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getRequestId() {
        return requestId;
    }

    public void setRequestId(Long requestId) {
        this.requestId = requestId;
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

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Long getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(Long referenceId) {
        this.referenceId = referenceId;
    }

    public Long getReferenceExtraId() {
        return referenceExtraId;
    }

    public void setReferenceExtraId(Long referenceExtraId) {
        this.referenceExtraId = referenceExtraId;
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
}