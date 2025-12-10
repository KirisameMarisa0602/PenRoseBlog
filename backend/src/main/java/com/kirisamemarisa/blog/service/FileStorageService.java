package com.kirisamemarisa.blog.service;

import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {

    String storeBlogMedia(MultipartFile file, Long userId);

    String storeMessageMedia(MultipartFile file, Long senderId, Long receiverId);
}
