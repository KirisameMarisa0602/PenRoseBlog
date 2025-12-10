package com.kirisamemarisa.blog.repository;

import com.kirisamemarisa.blog.model.BlogPostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface BlogPostLikeRepository extends JpaRepository<BlogPostLike, Long> {
    Optional<BlogPostLike> findByBlogPostIdAndUserId(Long blogPostId, Long userId);
    long countByBlogPostId(Long blogPostId);

    // 根据博客 ID 删除点赞
    void deleteByBlogPost_Id(Long blogPostId);

    // 根据多条博客 ID 批量删除点赞（目前用不到，预留）
    void deleteByBlogPost_IdIn(List<Long> blogPostIds);
}