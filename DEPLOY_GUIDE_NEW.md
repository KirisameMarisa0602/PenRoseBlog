# 云服务器部署与清理指南

## 1. 准备工作（本地操作）

我已经为您优化了项目配置，包括：
1.  **`docker-compose.yml`**: 补充了 `JWT_SECRET` 和 OAuth2 相关的环境变量映射，确保生产环境安全。
2.  **`redeploy.sh`**: 增加了自动清理旧镜像的命令，防止磁盘空间被占满。
3.  **`.gitignore`**: 忽略了 `.env` 文件，防止敏感信息泄露。

请先将这些更改推送到远程仓库：

```bash
git add .
git commit -m "chore: optimize deployment config and scripts"
git push
```

## 2. 服务器端操作

登录到您的云服务器，执行以下步骤。

### 步骤 A: 创建环境变量文件 (推荐)
为了安全起见，建议在服务器项目根目录下创建一个 `.env` 文件来存放敏感信息（如数据库密码、JWT 密钥等）。

```bash
# 进入项目目录
cd /home/ubuntu/blog

# 创建并编辑 .env 文件
nano .env
```

在文件中填入以下内容（请替换为您的实际密码和密钥）：

```dotenv
# 数据库密码
DB_PASSWORD=YourStrongPassword2024
# RabbitMQ 用户名密码
RABBITMQ_USER=guest
RABBITMQ_PASS=guest
# JWT 密钥 (生产环境务必修改)
JWT_SECRET=YourSuperSecretKeyForJWTTokenGeneration
# GitHub OAuth (如果需要)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=
```
*按 `Ctrl+O` 保存，`Enter` 确认，`Ctrl+X` 退出。*

### 步骤 B: 执行一键重部署
直接运行优化后的脚本，它会自动拉取最新代码、停止旧服务、重新构建、启动新服务，并清理旧的镜像。

```bash
./redeploy.sh
```

### 步骤 C: 彻底清理（可选）
如果您想**彻底删除**之前所有的旧产物（包括未使用的容器、网络、缓存等），可以手动执行以下命令：

**警告：这将删除所有停止的容器和未使用的镜像！**

```bash
# 1. 停止所有服务
docker-compose down

# 2. 清理所有未使用的系统资源 (容器, 网络, 悬空镜像)
docker system prune -a -f

# 3. (慎用) 如果想连数据库数据也清空，请加 -v
# docker-compose down -v 

# 4. 重新启动
docker-compose up -d --build
```

## 3. 验证部署

部署完成后，检查服务状态：

```bash
docker-compose ps
docker-compose logs -f --tail 100 backend  # 查看后端日志
```
