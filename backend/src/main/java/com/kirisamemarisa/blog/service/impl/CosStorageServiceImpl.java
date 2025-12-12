package com.kirisamemarisa.blog.service.impl;

import com.kirisamemarisa.blog.common.BusinessException;
import com.kirisamemarisa.blog.config.CosProperties;
import com.kirisamemarisa.blog.service.FileStorageService;
import com.qcloud.cos.COSClient;
import com.qcloud.cos.model.ObjectMetadata;
import com.qcloud.cos.model.PutObjectRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;

import com.qcloud.cos.http.HttpMethodName;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
@Primary // 优先使用 COS 存储
public class CosStorageServiceImpl implements FileStorageService {

    private static final Logger logger = LoggerFactory.getLogger(CosStorageServiceImpl.class);

    private final COSClient cosClient;
    private final CosProperties cosProperties;

    public CosStorageServiceImpl(COSClient cosClient, CosProperties cosProperties) {
        this.cosClient = cosClient;
        this.cosProperties = cosProperties;
    }

    @Override
    public String storeBlogMedia(MultipartFile file, Long userId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(400, "文件为空");
        }
        String userSegment = userId != null ? Long.toString(userId) : "common";
        // 保持原有的路径结构: sources/blogpostcontent/{userId}/{uuid}.ext
        // 注意：COS 中不需要 sources/ 前缀，或者可以保留以保持一致性。
        // 这里我们保留 sources/blogpostcontent/ 前缀，以便与前端 resolveUrl 逻辑匹配
        String key = "sources/blogpostcontent/" + userSegment + "/" + generateFileName(file);
        return uploadToCos(file, key);
    }

    @Override
    public String storeCoverImage(MultipartFile file, Long userId, Long postId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(400, "文件为空");
        }
        String userSegment = userId != null ? Long.toString(userId) : "common";
        String postSegment = postId != null ? Long.toString(postId) : "temp";
        // 保持原有的路径结构: sources/blogpostcover/{userId}/{postId}/{uuid}.ext
        String key = "sources/blogpostcover/" + userSegment + "/" + postSegment + "/" + generateFileName(file);
        return uploadToCos(file, key);
    }

    @Override
    public String storeUserMedia(MultipartFile file, Long userId, String type) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(400, "文件为空");
        }
        String userSegment = userId != null ? Long.toString(userId) : "common";
        // type: avatar, background, profile
        // path: sources/{type}/{userId}/{uuid}.ext
        String key = "sources/" + type + "/" + userSegment + "/" + generateFileName(file);
        return uploadToCos(file, key);
    }

    @Override
    public String storeMessageMedia(MultipartFile file, Long senderId, Long receiverId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(400, "文件为空");
        }
        // 保持原有的路径结构: sources/messages/{senderId}-{receiverId}/{uuid}.ext
        String key = "sources/messages/" + senderId + "-" + receiverId + "/" + generateFileName(file);
        return uploadToCos(file, key);
    }

    @Override
    public Map<String, String> generatePresignedUrl(String fileName, Long userId) {
        String userSegment = userId != null ? Long.toString(userId) : "common";
        String ext = "";
        if (fileName != null && fileName.lastIndexOf(".") != -1) {
            ext = fileName.substring(fileName.lastIndexOf("."));
        }
        // 保持与 storeBlogMedia 一致的路径结构
        String key = "sources/blogpostcontent/" + userSegment + "/" + UUID.randomUUID().toString() + ext;

        // 生成预签名 URL
        Date expiration = new Date(System.currentTimeMillis() + 30 * 60 * 1000); // 30分钟有效期
        java.net.URL url = cosClient.generatePresignedUrl(cosProperties.getBucketName(), key, expiration,
                HttpMethodName.PUT);

        Map<String, String> result = new HashMap<>();
        result.put("uploadUrl", url.toString());

        // 计算最终访问 URL
        String cdnUrl = cosProperties.getCdnUrl();
        String publicUrl;
        if (cdnUrl != null && !cdnUrl.isEmpty()) {
            if (!cdnUrl.endsWith("/"))
                cdnUrl += "/";
            publicUrl = cdnUrl + key;
        } else {
            publicUrl = "https://" + cosProperties.getBucketName() + ".cos." + cosProperties.getRegion()
                    + ".myqcloud.com/" + key;
        }
        result.put("publicUrl", publicUrl);

        return result;
    }

    @Override
    public Map<String, String> generateMessagePresignedUrl(String fileName, Long senderId, Long receiverId) {
        String ext = "";
        if (fileName != null && fileName.lastIndexOf(".") != -1) {
            ext = fileName.substring(fileName.lastIndexOf("."));
        }
        // 保持与 storeMessageMedia 一致的路径结构:
        // sources/messages/{senderId}-{receiverId}/{uuid}.ext
        String key = "sources/messages/" + senderId + "-" + receiverId + "/" + UUID.randomUUID().toString() + ext;

        // 生成预签名 URL
        Date expiration = new Date(System.currentTimeMillis() + 30 * 60 * 1000); // 30分钟有效期
        java.net.URL url = cosClient.generatePresignedUrl(cosProperties.getBucketName(), key, expiration,
                HttpMethodName.PUT);

        Map<String, String> result = new HashMap<>();
        result.put("uploadUrl", url.toString());

        // 计算最终访问 URL
        String cdnUrl = cosProperties.getCdnUrl();
        String publicUrl;
        if (cdnUrl != null && !cdnUrl.isEmpty()) {
            if (!cdnUrl.endsWith("/"))
                cdnUrl += "/";
            publicUrl = cdnUrl + key;
        } else {
            publicUrl = "https://" + cosProperties.getBucketName() + ".cos." + cosProperties.getRegion()
                    + ".myqcloud.com/" + key;
        }
        result.put("publicUrl", publicUrl);

        return result;
    }

    private String generateFileName(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String ext = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        return UUID.randomUUID().toString() + ext;
    }

    private String uploadToCos(MultipartFile file, String key) {
        try (InputStream inputStream = file.getInputStream()) {
            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentLength(file.getSize());
            metadata.setContentType(file.getContentType());

            PutObjectRequest putObjectRequest = new PutObjectRequest(cosProperties.getBucketName(), key, inputStream,
                    metadata);
            cosClient.putObject(putObjectRequest);

            // 返回相对路径，前端 resolveUrl 会自动拼接 CDN 域名
            // 注意：这里返回的必须是 / 开头的路径，或者符合 resolveUrl 的正则
            return "/" + key;
        } catch (IOException e) {
            logger.error("上传文件到 COS 失败: {}", key, e);
            throw new BusinessException(500, "文件上传失败");
        } catch (Exception e) {
            logger.error("COS 服务异常", e);
            throw new BusinessException(500, "云存储服务异常");
        }
    }
}
