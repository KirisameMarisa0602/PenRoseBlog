package com.kirisamemarisa.blog.dto;

public class CommentCreateDTO {
    private Long blogPostId;
    private Long userId;
    private String content;

    public Long getBlogPostId() { return blogPostId; }
    public void setBlogPostId(Long blogPostId) { this.blogPostId = blogPostId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
