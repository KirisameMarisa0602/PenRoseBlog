package com.kirisamemarisa.blog.controller;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.repository.UserRepository;
import com.kirisamemarisa.blog.service.BlockService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/block")
public class BlockController {

    private final UserRepository userRepository;
    private final BlockService blockService;

    public BlockController(UserRepository userRepository, BlockService blockService) {
        this.userRepository = userRepository;
        this.blockService = blockService;
    }

    private User resolveCurrent(UserDetails principal, Long headerUserId) {
        if (principal != null)
            return userRepository.findByUsername(principal.getUsername());
        if (headerUserId != null)
            return userRepository.findById(headerUserId).orElse(null);
        return null;
    }

    @PostMapping("/toggle/{targetId}")
    public ApiResponse<Boolean> toggleBlock(@PathVariable Long targetId,
                                            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
                                            @AuthenticationPrincipal UserDetails principal) {

        User me = resolveCurrent(principal, headerUserId);
        if (me == null) return new ApiResponse<>(401, "未认证", null);

        User target = userRepository.findById(targetId).orElse(null);
        if (target == null) return new ApiResponse<>(404, "用户不存在", null);

        boolean nowBlocked;
        if (blockService.isBlocked(me, target)) {
            // 已拉黑 -> 取消拉黑
            blockService.unblock(me, target);
            nowBlocked = false;
        } else {
            // 未拉黑 -> 拉黑
            blockService.block(me, target);
            nowBlocked = true;
        }

        return new ApiResponse<>(200, nowBlocked ? "已拉黑该用户" : "已取消拉黑", nowBlocked);
    }

    @GetMapping("/status/{targetId}")
    public ApiResponse<Boolean> blockStatus(@PathVariable Long targetId,
                                            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
                                            @AuthenticationPrincipal UserDetails principal) {

        User me = resolveCurrent(principal, headerUserId);
        if (me == null) return new ApiResponse<>(401, "未认证", null);

        User target = userRepository.findById(targetId).orElse(null);
        if (target == null) return new ApiResponse<>(404, "用户不存在", null);

        boolean blocked = blockService.isBlocked(me, target);
        return new ApiResponse<>(200, "OK", blocked);
    }
}