package com.kirisamemarisa.blog.dto;

public class UserStatsDTO {
    private long followingCount;
    private long followerCount;
    private long articleCount;

    public UserStatsDTO() {}

    public UserStatsDTO(long followingCount, long followerCount, long articleCount) {
        this.followingCount = followingCount;
        this.followerCount = followerCount;
        this.articleCount = articleCount;
    }

    public long getFollowingCount() {
        return followingCount;
    }

    public void setFollowingCount(long followingCount) {
        this.followingCount = followingCount;
    }

    public long getFollowerCount() {
        return followerCount;
    }

    public void setFollowerCount(long followerCount) {
        this.followerCount = followerCount;
    }

    public long getArticleCount() {
        return articleCount;
    }

    public void setArticleCount(long articleCount) {
        this.articleCount = articleCount;
    }
}
