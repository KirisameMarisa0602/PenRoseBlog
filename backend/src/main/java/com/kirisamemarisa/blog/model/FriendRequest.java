package com.kirisamemarisa.blog.model;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "friend_requests", uniqueConstraints = {
        @UniqueConstraint(name = "uk_sender_receiver", columnNames = { "sender_id", "receiver_id" })
}, indexes = {
        @Index(name = "idx_receiver_status", columnList = "receiver_id, status"),
        @Index(name = "idx_sender_receiver", columnList = "sender_id, receiver_id")
})
public class FriendRequest {
    private static final Logger logger = LoggerFactory.getLogger(FriendRequest.class);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private User sender;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id")
    private User receiver;

    @Column(length = 1000)
    private String message;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    public enum Status {
        PENDING, ACCEPTED, REJECTED
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }
}
