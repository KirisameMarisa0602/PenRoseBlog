package com.kirisamemarisa.blog.repository;

import com.kirisamemarisa.blog.model.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByBlogPostIdOrderByCreatedAtDesc(Long blogPostId);

    Page<Comment> findByBlogPostIdOrderByCreatedAtDesc(Long blogPostId, Pageable pageable);

    // 根据博客 ID 删除所有评论
    void deleteByBlogPost_Id(Long blogPostId);

    // 根据博客 ID 查询所有评论（用于级联删楼中楼、点赞）
    List<Comment> findByBlogPost_Id(Long blogPostId);
}