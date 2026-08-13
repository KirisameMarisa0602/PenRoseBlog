# PenRoseBlog
http://62.234.102.189

一个轻社交博客平台（前后端分离），包含文章/评论/关注好友/私信、通知与 SSE 实时推送，以及 AI 流式对话等能力。

## 目录结构

> 以仓库根目录为准（省略部分细节）。

```
.
├── docker-compose.yml        # 本地/生产一键编排：MySQL、Redis、RabbitMQ、backend、
├── redeploy.sh              # 简单重建部署脚本（compose down + up --build + prune）
├── package.json             # 根目录脚本（如有），通常用于辅助命令/统一入口
├── prompt.txt               # 辅助文件（不影响运行）
├── doc/                     # 项目文档
│   ├── 系统设计文档.md
│   └── 项目说明.md
├── backend/                 # 后端：Spring Boot
│   ├── Dockerfile
│   ├── pom.xml
│   ├── mvnw / mvnw.cmd      # Maven Wrapper 入口（建议保留并提交 .mvn/wrapper）
│   ├── .mvn/wrapper/        # Maven Wrapper 依赖与版本配置
│   └── src/
│       ├── main/
│       │   ├── java/        # Java 源码（controller/service/repository/dto 等）
│       │   └── resources/   # 配置文件（application.properties 等）
│       └── test/            # 测试代码
├── front/                   # 前端：React + Vite（由 Nginx 托管静态资源）
│   ├── Dockerfile
│   ├── nginx.conf           # 前端容器内 Nginx 配置（含 /api 反代、SSE 相关配置）
│   ├── vite.config.js
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── main.jsx / App.jsx
│       ├── pages/           # 页面级路由组件
│       ├── components/      # 可复用组件
│       ├── contexts/        # 全局状态/上下文（主题、AI、上传状态等）
│       ├── hooks/           # 自定义 hooks
│       ├── utils/           # 工具与 API 封装
│       └── styles/          # 样式
├── site_assets/             # 站点静态资源（供前端容器挂载/使用，目前挂在腾讯云COS）
└── sources/                 # 用户上传资源的目录（挂在腾讯云COS，也可以用作本地模拟服务器的资源映射路径）
```

## 模块关系（快速理解）

- `front/`：浏览器侧 SPA，静态资源由 Nginx 容器提供；通过 Nginx 反代访问后端 `/api`。
- `backend/`：提供 REST API + SSE（通知/私信/AI 流式）。
- `docker-compose.yml`：把 MySQL/Redis/RabbitMQ 与前后端一起拉起，形成可运行闭环。
- `doc/`：系统设计与项目说明文档（接口与关键链路说明以此为准）。

## 运行方式（最小提示）

- Docker Compose（如果有。本项目部署服务器采用docker构建）：在仓库根目录执行 `docker compose up -d --build`
- 后端（本地开发测试）：`cd backend && ./mvnw spring-boot:run`
- 前端（本地开发测试）：`cd front && npm install && npm run dev`
