package com.kirisamemarisa.blog.controller;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.PageResult;
import com.kirisamemarisa.blog.dto.PrivateMessageDTO;
import com.kirisamemarisa.blog.events.MessageEventPublisher;
import com.kirisamemarisa.blog.model.PrivateMessage;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.model.UserProfile;
import com.kirisamemarisa.blog.service.PrivateMessageService;
// 分层：控制器避免直接依赖仓库
import com.kirisamemarisa.blog.repository.PrivateMessageRepository;
import com.kirisamemarisa.blog.service.UserService;
import com.kirisamemarisa.blog.dto.PrivateMessageOperationDTO;
import com.kirisamemarisa.blog.dto.ConversationSummaryDTO;
import com.kirisamemarisa.blog.repository.UserProfileRepository;
import com.kirisamemarisa.blog.service.NotificationService;
import com.kirisamemarisa.blog.dto.NotificationDTO;
import com.kirisamemarisa.blog.service.BlogUrlPreviewService;
import com.kirisamemarisa.blog.service.PrivateMessageDtoService;

import java.util.*;
import java.util.stream.Collectors;
import java.io.IOException;
import java.time.Instant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.kirisamemarisa.blog.service.FileStorageService;
import com.kirisamemarisa.blog.service.CurrentUserResolver;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/messages")
public class PrivateMessageController {
    private final UserService userService;
    private final PrivateMessageService privateMessageService;
    private final PrivateMessageRepository privateMessageRepository;
    private final MessageEventPublisher publisher;
    private final UserProfileRepository userProfileRepository;
    private final NotificationService notificationService;
    private final BlogUrlPreviewService blogUrlPreviewService;
    private final FileStorageService fileStorageService;
    private final CurrentUserResolver currentUserResolver;
    private final PrivateMessageDtoService privateMessageDtoService;

    public PrivateMessageController(UserService userService,
            PrivateMessageService privateMessageService,
            PrivateMessageRepository privateMessageRepository,
            MessageEventPublisher publisher,
            UserProfileRepository userProfileRepository,
            NotificationService notificationService,
            BlogUrlPreviewService blogUrlPreviewService,
            FileStorageService fileStorageService,
            CurrentUserResolver currentUserResolver,
            PrivateMessageDtoService privateMessageDtoService) {
        this.userService = userService;
        this.privateMessageService = privateMessageService;
        this.privateMessageRepository = privateMessageRepository;
        this.publisher = publisher;
        this.userProfileRepository = userProfileRepository;
        this.notificationService = notificationService;
        this.blogUrlPreviewService = blogUrlPreviewService;
        this.fileStorageService = fileStorageService;
        this.currentUserResolver = currentUserResolver;
        this.privateMessageDtoService = privateMessageDtoService;
    }

    private User resolveCurrent(UserDetails principal, Long headerUserId) {
        return currentUserResolver.resolve(principal, headerUserId);
    }

    // DTO 转换、会话摘要与通知逻辑已下沉到 PrivateMessageDtoService

    /**
     * SSE 订阅接口
     * 前端：/api/messages/subscribe/{otherId}?userId={当前用户ID}&_={timestamp}
     */
    @PostMapping("/recall/{id}")
    public ApiResponse<Boolean> recallMessage(@PathVariable Long id,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {
        User me = resolveCurrent(principal, headerUserId);
        if (me == null) {
            return new ApiResponse<>(401, "未登录", false);
        }
        try {
            privateMessageService.revokeMessage(id, me.getId());
            return new ApiResponse<>(200, "撤回成功", true);
        } catch (Exception e) {
            return new ApiResponse<>(400, e.getMessage(), false);
        }
    }

    @PostMapping("/recall")
    public ApiResponse<Boolean> recallMessageBody(@RequestBody PrivateMessageOperationDTO body,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {
        if (body == null || body.getMessageId() == null) {
            return new ApiResponse<>(400, "messageId不能为空", false);
        }
        return recallMessage(body.getMessageId(), headerUserId, principal);
    }

    @PostMapping("/delete/{id}")
    public ApiResponse<Boolean> deleteMessage(@PathVariable Long id,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {
        User me = resolveCurrent(principal, headerUserId);
        if (me == null) {
            return new ApiResponse<>(401, "未登录", false);
        }
        try {
            privateMessageService.deleteMessage(id, me.getId());
            return new ApiResponse<>(200, "删除成功", true);
        } catch (Exception e) {
            return new ApiResponse<>(400, e.getMessage(), false);
        }
    }

    @PostMapping("/delete")
    public ApiResponse<Boolean> deleteMessageBody(@RequestBody PrivateMessageOperationDTO body,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {
        if (body == null || body.getMessageId() == null) {
            return new ApiResponse<>(400, "messageId不能为空", false);
        }
        return deleteMessage(body.getMessageId(), headerUserId, principal);
    }

    @GetMapping(value = "/subscribe/{otherId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeConversation(@PathVariable Long otherId,
            @RequestParam("userId") Long userId,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {
        // 简单鉴权：userId 必须等于当前登录的用户
        User me = resolveCurrent(principal, headerUserId);
        if (me == null || !Objects.equals(me.getId(), userId)) {
            SseEmitter emitter = new SseEmitter(0L);
            emitter.complete();
            return emitter;
        }

        User other = userService.getUserById(otherId);
        if (other == null) {
            SseEmitter emitter = new SseEmitter(0L);
            emitter.complete();
            return emitter;
        }

        Pageable pageable = PageRequest.of(0, 20);
        Page<PrivateMessage> pmPage = privateMessageService.conversationPage(me, other, pageable);
        List<PrivateMessageDTO> dtoList = privateMessageDtoService.buildInitialHistory(me, other, pmPage);
        return publisher.subscribe(me.getId(), other.getId(), dtoList);
    }

    @GetMapping("/conversation/{otherId}")
    public ApiResponse<PageResult<PrivateMessageDTO>> conversation(@PathVariable Long otherId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {
        User me = resolveCurrent(principal, headerUserId);
        if (me == null)
            return new ApiResponse<>(401, "未认证", null);
        User other = userService.getUserById(otherId);
        if (other == null)
            return new ApiResponse<>(404, "用户不存在", null);

        Pageable pageable = PageRequest.of(page, size);
        Page<PrivateMessage> pmPage = privateMessageService.conversationPage(me, other, pageable);
        PageResult<PrivateMessageDTO> result = privateMessageDtoService.buildConversationPage(me, other, pmPage);
        return new ApiResponse<>(200, "OK", result);
    }

    @GetMapping("/conversation/list")
    public ApiResponse<PageResult<ConversationSummaryDTO>> listConversations(
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails principal) {
        User me = resolveCurrent(principal, headerUserId);
        if (me == null)
            return new ApiResponse<>(401, "未认证", null);

        PageResult<ConversationSummaryDTO> page = privateMessageDtoService.buildConversationSummaryPage(me);
        return new ApiResponse<>(200, "OK", page);
    }

    @GetMapping("/unread/total")
    public ApiResponse<Long> unreadTotal(
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {
        User me = resolveCurrent(principal, headerUserId);
        if (me == null)
            return new ApiResponse<>(401, "未认证", null);
        long total = privateMessageService.countUnreadTotal(me.getId());
        return new ApiResponse<>(200, "OK", total);
    }

    @PostMapping("/conversation/{otherId}/read")
    @Transactional
    public ApiResponse<Integer> markRead(@PathVariable Long otherId,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {
        User me = resolveCurrent(principal, headerUserId);
        if (me == null)
            return new ApiResponse<>(401, "未认证", null);
        int updated = privateMessageService.markConversationRead(otherId, me.getId());
        return new ApiResponse<>(200, "OK", updated);
    }

    private void sendPmNotification(PrivateMessage msg) {
        privateMessageDtoService.sendPmNotification(msg);
    }

    @PostMapping
    public ApiResponse<PrivateMessageDTO> sendMessageUnified(
            @RequestBody Map<String, Object> body,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {
        User me = resolveCurrent(principal, headerUserId);
        if (me == null)
            return new ApiResponse<>(401, "未认证", null);

        Long receiverId = body.get("receiverId") != null ? ((Number) body.get("receiverId")).longValue() : null;
        String content = (String) body.get("content");

        if (receiverId == null || content == null) {
            return new ApiResponse<>(400, "receiverId and content are required", null);
        }

        User other = userService.getUserById(receiverId);
        if (other == null)
            return new ApiResponse<>(404, "用户不存在", null);

        try {
            PrivateMessage msg = privateMessageService.sendText(me, other, content);
            PrivateMessageDTO dto = privateMessageDtoService.toDtoSingle(msg);
            sendPmNotification(msg);
            return new ApiResponse<>(200, "发送成功", dto);
        } catch (IllegalStateException ex) {
            return new ApiResponse<>(400, ex.getMessage(), null);
        }
    }

    @PostMapping("/text/{otherId}")
    public ApiResponse<PrivateMessageDTO> sendText(@PathVariable Long otherId,
            @RequestBody PrivateMessageDTO body,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {
        User me = resolveCurrent(principal, headerUserId);
        if (me == null)
            return new ApiResponse<>(401, "未认证", null);
        User other = userService.getUserById(otherId);
        if (other == null)
            return new ApiResponse<>(404, "用户不存在", null);

        try {
            PrivateMessage msg = privateMessageService.sendText(me, other, body.getText());
            PrivateMessageDTO dto = privateMessageDtoService.toDtoSingle(msg);

            // 系统级通知
            sendPmNotification(msg);

            // SSE broadcast is now handled in PrivateMessageServiceImpl

            return new ApiResponse<>(200, "发送成功", dto);
        } catch (IllegalStateException ex) {
            return new ApiResponse<>(400, ex.getMessage(), null);
        }
    }

    @PostMapping("/media/{otherId}")
    public ApiResponse<PrivateMessageDTO> sendMedia(@PathVariable Long otherId,
            @RequestBody PrivateMessageDTO body,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {
        User me = resolveCurrent(principal, headerUserId);
        if (me == null)
            return new ApiResponse<>(401, "未认证", null);
        User other = userService.getUserById(otherId);
        if (other == null)
            return new ApiResponse<>(404, "用户不存在", null);

        try {
            PrivateMessage msg = privateMessageService.sendMedia(me, other, body.getType(), body.getMediaUrl(),
                    body.getText());
            PrivateMessageDTO dto = privateMessageDtoService.toDtoSingle(msg);

            sendPmNotification(msg);

            // SSE broadcast is now handled in PrivateMessageServiceImpl

            return new ApiResponse<>(200, "发送成功", dto);
        } catch (IllegalStateException ex) {
            return new ApiResponse<>(400, ex.getMessage(), null);
        }
    }

    @PostMapping("/upload")
    public ApiResponse<String> uploadMessageMedia(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "otherId", required = false) Long otherId,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {

        User me = resolveCurrent(principal, headerUserId);
        if (me == null)
            return new ApiResponse<>(401, "未认证", null);
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.startsWith("image/") && !contentType.startsWith("video/"))) {
            return new ApiResponse<>(400, "仅支持图片或视频文件", null);
        }

        try {
            String url = fileStorageService.storeMessageMedia(file, me.getId(), otherId);
            return new ApiResponse<>(200, "上传成功", url);
        } catch (com.kirisamemarisa.blog.common.BusinessException e) {
            return new ApiResponse<>(e.getCode(), e.getMessage(), null);
        }
    }

    /**
     * 获取私信媒体的预签名上传 URL (加速上传)
     */
    @GetMapping("/presigned-url")
    public ApiResponse<Map<String, String>> getMessagePresignedUrl(
            @RequestParam("fileName") String fileName,
            @RequestParam("otherId") Long otherId,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {
        User me = resolveCurrent(principal, headerUserId);
        if (me == null)
            return new ApiResponse<>(401, "未认证", null);

        // 简单校验文件类型
        boolean isVideo = fileName != null && (fileName.toLowerCase().endsWith(".mp4") ||
                fileName.toLowerCase().endsWith(".mov") ||
                fileName.toLowerCase().endsWith(".avi") ||
                fileName.toLowerCase().endsWith(".webm") ||
                fileName.toLowerCase().endsWith(".mkv"));

        // 视频权限检查 (可选，保持与博客一致)
        // if (isVideo && !userService.isVip(me.getId())) { ... }

        return new ApiResponse<>(200, "获取成功",
                fileStorageService.generateMessagePresignedUrl(fileName, me.getId(), otherId));
    }
}