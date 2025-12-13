package com.kirisamemarisa.blog.service.impl;

import com.kirisamemarisa.blog.common.BusinessException;
import com.kirisamemarisa.blog.config.CosProperties;
import com.kirisamemarisa.blog.service.FileStorageService;
import com.qcloud.cos.COSClient;
import com.qcloud.cos.model.ObjectMetadata;
import com.qcloud.cos.model.PutObjectRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
public class FileStorageServiceImpl implements FileStorageService {

    private static final Logger logger = LoggerFactory.getLogger(FileStorageServiceImpl.class);

    private final COSClient cosClient;
    private final CosProperties cosProperties;

    public FileStorageServiceImpl(COSClient cosClient, CosProperties cosProperties) {
        this.cosClient = cosClient;
        this.cosProperties = cosProperties;
    }

    @Override
    public String storeBlogMedia(MultipartFile file, Long userId) {
        String userSegment = userId != null ? Long.toString(userId) : "common";
        String key = "blogpostcontent/" + userSegment + "/" + generateFileName(file);
        return uploadToCos(file, key);
    }

    @Override
    public String storeCoverImage(MultipartFile file, Long userId, Long postId) {
        String userSegment = userId != null ? Long.toString(userId) : "common";
        String postSegment = postId != null ? Long.toString(postId) : "temp";
        String key = "blogpostcover/" + userSegment + "/" + postSegment + "/" + generateFileName(file);
        return uploadToCos(file, key);
    }

    @Override
    public String storeUserMedia(MultipartFile file, Long userId, String type) {
        String userSegment = userId != null ? Long.toString(userId) : "common";
        // type: avatar, background, profile
        String key = type + "/" + userSegment + "/" + generateFileName(file);
        return uploadToCos(file, key);
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
        String key = "messages/" + convoSegment + "/" + generateFileName(file);
        return uploadToCos(file, key);
    }

    @Override
    public Map<String, String> generatePresignedUrl(String fileName, Long userId) {
        String userSegment = userId != null ? Long.toString(userId) : "common";
        String ext = "";
        if (fileName != null && fileName.lastIndexOf(".") != -1) {
            ext = fileName.substring(fileName.lastIndexOf("."));
        }
        String key = "blogpostcontent/" + userSegment + "/" + System.currentTimeMillis() + "_"
                + UUID.randomUUID().toString().substring(0, 8) + ext;

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
        String convoSegment = "unknown";
        if (senderId != null && receiverId != null && senderId > 0 && receiverId > 0) {
            long a = Math.min(senderId, receiverId);
            long b = Math.max(senderId, receiverId);
            convoSegment = a + "-" + b;
        } else if (senderId != null && senderId > 0) {
            convoSegment = "user-" + senderId;
        }

        String ext = "";
        if (fileName != null && fileName.lastIndexOf(".") != -1) {
            ext = fileName.substring(fileName.lastIndexOf("."));
        }
        String key = "messages/" + convoSegment + "/" + System.currentTimeMillis() + "_"
                + UUID.randomUUID().toString().substring(0, 8) + ext;

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
    public void deleteFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return;
        }
        // 提取 Key
        String key = fileUrl;
        if (key.startsWith("http")) {
            // 尝试从 URL 中提取 key
            // 假设 URL 格式为 .../sources/... 或直接是 key
            // 这里简单处理，如果包含 bucket 域名，则去掉域名部分
            // 但由于 URL 格式多样，这里采用简单策略：如果包含 /sources/，则取其后部分
            // 或者如果 FileStorageServiceImpl 的 key 规则不包含 sources/ (看上面代码是 blogpostcontent/...)
            // 上面的代码 key = "blogpostcontent/..."

            // 尝试匹配 blogpostcontent, blogpostcover, avatar, background, profile, messages
            String[] prefixes = { "blogpostcontent/", "blogpostcover/", "avatar/", "background/", "profile/",
                    "messages/" };
            for (String prefix : prefixes) {
                int index = key.indexOf(prefix);
                if (index != -1) {
                    key = key.substring(index);
                    break;
                }
            }
        }

        try {
            cosClient.deleteObject(cosProperties.getBucketName(), key);
            logger.info("成功删除 COS 文件: {}", key);
        } catch (Exception e) {
            logger.error("删除 COS 文件失败: {}", key, e);
        }
    }

    private String generateFileName(MultipartFile file) {
        String rawName = file.getOriginalFilename();
        String ext = "";
        if (rawName != null && rawName.lastIndexOf(".") != -1) {
            ext = rawName.substring(rawName.lastIndexOf("."));
        }
        return System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
    }

    private String uploadToCos(MultipartFile file, String key) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(400, "文件为空");
        }
        try {
            InputStream inputStream = file.getInputStream();
            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentLength(file.getSize());
            metadata.setContentType(file.getContentType());

            PutObjectRequest putObjectRequest = new PutObjectRequest(cosProperties.getBucketName(), key, inputStream,
                    metadata);
            cosClient.putObject(putObjectRequest);

            String cdnUrl = cosProperties.getCdnUrl();
            if (cdnUrl != null && !cdnUrl.isEmpty()) {
                if (!cdnUrl.endsWith("/"))
                    cdnUrl += "/";
                return cdnUrl + key;
            } else {
                // Default COS URL: https://<bucket>.cos.<region>.myqcloud.com/<key>
                return "https://" + cosProperties.getBucketName() + ".cos." + cosProperties.getRegion()
                        + ".myqcloud.com/" + key;
            }
        } catch (IOException e) {
            logger.error("上传文件到COS失败: {}", key, e);
            throw new BusinessException(500, "文件上传失败");
        } catch (Exception e) {
            logger.error("COS服务异常", e);
            throw new BusinessException(500, "存储服务异常");
        }
    }
}
