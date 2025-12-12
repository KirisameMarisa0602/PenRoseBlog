# 项目代码审计报告 (Project Audit Report)

**日期**: 2025年12月13日
**审计对象**: PenRoseBlog (前后端代码)

本报告汇总了对 PenRoseBlog 项目进行全面代码审计后发现的安全漏洞、配置风险及代码质量问题。建议在部署前优先修复严重（Critical）和高危（High）级别的问题。

## 1. 严重安全漏洞 (Critical)

### 1.1 越权访问 (IDOR - Insecure Direct Object Reference)
*   **描述**: 多个核心业务接口直接信任前端传递的 `userId` 参数，未校验该 ID 是否属于当前登录用户。攻击者可篡改 `userId` 冒充他人进行操作。
*   **受影响文件**:
    *   `backend/.../controller/BlogPostController.java`: `create`, `toggleLike`, `toggleFavorite`
    *   `backend/.../controller/CommentController.java`: `deleteComment`, `toggleLike`
    *   `backend/.../service/impl/BlogPostServiceImpl.java`
*   **证据**:
    ```java
    // BlogPostController.java
    @PostMapping("/{id}/like")
    public ApiResponse<Boolean> toggleLike(@PathVariable Long id, @RequestParam Long userId) {
        // 直接使用传入的 userId，未验证身份
        return blogPostService.toggleLike(id, userId);
    }
    ```
*   **修复建议**:
    *   移除接口参数中的 `userId`。
    *   在 Controller 中通过 `SecurityContextHolder` 获取当前认证用户的 ID。
    *   参考 `UserController.java` 中的正确实现：
        ```java
        Long currentUserId = com.kirisamemarisa.blog.common.JwtUtil.getUserIdFromToken(token);
        if (!currentUserId.equals(targetUserId)) { throw new AccessDeniedException(...); }
        ```

### 1.2 存储型跨站脚本攻击 (Stored XSS)
*   **描述**: 前端使用 `marked` 库解析 Markdown 内容，并通过 `dangerouslySetInnerHTML` 直接渲染 HTML，未进行任何清洗（Sanitization）。攻击者可在文章中嵌入恶意脚本（如 `<script>`），当其他用户浏览时触发执行。
*   **受影响文件**:
    *   `front/src/pages/BlogEditor.jsx`
    *   `front/src/pages/ArticleDetail.jsx`
*   **证据**:
    ```jsx
    // BlogEditor.jsx
    <div className="tiptap-content" dangerouslySetInnerHTML={{ __html: previewHtml }} />
    ```
*   **修复建议**:
    *   引入 `dompurify` 库：`npm install dompurify`
    *   在渲染前清洗 HTML：
        ```javascript
        import DOMPurify from 'dompurify';
        // ...
        const cleanHtml = DOMPurify.sanitize(marked.parse(content));
        <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
        ```

### 1.3 硬编码敏感信息
*   **描述**: 数据库密码和 JWT 签名密钥以明文形式硬编码在配置文件中。
*   **受影响文件**:
    *   `backend/src/main/resources/application.properties`
*   **证据**:
    ```properties
    spring.datasource.password=20050602
    jwt.secret=VJ2fwrQ7Qq3S3UqY5yH2Z0t9Nf3KX8u6rPgC1yM4rQe9W7ZkH1vT2aR5mN8sQ0xB
    ```
*   **修复建议**:
    *   使用环境变量替换硬编码值：
        ```properties
        spring.datasource.password=${DB_PASSWORD}
        jwt.secret=${JWT_SECRET}
        ```
    *   在生产环境部署时通过环境变量注入真实值。

### 1.4 文件上传鉴权缺失
*   **描述**: 获取文件上传预签名 URL 的接口未正确实现用户身份绑定，逻辑被注释或缺失。
*   **受影响文件**:
    *   `backend/.../controller/FileController.java`
*   **证据**:
    ```java
    // Long userId = null; // 逻辑缺失
    return ApiResponse.success(fileStorageService.generatePresignedUrl(fileName, userId));
    ```
*   **修复建议**:
    *   完善 `userId` 获取逻辑，确保只有登录用户才能上传文件。
    *   限制 `fileName` 参数，防止路径遍历攻击（如 `../../etc/passwd`）。

## 2. 高危/中危风险 (High/Medium)

### 2.1 CORS 配置过于宽松
*   **描述**: 允许所有域名 (`*`) 进行跨域访问，增加了 CSRF 和数据泄露的风险。
*   **受影响文件**: `backend/.../config/SecurityConfig.java`
*   **修复建议**: 在生产环境中，将 `AllowedOriginPattern` 限制为前端实际部署的域名。

### 2.2 输入校验缺失
*   **描述**: `BlogPostCreateDTO` 等数据传输对象缺少校验注解（如 `@NotBlank`, `@Size`），且 Controller 层未使用 `@Valid`。
*   **受影响文件**: `backend/.../dto/BlogPostCreateDTO.java`, `BlogPostController.java`
*   **修复建议**:
    *   在 DTO 字段上添加 `jakarta.validation.constraints` 注解。
    *   在 Controller 方法参数前添加 `@Valid` 注解。

### 2.3 JWT 密钥配置逻辑风险
*   **描述**: `JwtUtil.java` 中，如果 `jwt.secret` 未配置，会生成随机密钥。这虽然保证了安全性，但会导致服务重启后所有旧 Token 失效，影响用户体验。
*   **修复建议**: 确保生产环境启动脚本中强制检查 `JWT_SECRET` 环境变量是否存在。

## 3. 代码质量与架构建议

*   **前端 Markdown 转换**: `BlogEditor.jsx` 在富文本和 Markdown 模式切换时使用 `turndown` 和 `marked` 进行转换。这种转换通常是有损的，可能导致复杂的格式丢失。建议考虑统一存储格式或提示用户切换可能导致格式丢失。
*   **依赖版本**: `pom.xml` 中 `spring-boot-starter-parent` 版本为 `3.5.7`，请确认该版本是否符合实际使用的 Spring Boot 版本（当前主流稳定版为 3.x）。
*   **数据库迁移**: 建议使用 Flyway 或 Liquibase 管理数据库版本，而不是依赖 `spring.jpa.hibernate.ddl-auto=update`，后者在生产环境中可能导致意外的 Schema 变更。

## 4. 下一步行动计划

1.  **立即修复**: 按照上述建议修复 IDOR 和 XSS 漏洞。
2.  **本地美化**: 进行样式调整（用户当前计划）。
3.  **部署准备**:
    *   配置环境变量（DB 密码, JWT 密钥）。
    *   构建前端生产包。
    *   调整 CORS 策略。
