package com.kirisamemarisa.blog.dto;

public class BlogViewRecordCreateDTO {

    private Long blogPostId;
    private Long userId;

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
}
