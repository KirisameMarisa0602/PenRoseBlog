package com.kirisamemarisa.blog.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.CommentCreateDTO;
import com.kirisamemarisa.blog.dto.CommentDTO;
import com.kirisamemarisa.blog.dto.PageResult;
import com.kirisamemarisa.blog.mapper.CommentMapper;
import com.kirisamemarisa.blog.model.BlogPost;
import com.kirisamemarisa.blog.model.Comment;
import com.kirisamemarisa.blog.model.CommentLike;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.model.UserProfile;
import com.kirisamemarisa.blog.repository.BlogPostRepository;
import com.kirisamemarisa.blog.repository.CommentLikeRepository;
import com.kirisamemarisa.blog.repository.CommentRepository;
import com.kirisamemarisa.blog.repository.CommentReplyRepository;
import com.kirisamemarisa.blog.repository.UserProfileRepository;
import com.kirisamemarisa.blog.repository.UserRepository;
import com.kirisamemarisa.blog.service.CommentService;
import com.kirisamemarisa.blog.service.NotificationService;
import com.kirisamemarisa.blog.dto.NotificationDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CommentServiceImpl implements CommentService {
    private static final Logger logger = LoggerFactory.getLogger(CommentServiceImpl.class);
    @Autowired
    private CommentRepository commentRepository;
    @Autowired
    private BlogPostRepository blogPostRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private CommentLikeRepository commentLikeRepository;
    @Autowired
    private CommentMapper commentMapper;
    @Autowired
    private UserProfileRepository userProfileRepository;
    @Autowired
    private CommentReplyRepository commentReplyRepository;
    @Autowired(required = false)
    private NotificationService notificationService;

    @Override
    @Transactional
    public ApiResponse<Long> addComment(CommentCreateDTO dto) {
        if (dto == null || dto.getBlogPostId() == null || dto.getUserId() == null || dto.getContent() == null
                || dto.getContent().trim().isEmpty()) {
            return new ApiResponse<>(400, "参数不完整", null);
        }
        Optional<BlogPost> blogPostOpt = blogPostRepository.findById(dto.getBlogPostId());
        Optional<User> userOpt = userRepository.findById(dto.getUserId());
        if (blogPostOpt.isEmpty() || userOpt.isEmpty()) {
            return new ApiResponse<>(404, "博客或用户不存在", null);
        }
        Comment comment = new Comment();
        comment.setBlogPost(blogPostOpt.get());
        comment.setUser(userOpt.get());
        comment.setContent(dto.getContent());
        commentRepository.save(comment);
        // 更新博客评论数
        BlogPost blogPost = blogPostOpt.get();
        blogPost.setCommentCount(blogPost.getCommentCount() + 1);
        blogPostRepository.save(blogPost);

        // 通知文章作者“收到评论”
        try {
            if (notificationService != null && blogPost.getUser() != null && comment.getUser() != null) {
                Long ownerId = blogPost.getUser().getId();
                Long commenterId = comment.getUser().getId();
                if (ownerId != null && !ownerId.equals(commenterId)) {
                    NotificationDTO n = new NotificationDTO();
                    n.setType("POST_COMMENT"); // 归类为收到评论
                    n.setSenderId(commenterId);
                    n.setReceiverId(ownerId);
                    n.setMessage("你的文章《" + safeTitle(blogPost.getTitle()) + "》收到了新的评论");
                    n.setCreatedAt(Instant.now());
                    n.setReferenceId(blogPost.getId()); // 文章ID
                    n.setReferenceExtraId(comment.getId()); // 评论ID

                    // 填充发送者信息
                    UserProfile up = userProfileRepository.findById(commenterId).orElse(null);
                    String nickname = (up != null && up.getNickname() != null) ? up.getNickname()
                            : comment.getUser().getUsername();
                    String avatar = (up != null) ? up.getAvatarUrl() : null;
                    n.setSenderNickname(nickname);
                    n.setSenderAvatarUrl(avatar);

                    notificationService.sendNotification(ownerId, n);
                }
            }
        } catch (Exception ignored) {
        }

        return new ApiResponse<>(200, "评论成功", comment.getId());
    }

    @Override
    public List<CommentDTO> listComments(Long blogPostId, Long currentUserId) {
        List<Comment> comments = commentRepository.findByBlogPostIdOrderByCreatedAtDesc(blogPostId);

        List<Long> commentIds = comments.stream().map(Comment::getId).distinct().toList();
        Map<Long, Long> replyCountMap = new HashMap<>();
        if (!commentIds.isEmpty()) {
            List<Object[]> rows = commentReplyRepository.countRepliesByCommentIds(commentIds);
            for (Object[] row : rows) {
                if (row == null || row.length < 2) continue;
                replyCountMap.put((Long) row[0], (Long) row[1]);
            }
        }

        // 批量获取所有 userId
        List<Long> userIds = comments.stream()
                .map(comment -> comment.getUser().getId())
                .distinct()
                .toList();
        List<UserProfile> profiles = userProfileRepository.findAllById(userIds);
        java.util.Map<Long, UserProfile> profileMap = new java.util.HashMap<>();
        for (UserProfile profile : profiles) {
            profileMap.put(profile.getUser().getId(), profile);
        }
        return comments.stream().map(comment -> {
            CommentDTO dto = commentMapper.toDTO(comment);
            dto.setReplyCount(replyCountMap.getOrDefault(comment.getId(), 0L));
            if (currentUserId != null) {
                dto.setLikedByCurrentUser(
                        commentLikeRepository.findByCommentIdAndUserId(comment.getId(), currentUserId).isPresent());
            } else {
                dto.setLikedByCurrentUser(false);
            }
            UserProfile profile = profileMap.get(comment.getUser().getId());
            if (profile != null) {
                dto.setNickname(profile.getNickname());
                dto.setAvatarUrl(profile.getAvatarUrl());
            }
            return dto;
        }).collect(java.util.stream.Collectors.toList());
    }

    @Override
    public PageResult<CommentDTO> pageComments(Long blogPostId, int page, int size, Long currentUserId) {
        org.springframework.data.domain.Page<Comment> commentPage = commentRepository
                .findByBlogPostIdOrderByCreatedAtDesc(blogPostId,
                        org.springframework.data.domain.PageRequest.of(page, size));
        List<Comment> comments = commentPage.getContent();

        List<Long> commentIds = comments.stream().map(Comment::getId).distinct().toList();
        Map<Long, Long> replyCountMap = new HashMap<>();
        if (!commentIds.isEmpty()) {
            List<Object[]> rows = commentReplyRepository.countRepliesByCommentIds(commentIds);
            for (Object[] row : rows) {
                if (row == null || row.length < 2) continue;
                replyCountMap.put((Long) row[0], (Long) row[1]);
            }
        }

        List<Long> userIds = comments.stream()
                .map(comment -> comment.getUser().getId())
                .distinct()
                .toList();
        List<UserProfile> profiles = userProfileRepository.findAllById(userIds);
        java.util.Map<Long, UserProfile> profileMap = new java.util.HashMap<>();
        for (UserProfile profile : profiles) {
            profileMap.put(profile.getUser().getId(), profile);
        }
        List<CommentDTO> dtoList = comments.stream().map(comment -> {
            CommentDTO dto = commentMapper.toDTO(comment);
            dto.setReplyCount(replyCountMap.getOrDefault(comment.getId(), 0L));
            if (currentUserId != null) {
                dto.setLikedByCurrentUser(
                        commentLikeRepository.findByCommentIdAndUserId(comment.getId(), currentUserId).isPresent());
            } else {
                dto.setLikedByCurrentUser(false);
            }
            UserProfile profile = profileMap.get(comment.getUser().getId());
            if (profile != null) {
                dto.setNickname(profile.getNickname());
                dto.setAvatarUrl(profile.getAvatarUrl());
            }
            return dto;
        }).collect(java.util.stream.Collectors.toList());
        return new PageResult<>(dtoList, commentPage.getTotalElements(), page, size);
    }

    @Override
    @Transactional
    public ApiResponse<Boolean> deleteComment(Long commentId, Long userId) {
        Optional<Comment> commentOpt = commentRepository.findById(commentId);
        if (commentOpt.isEmpty()) {
            return new ApiResponse<>(404, "评论不存在", false);
        }
        Comment comment = commentOpt.get();
        if (!comment.getUser().getId().equals(userId)) {
            return new ApiResponse<>(403, "无权限删除", false);
        }
        commentRepository.delete(comment);
        // 更新博客评论数
        BlogPost blogPost = comment.getBlogPost();
        blogPost.setCommentCount(Math.max(0, blogPost.getCommentCount() - 1));
        blogPostRepository.save(blogPost);
        return new ApiResponse<>(200, "删除成功", true);
    }

    @Override
    @Transactional
    public ApiResponse<Boolean> toggleLike(Long commentId, Long userId) {
        Optional<CommentLike> likeOpt = commentLikeRepository.findByCommentIdAndUserId(commentId, userId);
        Optional<Comment> commentOpt = commentRepository.findById(commentId);
        if (commentOpt.isEmpty())
            return new ApiResponse<>(404, "评论不存在", false);
        Comment comment = commentOpt.get();
        if (likeOpt.isPresent()) {
            commentLikeRepository.delete(likeOpt.get());
            comment.setLikeCount(Math.max(0, comment.getLikeCount() - 1));
            commentRepository.save(comment);
            return new ApiResponse<>(200, "取消点赞", false);
        } else {
            CommentLike like = new CommentLike();
            like.setComment(comment);
            like.setUser(userRepository.findById(userId).orElse(null));
            commentLikeRepository.save(like);
            comment.setLikeCount(comment.getLikeCount() + 1);
            commentRepository.save(comment);

            // 评论被点赞通知
            try {
                if (notificationService != null && comment.getUser() != null) {
                    Long authorId = comment.getUser().getId();
                    Long likerId = userId;
                    if (authorId != null && !authorId.equals(likerId)) {
                        NotificationDTO n = new NotificationDTO();
                        n.setType("COMMENT_LIKE");
                        n.setSenderId(likerId);
                        n.setReceiverId(authorId);
                        n.setMessage("你的评论收到了一个点赞");
                        n.setCreatedAt(Instant.now());
                        n.setReferenceId(comment.getBlogPost() != null ? comment.getBlogPost().getId() : null);
                        n.setReferenceExtraId(comment.getId());

                        // 填充发送者信息
                        UserProfile up = userProfileRepository.findById(likerId).orElse(null);
                        String nickname = (up != null && up.getNickname() != null) ? up.getNickname() : "有人";
                        String avatar = (up != null) ? up.getAvatarUrl() : null;
                        n.setSenderNickname(nickname);
                        n.setSenderAvatarUrl(avatar);

                        notificationService.sendNotification(authorId, n);
                    }
                }
            } catch (Exception ignored) {
            }

            return new ApiResponse<>(200, "点赞成功", true);
        }
    }

    private String safeTitle(String title) {
        if (title == null)
            return "";
        return title.length() > 50 ? title.substring(0, 50) + "..." : title;
    }

    @Override
    public CommentDTO getCommentById(Long commentId) {
        Optional<Comment> opt = commentRepository.findById(commentId);
        if (opt.isEmpty()) return null;
        Comment comment = opt.get();
        CommentDTO dto = commentMapper.toDTO(comment);

        try {
            List<Object[]> rows = commentReplyRepository.countRepliesByCommentIds(List.of(comment.getId()));
            if (rows != null && !rows.isEmpty() && rows.get(0) != null && rows.get(0).length >= 2) {
                dto.setReplyCount((Long) rows.get(0)[1]);
            } else {
                dto.setReplyCount(0L);
            }
        } catch (Exception ignored) {
            dto.setReplyCount(0L);
        }

        // 填充用户信息
        UserProfile profile = userProfileRepository.findById(comment.getUser().getId()).orElse(null);
        if (profile != null) {
            dto.setNickname(profile.getNickname());
            dto.setAvatarUrl(profile.getAvatarUrl());
        }
        return dto;
    }
}