# 微服务架构迁移实战指南

本文档详细说明如何将当前的 PenRoseBlog 单体后端 (`backend`) 改造为 Maven 多模块微服务架构。

## 1. 目标架构概览

我们将把项目重构为以下 Maven 多模块结构：

```text
PenRoseBlog/
├── backend-microservices/ (新根目录)
│   ├── pom.xml (父工程，管理依赖版本)
│   ├── blog-common/ (公共模块：DTO, Utils, Exception, Entity)
│   ├── blog-gateway/ (网关服务：路由, 鉴权, 限流)
│   ├── user-service/ (用户服务：用户, 鉴权, 好友)
│   ├── blog-service/ (博客服务：文章, 评论, 分类)
│   └── notification-service/ (通知服务：消息, 邮件)
```

---

## 2. 实施步骤详解

### 第一步：创建父工程 (Parent Project)

1.  新建文件夹 `backend-microservices`。
2.  在其中创建 `pom.xml`。
3.  **关键配置**：
    *   `packaging` 设为 `pom`。
    *   引入 `spring-boot-dependencies` 和 `spring-cloud-dependencies` 进行版本管理。

```xml
<!-- backend-microservices/pom.xml -->
<packaging>pom</packaging>
<modules>
    <module>blog-common</module>
    <module>blog-gateway</module>
    <module>user-service</module>
    <module>blog-service</module>
    <module>notification-service</module>
</modules>

<dependencyManagement>
    <dependencies>
        <!-- Spring Cloud -->
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-dependencies</artifactId>
            <version>2024.0.0</version> <!-- 对应 Spring Boot 3.4.x -->
            <type>pom</type>
            <scope>import</scope>
        </dependency>
        <!-- Spring Boot -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>3.4.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

### 第二步：抽取公共模块 (blog-common)

这是最关键的一步，避免代码重复。

1.  创建 `blog-common` 模块。
2.  **迁移内容**：
    *   `com.kirisamemarisa.blog.common.*` (ApiResponse, Exception, JwtUtil)
    *   `com.kirisamemarisa.blog.model.*` (JPA 实体类，如果多个服务共用数据库表，或者暂时不拆分数据库)
        *   *微服务最佳实践是数据库也拆分，但初期为了简化，可以先共享数据库，或者将 Entity 复制到各自服务。建议初期：DTO 放 common，Entity 放各自服务。*
    *   `com.kirisamemarisa.blog.dto.*` (数据传输对象)
3.  **依赖**：
    *   Lombok, Jackson, Spring Web (用于注解), Spring Data JPA (如果 Entity 在这里)。

### 第三步：创建网关服务 (blog-gateway)

1.  创建 `blog-gateway` 模块。
2.  **依赖**：`spring-cloud-starter-gateway`, `spring-cloud-starter-loadbalancer` (如果用注册中心)。
3.  **配置 (application.yml)**：

```yaml
server:
  port: 8080 # 网关占用原后端端口，对前端透明

spring:
  application:
    name: blog-gateway
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: http://localhost:8081 # 开发环境直接配置 URL，生产环境用 lb://user-service
          predicates:
            - Path=/api/auth/**, /api/user/**, /api/friend/**
        - id: blog-service
          uri: http://localhost:8082
          predicates:
            - Path=/api/blog/**, /api/comment/**
        - id: notification-service
          uri: http://localhost:8083
          predicates:
            - Path=/api/notification/**
      # 跨域配置 (CORS) 移到网关统一处理
      globalcors:
        cors-configurations:
          '[/**]':
            allowedOrigins: "*"
            allowedMethods: "*"
            allowedHeaders: "*"
```

### 第四步：拆分业务服务

以 **User Service** 为例：

1.  创建 `user-service` 模块。
2.  **依赖**：
    *   `blog-common`
    *   `spring-boot-starter-web`
    *   `spring-boot-starter-data-jpa`
    *   `mysql-connector-j`
3.  **迁移代码**：
    *   将 `UserController`, `AuthController`, `FriendController` 及其对应的 Service, Repository 移动到此模块。
    *   配置文件 `application.properties` 设置端口为 `8081`。

对 **Blog Service** (端口 8082) 和 **Notification Service** (端口 8083) 重复此步骤。

### 第五步：服务间通信 (OpenFeign)

当 Blog Service 需要获取用户信息时（例如显示评论者的头像）：

1.  在 `blog-common` 或 `blog-service` 中定义 Feign Client。

```java
@FeignClient(name = "user-service", url = "http://localhost:8081") // url 用于本地调试
public interface UserClient {
    @GetMapping("/api/user/{id}/simple")
    ApiResponse<UserSimpleDTO> getUserInfo(@PathVariable Long id);
}
```

2.  在启动类添加 `@EnableFeignClients`。

---

## 3. 数据库处理策略

*   **方案 A (推荐 - 独立数据库)**：
    *   新建 `blog_user_db`, `blog_post_db`, `blog_notif_db`。
    *   将原表拆分到不同库。
    *   优点：彻底解耦。缺点：无法使用 Join 查询，需在应用层组装数据。
*   **方案 B (过渡 - 共享数据库)**：
    *   所有微服务连接同一个 `blogdb`。
    *   优点：改动小。缺点：耦合度高，不是真正的微服务。
    *   *建议：先按方案 B 拆分代码，稳定后再按方案 A 拆分数据库。*

## 4. 部署调整

1.  **Docker Compose**: 需要为每个服务编写 Dockerfile，并在 `docker-compose.yml` 中定义 4 个服务 (Gateway + 3个业务服务)。
2.  **Nginx**: 前端请求全部发给 Gateway (8080)，Nginx 配置几乎不用变（或者去掉 Nginx 的 `/api` 反代，直接反代到 Gateway）。

## 5. 开发调试建议

1.  **本地启动顺序**: Redis/MySQL -> Gateway -> User/Blog/Notification Services。
2.  **调试**: 使用 Postman 直接请求 Gateway 端口 (8080)，验证路由是否正确转发到后端微服务。
