package com.kirisamemarisa.blog.service.impl;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.CommentReplyCreateDTO;
import com.kirisamemarisa.blog.dto.CommentReplyDTO;
import com.kirisamemarisa.blog.dto.PageResult;
import com.kirisamemarisa.blog.dto.NotificationDTO;
import com.kirisamemarisa.blog.mapper.CommentReplyMapper;
import com.kirisamemarisa.blog.model.Comment;
import com.kirisamemarisa.blog.model.CommentReply;
import com.kirisamemarisa.blog.model.CommentReplyLike;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.model.UserProfile;
import com.kirisamemarisa.blog.repository.CommentReplyLikeRepository;
import com.kirisamemarisa.blog.repository.CommentReplyRepository;
import com.kirisamemarisa.blog.repository.CommentRepository;
import com.kirisamemarisa.blog.repository.UserProfileRepository;
import com.kirisamemarisa.blog.repository.UserRepository;
import com.kirisamemarisa.blog.service.CommentReplyService;
import com.kirisamemarisa.blog.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@Service
public class CommentReplyServiceImpl implements CommentReplyService {

    private final CommentReplyRepository replyRepository;
    private final CommentReplyLikeRepository replyLikeRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final CommentReplyMapper replyMapper;
    private final NotificationService notificationService;

    public CommentReplyServiceImpl(CommentReplyRepository replyRepository,
                                   CommentReplyLikeRepository replyLikeRepository,
                                   CommentRepository commentRepository,
                                   UserRepository userRepository,
                                   UserProfileRepository userProfileRepository,
                                   CommentReplyMapper replyMapper,
                                   NotificationService notificationService) {
        this.replyRepository = replyRepository;
        this.replyLikeRepository = replyLikeRepository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.replyMapper = replyMapper;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional
    public ApiResponse<Long> addReply(CommentReplyCreateDTO dto) {
        if (dto == null || dto.getCommentId() == null || dto.getUserId() == null
                || dto.getContent() == null || dto.getContent().trim().isEmpty()) {
            return new ApiResponse<>(400, "参数不完整", null);
        }

        Optional<Comment> commentOpt = commentRepository.findById(dto.getCommentId());
        Optional<User> userOpt = userRepository.findById(dto.getUserId());
        if (commentOpt.isEmpty() || userOpt.isEmpty()) {
            return new ApiResponse<>(404, "评论或用户不存在", null);
        }

        CommentReply reply = new CommentReply();
        reply.setComment(commentOpt.get());
        reply.setUser(userOpt.get());
        reply.setContent(dto.getContent());
        replyRepository.save(reply);

        // 通知被回复的评论作者
        try {
                        if (notificationService != null) {
                             Comment comment = commentOpt.get();
                                if (comment.getUser() != null && reply.getUser() != null) {
                                        Long commentAuthorId = comment.getUser().getId();
                                        Long replierId = reply.getUser().getId();
                                        if (commentAuthorId != null && !commentAuthorId.equals(replierId)) {
                                                Long blogPostId = (comment.getBlogPost() != null
                                                                ? comment.getBlogPost().getId()
                                                                : null);
                                                NotificationDTO n = new NotificationDTO();
                                                n.setType("COMMENT_REPLY");  // 统一类型
                                                n.setSenderId(replierId);
                                                n.setReceiverId(commentAuthorId);
                                               n.setMessage("你的评论收到了新的回复");
                                               n.setCreatedAt(Instant.now());
                                                // 关键：统一约定
                                                        n.setReferenceId(reply.getId());     // 回复 ID（前端可视为“被高亮的评论/回复 ID”）
                                                n.setReferenceExtraId(blogPostId);   // 文章 ID
                                                notificationService.sendNotification(commentAuthorId, n);
                                            }
                                    }
                            }
                    } catch (Exception ignored) {
                    }

        return new ApiResponse<>(200, "回复成功", reply.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<CommentReplyDTO> pageReplies(Long commentId, int page, int size, Long currentUserId) {
        Page<CommentReply> replyPage = replyRepository
                .findByCommentIdOrderByCreatedAtDesc(commentId, PageRequest.of(page, size));

        List<CommentReply> replies = replyPage.getContent();

        // 批量获取所有 userId
        List<Long> userIds = replies.stream()
                .map(r -> r.getUser().getId())
                .distinct()
                .toList();

        List<UserProfile> profiles = userProfileRepository.findAllById(userIds);
        Map<Long, UserProfile> profileMap = new HashMap<>();
        for (UserProfile profile : profiles) {
            profileMap.put(profile.getUser().getId(), profile);
        }

        List<CommentReplyDTO> dtoList = replies.stream().map(reply -> {
            CommentReplyDTO dto = replyMapper.toDTO(reply);
            if (currentUserId != null) {
                boolean liked = replyLikeRepository
                        .findByReplyIdAndUserId(reply.getId(), currentUserId)
                        .isPresent();
                dto.setLikedByCurrentUser(liked);
            } else {
                dto.setLikedByCurrentUser(false);
            }
            UserProfile profile = profileMap.get(reply.getUser().getId());
            if (profile != null) {
                dto.setNickname(profile.getNickname());
                dto.setAvatarUrl(profile.getAvatarUrl());
            }
            return dto;
        }).collect(Collectors.toList());

        return new PageResult<>(dtoList, replyPage.getTotalElements(), page, size);
    }

    @Override
    @Transactional
    public ApiResponse<Boolean> deleteReply(Long replyId, Long userId) {
        Optional<CommentReply> replyOpt = replyRepository.findById(replyId);
        if (replyOpt.isEmpty()) {
            return new ApiResponse<>(404, "回复不存在", false);
        }
        CommentReply reply = replyOpt.get();
        if (!reply.getUser().getId().equals(userId)) {
            return new ApiResponse<>(403, "无权限删除", false);
        }
        replyRepository.delete(reply);
        return new ApiResponse<>(200, "删除成功", true);
    }

    @Override
    @Transactional
    public ApiResponse<Boolean> toggleLike(Long replyId, Long userId) {
        Optional<CommentReply> replyOpt = replyRepository.findById(replyId);
        if (replyOpt.isEmpty()) {
            return new ApiResponse<>(404, "回复不存在", false);
        }
        CommentReply reply = replyOpt.get();

        Optional<CommentReplyLike> likeOpt = replyLikeRepository.findByReplyIdAndUserId(replyId, userId);
        if (likeOpt.isPresent()) {
            replyLikeRepository.delete(likeOpt.get());
            reply.setLikeCount(Math.max(0, reply.getLikeCount() - 1));
            replyRepository.save(reply);
            return new ApiResponse<>(200, "取消点赞", false);
        } else {
            CommentReplyLike like = new CommentReplyLike();
            like.setReply(reply);
            like.setUser(userRepository.findById(userId).orElse(null));
            replyLikeRepository.save(like);
            reply.setLikeCount(reply.getLikeCount() + 1);
            replyRepository.save(reply);

            // 楼中楼被点赞通知
                        try {
                                if (notificationService != null && reply.getUser() != null) {
                                        Long authorId = reply.getUser().getId();
                                        Long likerId = userId;
                                        if (authorId != null && !authorId.equals(likerId)) {
                                                Long blogPostId = null;
                                                if (reply.getComment() != null && reply.getComment().getBlogPost() != null) {
                                                        blogPostId = reply.getComment().getBlogPost().getId();
                                                    }
                                                NotificationDTO n = new NotificationDTO();
                                                n.setType("REPLY_LIKE");
                                                n.setSenderId(likerId);
                                                n.setReceiverId(authorId);
                                                n.setMessage("你的回复收到了一个点赞");
                                                n.setCreatedAt(Instant.now());
                                                n.setReferenceId(reply.getId());    // 被点赞的回复 ID
                                                n.setReferenceExtraId(blogPostId);  // 所在文章 ID
                                                notificationService.sendNotification(authorId, n);
                                            }
                                    }
                            } catch (Exception ignored) {
                            }

            return new ApiResponse<>(200, "点赞成功", true);
        }
    }
}