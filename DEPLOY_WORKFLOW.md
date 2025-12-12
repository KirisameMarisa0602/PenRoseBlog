# 本地开发与远程部署工作流指南

本文档详细说明了如何通过本地开发、Git 同步以及服务器端自动化脚本来实现高效的开发部署流程。

## 1. 服务器端准备（已完成）

服务器根目录 `/home/ubuntu/blog` 下已创建自动化部署脚本 `redeploy.sh`。

该脚本支持指定分支进行部署，默认为 `main` 分支。

**脚本使用方式：**

```bash
# 赋予执行权限（仅需一次）
chmod +x redeploy.sh

# 部署 main 分支（默认）
./redeploy.sh

# 部署 local 分支
./redeploy.sh local
```

## 2. 本地电脑环境设置

请在您的**本地电脑**终端中执行以下操作，初始化项目环境。

### 2.1 拉取项目
```bash
# 克隆远程仓库
git clone git@github.com:KirisameMarisa0602/PenRoseBlog.git

# 进入项目目录
cd PenRoseBlog
```

### 2.2 创建开发分支
建议在 `local` 分支进行开发，保持 `main` 分支稳定。

```bash
# 创建并切换到 local 分支
git checkout -b local

# 将 local 分支推送到远程（首次推送需要设置上游）
git push -u origin local
```

## 3. 日常开发与部署流程

### 3.1 本地开发

后端启动（PowerShell 中需给参数加引号）：
```bash
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

在本地修改代码、测试完成后：

```bash
# 1. 提交更改
git add .
git commit -m "feat: 完成了某个新功能"

# 2. 推送到远程 local 分支
git push
```

### 3.2 服务器端部署

连接到远程服务器（或在 VS Code 终端中），根据您的需求选择部署方式。

#### 方式 A：直接部署 local 分支（测试用）
如果您想快速在服务器上查看 `local` 分支的效果：

```bash
./redeploy.sh local
```

#### 方式 B：合并到 main 后部署（正式发布）
建议在本地完成测试后，将代码合并到 `main` 分支再发布。

**本地操作：**
```bash
git checkout main
git merge local
git push
git checkout local  # 切回 local 继续开发
```

**服务器操作：**
```bash
./redeploy.sh
```

## 4. 脚本原理说明

`redeploy.sh` 脚本会自动执行以下步骤，免去手动输入的繁琐：

1.  **拉取代码**：`git fetch` 和 `git pull` 同步远程最新代码。
2.  **停止服务**：`docker-compose down` 停止当前运行的容器。
3.  **重建部署**：`docker-compose up -d --build` 重新构建镜像并启动容器。

## 5. 完整开发迭代流程 (Cheatsheet)

如果您已经初始化过项目，后续的日常开发请遵循以下步骤：

**Step 1. 开始新工作前（同步最新代码）**
```bash
# 在本地终端
git checkout main
git pull origin main
git checkout local      # 切换回开发分支
git merge main          # 将最新的 main 合并进 local，保持同步
```

**Step 2. 本地开发与测试**
```bash
# 启动后端
cd backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
.\mvnw.cmd spring-boot:run

# 启动前端（新开一个终端窗口）
cd front
npm run dev
```

**Step 3. 提交更改**
```bash
git add .
git commit -m "描述您的修改内容"
git push origin local
```

**Step 4. 合并到主分支（准备发布）**
```bash
git checkout main
git merge local
git push origin main
git checkout local      # 切回 local 准备下一次开发
```

**Step 5. 服务器部署**
```bash
# 在服务器终端（VS Code）
./redeploy.sh
```
