package com.kirisamemarisa.blog.controller;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.service.CurrentUserResolver;
import com.kirisamemarisa.blog.service.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/file")
public class FileController {

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private CurrentUserResolver currentUserResolver;

    @GetMapping("/presigned-url")
    public ApiResponse<Map<String, String>> getPresignedUrl(
            @RequestParam String fileName,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {

        User me = currentUserResolver.resolve(principal, headerUserId);
        Long userId = me != null ? me.getId() : null;

        return ApiResponse.success(fileStorageService.generatePresignedUrl(fileName, userId));
    }

    @GetMapping("/presigned-message-url")
    public ApiResponse<Map<String, String>> getMessagePresignedUrl(
            @RequestParam String fileName,
            @RequestParam Long otherId,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId,
            @AuthenticationPrincipal UserDetails principal) {

        User me = currentUserResolver.resolve(principal, headerUserId);
        if (me == null) {
            return new ApiResponse<>(401, "未登录", null);
        }

        return ApiResponse.success(fileStorageService.generateMessagePresignedUrl(fileName, me.getId(), otherId));
    }
}
