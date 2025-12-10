package com.kirisamemarisa.blog.dto;

import java.util.List;

public class BlogPostUpdateDTO {
    private String coverImageUrl;
    private String content;
    private String directory;
    private String categoryName;
    private List<String> tags;

    public String getCoverImageUrl() { return coverImageUrl; }
    public void setCoverImageUrl(String coverImageUrl) { this.coverImageUrl = coverImageUrl; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getDirectory() { return directory; }
    public void setDirectory(String directory) { this.directory = directory; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
}
