package com.kirisamemarisa.blog.service.impl;

import com.kirisamemarisa.blog.dto.PageResult;
import com.kirisamemarisa.blog.dto.UserSimpleDTO;
import com.kirisamemarisa.blog.mapper.UserSimpleMapper;
import com.kirisamemarisa.blog.model.FriendRequest;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.model.UserProfile;
import com.kirisamemarisa.blog.repository.FriendRequestRepository;
import com.kirisamemarisa.blog.repository.UserProfileRepository;
import com.kirisamemarisa.blog.service.FriendService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

import com.kirisamemarisa.blog.service.FollowService;
import com.kirisamemarisa.blog.service.NotificationService;
import com.kirisamemarisa.blog.dto.NotificationDTO;

@Service
@Transactional(readOnly = true)
public class FriendServiceImpl implements FriendService {
    private static final Logger logger = LoggerFactory.getLogger(FriendServiceImpl.class);
    private final FriendRequestRepository friendRequestRepository;
    private final UserProfileRepository userProfileRepository;
    private final FollowService followService;
    private final NotificationService notificationService;

    public FriendServiceImpl(FriendRequestRepository friendRequestRepository,
            UserProfileRepository userProfileRepository,
            FollowService followService,
            NotificationService notificationService) {
        this.friendRequestRepository = friendRequestRepository;
        this.userProfileRepository = userProfileRepository;
        this.followService = followService;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional
    public void deleteFriend(User me, User friend) {
        // 1. Delete FriendRequest (bidirectional check)
        friendRequestRepository.findBySenderAndReceiverAndStatus(me, friend, FriendRequest.Status.ACCEPTED)
                .ifPresent(friendRequestRepository::delete);
        friendRequestRepository.findBySenderAndReceiverAndStatus(friend, me, FriendRequest.Status.ACCEPTED)
                .ifPresent(friendRequestRepository::delete);

        // 2. Unfollow (bidirectional)
        followService.unfollow(me, friend);
        followService.unfollow(friend, me);

        // 3. Send Notification to friend
        try {
            NotificationDTO note = new NotificationDTO();
            note.setType("FRIEND_DELETE");
            note.setSenderId(me.getId());
            note.setReceiverId(friend.getId());
            note.setCreatedAt(java.time.Instant.now());

            UserProfile up = userProfileRepository.findById(me.getId()).orElse(null);
            String nickname = (up != null && up.getNickname() != null) ? up.getNickname() : me.getUsername();
            String avatar = (up != null) ? up.getAvatarUrl() : null;

            note.setSenderNickname(nickname);
            note.setSenderAvatarUrl(avatar);
            note.setMessage(nickname + " 解除了与你的好友关系");

            notificationService.sendNotification(friend.getId(), note);
        } catch (Exception e) {
            logger.warn("Failed to send delete friend notification: {}", e.getMessage());
        }
    }

    @Override
    public boolean isFriend(User a, User b) {
        if (a == null || b == null)
            return false;
        return friendRequestRepository
                .findBySenderAndReceiverAndStatus(a, b, FriendRequest.Status.ACCEPTED)
                .isPresent()
                || friendRequestRepository
                        .findBySenderAndReceiverAndStatus(b, a, FriendRequest.Status.ACCEPTED)
                        .isPresent();
    }

    @Override
    public List<User> listFriends(User me) {
        if (me == null)
            return List.of();
        List<User> acc = new ArrayList<>();
        for (var fr : friendRequestRepository.findBySenderAndStatus(me, FriendRequest.Status.ACCEPTED)) {
            acc.add(fr.getReceiver());
        }
        for (var fr : friendRequestRepository.findByReceiverAndStatus(me, FriendRequest.Status.ACCEPTED)) {
            acc.add(fr.getSender());
        }
        Map<Long, User> uniq = new LinkedHashMap<>();
        for (var u : acc)
            uniq.put(u.getId(), u);
        return new ArrayList<>(uniq.values());
    }

    @Override
    public List<Long> listFriendIds(User me) {
        List<User> users = listFriends(me);
        List<Long> ids = new ArrayList<>(users.size());
        for (var u : users)
            ids.add(u.getId());
        return ids;
    }

    @Override
    public List<UserSimpleDTO> listFriendDTOs(User me) {
        List<User> users = listFriends(me);
        if (users.isEmpty())
            return List.of();
        // 批量拉取资料
        Set<Long> ids = new HashSet<>();
        for (User u : users)
            ids.add(u.getId());
        List<UserProfile> profiles = userProfileRepository.findAllById(ids);
        Map<Long, UserProfile> profileMap = new HashMap<>();
        for (UserProfile p : profiles)
            profileMap.put(p.getId(), p);
        List<UserSimpleDTO> dtos = new ArrayList<>(users.size());
        for (User u : users) {
            dtos.add(UserSimpleMapper.INSTANCE.toDTO(u, profileMap.get(u.getId())));
        }
        return dtos;
    }

    @Override
    public PageResult<UserSimpleDTO> pageFriendDTOs(User me, int page, int size) {
        List<UserSimpleDTO> all = listFriendDTOs(me);
        int total = all.size();
        int from = Math.min(page * size, total);
        int to = Math.min(from + size, total);
        List<UserSimpleDTO> sub = from < to ? all.subList(from, to) : List.of();
        return new PageResult<>(sub, total, page, size);
    }
}
