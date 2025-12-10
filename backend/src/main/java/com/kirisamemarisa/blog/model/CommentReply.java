package com.kirisamemarisa.blog.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "comment_reply")
public class CommentReply {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 被回复的评论
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id", nullable = false)
    private Comment comment;

    // 回复用户
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 回复内容
    @Lob
    @Column(nullable = false)
    private String content;

    // 点赞数
    @Column(name = "like_count", nullable = false)
    private Long likeCount = 0L;

    // 创建时间
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }

    public Comment getComment() { return comment; }
    public void setComment(Comment comment) { this.comment = comment; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Long getLikeCount() { return likeCount; }
    public void setLikeCount(Long likeCount) { this.likeCount = likeCount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
