# bilibili banner 抓取工具

将 bilibili 首页顶部 banner 的动态图层抓取到本地，以供前端导航栏作为可交互背景显示。

## 输出目录

抓取结果写入到 `public/banner`：

- `public/banner/assets/{id}/data.json` 与若干图片/视频资源
- `public/banner/manifest.json`（主题清单，数组项包含 `id/name/createdAt`）

前端从以上目录按 HTTP 路径读取：

- 清单：`/banner/manifest.json`
- 单个主题：`/banner/assets/{id}/data.json`

## 运行

1. 安装依赖（首次）：
   - `npm i puppeteer -D`
2. 执行抓取（默认 id=今天日期）：
   - `npm run banner:grab`
3. 指定名称或 id（建议使用当天日期，如 2025-11-12）：
   - `npm run banner:grab -- --name "测试抓取" --id 2025-11-12`
4. 仅生成/重建清单（扫描 public/banner/assets/*）：
   - `npm run banner:manifest`

完成后，刷新开发页面即可看到最新主题位于导航栏背景，并会在“上滑显示导航栏”时轮换下一主题。
