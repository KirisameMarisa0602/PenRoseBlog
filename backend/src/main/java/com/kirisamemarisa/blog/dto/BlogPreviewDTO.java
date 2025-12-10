// 私信页面添加对博客预览信息的支持

package com.kirisamemarisa.blog.dto;

import java.time.LocalDateTime;

/**
 * 用于在私信中展示被转发博客的预览信息。
 */
public class BlogPreviewDTO {
    private Long blogId;
    private String title;
    private String coverImageUrl;
    private String url;
    private String authorNickname;
    private LocalDateTime createdAt;

    public Long getBlogId() {
        return blogId;
    }

    public void setBlogId(Long blogId) {
        this.blogId = blogId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCoverImageUrl() {
        return coverImageUrl;
    }

    public void setCoverImageUrl(String coverImageUrl) {
        this.coverImageUrl = coverImageUrl;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getAuthorNickname() {
        return authorNickname;
    }

    public void setAuthorNickname(String authorNickname) {
        this.authorNickname = authorNickname;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}