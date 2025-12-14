import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url';

// 说明：
// - 开发时通过 Vite 的 proxy 将 /api /avatar /background 等相对路径转发到后端（避免 CORS），
//   后端通常运行在 localhost:8080（可通过环境变量调整）。
// - 生产环境应在 .env.production 中设置 VITE_BACKEND_ORIGIN（例如 https://api.example.com），
//   前端的 resolveUrl 会使用该值生成绝对地址，跳过 dev proxy。

export default ({ mode }) => {
  // 在配置阶段使用 loadEnv 读取 .env* 文件中设置的变量
  const rootDir = fileURLToPath(new URL('.', import.meta.url));
  const env = loadEnv(mode, rootDir, '');

  // 开发环境默认后端端口与 docker-compose/backend 保持一致：8081
  // 如需调整请在 .env.development 设置 VITE_BACKEND_ORIGIN
  const backendTarget = env.VITE_BACKEND_ORIGIN || 'http://localhost:8081';

  return defineConfig({
    plugins: [react()],
    // 将 site_assets 目录作为静态资源目录之一
    publicDir: '../site_assets',
    resolve: {
      alias: {
        '@pages': '/src/pages',
        '@components': '/src/components',
        '@styles': '/src/styles',
        '@utils': '/src/utils',
        '@contexts': '/src/contexts',
        '@hooks': '/src/hooks'
      }
    },
    server: {
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '/api'),
          timeout: 600000, // 10分钟
          proxyTimeout: 600000
        },
        '/avatar': {
          target: backendTarget,
          changeOrigin: true,
          rewrite: path => path // keep same
        },
        '/background': {
          target: backendTarget,
          changeOrigin: true,
          rewrite: path => path,
          bypass: (req) => {
            if (req.url.includes('.mp4')) {
              return req.url;
            }
          }
        },
        '/profile': {
          target: backendTarget,
          changeOrigin: true,
          rewrite: path => path
        },
        // 博客文章封面等静态资源后端路径
        '/sources': {
          target: backendTarget,
          changeOrigin: true,
          rewrite: path => path
        },
        // 常见的上传/静态目录（如果后端使用其它前缀，可在此添加）
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
          rewrite: path => path
        },
        '/files': {
          target: backendTarget,
          changeOrigin: true,
          rewrite: path => path
        }
        // 注意：本地开发时，不要在此处添加 /live2dsrc 的代理。
        // 因为配置了 publicDir: '../site_assets'，Vite 会自动处理 live2d 资源。
        // 如果添加了代理，请求会被错误转发到后端导致 404。
      }
    }
  });
}
