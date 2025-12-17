package com.kirisamemarisa.blog.controller;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.PrivateMessageDTO;
import com.kirisamemarisa.blog.events.MessageEventPublisher;
import com.kirisamemarisa.blog.model.PrivateMessage;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.service.UserService;
import com.kirisamemarisa.blog.repository.UserProfileRepository;
import com.kirisamemarisa.blog.service.PrivateMessageService;
import com.kirisamemarisa.blog.service.BlogUrlPreviewService;
import com.kirisamemarisa.blog.service.CurrentUserResolver;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 私信会话实时流 (SSE)。
 */
@RestController
@RequestMapping("/api/messages")
public class PrivateMessageStreamController {
    private final UserService userService;
    private final PrivateMessageService privateMessageService;
    private final MessageEventPublisher publisher;
    private final UserProfileRepository userProfileRepository;
    private final BlogUrlPreviewService blogUrlPreviewService;
    private final CurrentUserResolver currentUserResolver;

    public PrivateMessageStreamController(UserService userService,
            PrivateMessageService privateMessageService,
            MessageEventPublisher publisher,
            UserProfileRepository userProfileRepository,
            BlogUrlPreviewService blogUrlPreviewService,
            CurrentUserResolver currentUserResolver) {
        this.userService = userService;
        this.privateMessageService = privateMessageService;
        this.publisher = publisher;
        this.userProfileRepository = userProfileRepository;
        this.blogUrlPreviewService = blogUrlPreviewService;
        this.currentUserResolver = currentUserResolver;
    }

    private User resolveCurrent(Object principal) {
        return currentUserResolver.resolve(principal);
    }

    private PrivateMessageDTO toDTO(PrivateMessage msg) {
        PrivateMessageDTO dto = new PrivateMessageDTO();
        dto.setId(msg.getId());
        dto.setSenderId(msg.getSender().getId());
        dto.setReceiverId(msg.getReceiver().getId());
        dto.setText(msg.getText());
        dto.setMediaUrl(msg.getMediaUrl());
        dto.setType(msg.getType());
        dto.setCreatedAt(msg.getCreatedAt());
        // populate nicknames and avatar urls when available
        Long sid = msg.getSender() != null ? msg.getSender().getId() : null;
        Long rid = msg.getReceiver() != null ? msg.getReceiver().getId() : null;
        if (sid != null) {
            com.kirisamemarisa.blog.model.UserProfile sp = userProfileRepository.findById(sid).orElse(null);
            if (sp != null) {
                dto.setSenderNickname(sp.getNickname());
                dto.setSenderAvatarUrl(sp.getAvatarUrl());
            } else {
                dto.setSenderNickname(msg.getSender() != null ? msg.getSender().getUsername() : "");
                dto.setSenderAvatarUrl("");
            }
        }
        if (rid != null) {
            com.kirisamemarisa.blog.model.UserProfile rp = userProfileRepository.findById(rid).orElse(null);
            if (rp != null) {
                dto.setReceiverNickname(rp.getNickname());
                dto.setReceiverAvatarUrl(rp.getAvatarUrl());
            } else {
                dto.setReceiverNickname(msg.getReceiver() != null ? msg.getReceiver().getUsername() : "");
                dto.setReceiverAvatarUrl("");
            }
        }

        // NEW: 填充博客预览
        dto.setBlogPreview(blogUrlPreviewService.extractPreviewFromText(dto.getText()));

        return dto;
    }

    @GetMapping("/stream/{otherId}")
    public SseEmitter stream(@PathVariable Long otherId,
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrent(principal);
        if (me == null) {
            // 返回一个立即结束的 emitter（前端识别失败回退轮询）
            SseEmitter failed = new SseEmitter();
            try {
                failed.send(SseEmitter.event().name("error")
                        .data(new ApiResponse<>(401, "未认证", null)));
            } catch (Exception ignored) {
            }
            failed.complete();
            return failed;
        }
        User other = userService.getUserById(otherId);
        if (other == null) {
            SseEmitter failed = new SseEmitter();
            try {
                failed.send(SseEmitter.event().name("error")
                        .data(new ApiResponse<>(404, "用户不存在", null)));
            } catch (Exception ignored) {
            }
            failed.complete();
            return failed;
        }
        List<PrivateMessageDTO> initial = privateMessageService
                .conversation(me, other)
                .stream().map(this::toDTO).collect(Collectors.toList());
        return publisher.subscribe(me.getId(), other.getId(), initial);
    }
}
