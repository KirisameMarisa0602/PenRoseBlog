package com.kirisamemarisa.blog.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.CommentCreateDTO;
import com.kirisamemarisa.blog.dto.CommentDTO;
import com.kirisamemarisa.blog.dto.PageResult;
import com.kirisamemarisa.blog.service.CommentService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/comment")
public class CommentController {
    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @PostMapping
    public ApiResponse<Long> addComment(@RequestBody CommentCreateDTO dto) {
        return commentService.addComment(dto);
    }

    @GetMapping("/list/{blogPostId}")
    public ApiResponse<PageResult<CommentDTO>> listComments(@PathVariable Long blogPostId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Long currentUserId) {
        PageResult<CommentDTO> result = commentService.pageComments(blogPostId, page, size, currentUserId);
        return new ApiResponse<>(200, "获取成功", result);
    }

    @DeleteMapping("/{commentId}")
    public ApiResponse<Boolean> deleteComment(@PathVariable Long commentId, @AuthenticationPrincipal Object principal) {
        Long userId = null;
        if (principal instanceof Long) {
            userId = (Long) principal;
        } else if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            // Handle UserDetails if needed, or just rely on ID
        }
        if (userId == null)
            return new ApiResponse<>(401, "未认证", false);
        return commentService.deleteComment(commentId, userId);
    }

    @PostMapping("/{commentId}/like")
    public ApiResponse<Boolean> toggleLike(@PathVariable Long commentId, @AuthenticationPrincipal Object principal) {
        Long userId = null;
        if (principal instanceof Long) {
            userId = (Long) principal;
        }
        if (userId == null)
            return new ApiResponse<>(401, "未认证", false);
        return commentService.toggleLike(commentId, userId);
    }

    @GetMapping("/{commentId}")
    public ApiResponse<CommentDTO> getComment(@PathVariable Long commentId) {
        CommentDTO dto = commentService.getCommentById(commentId);
        if (dto == null) {
            return new ApiResponse<>(404, "评论不存在", null);
        }
        return new ApiResponse<>(200, "获取成功", dto);
    }
}
