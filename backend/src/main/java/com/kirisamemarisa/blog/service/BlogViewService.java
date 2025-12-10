package com.kirisamemarisa.blog.service;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.BlogViewRecordCreateDTO;
import com.kirisamemarisa.blog.dto.BlogViewStatsDTO;

public interface BlogViewService {

    /**
     * 记录一次浏览，并返回当前该博客的浏览统计
     */
    ApiResponse<BlogViewStatsDTO> recordView(BlogViewRecordCreateDTO dto);

    /**
     * 获取指定博客的浏览统计
     */
    ApiResponse<BlogViewStatsDTO> getStats(Long blogPostId);

    /**
     * 删除指定博客的所有浏览相关数据（明细 + 统计）
     */
    void deleteByBlogPostId(Long blogPostId);

}