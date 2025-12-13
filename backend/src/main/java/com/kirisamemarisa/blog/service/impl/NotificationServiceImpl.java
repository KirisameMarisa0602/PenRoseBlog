package com.kirisamemarisa.blog.service.impl;

import com.kirisamemarisa.blog.dto.NotificationDTO;
import com.kirisamemarisa.blog.events.NotificationEventPublisher;
import com.kirisamemarisa.blog.events.NotificationMessage;
import com.kirisamemarisa.blog.events.RabbitNotificationBridge;
import com.kirisamemarisa.blog.model.Notification;
import com.kirisamemarisa.blog.model.NotificationType;
import com.kirisamemarisa.blog.model.UserProfile;
import com.kirisamemarisa.blog.repository.NotificationRepository;
import com.kirisamemarisa.blog.repository.UserProfileRepository;
import com.kirisamemarisa.blog.repository.FriendRequestRepository;
import com.kirisamemarisa.blog.model.FriendRequest;
import com.kirisamemarisa.blog.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.Optional;

@Service
public class NotificationServiceImpl implements NotificationService {
    private static final Logger logger = LoggerFactory.getLogger(NotificationServiceImpl.class);

    private final NotificationEventPublisher publisher;
    private final NotificationRepository notificationRepository;
    private final UserProfileRepository userProfileRepository;
    private final FriendRequestRepository friendRequestRepository;

    @Autowired(required = false)
    private RabbitNotificationBridge rabbitBridge;

    public NotificationServiceImpl(NotificationEventPublisher publisher,
            NotificationRepository notificationRepository,
            UserProfileRepository userProfileRepository,
            FriendRequestRepository friendRequestRepository) {
        this.publisher = publisher;
        this.notificationRepository = notificationRepository;
        this.userProfileRepository = userProfileRepository;
        this.friendRequestRepository = friendRequestRepository;
    }

    @Override
    public SseEmitter subscribe(Long userId, Object initialPayload) {
        return publisher.subscribe(userId, initialPayload);
    }

    @Override
    @Transactional
    public void sendNotification(Long userId, NotificationDTO payload) {
        if (payload == null || userId == null)
            return;

        // 1. Save to DB (Skip PRIVATE_MESSAGE as they are stored in private_messages
        // table)
        if (!"PRIVATE_MESSAGE".equals(payload.getType())) {
            try {
                NotificationType type;
                try {
                    type = NotificationType.valueOf(payload.getType());
                } catch (IllegalArgumentException e) {
                    logger.warn("Unknown notification type: {}", payload.getType());
                    type = NotificationType.SYSTEM;
                }

                Notification notification = new Notification();
                notification.setReceiverId(userId);
                notification.setSenderId(payload.getSenderId());
                notification.setType(type);
                notification.setReferenceId(payload.getReferenceId());
                notification.setReferenceExtraId(payload.getReferenceExtraId());
                notification.setContent(payload.getMessage());
                notification.setCreatedAt(payload.getCreatedAt() != null ? payload.getCreatedAt() : Instant.now());
                notification.setRead(false);

                notificationRepository.save(notification);
            } catch (Exception e) {
                logger.error("Failed to save notification to DB", e);
            }
        }

        // 2. Send Real-time (RabbitMQ / SSE)
        if (rabbitBridge != null) {
            try {
                NotificationMessage m = new NotificationMessage();
                m.setReceiverId(userId);
                m.setSenderId(payload.getSenderId());
                m.setRequestId(payload.getRequestId());
                m.setType(payload.getType());
                m.setMessage(payload.getMessage());
                m.setStatus(payload.getStatus());
                m.setCreatedAt(payload.getCreatedAt());
                m.setReferenceId(payload.getReferenceId());
                m.setReferenceExtraId(payload.getReferenceExtraId());
                rabbitBridge.publish(m);
                return;
            } catch (Exception ex) {
                logger.warn("Failed to publish notification via Rabbit bridge: {}. Falling back to local send",
                        ex.toString());
            }
        }

        publisher.sendNotification(userId, payload);
    }

    @Override
    public boolean isOnline(Long userId) {
        return publisher.isOnline(userId);
    }

    @Override
    public Page<NotificationDTO> getUserNotifications(Long userId, java.util.List<String> types, Pageable pageable) {
        if (types == null || types.isEmpty()) {
            return getUserNotifications(userId, pageable);
        }
        java.util.List<NotificationType> typeEnums = types.stream()
                .map(t -> {
                    try {
                        return NotificationType.valueOf(t);
                    } catch (IllegalArgumentException e) {
                        return null;
                    }
                })
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());

        if (typeEnums.isEmpty()) {
            return Page.empty(pageable);
        }

        Page<Notification> notifications = notificationRepository.findByReceiverIdAndTypeInOrderByCreatedAtDesc(userId,
                typeEnums, pageable);
        return notifications.map(this::convertToDTO);
    }

    @Override
    public Page<NotificationDTO> getUserNotifications(Long userId, Pageable pageable) {
        Page<Notification> notifications = notificationRepository.findByReceiverIdOrderByCreatedAtDesc(userId,
                pageable);
        return notifications.map(this::convertToDTO);
    }

    @Override
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByReceiverIdAndIsReadFalse(userId);
    }

    @Override
    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.saveAndFlush(n);
        });
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId);
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId, java.util.List<String> types) {
        if (types == null || types.isEmpty()) {
            markAllAsRead(userId);
            return;
        }
        java.util.List<NotificationType> typeEnums = types.stream()
                .map(t -> {
                    try {
                        return NotificationType.valueOf(t);
                    } catch (IllegalArgumentException e) {
                        return null;
                    }
                })
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());

        if (!typeEnums.isEmpty()) {
            notificationRepository.markAllAsRead(userId, typeEnums);
        }
    }

    @Override
    public java.util.Map<String, Long> getUnreadStats(Long userId) {
        java.util.Map<String, Long> stats = new java.util.HashMap<>();

        // LIKES: POST_LIKE, POST_FAVORITE, COMMENT_LIKE, REPLY_LIKE
        stats.put("LIKES", notificationRepository.countByReceiverIdAndIsReadFalseAndTypeIn(userId,
                java.util.Arrays.asList(
                        NotificationType.POST_LIKE,
                        NotificationType.POST_FAVORITE,
                        NotificationType.COMMENT_LIKE,
                        NotificationType.REPLY_LIKE)));

        // COMMENTS: POST_COMMENT, COMMENT_REPLY
        stats.put("COMMENTS", notificationRepository.countByReceiverIdAndIsReadFalseAndTypeIn(userId,
                java.util.Arrays.asList(
                        NotificationType.POST_COMMENT,
                        NotificationType.COMMENT_REPLY)));

        // FOLLOW: FOLLOW, UNFOLLOW
        stats.put("FOLLOW", notificationRepository.countByReceiverIdAndIsReadFalseAndTypeIn(userId,
                java.util.Arrays.asList(
                        NotificationType.FOLLOW,
                        NotificationType.UNFOLLOW)));

        // REQUESTS: FRIEND_REQUEST, FRIEND_REQUEST_ACCEPTED, FRIEND_REQUEST_REJECTED +
        // Pending Friend Requests
        long unreadRequestNotes = notificationRepository.countByReceiverIdAndIsReadFalseAndTypeIn(userId,
                java.util.Arrays.asList(
                        NotificationType.FRIEND_REQUEST,
                        NotificationType.FRIEND_REQUEST_ACCEPTED,
                        NotificationType.FRIEND_REQUEST_REJECTED));
        long pendingRequests = friendRequestRepository.countByReceiver_IdAndStatus(userId,
                FriendRequest.Status.PENDING);
        stats.put("REQUESTS", unreadRequestNotes + pendingRequests);

        // ALL: Sum of above (or just query all)
        // Note: This excludes SYSTEM or other types if they exist but aren't in
        // categories
        // Better to query all unread
        stats.put("ALL", notificationRepository.countByReceiverIdAndIsReadFalse(userId));

        return stats;
    }

    private NotificationDTO convertToDTO(Notification n) {
        NotificationDTO dto = new NotificationDTO();
        dto.setRequestId(n.getId());
        dto.setType(n.getType().name());
        dto.setSenderId(n.getSenderId());
        dto.setReceiverId(n.getReceiverId());
        dto.setMessage(n.getContent());
        dto.setCreatedAt(n.getCreatedAt());
        dto.setReferenceId(n.getReferenceId());
        dto.setReferenceExtraId(n.getReferenceExtraId());
        dto.setRead(n.isRead());

        Optional<UserProfile> senderProfile = userProfileRepository.findById(n.getSenderId());
        senderProfile.ifPresent(p -> {
            dto.setSenderNickname(p.getNickname());
            dto.setSenderAvatarUrl(p.getAvatarUrl());
        });

        return dto;
    }
}
