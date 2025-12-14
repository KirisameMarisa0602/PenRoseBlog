package com.kirisamemarisa.blog.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "blog_post_shares", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "blog_post_id", "user_id" })
})
public class BlogPostShare {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "blog_post_id", nullable = false)
    private Long blogPostId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public BlogPostShare() {
    }

    public BlogPostShare(Long blogPostId, Long userId) {
        this.blogPostId = blogPostId;
        this.userId = userId;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getBlogPostId() {
        return blogPostId;
    }

    public void setBlogPostId(Long blogPostId) {
        this.blogPostId = blogPostId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
