package com.kirisamemarisa.blog.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.*;
import com.kirisamemarisa.blog.model.*;
import com.kirisamemarisa.blog.repository.*;
import com.kirisamemarisa.blog.service.BlogPostService;
import com.kirisamemarisa.blog.service.BlogViewService;
import com.kirisamemarisa.blog.service.FileStorageService;
import com.kirisamemarisa.blog.mapper.BlogPostMapper;
import com.kirisamemarisa.blog.service.CommentService;
import com.kirisamemarisa.blog.service.NotificationService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.List;
import com.kirisamemarisa.blog.dto.PageResult;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;
import java.util.stream.Collectors;

@Service
public class BlogPostServiceImpl implements BlogPostService {
    private static final Logger logger = LoggerFactory.getLogger(BlogPostServiceImpl.class);
    private final BlogPostRepository blogPostRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final BlogPostLikeRepository blogPostLikeRepository;
    private final BlogPostFavoriteRepository blogPostFavoriteRepository;
    private final BlogPostShareRepository blogPostShareRepository; // Added
    private final CommentLikeRepository commentLikeRepository;
    private final CommentReplyRepository commentReplyRepository;
    private final CommentReplyLikeRepository commentReplyLikeRepository;
    private final UserProfileRepository userProfileRepository;
    private final BlogPostMapper blogpostMapper;
    private final CommentService commentService;
    private final NotificationService notificationService;
    private final BlogViewService blogViewService; // 新增：浏览相关服务
    private final TagRepository tagRepository;
    private final CategoryRepository categoryRepository;
    private final FileStorageService fileStorageService;

    public BlogPostServiceImpl(BlogPostRepository blogPostRepository,
            UserRepository userRepository,
            CommentRepository commentRepository,
            BlogPostLikeRepository blogPostLikeRepository,
            BlogPostFavoriteRepository blogPostFavoriteRepository,
            BlogPostShareRepository blogPostShareRepository, // Added
            CommentLikeRepository commentLikeRepository,
            CommentReplyRepository commentReplyRepository,
            CommentReplyLikeRepository commentReplyLikeRepository,
            UserProfileRepository userProfileRepository,
            CommentService commentService,
            NotificationService notificationService,
            BlogViewService blogViewService,
            TagRepository tagRepository,
            CategoryRepository categoryRepository,
            BlogPostMapper blogpostMapper,
            FileStorageService fileStorageService) {
        this.blogPostRepository = blogPostRepository;
        this.userRepository = userRepository;
        this.commentRepository = commentRepository;
        this.blogPostLikeRepository = blogPostLikeRepository;
        this.blogPostFavoriteRepository = blogPostFavoriteRepository;
        this.blogPostShareRepository = blogPostShareRepository; // Added
        this.commentLikeRepository = commentLikeRepository;
        this.commentReplyRepository = commentReplyRepository;
        this.commentReplyLikeRepository = commentReplyLikeRepository;
        this.userProfileRepository = userProfileRepository;
        this.commentService = commentService;
        this.notificationService = notificationService;
        this.blogViewService = blogViewService;
        this.tagRepository = tagRepository;
        this.categoryRepository = categoryRepository;
        this.blogpostMapper = blogpostMapper;
        this.fileStorageService = fileStorageService;
    }

    @Override
    @Transactional
    public ApiResponse<Long> create(BlogPostCreateDTO dto) {
        if (dto == null)
            return new ApiResponse<>(400, "请求体不能为空", null);
        if (dto.getTitle() == null || dto.getTitle().trim().isEmpty())
            return new ApiResponse<>(400, "标题不能为空", null);
        if (dto.getContent() == null || dto.getContent().trim().isEmpty())
            return new ApiResponse<>(400, "正文不能为空", null);
        if (dto.getUserId() == null)
            return new ApiResponse<>(400, "用户ID不能为空", null);
        Optional<User> userOpt = userRepository.findById(dto.getUserId());
        if (userOpt.isEmpty())
            return new ApiResponse<>(404, "用户不存在", null);

        BlogPost post = new BlogPost();
        post.setTitle(dto.getTitle().trim());
        post.setContent(dto.getContent().trim());
        post.setCoverImageUrl(dto.getCoverImageUrl());
        post.setDirectory(dto.getDirectory());
        post.setUser(userOpt.get());
        post.setRepost(false);
        if (dto.getStatus() != null) {
            post.setStatus(dto.getStatus());
        } else {
            post.setStatus("PUBLISHED");
        }
        BlogPost saved = blogPostRepository.save(post);
        return new ApiResponse<>(200, "创建成功", saved.getId());
    }

    @Override
    @Transactional
    public BlogPostDTO getById(Long id, Long currentUserId) {
        Optional<BlogPost> opt = blogPostRepository.findById(id);
        if (opt.isEmpty())
            return null;

        BlogPost post = opt.get();
        // load author profile (may be absent)
        UserProfile profile = userProfileRepository.findById(post.getUser().getId()).orElse(null);
        BlogPostDTO dto = blogpostMapper.toDTOWithProfile(post, profile);

        if (dto != null) {
            // Set user interaction flags
            if (currentUserId != null) {
                boolean liked = blogPostLikeRepository.findByBlogPostIdAndUserId(id, currentUserId).isPresent();
                dto.setLikedByCurrentUser(liked);
                boolean favorited = blogPostFavoriteRepository.findByUserIdAndBlogPostId(currentUserId, id).isPresent();
                dto.setFavoritedByCurrentUser(favorited);
            }

            // Get and set view count
            setViewCount(dto, id);
        }
        return dto;
    }

    @Override
    @Transactional
    public ApiResponse<Boolean> update(Long id, BlogPostUpdateDTO dto) {
        if (dto == null)
            return new ApiResponse<>(400, "请求体不能为空", false);
        Optional<BlogPost> opt = blogPostRepository.findById(id);
        if (opt.isEmpty())
            return new ApiResponse<>(404, "博客不存在", false);
        BlogPost post = opt.get();
        // 支持cover字段兼容
        if (dto.getCoverImageUrl() != null)
            post.setCoverImageUrl(dto.getCoverImageUrl());
        // 兼容前端传cover字段
        try {
            java.lang.reflect.Field coverField = dto.getClass().getDeclaredField("cover");
            coverField.setAccessible(true);
            Object coverValue = coverField.get(dto);
            if (coverValue instanceof String && !((String) coverValue).isEmpty()) {
                post.setCoverImageUrl((String) coverValue);
            }
        } catch (Exception ignored) {
        }
        if (dto.getContent() != null && !dto.getContent().trim().isEmpty())
            post.setContent(dto.getContent().trim());
        if (dto.getDirectory() != null)
            post.setDirectory(dto.getDirectory());
        if (dto.getStatus() != null) {
            post.setStatus(dto.getStatus());
        }
        // 支持后续字段扩展
        blogpostMapper.updateEntityFromDTO(dto, post);
        blogPostRepository.save(post);
        return new ApiResponse<>(200, "更新成功", true);
    }

    @Override
    @Transactional
    public ApiResponse<Boolean> toggleFavorite(Long blogPostId, Long userId) {
        if (blogPostId == null || userId == null)
            return new ApiResponse<>(400, "参数缺失", false);
        Optional<BlogPost> postOpt = blogPostRepository.findById(blogPostId);
        if (postOpt.isEmpty())
            return new ApiResponse<>(404, "博客不存在", false);
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty())
            return new ApiResponse<>(404, "用户不存在", false);

        BlogPost post = postOpt.get();
        Optional<BlogPostFavorite> favOpt = blogPostFavoriteRepository.findByUserIdAndBlogPostId(userId, blogPostId);
        if (favOpt.isPresent()) {
            blogPostFavoriteRepository.delete(favOpt.get());
            post.setFavoriteCount(safeLong(post.getFavoriteCount()) - 1);
            blogPostRepository.save(post);
            return new ApiResponse<>(200, "已取消收藏", false);
        } else {
            BlogPostFavorite fav = new BlogPostFavorite();
            fav.setBlogPost(post);
            fav.setUser(userOpt.get());
            blogPostFavoriteRepository.save(fav);
            post.setFavoriteCount(safeLong(post.getFavoriteCount()) + 1);
            blogPostRepository.save(post);

            // 文章被收藏通知
            try {
                if (notificationService != null && post.getUser() != null) {
                    Long ownerId = post.getUser().getId();
                    Long likerId = userOpt.get().getId();
                    // 自己给自己收藏不通知
                    if (ownerId != null && !ownerId.equals(likerId)) {
                        NotificationDTO dto = new NotificationDTO();
                        dto.setType("POST_FAVORITE");
                        dto.setSenderId(likerId);
                        dto.setReceiverId(ownerId);
                        dto.setMessage("你的文章《" + safeTitle(post.getTitle()) + "》被收藏了");
                        dto.setCreatedAt(Instant.now());
                        dto.setReferenceId(post.getId()); // 文章ID

                        // 填充发送者信息
                        UserProfile up = userProfileRepository.findById(likerId).orElse(null);
                        String nickname = (up != null && up.getNickname() != null) ? up.getNickname()
                                : userOpt.get().getUsername();
                        String avatar = (up != null) ? up.getAvatarUrl() : null;
                        dto.setSenderNickname(nickname);
                        dto.setSenderAvatarUrl(avatar);

                        notificationService.sendNotification(ownerId, dto);
                    }
                }
            } catch (Exception ignored) {
            }

            return new ApiResponse<>(200, "收藏成功", true);
        }
    }

    @Override
    @Transactional
    public ApiResponse<Boolean> toggleLike(Long blogPostId, Long userId) {
        if (blogPostId == null || userId == null)
            return new ApiResponse<>(400, "参数缺失", false);
        Optional<BlogPost> postOpt = blogPostRepository.findById(blogPostId);
        if (postOpt.isEmpty())
            return new ApiResponse<>(404, "博客不存在", false);
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty())
            return new ApiResponse<>(404, "用户不存在", false);

        BlogPost post = postOpt.get();
        Optional<BlogPostLike> likeOpt = blogPostLikeRepository.findByBlogPostIdAndUserId(blogPostId, userId);
        if (likeOpt.isPresent()) {
            blogPostLikeRepository.delete(likeOpt.get());
            post.setLikeCount(safeLong(post.getLikeCount()) - 1);
            blogPostRepository.save(post);
            return new ApiResponse<>(200, "已取消点赞", false);
        } else {
            BlogPostLike like = new BlogPostLike();
            like.setBlogPost(post);
            like.setUser(userOpt.get());
            blogPostLikeRepository.save(like);
            post.setLikeCount(safeLong(post.getLikeCount()) + 1);
            blogPostRepository.save(post);

            // 文章被点赞通知
            try {
                if (notificationService != null && post.getUser() != null) {
                    Long ownerId = post.getUser().getId();
                    Long likerId = userOpt.get().getId();
                    // 自己给自己点赞不通知
                    if (ownerId != null && !ownerId.equals(likerId)) {
                        NotificationDTO dto = new NotificationDTO();
                        dto.setType("POST_LIKE");
                        dto.setSenderId(likerId);
                        dto.setReceiverId(ownerId);
                        dto.setMessage("你的文章《" + safeTitle(post.getTitle()) + "》收到了一个点赞");
                        dto.setCreatedAt(Instant.now());
                        dto.setReferenceId(post.getId()); // 文章ID

                        // 填充发送者信息
                        UserProfile up = userProfileRepository.findById(likerId).orElse(null);
                        String nickname = (up != null && up.getNickname() != null) ? up.getNickname()
                                : userOpt.get().getUsername();
                        String avatar = (up != null) ? up.getAvatarUrl() : null;
                        dto.setSenderNickname(nickname);
                        dto.setSenderAvatarUrl(avatar);

                        notificationService.sendNotification(ownerId, dto);
                    }
                }
            } catch (Exception ignored) {
            }

            return new ApiResponse<>(200, "点赞成功", true);
        }
    }

    @Override
    public ApiResponse<Long> addComment(CommentCreateDTO dto) {
        return commentService.addComment(dto);
    }

    @Override
    public List<CommentDTO> listComments(Long blogPostId, Long currentUserId) {
        return commentService.listComments(blogPostId, currentUserId);
    }

    @Override
    public ApiResponse<Boolean> toggleCommentLike(Long commentId, Long userId) {
        return commentService.toggleLike(commentId, userId);
    }

    @Override
    public PageResult<BlogPostDTO> pageList(int page, int size, Long currentUserId) {
        return search(null, null, null, null, "PUBLISHED", page, size, currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<BlogPostDTO> search(String keyword, Long userId, String directory, String categoryName,
            String status, int page,
            int size,
            Long currentUserId) {

        String statusFilter = "PUBLISHED";
        if (userId != null && currentUserId != null && userId.longValue() == currentUserId.longValue()) {
            // 如果是作者本人查看，且未指定状态，则查看所有状态（包括草稿）
            if (status == null || status.isEmpty()) {
                statusFilter = null;
            } else {
                statusFilter = status;
            }
        }

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<BlogPost> blogPage = blogPostRepository.search(keyword, userId, directory, categoryName, statusFilter,
                pageRequest);
        List<BlogPost> posts = blogPage.getContent();
        // 批量获取所有 userId
        List<Long> userIds = posts.stream()
                .map(post -> post.getUser().getId())
                .distinct()
                .toList();
        // 批量查找所有 UserProfile
        List<UserProfile> profiles = userProfileRepository.findAllById(userIds);
        // 构建 userId -> UserProfile 映射
        java.util.Map<Long, UserProfile> profileMap = new java.util.HashMap<>();
        for (UserProfile profile : profiles) {
            profileMap.put(profile.getUser().getId(), profile);
        }
        // 批量获取浏览量
        List<Long> postIds = posts.stream().map(BlogPost::getId).toList();
        java.util.Map<Long, Long> viewCounts = new java.util.HashMap<>();
        try {
            ApiResponse<java.util.Map<Long, Long>> batchStats = blogViewService.getBatchStats(postIds);
            if (batchStats != null && batchStats.getData() != null) {
                viewCounts = batchStats.getData();
            }
        } catch (Exception e) {
            logger.error("Failed to batch get view stats", e);
        }
        final java.util.Map<Long, Long> finalViewCounts = viewCounts;

        List<BlogPostDTO> dtoList = posts.stream().map(post -> {
            UserProfile profile = profileMap.get(post.getUser().getId());
            BlogPostDTO dto = blogpostMapper.toDTOWithProfile(post, profile);

            // Add view count for each post
            if (dto != null) {
                dto.setViewCount(finalViewCounts.getOrDefault(post.getId(), 0L));
            }

            return dto;
        }).toList();
        return new PageResult<>(dtoList, blogPage.getTotalElements(), page, size);
    }

    @Override
    public List<String> getUserDirectories(Long userId) {
        if (userId == null)
            return java.util.Collections.emptyList();
        return blogPostRepository.findDirectoriesByUserId(userId);
    }

    @Override
    public List<BlogPostDTO> list(int page, int size, Long currentUserId) {
        return pageList(page, size, currentUserId).getList();
    }

    @Override
    public PageResult<CommentDTO> pageComments(Long blogPostId, int page, int size, Long currentUserId) {
        Page<Comment> commentPage = commentRepository.findByBlogPostIdOrderByCreatedAtDesc(blogPostId,
                PageRequest.of(page, size));
        List<CommentDTO> dtoList = commentPage.getContent().stream().map(c -> toCommentDTO(c, currentUserId)).toList();
        return new PageResult<>(dtoList, commentPage.getTotalElements(), page, size);
    }

    private CommentDTO toCommentDTO(Comment c, Long currentUserId) {
        CommentDTO dto = new CommentDTO();
        dto.setId(c.getId());
        dto.setBlogPostId(c.getBlogPost().getId());
        dto.setUserId(c.getUser().getId());
        dto.setContent(c.getContent());
        dto.setCreatedAt(c.getCreatedAt());
        dto.setLikeCount(safeLong(c.getLikeCount()));
        if (currentUserId != null) {
            dto.setLikedByCurrentUser(
                    commentLikeRepository.findByCommentIdAndUserId(c.getId(), currentUserId).isPresent());
        }
        UserProfile up = userProfileRepository.findById(c.getUser().getId()).orElse(null);
        if (up != null) {
            dto.setNickname(up.getNickname() != null ? up.getNickname() : "");
            dto.setAvatarUrl(up.getAvatarUrl() != null ? up.getAvatarUrl() : "");
        } else {
            // fallback to username
            dto.setNickname(c.getUser() != null && c.getUser().getUsername() != null ? c.getUser().getUsername() : "");
            dto.setAvatarUrl("");
        }
        return dto;
    }

    @Override
    @Transactional
    public ApiResponse<Long> createWithCover(String title, String content, Long userId, String directory,
            String categoryName, java.util.List<String> tags, String status,
            MultipartFile cover) {
        if (title == null || title.trim().isEmpty())
            return new ApiResponse<>(400, "标题不能为空", null);
        if (content == null || content.trim().isEmpty())
            return new ApiResponse<>(400, "正文不能为空", null);
        if (userId == null)
            return new ApiResponse<>(400, "用户ID不能为空", null);
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty())
            return new ApiResponse<>(404, "用户不存在", null);
        BlogPost post = new BlogPost();
        post.setTitle(title.trim());
        post.setContent(content.trim());
        post.setDirectory(directory);
        post.setUser(userOpt.get());
        post.setRepost(false);
        if (status != null) {
            post.setStatus(status);
        } else {
            post.setStatus("PUBLISHED");
        }

        // Handle Category
        if (categoryName != null && !categoryName.trim().isEmpty()) {
            Optional<Category> catOpt = categoryRepository.findByName(categoryName.trim());
            if (catOpt.isPresent()) {
                post.setCategory(catOpt.get());
            } else {
                Category newCat = new Category();
                newCat.setName(categoryName.trim());
                post.setCategory(categoryRepository.save(newCat));
            }
        }

        // Handle Tags
        if (tags != null && !tags.isEmpty()) {
            if (tags.size() > 5) {
                return new ApiResponse<>(400, "标签数量不能超过5个", null);
            }
            java.util.Set<Tag> tagSet = new java.util.HashSet<>();
            for (String tagName : tags) {
                if (tagName == null || tagName.trim().isEmpty())
                    continue;
                String cleanName = tagName.trim();
                Optional<Tag> tagOpt = tagRepository.findByName(cleanName);
                if (tagOpt.isPresent()) {
                    tagSet.add(tagOpt.get());
                } else {
                    Tag newTag = new Tag();
                    newTag.setName(cleanName);
                    tagSet.add(tagRepository.save(newTag));
                }
            }
            post.setTags(tagSet);
        }

        BlogPost saved = blogPostRepository.save(post);
        // 保存封面文件
        if (cover != null && !cover.isEmpty()) {
            try {
                String url = fileStorageService.storeCoverImage(cover, userId, saved.getId());
                saved.setCoverImageUrl(url);
                blogPostRepository.save(saved);
            } catch (Exception e) {
                logger.error("封面上传异常", e);
                return new ApiResponse<>(500, "封面上传失败", null);
            }
        }
        return new ApiResponse<>(200, "创建成功", saved.getId());
    }

    @Override
    @Transactional
    public ApiResponse<Boolean> updateWithCover(Long id, String title, String content, String directory,
            String categoryName,
            java.util.List<String> tags, String status, MultipartFile cover, Boolean removeCover) {
        Optional<BlogPost> opt = blogPostRepository.findById(id);
        if (opt.isEmpty())
            return new ApiResponse<>(404, "博客不存在", false);
        BlogPost post = opt.get();
        if (title != null && !title.trim().isEmpty()) {
            post.setTitle(title.trim());
        }
        if (content != null && !content.trim().isEmpty()) {
            // 1. Extract images from old content
            List<String> oldImages = extractImageUrls(post.getContent());

            // 2. Extract images from new content
            String newContent = content.trim();
            List<String> newImages = extractImageUrls(newContent);

            // 3. Find images to delete (in old but not in new)
            List<String> imagesToDelete = oldImages.stream()
                    .filter(img -> !newImages.contains(img))
                    .collect(Collectors.toList());

            // 4. Delete from COS
            for (String imgUrl : imagesToDelete) {
                try {
                    fileStorageService.deleteFile(imgUrl);
                    logger.info("Deleted unused content image: {}", imgUrl);
                } catch (Exception e) {
                    logger.warn("Failed to delete unused content image: {}", imgUrl, e);
                }
            }

            post.setContent(newContent);
        }
        if (directory != null)
            post.setDirectory(directory);
        if (status != null) {
            post.setStatus(status);
        }

        // Handle Category
        if (categoryName != null) {
            if (categoryName.trim().isEmpty()) {
                post.setCategory(null);
            } else {
                Optional<Category> catOpt = categoryRepository.findByName(categoryName.trim());
                if (catOpt.isPresent()) {
                    post.setCategory(catOpt.get());
                } else {
                    Category newCat = new Category();
                    newCat.setName(categoryName.trim());
                    post.setCategory(categoryRepository.save(newCat));
                }
            }
        }

        // Handle Tags
        if (tags != null) {
            if (tags.size() > 5) {
                return new ApiResponse<>(400, "标签数量不能超过5个", false);
            }
            java.util.Set<Tag> tagSet = new java.util.HashSet<>();
            for (String tagName : tags) {
                if (tagName == null || tagName.trim().isEmpty())
                    continue;
                String cleanName = tagName.trim();
                Optional<Tag> tagOpt = tagRepository.findByName(cleanName);
                if (tagOpt.isPresent()) {
                    tagSet.add(tagOpt.get());
                } else {
                    Tag newTag = new Tag();
                    newTag.setName(cleanName);
                    tagSet.add(tagRepository.save(newTag));
                }
            }
            post.setTags(tagSet);
        }

        // 处理封面逻辑：优先处理删除，再处理上传
        if (Boolean.TRUE.equals(removeCover)) {
            // 如果原先有封面，删除文件
            if (post.getCoverImageUrl() != null && !post.getCoverImageUrl().isEmpty()) {
                fileStorageService.deleteFile(post.getCoverImageUrl());
                post.setCoverImageUrl(null);
            }
        }

        // 保存新封面文件
        if (cover != null && !cover.isEmpty()) {
            // 如果有旧封面且未被删除（removeCover为false），则先删除旧封面
            if (post.getCoverImageUrl() != null && !post.getCoverImageUrl().isEmpty()) {
                fileStorageService.deleteFile(post.getCoverImageUrl());
            }

            try {
                String url = fileStorageService.storeCoverImage(cover, post.getUser().getId(), post.getId());
                post.setCoverImageUrl(url);
            } catch (Exception e) {
                logger.error("封面上传异常", e);
                return new ApiResponse<>(500, "封面上传失败", false);
            }
        }
        blogPostRepository.save(post);
        return new ApiResponse<>(200, "更新成功", true);
    }

    // 只展示 delete 方法，其余保持你当前版本不变
    @Override
    @Transactional
    public ApiResponse<Boolean> delete(Long blogPostId, Long userId) {
        if (blogPostId == null || userId == null) {
            return new ApiResponse<>(400, "参数缺失", false);
        }

        // 只允许作者删除
        Optional<BlogPost> postOpt = blogPostRepository.findById(blogPostId);
        if (postOpt.isEmpty()) {
            return new ApiResponse<>(404, "博客不存在", false);
        }
        BlogPost post = postOpt.get();
        if (post.getUser() == null || !userId.equals(post.getUser().getId())) {
            return new ApiResponse<>(403, "无权限删除该博客", false);
        }

        // 0. 清理关联的 COS 资源 (封面和正文图片)
        // 仅当是草稿时，或者我们确定要彻底删除资源时执行。
        // 这里我们对所有删除操作都尝试清理资源，因为博客被删除了，其专属资源也不再需要。
        // 注意：如果图片被其他文章引用（虽然不常见），可能会误删。但通常博客图片是专属的。
        try {
            // 删除封面
            if (post.getCoverImageUrl() != null && !post.getCoverImageUrl().isEmpty()) {
                fileStorageService.deleteFile(post.getCoverImageUrl());
            }

            // 解析并删除正文中的图片
            List<String> contentImages = extractImageUrls(post.getContent());
            for (String imgUrl : contentImages) {
                fileStorageService.deleteFile(imgUrl);
            }
        } catch (Exception e) {
            logger.warn("清理博客 {} 的资源失败", blogPostId, e);
            // 不阻断删除流程
        }

        // 1. 找到该博客下所有评论
        List<Comment> comments = commentRepository.findByBlogPost_Id(blogPostId);
        List<Long> commentIds = comments.stream()
                .map(Comment::getId)
                .collect(Collectors.toList());

        if (!commentIds.isEmpty()) {
            // 2. 根据评论 ID 批量查询所有楼中楼回复（只查相关评论，不全表扫）
            List<CommentReply> replies = commentReplyRepository.findByComment_IdIn(commentIds);
            List<Long> replyIds = replies.stream()
                    .map(CommentReply::getId)
                    .collect(Collectors.toList());

            // 3. 先删回复的点赞
            if (!replyIds.isEmpty()) {
                commentReplyLikeRepository.deleteByReply_IdIn(replyIds);
            }
            // 4. 再删回复本身
            if (!commentIds.isEmpty()) {
                commentReplyRepository.deleteByComment_IdIn(commentIds);
            }

            // 5. 删评论的点赞
            commentLikeRepository.deleteByComment_IdIn(commentIds);

            // 6. 删评论本身
            commentRepository.deleteByBlogPost_Id(blogPostId);
        }

        // 7. 删文章的点赞
        blogPostLikeRepository.deleteByBlogPost_Id(blogPostId);

        // 7.5 删文章的收藏
        blogPostFavoriteRepository.deleteByBlogPostId(blogPostId);

        // 8. 删文章的浏览记录和统计（必须在删 blog_post 之前）
        try {
            blogViewService.deleteByBlogPostId(blogPostId);
        } catch (Exception e) {
            logger.warn("删除博客 {} 的浏览数据失败", blogPostId, e);
        }

        // 9. 最后删博客
        blogPostRepository.delete(post);

        return new ApiResponse<>(200, "删除成功", true);
    }

    @Override
    @Transactional
    public ApiResponse<Boolean> share(Long blogPostId, Long userId) {
        Optional<BlogPost> opt = blogPostRepository.findById(blogPostId);
        if (opt.isEmpty()) {
            return new ApiResponse<>(404, "博客不存在", false);
        }
        BlogPost post = opt.get();

        // 如果提供了 userId，检查是否已分享
        if (userId != null) {
            boolean alreadyShared = blogPostShareRepository.existsByBlogPostIdAndUserId(blogPostId, userId);
            if (alreadyShared) {
                // 已分享过，不增加计数，但返回成功
                return new ApiResponse<>(200, "已分享过", true);
            }
            // 记录分享
            BlogPostShare share = new BlogPostShare(blogPostId, userId);
            blogPostShareRepository.save(share);
        }

        post.setShareCount(post.getShareCount() + 1);
        blogPostRepository.save(post);
        return new ApiResponse<>(200, "分享成功", true);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<BlogPostDTO> getFavorites(Long userId, String categoryName, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<BlogPost> postPage = blogPostRepository.findFavoritesByUserId(userId, categoryName, pageable);

        List<BlogPostDTO> list = postPage.getContent().stream().map(post -> {
            UserProfile profile = userProfileRepository.findById(post.getUser().getId()).orElse(null);
            BlogPostDTO dto = blogpostMapper.toDTOWithProfile(post, profile);
            // 既然是收藏列表，当前用户肯定收藏了
            dto.setFavoritedByCurrentUser(true);
            // 检查点赞状态
            boolean liked = blogPostLikeRepository.findByBlogPostIdAndUserId(post.getId(), userId).isPresent();
            dto.setLikedByCurrentUser(liked);

            // Set view count
            setViewCount(dto, post.getId());

            return dto;
        }).collect(Collectors.toList());

        return new PageResult<>(list, postPage.getTotalElements(), page, size);
    }

    @Override
    public List<String> getFavoriteCategories(Long userId) {
        return blogPostRepository.findFavoriteCategories(userId);
    }

    private long safeLong(Long v) {
        return v == null ? 0L : v;
    }

    private String safeTitle(String title) {
        if (title == null)
            return "";
        return title.length() > 50 ? title.substring(0, 50) + "..." : title;
    }

    /**
     * Helper method to fetch and set view count for a BlogPostDTO
     * 
     * @param dto    The BlogPostDTO to update
     * @param postId The post ID to fetch view count for
     */
    private void setViewCount(BlogPostDTO dto, Long postId) {
        if (dto == null || postId == null) {
            return;
        }
        try {
            ApiResponse<BlogViewStatsDTO> statsResponse = blogViewService.getStats(postId);
            if (statsResponse != null && statsResponse.getCode() == 200 && statsResponse.getData() != null) {
                dto.setViewCount(statsResponse.getData().getViewCount());
            } else {
                dto.setViewCount(0L);
            }
        } catch (Exception e) {
            logger.error("Failed to get view stats for post " + postId, e);
            dto.setViewCount(0L);
        }
    }

    /**
     * 从 Markdown/HTML 内容中提取图片 URL
     * 简单正则匹配 Markdown ![...](url) 和 HTML <img src="url">
     */
    private List<String> extractImageUrls(String content) {
        List<String> urls = new java.util.ArrayList<>();
        if (content == null || content.isEmpty()) {
            return urls;
        }

        // 匹配 Markdown 图片: ![alt](url)
        java.util.regex.Pattern mdPattern = java.util.regex.Pattern.compile("!\\[.*?\\]\\((.*?)\\)");
        java.util.regex.Matcher mdMatcher = mdPattern.matcher(content);
        while (mdMatcher.find()) {
            String url = mdMatcher.group(1);
            // 简单过滤，只提取本站 COS 的链接 (包含 sources/ 或 blogpostcontent/)
            if (url != null && (url.contains("sources/") || url.contains("blogpostcontent/"))) {
                // 可能包含 title，如 "url \"title\""
                int spaceIndex = url.indexOf(" ");
                if (spaceIndex != -1) {
                    url = url.substring(0, spaceIndex);
                }
                urls.add(url);
            }
        }

        // 匹配 HTML 图片: <img ... src="url" ...>
        java.util.regex.Pattern htmlPattern = java.util.regex.Pattern
                .compile("<img[^>]+src\\s*=\\s*['\"]([^'\"]+)['\"][^>]*>");
        java.util.regex.Matcher htmlMatcher = htmlPattern.matcher(content);
        while (htmlMatcher.find()) {
            String url = htmlMatcher.group(1);
            if (url != null && (url.contains("sources/") || url.contains("blogpostcontent/"))) {
                urls.add(url);
            }
        }

        return urls;
    }
}