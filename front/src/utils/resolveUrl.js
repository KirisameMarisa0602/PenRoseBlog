// 将后端返回的图片/媒体路径规范为浏览器可请求的 URL
export default function resolveUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  // 优先使用 VITE_BACKEND_ORIGIN（生产部署时在 .env.production 设置），开发环境回退到 window.location.origin
  const backend = import.meta.env.VITE_BACKEND_ORIGIN || (typeof window !== 'undefined' ? window.location.origin : '');
  if (url.startsWith('/')) return backend + url;
  // 兼容历史存量：如 "1/<uuid>.jpg" 这类未带前缀的相对路径，默认映射到 /sources
  const bareMedia = /^(\d+)\/[a-z0-9\-_.]+\.(jpg|jpeg|png|gif|webp)$/i;
  if (bareMedia.test(url)) {
    return backend + '/sources/blogpostcontent/' + url;
  }
  // 常见相对前缀（已省略开头的斜杠）
  const knownPrefixes = ['sources/', 'avatar/', 'background/', 'files/messages/'];
  if (knownPrefixes.some(p => url.startsWith(p))) {
    return backend + '/' + url;
  }
  return backend + '/' + url;
}
