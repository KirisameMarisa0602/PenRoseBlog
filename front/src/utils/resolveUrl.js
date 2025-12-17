const CDN_URL = import.meta.env.VITE_CDN_URL || '';
// 优先使用 VITE_BACKEND_ORIGIN（生产部署时在 .env.production 设置），开发环境回退到 window.location.origin
const backend = import.meta.env.VITE_BACKEND_ORIGIN || (typeof window !== 'undefined' ? window.location.origin : '');

// 将后端返回的图片/媒体路径规范为浏览器可请求的 URL
export default function resolveUrl(url) {
  if (!url) return '';
  // 如果是 http/https、blob 或 data 协议，直接返回
  if (/^(https?|blob|data):/i.test(url)) return url;

  let path = url;

  // 规范化路径，确保以 / 开头
  if (!path.startsWith('/')) {
    // 兼容历史存量：如 "1/<uuid>.jpg" 这类未带前缀的相对路径，默认映射到 /sources/blogpostcontent
    const bareMedia = /^(\d+)\/[a-z0-9\-_.]+\.(jpg|jpeg|png|gif|webp)$/i;
    if (bareMedia.test(url)) {
      path = '/sources/blogpostcontent/' + url;
    } else {
      path = '/' + url;
    }
  }

  // 定义需要走 CDN 的路径前缀
  // 包含 site_assets 下的静态资源和 sources 下的用户上传资源
  const cdnPrefixes = [
    // User uploads (backend)
    '/sources', '/avatar', /* '/background' 强制本地，不走CDN */ '/blogpostcontent', '/blogpostcover', '/messages', '/profile', '/files', '/uploads',
    // Static assets (site_assets)
    '/site_assets', '/banner', '/icons', '/imgs', '/live2dmodels', '/live2dsrc'
  ];

  // 站点静态资源前缀（这些资源在本地/Nginx是根路径，但在 COS 中位于 site_assets 目录下）
  const siteAssetPrefixes = ['/banner', '/icons', '/imgs', '/live2dmodels', '/live2dsrc'];

  // 登录/注册/首页主题背景与占位图：强制本地
  if (path.startsWith('/background')) {
    return path;
  }

  if (CDN_URL && cdnPrefixes.some(prefix => path.startsWith(prefix))) {
    // 如果是站点静态资源，且路径没有以 /site_assets 开头，则补全 /site_assets 前缀
    // 例如：/live2dmodels/... -> /site_assets/live2dmodels/...
    if (siteAssetPrefixes.some(prefix => path.startsWith(prefix))) {
      return CDN_URL + '/site_assets' + path;
    }
    return CDN_URL + path;
  }

  // 本地开发/非CDN模式下：
  // 静态资源由 Vite (publicDir) 或 Nginx (alias) 直接服务，不需要转发给后端
  if (siteAssetPrefixes.some(prefix => path.startsWith(prefix)) || path.startsWith('/site_assets')) {
    return path;
  }

  return backend + path;
}
