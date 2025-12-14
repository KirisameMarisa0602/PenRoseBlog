package com.kirisamemarisa.blog.controller;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.CommentReplyCreateDTO;
import com.kirisamemarisa.blog.dto.CommentReplyDTO;
import com.kirisamemarisa.blog.dto.PageResult;
import com.kirisamemarisa.blog.service.CommentReplyService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/comment-reply")
public class CommentReplyController {

    private final CommentReplyService commentReplyService;

    public CommentReplyController(CommentReplyService commentReplyService) {
        this.commentReplyService = commentReplyService;
    }

    // 新增回复
    @PostMapping
    public ApiResponse<Long> addReply(@RequestBody CommentReplyCreateDTO dto) {
        return commentReplyService.addReply(dto);
    }

    // 分页获取某条评论下的所有回复
    @GetMapping("/list/{commentId}")
    public ApiResponse<PageResult<CommentReplyDTO>> listReplies(@PathVariable Long commentId,
                                                                @RequestParam(defaultValue = "0") int page,
                                                                @RequestParam(defaultValue = "10") int size,
                                                                @RequestParam(required = false) Long currentUserId) {
        PageResult<CommentReplyDTO> result = commentReplyService.pageReplies(commentId, page, size, currentUserId);
        return new ApiResponse<>(200, "获取成功", result);
    }

    // 删除回复（只能本人删除）
    @DeleteMapping("/{replyId}")
    public ApiResponse<Boolean> deleteReply(@PathVariable Long replyId, @RequestParam Long userId) {
        return commentReplyService.deleteReply(replyId, userId);
    }

    // 点赞 / 取消点赞
    @PostMapping("/{replyId}/like")
    public ApiResponse<Boolean> toggleLike(@PathVariable Long replyId, @RequestParam Long userId) {
        return commentReplyService.toggleLike(replyId, userId);
    }

    @GetMapping("/{replyId}")
    public ApiResponse<CommentReplyDTO> getReply(@PathVariable Long replyId) {
        CommentReplyDTO dto = commentReplyService.getReplyById(replyId);
        if (dto == null) {
            return new ApiResponse<>(404, "回复不存在", null);
        }
        return new ApiResponse<>(200, "获取成功", dto);
    }
}
