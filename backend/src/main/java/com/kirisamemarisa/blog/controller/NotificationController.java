package com.kirisamemarisa.blog.controller;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.NotificationDTO;
import com.kirisamemarisa.blog.dto.PageResult;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.service.CurrentUserResolver;
import com.kirisamemarisa.blog.service.NotificationService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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

    @GetMapping("/subscribe")
    public SseEmitter subscribe(@AuthenticationPrincipal Object principal) {
        User currentUser = currentUserResolver.resolve(principal);
        if (currentUser == null) {
            return null; // Or handle error appropriately
        }
        return notificationService.subscribe(currentUser.getId(), "Connected");
    }

    @GetMapping
    public ApiResponse<PageResult<NotificationDTO>> getNotifications(
            @AuthenticationPrincipal Object principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) java.util.List<String> types) {

        User currentUser = currentUserResolver.resolve(principal);
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
            @AuthenticationPrincipal Object principal) {

        User currentUser = currentUserResolver.resolve(principal);
        if (currentUser == null) {
            return new ApiResponse<>(401, "Unauthorized", null);
        }

        long count = notificationService.getUnreadCount(currentUser.getId());
        return new ApiResponse<>(200, "Success", count);
    }

    @GetMapping("/unread-stats")
    public ApiResponse<java.util.Map<String, Long>> getUnreadStats(
            @AuthenticationPrincipal Object principal) {

        User currentUser = currentUserResolver.resolve(principal);
        if (currentUser == null) {
            return new ApiResponse<>(401, "Unauthorized", null);
        }

        java.util.Map<String, Long> stats = notificationService.getUnreadStats(currentUser.getId());
        return new ApiResponse<>(200, "Success", stats);
    }

    @PutMapping("/{id}/read")
    public ApiResponse<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return new ApiResponse<>(200, "Success", null);
    }

    @PutMapping("/read-all")
    public ApiResponse<Void> markAllAsRead(
            @AuthenticationPrincipal Object principal,
            @RequestBody(required = false) java.util.List<String> types) {

        User currentUser = currentUserResolver.resolve(principal);
        if (currentUser == null) {
            return new ApiResponse<>(401, "Unauthorized", null);
        }

        if (types != null && !types.isEmpty()) {
            notificationService.markAllAsRead(currentUser.getId(), types);
        } else {
            notificationService.markAllAsRead(currentUser.getId());
        }
        return new ApiResponse<>(200, "Success", null);
    }
}
