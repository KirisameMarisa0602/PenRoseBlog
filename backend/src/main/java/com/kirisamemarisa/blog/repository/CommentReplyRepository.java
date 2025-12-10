package com.kirisamemarisa.blog.repository;

import com.kirisamemarisa.blog.model.CommentReply;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentReplyRepository extends JpaRepository<CommentReply, Long> {

    Page<CommentReply> findByCommentIdOrderByCreatedAtDesc(Long commentId, Pageable pageable);

    // 根据单条评论 ID 删除所有回复
    void deleteByComment_Id(Long commentId);

    // 根据多条评论 ID 批量删除回复
    void deleteByComment_IdIn(List<Long> commentIds);

    // 根据多条评论 ID 查询所有回复（用于先拿到 replyIds，避免全表扫描）
    List<CommentReply> findByComment_IdIn(List<Long> commentIds);
}