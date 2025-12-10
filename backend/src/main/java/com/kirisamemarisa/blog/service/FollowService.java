package com.kirisamemarisa.blog.service;

import com.kirisamemarisa.blog.model.Follow;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.model.UserProfile;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface FollowService {
    Follow follow(User follower, User followee);

    void unfollow(User follower, User followee);

    boolean isFollowing(User follower, User followee);

    List<User> listFollowers(User user);

    List<User> listFollowing(User user);

    List<Object[]> pageFollowers(User user, Pageable pageable);

    List<Object[]> pageFollowing(User user, Pageable pageable);

    long countFollowers(User user);

    long countFollowing(User user);
}
