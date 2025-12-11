package com.kirisamemarisa.blog.controller;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.NotificationDTO;
import com.kirisamemarisa.blog.dto.PageResult;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.service.CurrentUserResolver;
import com.kirisamemarisa.blog.service.NotificationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final CurrentUserResolver currentUserResolver;

    public NotificationController(NotificationService notificationService,
            CurrentUserResolver currentUserResolver) {
        this.notificationService = notificationService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping("/subscribe/{userId}")
    public SseEmitter subscribe(@PathVariable Long userId) {
        // Note: Ideally we should verify if userId matches the authenticated user
        return notificationService.subscribe(userId, "Connected");
    }

    @GetMapping
    public ApiResponse<PageResult<NotificationDTO>> getNotifications(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) java.util.List<String> types) {

        User currentUser = currentUserResolver.resolve(userDetails, headerUserId);
        if (currentUser == null) {
            return new ApiResponse<>(401, "Unauthorized", null);
        }

        Pageable pageable = PageRequest.of(page, size);
        org.springframework.data.domain.Page<NotificationDTO> notifications;
        if (types != null && !types.isEmpty()) {
            notifications = notificationService.getUserNotifications(currentUser.getId(), types, pageable);
        } else {
            notifications = notificationService.getUserNotifications(currentUser.getId(), pageable);
        }

        PageResult<NotificationDTO> result = new PageResult<>(
                notifications.getContent(),
                notifications.getTotalElements(),
                notifications.getNumber(),
                notifications.getSize());
        return new ApiResponse<>(200, "Success", result);
    }

    @GetMapping("/unread-count")
    public ApiResponse<Long> getUnreadCount(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId) {

        User currentUser = currentUserResolver.resolve(userDetails, headerUserId);
        if (currentUser == null) {
            return new ApiResponse<>(401, "Unauthorized", null);
        }

        long count = notificationService.getUnreadCount(currentUser.getId());
        return new ApiResponse<>(200, "Success", count);
    }

    @PutMapping("/{id}/read")
    public ApiResponse<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return new ApiResponse<>(200, "Success", null);
    }

    @PutMapping("/read-all")
    public ApiResponse<Void> markAllAsRead(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId) {

        User currentUser = currentUserResolver.resolve(userDetails, headerUserId);
        if (currentUser == null) {
            return new ApiResponse<>(401, "Unauthorized", null);
        }

        notificationService.markAllAsRead(currentUser.getId());
        return new ApiResponse<>(200, "Success", null);
    }
}
