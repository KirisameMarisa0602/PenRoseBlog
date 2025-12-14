package com.kirisamemarisa.blog.service.impl;

import com.kirisamemarisa.blog.common.BusinessException;
import com.kirisamemarisa.blog.service.FileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
// @Primary
public class LocalFileStorageServiceImpl implements FileStorageService {

    private static final Logger logger = LoggerFactory.getLogger(LocalFileStorageServiceImpl.class);
    private static final String BASE_DIR = "sources";

    @Override
    public String storeBlogMedia(MultipartFile file, Long userId) {
        String userSegment = userId != null ? Long.toString(userId) : "common";
        String relativePath = "blogpostcontent/" + userSegment + "/" + generateFileName(file);
        return saveFile(file, relativePath);
    }

    @Override
    public String storeCoverImage(MultipartFile file, Long userId, Long postId) {
        String userSegment = userId != null ? Long.toString(userId) : "common";
        String postSegment = postId != null ? Long.toString(postId) : "temp";
        String relativePath = "blogpostcover/" + userSegment + "/" + postSegment + "/" + generateFileName(file);
        return saveFile(file, relativePath);
    }

    @Override
    public String storeUserMedia(MultipartFile file, Long userId, String type) {
        String userSegment = userId != null ? Long.toString(userId) : "common";
        // type: avatar, background, profile
        String relativePath = type + "/" + userSegment + "/" + generateFileName(file);
        String url = saveFile(file, relativePath);

        // Special handling for avatar to match Nginx config
        if ("avatar".equals(type)) {
            // Nginx maps /avatar/ to /app/sources/avatar/
            // saveFile returns /sources/avatar/...
            // We want /avatar/...
            // But wait, saveFile returns /sources/... because I'll implement it that way.
            // Let's adjust saveFile to return the web accessible URL.
        }
        return url;
    }

    @Override
    public String storeMessageMedia(MultipartFile file, Long senderId, Long receiverId) {
        String convoSegment = "unknown";
        if (senderId != null && receiverId != null && senderId > 0 && receiverId > 0) {
            long a = Math.min(senderId, receiverId);
            long b = Math.max(senderId, receiverId);
            convoSegment = a + "-" + b;
        } else if (senderId != null && senderId > 0) {
            convoSegment = "user-" + senderId;
        }
        String relativePath = "messages/" + convoSegment + "/" + generateFileName(file);
        return saveFile(file, relativePath);
    }

    @Override
    public Map<String, String> generatePresignedUrl(String fileName, Long userId) {
        // Local storage does not support presigned URLs.
        return new HashMap<>();
    }

    @Override
    public Map<String, String> generateMessagePresignedUrl(String fileName, Long senderId, Long receiverId) {
        // Local storage does not support presigned URLs.
        return new HashMap<>();
    }

    @Override
    public void deleteFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return;
        }
        try {
            // fileUrl example: /sources/blogpostcontent/1/abc.jpg
            // or /avatar/1/abc.jpg -> /app/sources/avatar/1/abc.jpg

            String relativePath = fileUrl;
            if (relativePath.startsWith("/sources/")) {
                relativePath = relativePath.substring("/sources/".length());
            } else if (relativePath.startsWith("/avatar/")) {
                relativePath = "avatar/" + relativePath.substring("/avatar/".length());
            } else if (relativePath.startsWith("/files/messages/")) {
                relativePath = "messages/" + relativePath.substring("/files/messages/".length());
            } else if (relativePath.startsWith("/")) {
                relativePath = relativePath.substring(1);
            }

            Path rootPath = Paths.get(BASE_DIR).toAbsolutePath();
            Path targetPath = rootPath.resolve(relativePath);

            // Security check to prevent directory traversal
            if (!targetPath.normalize().startsWith(rootPath.normalize())) {
                logger.warn("Attempt to delete file outside of base dir: {}", fileUrl);
                return;
            }

            Files.deleteIfExists(targetPath);
        } catch (IOException e) {
            logger.error("Failed to delete file: " + fileUrl, e);
        }
    }

    private String saveFile(MultipartFile file, String relativePath) {
        try {
            Path rootPath = Paths.get(BASE_DIR).toAbsolutePath();
            Path targetPath = rootPath.resolve(relativePath);
            Files.createDirectories(targetPath.getParent());
            file.transferTo(targetPath.toFile());

            // Construct URL
            // Nginx maps:
            // /sources/ -> /app/sources/
            // /avatar/ -> /app/sources/avatar/
            // /files/messages/ -> /app/sources/messages/

            String normalizedPath = relativePath.replace("\\", "/");

            if (normalizedPath.startsWith("avatar/")) {
                return "/" + normalizedPath; // /avatar/1/file.jpg
            } else if (normalizedPath.startsWith("messages/")) {
                return "/files/" + normalizedPath; // /files/messages/...
            } else {
                return "/sources/" + normalizedPath; // /sources/blogpostcontent/...
            }

        } catch (IOException e) {
            logger.error("Failed to store file locally", e);
            throw new BusinessException("文件存储失败");
        }
    }

    private String generateFileName(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String ext = "";
        if (originalFilename != null && originalFilename.lastIndexOf(".") != -1) {
            ext = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        return UUID.randomUUID().toString().replace("-", "") + ext;
    }
}
