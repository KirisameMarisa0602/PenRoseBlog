package com.kirisamemarisa.blog.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.kirisamemarisa.blog.model.Follow;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.model.UserProfile;
import com.kirisamemarisa.blog.repository.FollowRepository;
import com.kirisamemarisa.blog.repository.UserRepository;
import com.kirisamemarisa.blog.repository.UserProfileRepository;
import com.kirisamemarisa.blog.service.FollowService;
import com.kirisamemarisa.blog.service.NotificationService;
import com.kirisamemarisa.blog.dto.NotificationDTO;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class FollowServiceImpl implements FollowService {
    private static final Logger logger = LoggerFactory.getLogger(FollowServiceImpl.class);
    private final FollowRepository followRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final NotificationService notificationService;

    public FollowServiceImpl(FollowRepository followRepository, UserRepository userRepository,
            UserProfileRepository userProfileRepository, NotificationService notificationService) {
        this.followRepository = followRepository;
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.notificationService = notificationService;
        logger.debug("FollowServiceImpl initialized with followRepository={} userRepository={}",
                followRepository != null, userRepository != null);
    }

    @Override
    public Follow follow(User follower, User followee) {
        return followRepository.findByFollowerAndFollowee(follower, followee)
                .orElseGet(() -> {
                    Follow f = new Follow();
                    f.setFollower(follower);
                    f.setFollowee(followee);
                    Follow saved = null;
                    try {
                        saved = followRepository.save(f);
                        followRepository.flush();
                        logger.info("Created follow {} -> {} (id={})", follower.getId(), followee.getId(),
                                saved.getId());
                    } catch (Exception ex) {
                        logger.error("Failed to save or flush follow {} -> {}: {}", follower.getId(), followee.getId(),
                                ex.toString());
                        throw new RuntimeException("关注操作失败: " + ex.getMessage(), ex);
                    }
                    if (saved == null || saved.getId() == null) {
                        logger.error("Follow save returned null or id is null for {} -> {}", follower.getId(),
                                followee.getId());
                        throw new RuntimeException("关注操作失败: 未能保存记录");
                    }

                    // 发送关注通知
                    try {
                        NotificationDTO note = new NotificationDTO();
                        note.setType("FOLLOW");
                        note.setSenderId(follower.getId());
                        note.setReceiverId(followee.getId());
                        note.setCreatedAt(java.time.Instant.now());
                        note.setReferenceId(follower.getId()); // 跳转到关注者主页

                        // 填充发送者信息
                        UserProfile up = userProfileRepository.findById(follower.getId()).orElse(null);
                        String nickname = (up != null && up.getNickname() != null) ? up.getNickname()
                                : follower.getUsername();
                        String avatar = (up != null) ? up.getAvatarUrl() : null;
                        note.setSenderNickname(nickname);
                        note.setSenderAvatarUrl(avatar);
                        note.setMessage(nickname + " 关注了你");

                        notificationService.sendNotification(followee.getId(), note);
                    } catch (Exception e) {
                        logger.warn("Failed to send follow notification: {}", e.getMessage());
                    }

                    return saved;
                });
    }

    @Override
    public void unfollow(User follower, User followee) {
        followRepository.findByFollowerAndFollowee(follower, followee)
                .ifPresent(f -> {
                    followRepository.delete(f);

                    // Send UNFOLLOW notification
                    try {
                        NotificationDTO note = new NotificationDTO();
                        note.setType("UNFOLLOW");
                        note.setSenderId(follower.getId());
                        note.setReceiverId(followee.getId());
                        note.setCreatedAt(java.time.Instant.now());
                        note.setReferenceId(follower.getId());

                        UserProfile up = userProfileRepository.findById(follower.getId()).orElse(null);
                        String nickname = (up != null && up.getNickname() != null) ? up.getNickname()
                                : follower.getUsername();
                        String avatar = (up != null) ? up.getAvatarUrl() : null;
                        note.setSenderNickname(nickname);
                        note.setSenderAvatarUrl(avatar);
                        note.setMessage(nickname + " 取消了对你的关注");

                        notificationService.sendNotification(followee.getId(), note);
                    } catch (Exception e) {
                        logger.warn("Failed to send unfollow notification: {}", e.getMessage());
                    }
                });
    }

    @Override
    public boolean isFollowing(User follower, User followee) {
        return followRepository.findByFollowerAndFollowee(follower, followee).isPresent();
    }

    // 好友关系不再由互相关注判定，移除此方法

    @Override
    public List<User> listFollowers(User user) {
        return followRepository.findByFollowee(user).stream()
                .map(Follow::getFollower)
                .collect(Collectors.toList());
    }

    @Override
    public List<User> listFollowing(User user) {
        return followRepository.findByFollower(user).stream()
                .map(Follow::getFollowee)
                .collect(Collectors.toList());
    }

    @Override
    public List<Object[]> pageFollowers(User user, Pageable pageable) {
        return followRepository.findFollowersWithProfile(user, pageable);
    }

    @Override
    public List<Object[]> pageFollowing(User user, Pageable pageable) {
        return followRepository.findFollowingWithProfile(user, pageable);
    }

    @Override
    public long countFollowers(User user) {
        return followRepository.countByFollowee(user);
    }

    @Override
    public long countFollowing(User user) {
        return followRepository.countByFollower(user);
    }

    // no-op: keep the logger used in constructor; remove unused helper method
}
