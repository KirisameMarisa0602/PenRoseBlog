package com.kirisamemarisa.blog.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.FriendRequestDTO;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.service.UserService;
import com.kirisamemarisa.blog.service.FriendRequestService;
import com.kirisamemarisa.blog.service.NotificationService;
import com.kirisamemarisa.blog.service.FriendService;
import com.kirisamemarisa.blog.service.CurrentUserResolver;
import com.kirisamemarisa.blog.dto.PageResult;

import java.util.List;

@RestController
@RequestMapping("/api/friends")
public class FriendRequestController {
    private static final Logger logger = LoggerFactory.getLogger(FriendRequestController.class);

    private final UserService userService;
    private final FriendRequestService friendRequestService;
    private final NotificationService notificationService;
    private final FriendService friendService;
    private final CurrentUserResolver currentUserResolver;

    public FriendRequestController(UserService userService, FriendRequestService friendRequestService,
            NotificationService notificationService,
            FriendService friendService,
            CurrentUserResolver currentUserResolver) {
        this.userService = userService;
        this.friendRequestService = friendRequestService;
        this.notificationService = notificationService;
        this.friendService = friendService;
        this.currentUserResolver = currentUserResolver;
    }

    private User resolveCurrentUser(Object principal) {
        return currentUserResolver.resolve(principal);
    }

    @PostMapping("/request/{targetId}")
    public ApiResponse<FriendRequestDTO> sendRequest(@PathVariable Long targetId,
            @RequestBody(required = false) FriendRequestDTO body,
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrentUser(principal);
        if (me == null) {
            logger.info("Unauthenticated request to send friend request to {}", targetId);
            return new ApiResponse<>(401, "未认证", null);
        }
        User target = userService.getUserById(targetId);
        if (target == null) {
            logger.info("Friend request target {} not found (from user {})", targetId, me.getId());
            return new ApiResponse<>(404, "目标用户不存在", null);
        }
        if (me.getId().equals(targetId))
            return new ApiResponse<>(400, "不能添加自己为好友", null);
        String msg = body != null ? body.getMessage() : null;
        FriendRequestDTO saved = friendRequestService.sendRequest(me, target, msg);
        logger.info("User {} sent friend request {} to {}", me.getId(), saved.getId(), targetId);
        return new ApiResponse<>(200, "申请已发送", saved);
    }

    @DeleteMapping("/{targetId}")
    public ApiResponse<Void> deleteFriend(@PathVariable Long targetId,
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrentUser(principal);
        if (me == null) {
            return new ApiResponse<>(401, "未认证", null);
        }
        User target = userService.getUserById(targetId);
        if (target == null) {
            return new ApiResponse<>(404, "目标用户不存在", null);
        }

        friendService.deleteFriend(me, target);
        return new ApiResponse<>(200, "好友已删除", null);
    }

    @GetMapping("/pending")
    public ApiResponse<List<FriendRequestDTO>> pending(
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrentUser(principal);
        if (me == null) {
            logger.info("Unauthenticated request to get pending friend requests");
            return new ApiResponse<>(401, "未认证", null);
        }
        List<FriendRequestDTO> list = friendRequestService.pendingFor(me);
        logger.info("User {} fetched {} pending friend requests", me.getId(), list.size());
        return new ApiResponse<>(200, "OK", list);
    }

    @PostMapping("/respond/{requestId}")
    public ApiResponse<FriendRequestDTO> respond(@PathVariable Long requestId,
            @RequestParam boolean accept,
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrentUser(principal);
        if (me == null) {
            logger.info("Unauthenticated request to respond friend request {}", requestId);
            return new ApiResponse<>(401, "未认证", null);
        }
        FriendRequestDTO saved = friendRequestService.respond(requestId, me, accept);
        logger.info("User {} responded to friend request {}: accept={}", me.getId(), requestId, accept);
        return new ApiResponse<>(200, "已处理", saved);
    }

    @GetMapping("/subscribe")
    public SseEmitter subscribe(
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrentUser(principal);
        if (me == null) {
            logger.info("Unauthenticated SSE subscribe attempt");
            SseEmitter failed = new SseEmitter(0L);
            try {
                failed.send(SseEmitter.event().name("error")
                        .data(new ApiResponse<>(401, "未认证", null)));
            } catch (Exception ignored) {
            }
            failed.complete();
            return failed;
        }
        // initial payload: pending requests (DTO)
        List<FriendRequestDTO> pending = friendRequestService.pendingFor(me);
        logger.info("User {} subscribed to friend request SSE (pending={})", me.getId(), pending.size());
        return notificationService.subscribe(me.getId(), pending);
    }

    @GetMapping("/list")
    public ApiResponse<java.util.List<com.kirisamemarisa.blog.dto.UserSimpleDTO>> listFriends(
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrentUser(principal);
        if (me == null) {
            return new ApiResponse<>(401, "未认证", null);
        }
        var dtoList = friendService.listFriendDTOs(me);
        return new ApiResponse<>(200, "获取成功", dtoList);
    }

    @GetMapping("/list/page")
    public ApiResponse<PageResult<com.kirisamemarisa.blog.dto.UserSimpleDTO>> listFriendsPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrentUser(principal);
        if (me == null) {
            return new ApiResponse<>(401, "未认证", null);
        }
        PageResult<com.kirisamemarisa.blog.dto.UserSimpleDTO> pageResult = friendService.pageFriendDTOs(me, page, size);
        return new ApiResponse<>(200, "获取成功", pageResult);
    }

    @GetMapping("/ids")
    public ApiResponse<java.util.List<Long>> friendIds(
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrentUser(principal);
        if (me == null) {
            return new ApiResponse<>(401, "未认证", null);
        }
        java.util.List<Long> ids = friendService.listFriendIds(me);
        return new ApiResponse<>(200, "OK", ids);
    }

    @GetMapping("/isFriend/{otherId}")
    public ApiResponse<Boolean> isFriend(@PathVariable Long otherId,
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrentUser(principal);
        if (me == null) {
            return new ApiResponse<>(401, "未认证", null);
        }
        User other = userService.getUserById(otherId);
        if (other == null) {
            return new ApiResponse<>(404, "用户不存在", null);
        }
        boolean isFriend = friendService.isFriend(me, other);
        return new ApiResponse<>(200, "OK", isFriend);
    }
}
