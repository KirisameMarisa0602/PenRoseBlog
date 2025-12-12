#!/bin/bash

# 默认分支为 main
BRANCH=${1:-main}

echo "Starting deployment process for branch: $BRANCH..."

# 拉取最新代码
echo "Pulling latest changes from git..."
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# 重新构建并启动容器
echo "Rebuilding and restarting containers..."
docker-compose down
docker-compose up -d --build

# 清理未使用的镜像（构建过程中产生的旧镜像）
echo "Cleaning up unused images..."
docker image prune -f

echo "Deployment completed successfully!"
