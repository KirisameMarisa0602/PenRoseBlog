package com.kirisamemarisa.blog.service;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.*;
import com.kirisamemarisa.blog.dto.PageResult;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface BlogPostService {
        ApiResponse<Long> create(BlogPostCreateDTO dto);

        BlogPostDTO getById(Long id, Long currentUserId);

        ApiResponse<Boolean> update(Long id, BlogPostUpdateDTO dto);

        ApiResponse<Boolean> toggleLike(Long blogPostId, Long userId);

        ApiResponse<Boolean> toggleFavorite(Long blogPostId, Long userId);

        ApiResponse<Boolean> toggleCommentLike(Long commentId, Long userId);

        ApiResponse<Long> addComment(CommentCreateDTO dto);

        List<CommentDTO> listComments(Long blogPostId, Long currentUserId);

        List<BlogPostDTO> list(int page, int size, Long currentUserId);

        PageResult<BlogPostDTO> pageList(int page, int size, Long currentUserId);

        // 搜索文章
        PageResult<BlogPostDTO> search(String keyword, Long userId, String directory, String categoryName, String status, int page,
                        int size,
                        Long currentUserId);

        // 获取用户目录列表
        List<String> getUserDirectories(Long userId);

        PageResult<CommentDTO> pageComments(Long blogPostId, int page, int size, Long currentUserId);

        ApiResponse<Long> createWithCover(String title, String content, Long userId, String directory,
                        String categoryName,
                        List<String> tags, String status, MultipartFile cover);

        ApiResponse<Boolean> updateWithCover(Long id, String content, String directory, String categoryName,
                        List<String> tags, String status, MultipartFile cover);

        // 新增：删除博客接口（只能作者删除）
        ApiResponse<Boolean> delete(Long blogPostId, Long userId);

        ApiResponse<Boolean> share(Long blogPostId);

        // 获取用户收藏的文章
        PageResult<BlogPostDTO> getFavorites(Long userId, String categoryName, int page, int size);

        // 获取用户收藏文章的分类列表
        List<String> getFavoriteCategories(Long userId);
}