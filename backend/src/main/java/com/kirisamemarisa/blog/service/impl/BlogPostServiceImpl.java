package com.kirisamemarisa.blog.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.*;
import com.kirisamemarisa.blog.model.*;
import com.kirisamemarisa.blog.repository.*;
import com.kirisamemarisa.blog.service.BlogPostService;
import com.kirisamemarisa.blog.service.BlogViewService;
import com.kirisamemarisa.blog.mapper.BlogPostMapper;
import com.kirisamemarisa.blog.service.CommentService;
import com.kirisamemarisa.blog.service.NotificationService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import java.time.Instant;
import java.util.Optional;
import java.util.List;
import com.kirisamemarisa.blog.dto.PageResult;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.Files;
import java.util.stream.Collectors;

@Service
public class BlogPostServiceImpl implements BlogPostService {
    private static final Logger logger = LoggerFactory.getLogger(BlogPostServiceImpl.class);
    private final BlogPostRepository blogPostRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final BlogPostLikeRepository blogPostLikeRepository;
    private final BlogPostFavoriteRepository blogPostFavoriteRepository;
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

    @Value("${resource.blogpostcover-location}")
    private String blogpostcoverLocation;

    public BlogPostServiceImpl(BlogPostRepository blogPostRepository,
            UserRepository userRepository,
            CommentRepository commentRepository,
            BlogPostLikeRepository blogPostLikeRepository,
            BlogPostFavoriteRepository blogPostFavoriteRepository,
            CommentLikeRepository commentLikeRepository,
            CommentReplyRepository commentReplyRepository,
            CommentReplyLikeRepository commentReplyLikeRepository,
            UserProfileRepository userProfileRepository,
            CommentService commentService,
            NotificationService notificationService,
            BlogViewService blogViewService,
            TagRepository tagRepository,
            CategoryRepository categoryRepository,
            BlogPostMapper blogpostMapper) {
        this.blogPostRepository = blogPostRepository;
        this.userRepository = userRepository;
        this.commentRepository = commentRepository;
        this.blogPostLikeRepository = blogPostLikeRepository;
        this.blogPostFavoriteRepository = blogPostFavoriteRepository;
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
        return search(null, null, null, null, page, size, currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<BlogPostDTO> search(String keyword, Long userId, String directory, String categoryName, int page,
            int size,
            Long currentUserId) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<BlogPost> blogPage = blogPostRepository.search(keyword, userId, directory, categoryName, pageRequest);
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
        // TODO: Optimize this to use batch retrieval of view counts to avoid N+1 query
        // pattern
        // Consider adding a method like blogViewService.getBatchStats(List<Long>
        // postIds)
        // that uses Redis MGET or Pipeline to fetch all view counts in one call
        List<BlogPostDTO> dtoList = posts.stream().map(post -> {
            UserProfile profile = profileMap.get(post.getUser().getId());
            BlogPostDTO dto = blogpostMapper.toDTOWithProfile(post, profile);

            // Add view count for each post using helper method
            if (dto != null) {
                setViewCount(dto, post.getId());
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
            String categoryName, java.util.List<String> tags,
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
            Path baseDir = Paths.get(toLocalPath(blogpostcoverLocation));
            Path dirPath = baseDir.resolve(String.valueOf(userId)).resolve(String.valueOf(saved.getId()));
            try {
                Files.createDirectories(dirPath);
            } catch (IOException e) {
                logger.error("无法创建目录: {}", dirPath, e);
                return new ApiResponse<>(500, "封面上传失败（无法创建目录）", null);
            }
            // sanitize filename to avoid path traversal — allow only limited characters
            String rawName = cover.getOriginalFilename();
            String safeName = sanitizeFilename(rawName);
            if (safeName.isEmpty())
                safeName = String.valueOf(System.currentTimeMillis());
            String fileName = System.currentTimeMillis() + "_" + safeName;
            Path destPath = dirPath.resolve(fileName).normalize();
            try {
                Path allowed = dirPath.toAbsolutePath().normalize();
                if (!destPath.startsWith(allowed)) {
                    logger.warn("尝试写入不允许的位置: {} (allowed: {})", destPath, allowed);
                    return new ApiResponse<>(400, "非法的文件路径", null);
                }
                File destFile = destPath.toFile();
                cover.transferTo(destFile);
                String url = "/sources/blogpostcover/" + userId + "/" + saved.getId() + "/" + fileName;
                saved.setCoverImageUrl(url);
                blogPostRepository.save(saved);
            } catch (IOException e) {
                logger.error("封面上传异常", e);
                return new ApiResponse<>(500, "封面上传失败", null);
            }
        }
        return new ApiResponse<>(200, "创建成功", saved.getId());
    }

    @Override
    @Transactional
    public ApiResponse<Boolean> updateWithCover(Long id, String content, String directory, String categoryName,
            java.util.List<String> tags, MultipartFile cover) {
        Optional<BlogPost> opt = blogPostRepository.findById(id);
        if (opt.isEmpty())
            return new ApiResponse<>(404, "博客不存在", false);
        BlogPost post = opt.get();
        if (content != null && !content.trim().isEmpty())
            post.setContent(content.trim());
        if (directory != null)
            post.setDirectory(directory);

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

        // 保存新封面文件
        if (cover != null && !cover.isEmpty()) {
            Path baseDir = Paths.get(toLocalPath(blogpostcoverLocation));
            Path dirPath = baseDir.resolve(String.valueOf(post.getUser().getId()))
                    .resolve(String.valueOf(post.getId()));
            try {
                Files.createDirectories(dirPath);
            } catch (IOException e) {
                logger.error("无法创建目录: {}", dirPath, e);
                return new ApiResponse<>(500, "封面上传失败（无法创建目录）", false);
            }
            String rawName = cover.getOriginalFilename();
            String safeName = sanitizeFilename(rawName);
            if (safeName.isEmpty())
                safeName = String.valueOf(System.currentTimeMillis());
            String fileName = System.currentTimeMillis() + "_" + safeName;
            Path destPath = dirPath.resolve(fileName).normalize();
            try {
                Path allowed = dirPath.toAbsolutePath().normalize();
                if (!destPath.startsWith(allowed)) {
                    logger.warn("尝试写入不允许的位置: {} (allowed: {})", destPath, allowed);
                    return new ApiResponse<>(400, "非法的文件路径", false);
                }
                File destFile = destPath.toFile();
                cover.transferTo(destFile);
                String url = "/sources/blogpostcover/" + post.getUser().getId() + "/" + post.getId() + "/" + fileName;
                post.setCoverImageUrl(url);
            } catch (IOException e) {
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
    public ApiResponse<Boolean> share(Long blogPostId) {
        Optional<BlogPost> opt = blogPostRepository.findById(blogPostId);
        if (opt.isEmpty()) {
            return new ApiResponse<>(404, "博客不存在", false);
        }
        BlogPost post = opt.get();
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

    private String toLocalPath(String configured) {
        if (configured == null)
            return "";
        String v = configured;
        if (v.startsWith("file:"))
            v = v.substring(5);
        // Normalize slashes; keep as-is for Windows, ensure trailing separator
        if (!v.endsWith(File.separator) && !v.endsWith("/")) {
            v = v + File.separator;
        }
        return v.replace('/', File.separatorChar);
    }

    private String sanitizeFilename(String raw) {
        if (raw == null)
            return "";
        // Remove any path segments by taking substring after last slash/backslash
        String name = raw;
        int idx = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (idx >= 0 && idx + 1 < name.length())
            name = name.substring(idx + 1);
        // Remove any parent traversal
        name = name.replace("..", "");
        // Replace any character not in [a-zA-Z0-9._-] with underscore
        name = name.replaceAll("[^a-zA-Z0-9._-]", "_");
        // limit length
        if (name.length() > 200)
            name = name.substring(name.length() - 200);
        return name;
    }

    private long safeLong(Long v) {
        return v == null ? 0L : v;
    }

    private int safeInt(Integer v) {
        return v == null ? 0 : v;
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
}