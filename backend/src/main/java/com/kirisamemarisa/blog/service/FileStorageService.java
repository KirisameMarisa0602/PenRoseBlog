package com.kirisamemarisa.blog.service;

import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {

    String storeBlogMedia(MultipartFile file, Long userId);

    String storeCoverImage(MultipartFile file, Long userId, Long postId);

    String storeUserMedia(MultipartFile file, Long userId, String type);

    String storeMessageMedia(MultipartFile file, Long senderId, Long receiverId);

    /**
     * 生成预签名上传 URL
     * 
     * @param fileName 原始文件名
     * @param userId   用户ID
     * @return 包含 uploadUrl (带签名) 和 publicUrl (不带签名) 的 Map
     */
    java.util.Map<String, String> generatePresignedUrl(String fileName, Long userId);

    /**
     * 生成私信媒体的预签名上传 URL
     */
    java.util.Map<String, String> generateMessagePresignedUrl(String fileName, Long senderId, Long receiverId);

    /**
     * 删除文件
     * 
     * @param fileUrl 文件URL或路径
     */
    void deleteFile(String fileUrl);
}
