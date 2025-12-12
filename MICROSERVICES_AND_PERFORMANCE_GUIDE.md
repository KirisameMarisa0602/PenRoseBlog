# 微服务化与极致性能优化指南

本文档详细指导如何将 PenRoseBlog 从单体架构演进为微服务架构，并实施极致的性能优化。

## 1. 微服务化探索 (Microservices Migration)

当单体应用（Monolith）变得过于庞大，维护成本增加，或者不同模块的扩展需求不一致时（例如：博客浏览量巨大，但用户注册量很小），可以考虑微服务拆分。

### 1.1 服务拆分策略

建议将现有后端拆分为以下三个核心微服务：

1.  **User Service (用户服务)**
    *   **职责**: 用户注册、登录认证 (JWT)、个人资料管理、好友关系。
    *   **数据库**: `user`, `user_profile`, `follow`, `friend_request` 表。
    *   **端口**: 8081

2.  **Blog Service (博客服务)**
    *   **职责**: 文章发布、浏览、评论、点赞、分类标签管理。
    *   **数据库**: `blog_post`, `comment`, `category`, `tag` 等表。
    *   **端口**: 8082

3.  **Notification Service (通知服务)**
    *   **职责**: 站内信、邮件发送、实时消息推送 (SSE/WebSocket)。
    *   **数据库**: `private_message`, `notification` (如果存在)。
    *   **端口**: 8083

### 1.2 引入 Spring Cloud Gateway

作为统一的流量入口，网关负责路由转发、鉴权和限流。

**依赖 (pom.xml):**
```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway</artifactId>
</dependency>
```

**配置 (application.yml):**
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/api/user/**
        - id: blog-service
          uri: lb://blog-service
          predicates:
            - Path=/api/blog/**
      globalcors:
        cors-configurations:
          '[/**]':
            allowedOrigins: "*"
            allowedMethods: "*"
```

### 1.3 服务间通信
*   **同步调用**: 使用 **OpenFeign** 进行服务间 HTTP 调用（例如：博客服务需要查询用户信息）。
*   **异步解耦**: 继续使用 **RabbitMQ** 处理非关键链路（例如：发布文章后通知粉丝）。

---

## 2. 极致性能优化 (Performance Optimization)

### 2.1 静态资源 CDN 加速

将 `site_assets` (静态图标、Banner) 和 `sources` (用户上传的图片) 接入 CDN，可以显著降低服务器带宽压力。

**步骤：**

1.  **选购 CDN 服务**: 阿里云 OSS、腾讯云 COS 或 Cloudflare R2。
2.  **配置回源**: 设置 CDN 回源到你的服务器 IP（或者直接将文件上传到对象存储）。
3.  **前端改造**: 修改 `front/src/utils/resolveUrl.js`。

```javascript
// front/src/utils/resolveUrl.js
const CDN_URL = import.meta.env.VITE_CDN_URL || ''; // e.g., 'https://cdn.example.com'

export default function resolveUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  
  // 如果配置了 CDN，且资源属于静态资源或上传资源，则走 CDN
  if (CDN_URL && (url.startsWith('/sources') || url.startsWith('/site_assets'))) {
      return CDN_URL + url;
  }
  
  // ... 原有逻辑
}
```

### 2.2 多级缓存体系 (L1 Caffeine + L2 Redis)

引入 Caffeine 本地缓存，拦截高频热点读取（如首页文章列表、全局配置），减少 Redis 网络开销。

**依赖:**
```xml
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>
```

**配置 CacheConfig.java:**

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory redisConnectionFactory) {
        // L2: Redis Cache
        RedisCacheManager redisManager = RedisCacheManager.builder(redisConnectionFactory).build();
        
        // L1: Caffeine Cache
        CaffeineCacheManager caffeineManager = new CaffeineCacheManager();
        caffeineManager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(5, TimeUnit.MINUTES)
                .maximumSize(1000));
        
        // 组合 CacheManager (需自定义 CompositeCacheManager 逻辑或使用 Spring Cache 的多 CacheManager 支持)
        // 简单做法：针对不同业务场景注入不同的 CacheManager
        return redisManager; 
    }
    
    @Bean("localCacheManager")
    public CacheManager localCacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(1, TimeUnit.MINUTES)
                .maximumSize(100));
        return manager;
    }
}
```

**使用:**

```java
// 使用本地缓存，极大提升首页 QPS
@Cacheable(value = "home_posts", key = "#page", cacheManager = "localCacheManager")
public Page<BlogPostDTO> getHomePosts(int page) { ... }
```
