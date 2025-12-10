package com.kirisamemarisa.blog.repository;

import com.kirisamemarisa.blog.model.BlogViewRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlogViewRecordRepository extends JpaRepository<BlogViewRecord, Long> {

    boolean existsByBlogPostIdAndUserId(Long blogPostId, Long userId);

    /**
     * 根据文章 ID 删除所有浏览明细记录
     */
    void deleteByBlogPost_Id(Long blogPostId);
}