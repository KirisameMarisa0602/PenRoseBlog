package com.kirisamemarisa.blog.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.BlogViewRecordCreateDTO;
import com.kirisamemarisa.blog.dto.BlogViewStatsDTO;
import com.kirisamemarisa.blog.model.BlogPost;
import com.kirisamemarisa.blog.model.BlogViewRecord;
import com.kirisamemarisa.blog.model.BlogViewStats;
import com.kirisamemarisa.blog.repository.BlogPostRepository;
import com.kirisamemarisa.blog.repository.BlogViewRecordRepository;
import com.kirisamemarisa.blog.repository.BlogViewStatsRepository;
import com.kirisamemarisa.blog.repository.UserRepository;
import com.kirisamemarisa.blog.service.BlogViewService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;
import java.util.Set;

@Service
public class BlogViewServiceImpl implements BlogViewService {

    private static final Logger logger = LoggerFactory.getLogger(BlogViewServiceImpl.class);

    private final BlogPostRepository blogPostRepository;
    private final UserRepository userRepository;
    private final BlogViewRecordRepository blogViewRecordRepository;
    private final BlogViewStatsRepository blogViewStatsRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final org.springframework.transaction.support.TransactionTemplate transactionTemplate;

    private static final String KEY_VIEWED_USERS_PREFIX = "blog:post:viewed_users:";
    private static final String KEY_VIEW_COUNT_DELTA_PREFIX = "blog:post:view_count_delta:";
    private static final String KEY_PENDING_SYNC_POSTS = "blog:post:pending_sync";
    private static final String KEY_PENDING_RECORDS = "blog:view_records:pending";
    private static final long VIEW_COOLDOWN_HOURS = 24; // 24 hours cooldown per user per post

    public BlogViewServiceImpl(BlogPostRepository blogPostRepository,
            UserRepository userRepository,
            BlogViewRecordRepository blogViewRecordRepository,
            BlogViewStatsRepository blogViewStatsRepository,
            StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper,
            org.springframework.transaction.PlatformTransactionManager transactionManager) {
        this.blogPostRepository = blogPostRepository;
        this.userRepository = userRepository;
        this.blogViewRecordRepository = blogViewRecordRepository;
        this.blogViewStatsRepository = blogViewStatsRepository;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.transactionTemplate = new org.springframework.transaction.support.TransactionTemplate(transactionManager);
    }

    @Override
    @Transactional
    public ApiResponse<BlogViewStatsDTO> recordView(BlogViewRecordCreateDTO dto) {
        if (dto == null || dto.getBlogPostId() == null) {
            return new ApiResponse<>(400, "blogPostId 不能为空", null);
        }

        // 检查博客是否存在
        Optional<BlogPost> postOpt = blogPostRepository.findById(dto.getBlogPostId());
        if (postOpt.isEmpty()) {
            return new ApiResponse<>(404, "博客不存在", null);
        }

        Long userId = dto.getUserId();
        boolean isNewView = false;

        if (userId != null) {
            String viewedUsersKey = KEY_VIEWED_USERS_PREFIX + dto.getBlogPostId();
            // Try to add to Redis
            Long added = redisTemplate.opsForSet().add(viewedUsersKey, userId.toString());

            if (added != null && added > 0) {
                // Redis says it's new (or key expired). Check DB to ensure "once per user
                // forever".
                boolean existsInDb = blogViewRecordRepository.existsByBlogPostIdAndUserId(dto.getBlogPostId(), userId);
                if (existsInDb) {
                    // Already viewed in the past, not a new view.
                    isNewView = false;
                } else {
                    // Truly new view
                    isNewView = true;
                }
                // Refresh expiration
                redisTemplate.expire(viewedUsersKey, VIEW_COOLDOWN_HOURS, java.util.concurrent.TimeUnit.HOURS);
            } else {
                // Already in Redis
                isNewView = false;
            }
        } else {
            // TODO: Implement IP-based rate limiting to prevent anonymous user spam
            // Current implementation allows anonymous users to repeatedly increment view
            // count
            // Consider using request IP from HttpServletRequest and tracking in Redis with
            // expiration
            // Example: redisTemplate.opsForValue().set("view_limit:" + postId + ":" +
            // ipAddress, "1", 24, HOURS)
            isNewView = true;
        }

        if (isNewView) {
            // 新增浏览
            String deltaKey = KEY_VIEW_COUNT_DELTA_PREFIX + dto.getBlogPostId();
            redisTemplate.opsForValue().increment(deltaKey);
            redisTemplate.opsForSet().add(KEY_PENDING_SYNC_POSTS, dto.getBlogPostId().toString());

            // 异步记录明细（仅针对登录用户）
            if (userId != null) {
                try {
                    BlogViewRecordDTO recordDTO = new BlogViewRecordDTO(dto.getBlogPostId(), userId,
                            LocalDateTime.now());
                    // Jackson 序列化 LocalDateTime 需要模块支持，这里简单转字符串或确保配置了 JavaTimeModule
                    // 为保险起见，DTO 中使用 String 存储时间或依赖全局配置
                    String json = objectMapper.writeValueAsString(recordDTO);
                    redisTemplate.opsForList().rightPush(KEY_PENDING_RECORDS, json);
                } catch (Exception e) {
                    logger.error("Failed to push view record to redis", e);
                }
            }
        }

        return getStats(dto.getBlogPostId());
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<BlogViewStatsDTO> getStats(Long blogPostId) {
        if (blogPostId == null) {
            return new ApiResponse<>(400, "blogPostId 不能为空", null);
        }

        // 查库
        Optional<BlogViewStats> statsOpt = blogViewStatsRepository.findByBlogPostId(blogPostId);
        long dbCount = statsOpt.map(BlogViewStats::getViewCount).orElse(0L);

        // 查 Redis Delta
        String deltaKey = KEY_VIEW_COUNT_DELTA_PREFIX + blogPostId;
        String deltaStr = redisTemplate.opsForValue().get(deltaKey);
        long delta = deltaStr != null ? Long.parseLong(deltaStr) : 0L;

        BlogViewStatsDTO dto = new BlogViewStatsDTO();
        dto.setBlogPostId(blogPostId);
        dto.setViewCount(dbCount + delta);

        return new ApiResponse<>(200, "获取成功", dto);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<java.util.Map<Long, Long>> getBatchStats(java.util.List<Long> blogPostIds) {
        if (blogPostIds == null || blogPostIds.isEmpty()) {
            return new ApiResponse<>(200, "获取成功", java.util.Collections.emptyMap());
        }

        // 1. Batch fetch from DB
        java.util.List<BlogViewStats> statsList = blogViewStatsRepository.findAllByBlogPostIdIn(blogPostIds);
        java.util.Map<Long, Long> dbCounts = statsList.stream()
                .collect(java.util.stream.Collectors.toMap(s -> s.getBlogPost().getId(), BlogViewStats::getViewCount));

        // 2. Batch fetch from Redis
        java.util.List<String> deltaKeys = blogPostIds.stream()
                .map(id -> KEY_VIEW_COUNT_DELTA_PREFIX + id)
                .collect(java.util.stream.Collectors.toList());

        java.util.List<String> deltaValues = redisTemplate.opsForValue().multiGet(deltaKeys);

        java.util.Map<Long, Long> result = new java.util.HashMap<>();
        for (int i = 0; i < blogPostIds.size(); i++) {
            Long id = blogPostIds.get(i);
            long db = dbCounts.getOrDefault(id, 0L);
            long delta = 0L;
            if (deltaValues != null && deltaValues.get(i) != null) {
                delta = Long.parseLong(deltaValues.get(i));
            }
            result.put(id, db + delta);
        }

        return new ApiResponse<>(200, "获取成功", result);
    }

    @Override
    @Transactional
    public void deleteByBlogPostId(Long blogPostId) {
        if (blogPostId == null) {
            return;
        }

        // 1. 删除数据库中的记录
        blogViewRecordRepository.deleteByBlogPost_Id(blogPostId);
        blogViewStatsRepository.deleteByBlogPost_Id(blogPostId);

        // 2. 清理 Redis 缓存
        String viewedUsersKey = KEY_VIEWED_USERS_PREFIX + blogPostId;
        String deltaKey = KEY_VIEW_COUNT_DELTA_PREFIX + blogPostId;

        redisTemplate.delete(viewedUsersKey);
        redisTemplate.delete(deltaKey);

        // 从待同步集合中移除，防止再次同步
        redisTemplate.opsForSet().remove(KEY_PENDING_SYNC_POSTS, blogPostId.toString());
    }

    @Override
    public void flushPendingViewCounts() {
        syncViewCounts();
    }

    // 定时任务：同步浏览量和记录到数据库
    @Scheduled(fixedDelay = 5000) // 每5秒同步一次
    public void syncViewsToDatabase() {
        // 1. 同步统计计数
        syncViewCounts();

        // 2. 同步浏览记录明细
        syncViewRecords();
    }

    private void syncViewCounts() {
        Set<String> pendingPosts = redisTemplate.opsForSet().members(KEY_PENDING_SYNC_POSTS);
        if (pendingPosts == null || pendingPosts.isEmpty()) {
            return;
        }

        for (String postIdStr : pendingPosts) {
            // 先移除，防止处理期间又有新浏览导致丢失同步信号
            redisTemplate.opsForSet().remove(KEY_PENDING_SYNC_POSTS, postIdStr);
            try {
                Long postId = Long.parseLong(postIdStr);
                String deltaKey = KEY_VIEW_COUNT_DELTA_PREFIX + postId;

                // 原子获取并删除（重置）
                DefaultRedisScript<String> script = new DefaultRedisScript<>();
                script.setScriptText(
                        "local val = redis.call('GET', KEYS[1]); redis.call('DEL', KEYS[1]); return val;");
                script.setResultType(String.class);
                String deltaStr = redisTemplate.execute(script, Collections.singletonList(deltaKey));

                if (deltaStr != null) {
                    long delta = Long.parseLong(deltaStr);
                    if (delta > 0) {
                        // 使用事务模板确保 DB 操作的原子性
                        transactionTemplate.executeWithoutResult(status -> {
                            BlogViewStats stats = blogViewStatsRepository.findByBlogPostId(postId)
                                    .orElseGet(() -> {
                                        BlogViewStats s = new BlogViewStats();
                                        s.setBlogPost(blogPostRepository.getReferenceById(postId));
                                        s.setViewCount(0L);
                                        return s;
                                    });
                            stats.setViewCount(stats.getViewCount() + delta);
                            blogViewStatsRepository.save(stats);

                            // 如果需要同步更新 BlogPost 表，可以在这里添加
                            // blogPostRepository.updateViewCount(postId, stats.getViewCount());
                        });
                    }
                }
            } catch (Exception e) {
                logger.error("Error syncing view stats for post " + postIdStr, e);
                // 如果失败，尝试加回集合以便下次重试（可选）
                redisTemplate.opsForSet().add(KEY_PENDING_SYNC_POSTS, postIdStr);
            }
        }
    }

    private void syncViewRecords() {
        // 每次处理最多 100 条，防止长事务
        for (int i = 0; i < 100; i++) {
            String json = redisTemplate.opsForList().leftPop(KEY_PENDING_RECORDS);
            if (json == null)
                break;

            try {
                BlogViewRecordDTO dto = objectMapper.readValue(json, BlogViewRecordDTO.class);
                transactionTemplate.executeWithoutResult(status -> {
                    BlogViewRecord record = new BlogViewRecord();
                    record.setBlogPost(blogPostRepository.getReferenceById(dto.blogPostId));
                    if (dto.userId != null) {
                        record.setUser(userRepository.getReferenceById(dto.userId));
                    }
                    record.setViewedAt(dto.viewedAt);
                    blogViewRecordRepository.save(record);
                });
            } catch (Exception e) {
                logger.error("Error syncing view record: " + json, e);
                // 可选：如果失败，可以将 json 重新 push 回队列（右侧），或者放入死信队列
                // redisTemplate.opsForList().rightPush(KEY_PENDING_RECORDS, json);
            }
        }
    } // 内部 DTO 用于序列化

    public static class BlogViewRecordDTO {
        public Long blogPostId;
        public Long userId;
        public LocalDateTime viewedAt;

        public BlogViewRecordDTO() {
        }

        public BlogViewRecordDTO(Long blogPostId, Long userId, LocalDateTime viewedAt) {
            this.blogPostId = blogPostId;
            this.userId = userId;
            this.viewedAt = viewedAt;
        }
    }
}
