# Docker 常用指令备忘录

本文档整理了本项目（基于 Docker Compose）常用的 Docker 操作指令，方便日常运维和调试。

## 1. 基础启停

### 启动所有服务
后台启动所有服务（如果镜像不存在会自动构建）：
```bash
docker-compose up -d
```

### 重新构建并启动
当修改了代码（后端 Java 或前端 Vue/React）后，需要重新构建镜像并重启：
```bash
docker-compose up -d --build
```
*   `--build`: 强制重新构建镜像。
*   `-d`: 后台运行。

### 停止所有服务
停止并移除容器（保留数据卷）：
```bash
docker-compose down
```

### 停止并删除所有数据
**警告**：这将删除数据库和 Redis 中的所有数据！
```bash
docker-compose down -v
```

## 2. 单个服务操作

### 只重启前端
```bash
docker-compose restart frontend
```

### 只重新构建前端
```bash
docker-compose up -d --build frontend
```

### 只重新构建后端
```bash
docker-compose up -d --build backend
```

## 3. 查看状态与日志

### 查看运行中的容器
```bash
docker-compose ps
```

### 查看所有容器（包括停止的）
```bash
docker-compose ps -a
```

### 查看日志
查看所有服务的实时日志：
```bash
docker-compose logs -f
```

查看特定服务（如后端）的日志：
```bash
docker-compose logs -f backend
```
*   `-f`: 实时跟随日志输出 (Follow)。
*   `--tail 100`: 只看最后 100 行。

## 4. 清理与维护

### 清理旧镜像
构建新镜像后，旧的镜像会变成 `<none>` (dangling images)，占用磁盘空间。
清理所有悬空镜像：
```bash
docker image prune -f
```

### 清理所有未使用的对象
**慎用**：清理所有停止的容器、未使用的网络和悬空镜像。
```bash
docker system prune -f
```

## 5. 进入容器内部

有时候需要进入容器内部查看文件或执行命令（如查看生成的日志文件、手动连接数据库等）。

### 进入后端容器
```bash
docker-compose exec backend /bin/bash
# 或者
docker exec -it blog-backend /bin/bash
```

### 进入数据库容器
```bash
docker-compose exec mysql /bin/bash
# 登录 MySQL
mysql -u root -p
```

## 6. 常见问题排查

### 端口冲突
如果启动失败提示端口被占用：
```bash
# 查看端口占用情况
netstat -tulpn | grep <端口号>
```

### 容器启动失败
如果容器状态是 `Exited` 或 `Restarting`，查看日志找原因：
```bash
docker-compose logs --tail 50 <服务名>
```
