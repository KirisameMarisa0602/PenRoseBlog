package com.kirisamemarisa.blog.repository;

import com.kirisamemarisa.blog.model.CommentReplyLike;
import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentReplyLikeRepository extends JpaRepository<CommentReplyLike, Long> {

    Optional<CommentReplyLike> findByReplyIdAndUserId(Long replyId, Long userId);

    long countByReplyId(Long replyId);

    // 根据回复 ID 删除点赞
    void deleteByReply_Id(Long replyId);

    // 根据多条回复批量删除点赞
    void deleteByReply_IdIn(List<Long> replyIds);
}