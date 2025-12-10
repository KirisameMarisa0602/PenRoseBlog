package com.kirisamemarisa.blog.service;

import com.kirisamemarisa.blog.dto.BlogPreviewDTO;

/**
 * 识别站内博客 URL 并生成预览信息的服务。
 */
public interface BlogUrlPreviewService {

    /**
     * 如果 text 中包含站内博客链接，则返回对应的预览信息；否则返回 null。
     */
    BlogPreviewDTO extractPreviewFromText(String text);
}