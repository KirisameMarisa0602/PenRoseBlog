package com.kirisamemarisa.blog.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.UserSimpleDTO;
import com.kirisamemarisa.blog.dto.PageResult;
import com.kirisamemarisa.blog.mapper.UserSimpleMapper;
import com.kirisamemarisa.blog.repository.UserProfileRepository;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.model.UserProfile;
// 分层：控制器不直接依赖仓库，改为依赖服务
import com.kirisamemarisa.blog.service.UserService;
import com.kirisamemarisa.blog.service.FollowService;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 关注相关接口：兼容未登录测试（通过 X-User-Id 头传当前用户ID）。
 */
@RestController
@RequestMapping("/api/follow")
public class FollowController {
    private static final Logger logger = LoggerFactory.getLogger(FollowController.class);

    private final UserService userService;
    private final FollowService followService;
    private final UserProfileRepository userProfileRepository;

    public FollowController(UserService userService, FollowService followService,
            UserProfileRepository userProfileRepository) {
        this.userService = userService;
        this.followService = followService;
        this.userProfileRepository = userProfileRepository;
    }

    private User resolveCurrentUser(UserDetails principal, Long headerUserId) {
        if (principal != null) {
            return userService.getUserByUsername(principal.getUsername());
        }
        if (headerUserId != null) {
            return userService.getUserById(headerUserId);
        }
        return null;
    }

    @PostMapping("/{targetId}")
    public ApiResponse<Void> follow(@PathVariable Long targetId,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {
        User me = resolveCurrentUser(principal, headerUserId);
        if (me == null) {
            return new ApiResponse<>(401, "未认证", null);
        }
        User target = userService.getUserById(targetId);
        if (target == null) {
            return new ApiResponse<>(404, "目标用户不存在", null);
        }
        if (me.getId().equals(targetId)) {
            return new ApiResponse<>(400, "不能关注自己", null);
        }
        if (followService.isFollowing(me, target)) {
            return new ApiResponse<>(200, "已关注，无需重复操作", null);
        }
        followService.follow(me, target);
        return new ApiResponse<>(200, "关注成功", null);
    }

    @DeleteMapping("/{targetId}")
    public ApiResponse<Void> unfollow(@PathVariable Long targetId,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {
        User me = resolveCurrentUser(principal, headerUserId);
        if (me == null) {
            return new ApiResponse<>(401, "未认证", null);
        }
        User target = userService.getUserById(targetId);
        if (target == null) {
            return new ApiResponse<>(404, "目标用户不存在", null);
        }
        if (!followService.isFollowing(me, target)) {
            return new ApiResponse<>(200, "未关注，无需取关", null);
        }
        followService.unfollow(me, target);
        return new ApiResponse<>(200, "取关成功", null);
    }

    @GetMapping("/followers")
    public ApiResponse<PageResult<UserSimpleDTO>> followers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {
        User me = resolveCurrentUser(principal, headerUserId);
        if (me == null) {
            return new ApiResponse<>(401, "未认证", null);
        }
        List<Object[]> list = followService.pageFollowers(me, PageRequest.of(page, size));
        long total = followService.countFollowers(me);
        List<UserSimpleDTO> dtoList = list.stream()
                .map(arr -> UserSimpleMapper.INSTANCE.toDTO((User) arr[0], (UserProfile) arr[1]))
                .toList();
        return new ApiResponse<>(200, "获取成功", new PageResult<>(dtoList, total, page, size));
    }

    @GetMapping("/following")
    public ApiResponse<PageResult<UserSimpleDTO>> following(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {
        User me = resolveCurrentUser(principal, headerUserId);
        if (me == null) {
            return new ApiResponse<>(401, "未认证", null);
        }
        List<Object[]> list = followService.pageFollowing(me, PageRequest.of(page, size));
        long total = followService.countFollowing(me);
        List<UserSimpleDTO> dtoList = list.stream()
                .map(arr -> UserSimpleMapper.INSTANCE.toDTO((User) arr[0], (UserProfile) arr[1]))
                .toList();
        return new ApiResponse<>(200, "获取成功", new PageResult<>(dtoList, total, page, size));
    }

    // 移除好友相关接口：好友不再由互关推导
}
