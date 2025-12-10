package com.kirisamemarisa.blog.model;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * 用户拉黑关系：blocker 拉黑 blocked。
 */
@Entity
@Table(
        name = "blocked_user",
        uniqueConstraints = @UniqueConstraint(columnNames = {"blocker_id", "blocked_id"})
)
public class BlockedUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 谁拉黑了别人
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "blocker_id")
    private User blocker;

    // 被谁拉黑
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "blocked_id")
    private User blocked;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public User getBlocker() {
        return blocker;
    }

    public void setBlocker(User blocker) {
        this.blocker = blocker;
    }

    public User getBlocked() {
        return blocked;
    }

    public void setBlocked(User blocked) {
        this.blocked = blocked;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}