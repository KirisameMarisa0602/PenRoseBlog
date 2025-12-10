package com.kirisamemarisa.blog.dto;

public class BlogViewStatsDTO {

    private Long blogPostId;
    private Long viewCount;

    public Long getBlogPostId() {
        return blogPostId;
    }

    public void setBlogPostId(Long blogPostId) {
        this.blogPostId = blogPostId;
    }

    public Long getViewCount() {
        return viewCount;
    }

    public void setViewCount(Long viewCount) {
        this.viewCount = viewCount;
    }
}
