package com.kirisamemarisa.blog.controller;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.BlogViewRecordCreateDTO;
import com.kirisamemarisa.blog.dto.BlogViewStatsDTO;
import com.kirisamemarisa.blog.service.BlogViewService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/blogview")
public class BlogViewController {

    private final BlogViewService blogViewService;

    public BlogViewController(BlogViewService blogViewService) {
        this.blogViewService = blogViewService;
    }

    /**
     * 记录一次浏览：前端在用户进入博客详情页时调用
     */
    @PostMapping("/record")
    public ApiResponse<BlogViewStatsDTO> recordView(@RequestBody BlogViewRecordCreateDTO dto) {
        return blogViewService.recordView(dto);
    }

    /**
     * 获取某篇博客当前浏览量
     */
    @GetMapping("/{blogPostId}")
    public ApiResponse<BlogViewStatsDTO> getStats(@PathVariable Long blogPostId) {
        return blogViewService.getStats(blogPostId);
    }
}
