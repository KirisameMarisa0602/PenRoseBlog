package com.kirisamemarisa.blog.dto;

import java.util.List;

public class BlogPostCreateDTO {
    private String title;
    private String content;
    private Long userId;
    private String coverImageUrl;
    private String directory;
    private String categoryName;
    private List<String> tags;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getCoverImageUrl() { return coverImageUrl; }
    public void setCoverImageUrl(String coverImageUrl) { this.coverImageUrl = coverImageUrl; }

    public String getDirectory() { return directory; }
    public void setDirectory(String directory) { this.directory = directory; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
}
