package com.kirisamemarisa.blog.events;

import java.io.Serializable;
import java.time.Instant;

/**
 * 发送到 RabbitMQ 的通知载体，与 NotificationDTO 字段基本对齐，
 * 增加 referenceId / referenceExtraId 以携带业务主键。
 */
public class NotificationMessage implements Serializable {
    private Long requestId;
    private Long senderId;
    private Long receiverId;
    private String type;
    private String message;
    private String status;
    private Instant createdAt;

    // 与 DTO 对齐，用于在 MQ 中携带业务 ID
    private Long referenceId;
    private Long referenceExtraId;

    public Long getRequestId() { return requestId; }
    public void setRequestId(Long requestId) { this.requestId = requestId; }

    public Long getSenderId() { return senderId; }
    public void setSenderId(Long senderId) { this.senderId = senderId; }

    public Long getReceiverId() { return receiverId; }
    public void setReceiverId(Long receiverId) { this.receiverId = receiverId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

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
}