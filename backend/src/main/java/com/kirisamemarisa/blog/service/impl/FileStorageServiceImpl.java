package com.kirisamemarisa.blog.service.impl;

import com.kirisamemarisa.blog.common.BusinessException;
import com.kirisamemarisa.blog.config.ResourceProperties;
import com.kirisamemarisa.blog.service.FileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileStorageServiceImpl implements FileStorageService {

    private static final Logger logger = LoggerFactory.getLogger(FileStorageServiceImpl.class);

    private final ResourceProperties resourceProperties;

    public FileStorageServiceImpl(ResourceProperties resourceProperties) {
        this.resourceProperties = resourceProperties;
    }

    @Override
    public String storeBlogMedia(MultipartFile file, Long userId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(400, "文件为空");
        }
        if (userId != null && userId <= 0) {
            throw new BusinessException(400, "非法的 userId");
        }

        // 使用 blogpostcontentLocation 作为基准目录，保持与其他资源目录结构一致
        Path baseDir = Paths.get(toLocalPath(resourceProperties.getBlogpostcontentLocation())).toAbsolutePath()
                .normalize();
        String userSegment = userId != null ? Long.toString(userId) : "common";
        Path dirPath = baseDir.resolve(userSegment).normalize();
        try {
            if (!dirPath.startsWith(baseDir)) {
                logger.warn("目标目录不在允许范围内: {} (base: {})", dirPath, baseDir);
                throw new BusinessException(400, "非法的目标目录");
            }
            Files.createDirectories(dirPath);
        } catch (IOException e) {
            logger.error("无法创建目录: {}", dirPath, e);
            throw new BusinessException(500, "上传失败（无法创建目录）");
        }

        String rawName = file.getOriginalFilename();
        String safeName = sanitizeFilename(rawName);
        if (safeName.isEmpty())
            safeName = String.valueOf(System.currentTimeMillis());
        String fileName = System.currentTimeMillis() + "_" + safeName;
        Path destPath = dirPath.resolve(fileName).normalize();
        try {
            Path allowed = dirPath.toAbsolutePath().normalize();
            if (!destPath.startsWith(allowed)) {
                logger.warn("尝试写入不允许的位置: {} (allowed: {})", destPath, allowed);
                throw new BusinessException(400, "非法的文件路径");
            }
            File destFile = destPath.toFile();
            file.transferTo(destFile);
            // 返回 URL 路径需与 WebConfig 中的映射一致：/sources/blogpostcontent/**
            return "/sources/blogpostcontent/" + (userId != null ? userSegment + "/" : "common/") + fileName;
        } catch (IOException e) {
            logger.error("上传媒体失败", e);
            throw new BusinessException(500, "上传失败");
        }
    }

    @Override
    public String storeMessageMedia(MultipartFile file, Long senderId, Long receiverId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(400, "上传文件不能为空");
        }

        String originalFilename = file.getOriginalFilename();
        String ext = "";
        if (originalFilename != null) {
            int dotIndex = originalFilename.lastIndexOf('.');
            if (dotIndex >= 0 && dotIndex < originalFilename.length() - 1) {
                ext = originalFilename.substring(dotIndex);
            }
        }

        String filename = UUID.randomUUID().toString().replace("-", "") + ext;
        // 重要：配置里可能是 file:D:/... 这样的 URI 风格，这里需要转为本地路径
        Path baseDir = Paths.get(toLocalPath(resourceProperties.getMessageMediaLocation()))
                .toAbsolutePath()
                .normalize();

        // 为会话创建子目录：按参与者ID排序，确保同一对话固定一个目录
        String convoSegment = "unknown";
        if (senderId != null && receiverId != null && senderId > 0 && receiverId > 0) {
            long a = Math.min(senderId, receiverId);
            long b = Math.max(senderId, receiverId);
            convoSegment = a + "-" + b;
        } else if (senderId != null && senderId > 0) {
            convoSegment = "user-" + senderId;
        }

        Path dirPath = baseDir.resolve(convoSegment).normalize();
        try {
            // 目录越权保护
            if (!dirPath.startsWith(baseDir)) {
                throw new BusinessException(400, "非法的上传目录");
            }
            Files.createDirectories(dirPath);
        } catch (IOException e) {
            throw new BusinessException(500, "创建上传目录失败: " + dirPath);
        }

        Path destPath = dirPath.resolve(filename).normalize();
        if (!destPath.startsWith(dirPath)) {
            throw new BusinessException(400, "非法的目标路径");
        }
        try {
            file.transferTo(destPath.toFile());
        } catch (IOException e) {
            throw new BusinessException(500, "保存上传文件失败: " + destPath);
        }

        String prefix = resourceProperties.getMessageMediaAccessPrefix();
        if (prefix == null || prefix.isEmpty())
            prefix = "/files/messages";
        if (!prefix.startsWith("/"))
            prefix = "/" + prefix;
        if (prefix.endsWith("/"))
            prefix = prefix.substring(0, prefix.length() - 1);

        return prefix + "/" + convoSegment + "/" + filename;
    }

    private String toLocalPath(String configured) {
        if (configured == null)
            return "";
        String v = configured;
        if (v.startsWith("file:"))
            v = v.substring(5);
        if (!v.endsWith(File.separator) && !v.endsWith("/")) {
            v = v + File.separator;
        }
        return v.replace('/', File.separatorChar);
    }

    private String sanitizeFilename(String raw) {
        if (raw == null)
            return "";
        String name = raw;
        int idx = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (idx >= 0 && idx + 1 < name.length())
            name = name.substring(idx + 1);
        name = name.replace("..", "");
        name = name.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (name.length() > 200)
            name = name.substring(name.length() - 200);
        return name;
    }
}
