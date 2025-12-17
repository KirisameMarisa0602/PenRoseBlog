import React, { useEffect, useState } from 'react';
import ArticleCard from './ArticleCard';
import { fetchPostDetail } from '@utils/api/postService';

// 简单内存缓存，避免同会话频繁重复请求
const cache = new Map(); // key: blogId, value: post object

export default function ArticleCardFetcher({ blogId, fallback, mode = 'vertical', className, style, state }) {
  const [post, setPost] = useState(() => {
    if (cache.has(blogId)) return cache.get(blogId);
    return fallback || null;
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!blogId) return;
        if (cache.has(blogId)) {
          if (alive) setPost(cache.get(blogId));
          return;
        }
        const res = await fetchPostDetail(blogId);
        if (alive && res && res.code === 200 && res.data) {
          cache.set(blogId, res.data);
          setPost(res.data);
        }
      } catch {
        // ignore; fallback will be used
      }
    })();
    return () => { alive = false; };
  }, [blogId]);

  if (!post) {
    return <div style={{padding: 10, color: '#999', fontSize: 12}}>加载文章预览...</div>;
  }

  return (
    <ArticleCard
      post={post}
      mode={mode}
      className={className}
      style={style}
      state={state}
    />
  );
}
