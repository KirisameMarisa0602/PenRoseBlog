package com.kirisamemarisa.blog.model;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "private_messages")
public class PrivateMessage {
    private static final Logger logger = LoggerFactory.getLogger(PrivateMessage.class);
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private User sender;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id")
    private User receiver;

    @Column(length = 2000)
    private String text;

    @Column(length = 512)
    private String mediaUrl; // 图片/视频 URL

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MessageType type = MessageType.TEXT;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private boolean readByReceiver = false;

    @Column(nullable = false)
    private boolean recalled = false;

    @Column(nullable = false)
    private boolean deletedBySender = false;

    @Column(nullable = false)
    private boolean deletedByReceiver = false;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    public enum MessageType {
        TEXT, IMAGE, VIDEO
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public boolean isRecalled() {
        return recalled;
    }

    public void setRecalled(boolean recalled) {
        this.recalled = recalled;
    }

    public boolean isDeletedBySender() {
        return deletedBySender;
    }

    public void setDeletedBySender(boolean deletedBySender) {
        this.deletedBySender = deletedBySender;
    }

    public boolean isDeletedByReceiver() {
        return deletedByReceiver;
    }

    public void setDeletedByReceiver(boolean deletedByReceiver) {
        this.deletedByReceiver = deletedByReceiver;
    }

    public User getSender() {
        return sender;
    }

    public void setSender(User sender) {
        this.sender = sender;
    }

    public User getReceiver() {
        return receiver;
    }

    public void setReceiver(User receiver) {
        this.receiver = receiver;
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

    public boolean isReadByReceiver() {
        return readByReceiver;
    }

    public void setReadByReceiver(boolean readByReceiver) {
        this.readByReceiver = readByReceiver;
    }
}
