import React from 'react';
import ArticleCard from '@components/common/ArticleCard';
import '@styles/home/HomeArticleList.css';

export default function HomeArticleList({ posts }) {
  if (!posts || posts.length === 0) {
    return <div className="home-articles-empty">暂无文章</div>;
  }

  return (
    <div className="home-article-grid">
      {posts.map((p) => (
        <ArticleCard 
          key={p.id || p.postId} 
          post={p} 
          className="home-article-card" 
          mode="vertical" 
        />
      ))}
    </div>
  );
}
