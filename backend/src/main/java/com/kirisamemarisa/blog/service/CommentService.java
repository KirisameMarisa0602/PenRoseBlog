package com.kirisamemarisa.blog.service;

import com.kirisamemarisa.blog.dto.CommentCreateDTO;
import com.kirisamemarisa.blog.dto.CommentDTO;
import com.kirisamemarisa.blog.dto.PageResult;
import com.kirisamemarisa.blog.common.ApiResponse;
import java.util.List;

public interface CommentService {
    ApiResponse<Long> addComment(CommentCreateDTO dto);
    List<CommentDTO> listComments(Long blogPostId, Long currentUserId);
    ApiResponse<Boolean> deleteComment(Long commentId, Long userId);
    ApiResponse<Boolean> toggleLike(Long commentId, Long userId);
    PageResult<CommentDTO> pageComments(Long blogPostId, int page, int size, Long currentUserId);
}
