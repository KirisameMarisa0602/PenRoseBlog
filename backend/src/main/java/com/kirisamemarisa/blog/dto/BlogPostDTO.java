package com.kirisamemarisa.blog.dto;

import java.time.LocalDateTime;
import java.util.List;

public class BlogPostDTO {
    private Long id;
    private String title;
    private Long userId;
    private String coverImageUrl;
    private String content;
    private String directory;
    private Long likeCount;
    private Long commentCount;
    private Long shareCount;
    private Long favoriteCount;
    private Integer repostCount;
    private Long viewCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean repost;
    private Long originalPostId;
    private Boolean likedByCurrentUser;
    private Boolean favoritedByCurrentUser;
    private String authorNickname;
    private String authorAvatarUrl;
    private String categoryName;
    private List<String> tags;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getCoverImageUrl() { return coverImageUrl; }
    public void setCoverImageUrl(String coverImageUrl) { this.coverImageUrl = coverImageUrl; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getDirectory() { return directory; }
    public void setDirectory(String directory) { this.directory = directory; }
    public Long getLikeCount() { return likeCount; }
    public void setLikeCount(Long likeCount) { this.likeCount = likeCount; }
    public Long getCommentCount() { return commentCount; }
    public void setCommentCount(Long commentCount) { this.commentCount = commentCount; }
    public Long getShareCount() { return shareCount; }
    public void setShareCount(Long shareCount) { this.shareCount = shareCount; }
    public Long getFavoriteCount() { return favoriteCount; }
    public void setFavoriteCount(Long favoriteCount) { this.favoriteCount = favoriteCount; }
    public Integer getRepostCount() { return repostCount; }
    public void setRepostCount(Integer repostCount) { this.repostCount = repostCount; }
    public Long getViewCount() { return viewCount; }
    public void setViewCount(Long viewCount) { this.viewCount = viewCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public Boolean getRepost() { return repost; }
    public void setRepost(Boolean repost) { this.repost = repost; }
    public Long getOriginalPostId() { return originalPostId; }
    public void setOriginalPostId(Long originalPostId) { this.originalPostId = originalPostId; }
    public Boolean getLikedByCurrentUser() { return likedByCurrentUser; }
    public void setLikedByCurrentUser(Boolean likedByCurrentUser) { this.likedByCurrentUser = likedByCurrentUser; }
    public Boolean getFavoritedByCurrentUser() { return favoritedByCurrentUser; }
    public void setFavoritedByCurrentUser(Boolean favoritedByCurrentUser) { this.favoritedByCurrentUser = favoritedByCurrentUser; }
    public String getAuthorNickname() { return authorNickname; }
    public void setAuthorNickname(String authorNickname) { this.authorNickname = authorNickname; }
    public String getAuthorAvatarUrl() { return authorAvatarUrl; }
    public void setAuthorAvatarUrl(String authorAvatarUrl) { this.authorAvatarUrl = authorAvatarUrl; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
}
