package com.kirisamemarisa.blog.repository;

import com.kirisamemarisa.blog.model.BlogPostShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BlogPostShareRepository extends JpaRepository<BlogPostShare, Long> {
    Optional<BlogPostShare> findByBlogPostIdAndUserId(Long blogPostId, Long userId);

    boolean existsByBlogPostIdAndUserId(Long blogPostId, Long userId);
}
