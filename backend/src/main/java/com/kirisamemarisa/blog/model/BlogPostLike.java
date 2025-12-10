package com.kirisamemarisa.blog.model;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.persistence.*;

@Entity
@Table(name = "blog_post_like", uniqueConstraints = @UniqueConstraint(columnNames = { "blog_post_id", "user_id" }))
public class BlogPostLike {
    private static final Logger logger = LoggerFactory.getLogger(BlogPostLike.class);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blog_post_id", nullable = false)
    private BlogPost blogPost;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

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
}
