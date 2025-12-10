package com.kirisamemarisa.blog.dto;

import java.time.LocalDateTime;

public class CommentDTO {
    private Long id;
    private Long blogPostId;
    private Long userId;
    private String content;
    private LocalDateTime createdAt;
    private Long likeCount;
    private Boolean likedByCurrentUser;
    private String nickname;
    private String avatarUrl;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getBlogPostId() { return blogPostId; }
    public void setBlogPostId(Long blogPostId) { this.blogPostId = blogPostId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public Long getLikeCount() { return likeCount; }
    public void setLikeCount(Long likeCount) { this.likeCount = likeCount; }
    public Boolean getLikedByCurrentUser() { return likedByCurrentUser; }
    public void setLikedByCurrentUser(Boolean likedByCurrentUser) { this.likedByCurrentUser = likedByCurrentUser; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
}
