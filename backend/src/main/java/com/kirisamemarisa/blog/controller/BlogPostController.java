package com.kirisamemarisa.blog.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.*;
import com.kirisamemarisa.blog.service.BlogPostService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.kirisamemarisa.blog.service.FileStorageService;
import com.kirisamemarisa.blog.service.UserService;

@RestController
@RequestMapping("/api/blogpost")
public class BlogPostController {
    private static final Logger logger = LoggerFactory.getLogger(BlogPostController.class);

    private final BlogPostService blogPostService;
    private final FileStorageService fileStorageService;
    private final UserService userService;

    public BlogPostController(BlogPostService blogPostService, FileStorageService fileStorageService,
            UserService userService) {
        this.blogPostService = blogPostService;
        this.fileStorageService = fileStorageService;
        this.userService = userService;
    }

    @PostMapping
    public ApiResponse<Long> create(@RequestBody BlogPostCreateDTO dto) {
        return blogPostService.create(dto);
    }

    @GetMapping("/{id}")
    public ApiResponse<BlogPostDTO> get(@PathVariable Long id,
            @RequestParam(required = false) Long currentUserId) {
        BlogPostDTO dto = blogPostService.getById(id, currentUserId);
        if (dto == null) {
            return new ApiResponse<>(404, "博客不存在", null);
        }
        return new ApiResponse<>(200, "获取成功", dto);
    }

    @GetMapping
    public ApiResponse<PageResult<BlogPostDTO>> list(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String directory,
            @RequestParam(required = false) String categoryName,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long currentUserId) {
        PageResult<BlogPostDTO> result = blogPostService.search(keyword, userId, directory, categoryName, status, page,
                size,
                currentUserId);
        return new ApiResponse<>(200, "获取成功", result);
    }

    @GetMapping("/directories")
    public ApiResponse<java.util.List<String>> getDirectories(@RequestParam Long userId) {
        return new ApiResponse<>(200, "获取成功", blogPostService.getUserDirectories(userId));
    }

    @GetMapping("/favorites")
    public ApiResponse<PageResult<BlogPostDTO>> getFavorites(@RequestParam Long userId,
            @RequestParam(required = false) String categoryName,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageResult<BlogPostDTO> result = blogPostService.getFavorites(userId, categoryName, page, size);
        return new ApiResponse<>(200, "获取成功", result);
    }

    @GetMapping("/favorites/categories")
    public ApiResponse<java.util.List<String>> getFavoriteCategories(@RequestParam Long userId) {
        return new ApiResponse<>(200, "获取成功", blogPostService.getFavoriteCategories(userId));
    }

    @PostMapping("/{id}/like")
    public ApiResponse<Boolean> toggleLike(@PathVariable Long id,
            @RequestParam Long userId) {
        return blogPostService.toggleLike(id, userId);
    }

    @PostMapping("/{id}/favorite")
    public ApiResponse<Boolean> toggleFavorite(@PathVariable Long id,
            @RequestParam Long userId) {
        return blogPostService.toggleFavorite(id, userId);
    }

    @PostMapping("/{id}/share")
    public ApiResponse<Boolean> share(@PathVariable Long id) {
        return blogPostService.share(id);
    }

    @PostMapping("/comment")
    public ApiResponse<Long> comment(@RequestBody CommentCreateDTO dto) {
        return blogPostService.addComment(dto);
    }

    @GetMapping("/{id}/comments")
    public ApiResponse<PageResult<CommentDTO>> comments(@PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Long currentUserId) {
        PageResult<CommentDTO> result = blogPostService.pageComments(id, page, size, currentUserId);
        return new ApiResponse<>(200, "获取成功", result);
    }

    @PostMapping("/comment/{id}/like")
    public ApiResponse<Boolean> toggleCommentLike(@PathVariable Long id,
            @RequestParam Long userId) {
        return blogPostService.toggleCommentLike(id, userId);
    }

    @PutMapping("/{id}")
    public ApiResponse<Boolean> update(@PathVariable Long id, @RequestBody BlogPostUpdateDTO dto) {
        return blogPostService.update(id, dto);
    }

    @PostMapping("/withcover")
    public ApiResponse<Long> createWithCover(@RequestParam("title") String title,
            @RequestParam("content") String content,
            @RequestParam("userId") Long userId,
            @RequestParam(value = "directory", required = false) String directory,
            @RequestParam(value = "categoryName", required = false) String categoryName,
            @RequestParam(value = "tags", required = false) java.util.List<String> tags,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "cover", required = false) MultipartFile cover) {
        return blogPostService.createWithCover(title, content, userId, directory, categoryName, tags, status, cover);
    }

    @PostMapping("/{id}/withcover")
    public ApiResponse<Boolean> updateWithCover(@PathVariable Long id,
            @RequestParam(value = "content", required = false) String content,
            @RequestParam(value = "directory", required = false) String directory,
            @RequestParam(value = "categoryName", required = false) String categoryName,
            @RequestParam(value = "tags", required = false) java.util.List<String> tags,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "cover", required = false) MultipartFile cover,
            @RequestParam(value = "removeCover", required = false) Boolean removeCover) {
        return blogPostService.updateWithCover(id, content, directory, categoryName, tags, status, cover, removeCover);
    }

    // 新增：删除博客接口
    // 前端调用示例：DELETE /api/blogpost/{id}?userId=当前用户ID
    @DeleteMapping("/{id}")
    public ApiResponse<Boolean> delete(@PathVariable Long id, @RequestParam Long userId) {
        return blogPostService.delete(id, userId);
    }

    /**
     * 获取 COS 预签名上传 URL (用于前端直传大文件)
     */
    @GetMapping("/presigned-url")
    public ApiResponse<java.util.Map<String, String>> getPresignedUrl(
            @RequestParam("fileName") String fileName,
            @RequestParam(value = "userId", required = false) Long userId) {
        // 检查是否为视频文件
        boolean isVideo = fileName != null && (fileName.toLowerCase().endsWith(".mp4") ||
                fileName.toLowerCase().endsWith(".mov") ||
                fileName.toLowerCase().endsWith(".avi") ||
                fileName.toLowerCase().endsWith(".webm") ||
                fileName.toLowerCase().endsWith(".mkv"));

        if (isVideo) {
            if (userId == null || !userService.isVip(userId)) {
                return new ApiResponse<>(403, "只有VIP用户可以上传视频", null);
            }
        }
        return new ApiResponse<>(200, "获取成功", fileStorageService.generatePresignedUrl(fileName, userId));
    }

    /**
     * 上传媒体文件（图片 / gif / video）供编辑器内使用，返回可访问的 URL
     * 返回格式：ApiResponse<String>，data 为 url（以 /sources/... 开头）
     */
    @PostMapping("/media")
    public ApiResponse<String> uploadMedia(@RequestParam("file") MultipartFile file,
            @RequestParam(value = "userId", required = false) Long userId) {
        // 检查是否为视频文件
        String contentType = file.getContentType();
        if (contentType != null && contentType.startsWith("video/")) {
            if (userId == null || !userService.isVip(userId)) {
                return new ApiResponse<>(403, "只有VIP用户可以上传视频", null);
            }
        }

        try {
            String url = fileStorageService.storeBlogMedia(file, userId);
            return new ApiResponse<>(200, "上传成功", url);
        } catch (com.kirisamemarisa.blog.common.BusinessException e) {
            return new ApiResponse<>(e.getCode(), e.getMessage(), null);
        }
    }
}