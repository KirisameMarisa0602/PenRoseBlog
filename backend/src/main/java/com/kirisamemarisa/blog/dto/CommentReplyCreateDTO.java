package com.kirisamemarisa.blog.dto;

public class CommentReplyCreateDTO {

    private Long commentId;
    private Long userId;
    private String content;

    public Long getCommentId() { return commentId; }
    public void setCommentId(Long commentId) { this.commentId = commentId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
