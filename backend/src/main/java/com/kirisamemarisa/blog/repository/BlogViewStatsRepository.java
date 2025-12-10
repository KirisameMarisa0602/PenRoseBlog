package com.kirisamemarisa.blog.repository;

import com.kirisamemarisa.blog.model.BlogViewStats;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BlogViewStatsRepository extends JpaRepository<BlogViewStats, Long> {

    Optional<BlogViewStats> findByBlogPostId(Long blogPostId);

    /**
     * 根据文章 ID 删除浏览统计记录
     */
    void deleteByBlogPost_Id(Long blogPostId);
}