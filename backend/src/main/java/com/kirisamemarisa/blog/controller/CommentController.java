package com.kirisamemarisa.blog.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.CommentCreateDTO;
import com.kirisamemarisa.blog.dto.CommentDTO;
import com.kirisamemarisa.blog.dto.PageResult;
import com.kirisamemarisa.blog.service.CommentService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/comment")
public class CommentController {
    private static final Logger logger = LoggerFactory.getLogger(CommentController.class);
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
    public ApiResponse<Boolean> deleteComment(@PathVariable Long commentId, @RequestParam Long userId) {
        return commentService.deleteComment(commentId, userId);
    }

    @PostMapping("/{commentId}/like")
    public ApiResponse<Boolean> toggleLike(@PathVariable Long commentId, @RequestParam Long userId) {
        return commentService.toggleLike(commentId, userId);
    }
}
