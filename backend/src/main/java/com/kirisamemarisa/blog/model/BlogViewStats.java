package com.kirisamemarisa.blog.model;

import jakarta.persistence.*;

@Entity
@Table(name = "blog_view_stats")
public class BlogViewStats {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 一篇博客对应一条统计
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blog_post_id", nullable = false, unique = true)
    private BlogPost blogPost;

    @Column(name = "view_count", nullable = false)
    private Long viewCount = 0L;

    public Long getId() {
        return id;
    }

    public BlogPost getBlogPost() {
        return blogPost;
    }

    public void setBlogPost(BlogPost blogPost) {
        this.blogPost = blogPost;
    }

    public Long getViewCount() {
        return viewCount;
    }

    public void setViewCount(Long viewCount) {
        this.viewCount = viewCount;
    }
}
