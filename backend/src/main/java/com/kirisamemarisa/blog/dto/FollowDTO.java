package com.kirisamemarisa.blog.dto;

public class FollowDTO {
    private Long followerId;
    private Long followeeId;

    public FollowDTO() {}

    public FollowDTO(Long followerId, Long followeeId) {
        this.followerId = followerId;
        this.followeeId = followeeId;
    }

    public Long getFollowerId() { return followerId; }
    public void setFollowerId(Long followerId) { this.followerId = followerId; }

    public Long getFolloweeId() { return followeeId; }
    public void setFolloweeId(Long followeeId) { this.followeeId = followeeId; }
}
