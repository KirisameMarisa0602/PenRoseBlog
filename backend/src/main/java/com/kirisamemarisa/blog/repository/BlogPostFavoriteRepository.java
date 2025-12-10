package com.kirisamemarisa.blog.repository;

import com.kirisamemarisa.blog.model.BlogPostFavorite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface BlogPostFavoriteRepository extends JpaRepository<BlogPostFavorite, Long> {
    Optional<BlogPostFavorite> findByUserIdAndBlogPostId(Long userId, Long blogPostId);

    boolean existsByUserIdAndBlogPostId(Long userId, Long blogPostId);

    @Transactional
    @Modifying
    void deleteByUserIdAndBlogPostId(Long userId, Long blogPostId);

    @Transactional
    @Modifying
    void deleteByBlogPostId(Long blogPostId);

    @Query("SELECT f FROM BlogPostFavorite f WHERE f.user.id = :userId ORDER BY f.createdAt DESC")
    Page<BlogPostFavorite> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByBlogPostId(Long blogPostId);
}
