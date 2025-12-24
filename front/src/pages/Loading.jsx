import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '@styles/loading/Loading.css';
import { fetchPosts, fetchPostDetail } from '@utils/api/postService';
import { fetchUserProfile } from '@utils/api/userService';
import resolveUrl from '@utils/resolveUrl';

function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

function preloadImage(url) {
  return new Promise(res => {
    if (!url) return res();
    const img = new Image();
    img.onload = img.onerror = () => res();
    img.src = resolveUrl(url);
  });
}

async function preloadBanner(limit = 6) {
  try {
    const r = await fetch('/banner/manifest.json', { cache: 'no-cache' });
    const manifest = r.ok ? await r.json() : null;
    if (!Array.isArray(manifest) || manifest.length === 0) return;
    const activeId = String(manifest[0]?.id || manifest[0]?.name || '');
    if (!activeId) return;
    // data.json 通常随 activeId 变化而变化：允许缓存能显著加速二次进入
    const rr = await fetch(`/banner/assets/${activeId}/data.json`, { cache: 'force-cache' });
    const data = rr.ok ? await rr.json() : null;
    if (!Array.isArray(data)) return;
    const urls = [];
    for (const item of data) {
      if (item?.tagName === 'img' && item?.src) {
        const src = /^\.\/assets\//.test(item.src) ? item.src.replace(/^\.\/assets\//, '/banner/assets/') : item.src;
        urls.push(src);
      }
      if (urls.length >= limit) break;
    }
    await Promise.all(urls.map(u => new Promise(res => { const img = new Image(); img.onload = img.onerror = () => res(); img.src = u; })));
  } catch { /* ignore */ }
}

async function preloadForPath(fullPath) {
  try {
    const pStr = typeof fullPath === 'string' ? fullPath : '/';
    const [pathname, search] = pStr.split('?');
    const searchParams = new URLSearchParams(search);

    const bannerTask = preloadBanner(6);
    const tasks = [bannerTask];

    if (pathname === '/' || pathname.startsWith('/home')) {
      tasks.push(import('./Home'));
      const sortMode = searchParams.get('sort') || 'latest';
      const category = searchParams.get('category');
      // 预加载首页文章封面和头像
      tasks.push(fetchPosts({ page: 0, size: 5, sortMode, category }).then(res => {
        if (res && res.data && Array.isArray(res.data.list)) {
          const covers = res.data.list.map(post => post.coverUrl).filter(Boolean);
          const avatars = res.data.list.map(post => post.author?.avatarUrl).filter(Boolean);
          return Promise.all([...covers, ...avatars].map(preloadImage));
        }
      }).catch(() => { }));
    } else if (pathname.startsWith('/post/')) {
      tasks.push(import('./ArticleDetail'));
      const match = pathname.match(/\/post\/(\d+)/);
      if (match) {
        const id = match[1];
        tasks.push(fetchPostDetail(id).then(res => {
          if (res && res.data) {
            const p = [];
            if (res.data.coverUrl) p.push(preloadImage(res.data.coverUrl));
            if (res.data.author?.avatarUrl) p.push(preloadImage(res.data.author?.avatarUrl));
            return Promise.all(p);
          }
        }).catch(() => { }));
      }
    } else if (pathname.startsWith('/selfspace')) {
      tasks.push(import('./SelfSpace'));
      const userId = searchParams.get('userId');
      if (userId) {
        tasks.push(fetchUserProfile(userId).then(res => {
          if (res && res.data) {
            const p = [];
            if (res.data.avatarUrl) p.push(preloadImage(res.data.avatarUrl));
            if (res.data.backgroundUrl) p.push(preloadImage(res.data.backgroundUrl));
            return Promise.all(p);
          }
        }).catch(() => { }));
      }
    } else {
      if (pathname.startsWith('/welcome')) tasks.push(import('./Welcome'));
      if (pathname.startsWith('/blog-edit')) tasks.push(import('./BlogEditor'));
      if (pathname.startsWith('/messages')) tasks.push(import('./MessageList'));
      if (pathname.startsWith('/conversation/')) tasks.push(import('./ConversationDetail'));
      if (pathname.startsWith('/users/search')) tasks.push(import('./UserSearch'));
      if (pathname.startsWith('/friends/pending')) tasks.push(import('./PendingFriendRequests'));
      if (pathname.startsWith('/friends')) tasks.push(import('./FriendsList'));
      if (pathname.startsWith('/follows')) tasks.push(import('./FollowingList'));
    }

    await Promise.all(tasks);
  } catch { /* ignore */ }
}

export default function Loading({ onReady }) {
  const location = useLocation();

  useEffect(() => {
    const to = location.pathname + location.search;
    let stopped = false;
    (async () => {
      // 资源加载优先：若预加载先完成则立即进入；否则由 App.jsx 的 10 秒兜底处理
      const preloadTask = preloadForPath(to);
      await preloadTask;
      if (!stopped && onReady) onReady();
    })();
    return () => { stopped = true; };
  }, [location, onReady]);

  return (
    <div className="loading-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loading-spinner" />
      <div className="loading-text">正在加载，请稍候…</div>
    </div>
  );
}
