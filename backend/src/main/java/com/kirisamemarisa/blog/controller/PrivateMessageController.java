package com.kirisamemarisa.blog.controller;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.PageResult;
import com.kirisamemarisa.blog.dto.PrivateMessageDTO;
import com.kirisamemarisa.blog.events.MessageEventPublisher;
import com.kirisamemarisa.blog.model.PrivateMessage;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.service.PrivateMessageService;
import com.kirisamemarisa.blog.service.UserService;
import com.kirisamemarisa.blog.dto.PrivateMessageOperationDTO;
import com.kirisamemarisa.blog.dto.ConversationSummaryDTO;
import com.kirisamemarisa.blog.service.PrivateMessageDtoService;

import java.util.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    private final MessageEventPublisher publisher;
    private final FileStorageService fileStorageService;
    private final CurrentUserResolver currentUserResolver;
    private final PrivateMessageDtoService privateMessageDtoService;

    public PrivateMessageController(UserService userService,
            PrivateMessageService privateMessageService,
            MessageEventPublisher publisher,
            FileStorageService fileStorageService,
            CurrentUserResolver currentUserResolver,
            PrivateMessageDtoService privateMessageDtoService) {
        this.userService = userService;
        this.privateMessageService = privateMessageService;
        this.publisher = publisher;
        this.fileStorageService = fileStorageService;
        this.currentUserResolver = currentUserResolver;
        this.privateMessageDtoService = privateMessageDtoService;
    }

    private User resolveCurrent(Object principal) {
        return currentUserResolver.resolve(principal);
    }

    @PostMapping("/recall/{id}")
    public ApiResponse<Boolean> recallMessage(@PathVariable Long id,
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrent(principal);
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
            @AuthenticationPrincipal Object principal) {
        if (body == null || body.getMessageId() == null) {
            return new ApiResponse<>(400, "messageId不能为空", false);
        }
        return recallMessage(body.getMessageId(), principal);
    }

    @PostMapping("/delete/{id}")
    public ApiResponse<Boolean> deleteMessage(@PathVariable Long id,
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrent(principal);
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
            @AuthenticationPrincipal Object principal) {
        if (body == null || body.getMessageId() == null) {
            return new ApiResponse<>(400, "messageId不能为空", false);
        }
        return deleteMessage(body.getMessageId(), principal);
    }

    @GetMapping(value = "/subscribe/{otherId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeConversation(@PathVariable Long otherId,
            @RequestParam("userId") Long userId,
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrent(principal);
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
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrent(principal);
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
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrent(principal);
        if (me == null)
            return new ApiResponse<>(401, "未认证", null);

        PageResult<ConversationSummaryDTO> page = privateMessageDtoService.buildConversationSummaryPage(me);
        return new ApiResponse<>(200, "OK", page);
    }

    @GetMapping("/unread/total")
    public ApiResponse<Long> unreadTotal(
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrent(principal);
        if (me == null)
            return new ApiResponse<>(401, "未认证", null);
        long total = privateMessageService.countUnreadTotal(me.getId());
        return new ApiResponse<>(200, "OK", total);
    }

    @PostMapping("/conversation/{otherId}/read")
    @Transactional
    public ApiResponse<Integer> markRead(@PathVariable Long otherId,
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrent(principal);
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
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrent(principal);
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
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrent(principal);
        if (me == null)
            return new ApiResponse<>(401, "未认证", null);

        User other = userService.getUserById(otherId);
        if (other == null)
            return new ApiResponse<>(404, "用户不存在", null);

        try {
            PrivateMessage msg = privateMessageService.sendText(me, other, body.getText());
            PrivateMessageDTO dto = privateMessageDtoService.toDtoSingle(msg);
            sendPmNotification(msg);
            return new ApiResponse<>(200, "发送成功", dto);
        } catch (IllegalStateException ex) {
            return new ApiResponse<>(400, ex.getMessage(), null);
        }
    }

    @PostMapping("/media/{otherId}")
    public ApiResponse<PrivateMessageDTO> sendMedia(@PathVariable Long otherId,
            @RequestBody PrivateMessageDTO body,
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrent(principal);
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
            return new ApiResponse<>(200, "发送成功", dto);
        } catch (IllegalStateException ex) {
            return new ApiResponse<>(400, ex.getMessage(), null);
        }
    }

    @PostMapping("/upload")
    public ApiResponse<String> uploadMessageMedia(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "otherId", required = false) Long otherId,
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrent(principal);
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

    @GetMapping("/presigned-url")
    public ApiResponse<Map<String, String>> getMessagePresignedUrl(
            @RequestParam("fileName") String fileName,
            @RequestParam("otherId") Long otherId,
            @AuthenticationPrincipal Object principal) {
        User me = resolveCurrent(principal);
        if (me == null)
            return new ApiResponse<>(401, "未认证", null);

        // 简单校验文件类型
        boolean isVideo = fileName != null && (fileName.toLowerCase().endsWith(".mp4") ||
                fileName.toLowerCase().endsWith(".mov") ||
                fileName.toLowerCase().endsWith(".avi") ||
                fileName.toLowerCase().endsWith(".webm") ||
                fileName.toLowerCase().endsWith(".mkv"));

        return new ApiResponse<>(200, "获取成功",
                fileStorageService.generateMessagePresignedUrl(fileName, me.getId(), otherId));
    }
}
