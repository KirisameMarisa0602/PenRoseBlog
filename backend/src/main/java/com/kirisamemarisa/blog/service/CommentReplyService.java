package com.kirisamemarisa.blog.service;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.CommentReplyCreateDTO;
import com.kirisamemarisa.blog.dto.CommentReplyDTO;
import com.kirisamemarisa.blog.dto.PageResult;

public interface CommentReplyService {

    ApiResponse<Long> addReply(CommentReplyCreateDTO dto);

    PageResult<CommentReplyDTO> pageReplies(Long commentId, int page, int size, Long currentUserId);

    ApiResponse<Boolean> deleteReply(Long replyId, Long userId);

    ApiResponse<Boolean> toggleLike(Long replyId, Long userId);

    CommentReplyDTO getReplyById(Long replyId);
}
