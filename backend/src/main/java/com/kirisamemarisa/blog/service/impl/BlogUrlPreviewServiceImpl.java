package com.kirisamemarisa.blog.service.impl;

import com.kirisamemarisa.blog.dto.BlogPreviewDTO;
import com.kirisamemarisa.blog.model.BlogPost;
import com.kirisamemarisa.blog.model.UserProfile;
import com.kirisamemarisa.blog.repository.BlogPostRepository;
import com.kirisamemarisa.blog.repository.UserProfileRepository;
import com.kirisamemarisa.blog.service.BlogUrlPreviewService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 根据文本中的 URL 识别是否为站内博客链接，若是则查库生成预览信息。
 */
@Service
public class BlogUrlPreviewServiceImpl implements BlogUrlPreviewService {

    // 站点域名，可在 application.yml 中配置，如 blog.base-url=https://your-domain.com
    // 这里只用于拼接完整 URL，不再用于严格匹配域名，避免本地开发端口不一致导致匹配失败。
    @Value("${blog.base-url:}")
    private String blogBaseUrl;

    /**
     * 你的前端文章详情路径是 /post/{id}（例如 http://localhost:5173/post/1），
     * 所以这里改为匹配 /post/{数字}。
     *
     * 如果以后路由改成 /blog/{id}，只需把 "post" 改回 "blog" 即可。
     */
    private static final Pattern PATH_PATTERN = Pattern.compile("/post/(\\d+)");

    private final BlogPostRepository blogPostRepository;
    private final UserProfileRepository userProfileRepository;

    public BlogUrlPreviewServiceImpl(BlogPostRepository blogPostRepository,
                                     UserProfileRepository userProfileRepository) {
        this.blogPostRepository = blogPostRepository;
        this.userProfileRepository = userProfileRepository;
    }

    @Override
    public BlogPreviewDTO extractPreviewFromText(String text) {
        if (text == null || text.isEmpty()) return null;

        // 在文本中查找一个形如 /post/{id} 或 http(s)://xxx/post/{id} 的片段
        String urlPart = findBlogUrl(text);
        if (urlPart == null) return null;

        Long blogId = extractBlogId(urlPart);
        if (blogId == null) return null;

        Optional<BlogPost> opt = blogPostRepository.findById(blogId);
        if (opt.isEmpty()) return null;
        BlogPost post = opt.get();

        BlogPreviewDTO dto = new BlogPreviewDTO();
        dto.setBlogId(post.getId());
        dto.setTitle(post.getTitle());
        dto.setCoverImageUrl(post.getCoverImageUrl());

        // createdAt 类型按你的实体来，这里假设 BlogPost.getCreatedAt() 返回 LocalDateTime。
        // 如果是 Instant，可以改为：
        // LocalDateTime created = post.getCreatedAt() == null
        //     ? null
        //     : LocalDateTime.ofInstant(post.getCreatedAt(), ZoneId.systemDefault());
        LocalDateTime created = null;
        if (post.getCreatedAt() instanceof LocalDateTime) {
            created = (LocalDateTime) post.getCreatedAt();
        } else if (post.getCreatedAt() != null) {
            // 如果实际是 Instant，取消注释下面两行并删除上面的判断
            // created = LocalDateTime.ofInstant(
            //     (Instant) post.getCreatedAt(), ZoneId.systemDefault());
        }
        dto.setCreatedAt(created);

        // 预览 URL：前端实际使用的是 /post/{id}，这里保持一致
        String prefix = (blogBaseUrl != null && !blogBaseUrl.isEmpty())
                ? blogBaseUrl.replaceAll("/+$", "")
                : "";
        // 如果不想拼后端域名，只给前端路由，用下面这行：
        // dto.setUrl("/post/" + post.getId());
        dto.setUrl(prefix + "/post/" + post.getId());

        // 作者昵称
        if (post.getUser() != null && post.getUser().getId() != null) {
            UserProfile profile = userProfileRepository
                    .findById(post.getUser().getId())
                    .orElse(null);
            if (profile != null && profile.getNickname() != null) {
                dto.setAuthorNickname(profile.getNickname());
            } else if (post.getUser().getUsername() != null) {
                dto.setAuthorNickname(post.getUser().getUsername());
            } else {
                dto.setAuthorNickname("");
            }
        } else {
            dto.setAuthorNickname("");
        }

        return dto;
    }

    /**
     * 在文本中查找一个形如 http(s)://任意域名/post/{id} 或 /post/{id} 的链接。
     *
     * 不再强依赖 blogBaseUrl，这样本地开发（不同端口）也能识别。
     */
    private String findBlogUrl(String text) {
        if (text == null || text.isEmpty()) return null;

        // 1. 先直接用 PATH_PATTERN 在整段文本里找 /post/{id}
        Matcher m = PATH_PATTERN.matcher(text);
        if (m.find()) {
            // 返回整个匹配片段，如 "/post/1"
            return m.group(0);
        }

        // 2. 可选：如果你希望只识别带域名的完整 URL，可以在这里加一层匹配：
        // Pattern full = Pattern.compile("https?://[^\\s]+/post/(\\d+)");
        // Matcher m2 = full.matcher(text);
        // if (m2.find()) return m2.group(0);

        return null;
    }

    /**
     * 从匹配到的 URL 片段中提取 blogId。
     */
    private Long extractBlogId(String url) {
        if (url == null) return null;
        Matcher m = PATH_PATTERN.matcher(url);
        if (!m.find()) return null;
        try {
            return Long.parseLong(m.group(1));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}