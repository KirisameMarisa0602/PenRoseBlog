package com.kirisamemarisa.blog.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "blog_view_record")
public class BlogViewRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 被浏览的博客
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blog_post_id", nullable = false)
    private BlogPost blogPost;

    // 发起浏览的用户，可为空（未登录）
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "viewed_at", nullable = false)
    private LocalDateTime viewedAt;

    @PrePersist
    protected void onCreate() {
        if (viewedAt == null) {
            viewedAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public BlogPost getBlogPost() {
        return blogPost;
    }

    public void setBlogPost(BlogPost blogPost) {
        this.blogPost = blogPost;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public LocalDateTime getViewedAt() {
        return viewedAt;
    }

    public void setViewedAt(LocalDateTime viewedAt) {
        this.viewedAt = viewedAt;
    }
}
