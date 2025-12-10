import React from 'react';
import ArticleCard from '@components/common/ArticleCard';

export default function HomeArticleList({ posts }) {
  if (!posts || posts.length === 0) {
    return <div className="home-articles-empty">暂无文章</div>;
  }

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <>
      {featured && (
        <ArticleCard key={featured.id || featured.postId} post={featured} className="home-article-card" />
      )}
      {rest.map((p) => (
        <ArticleCard key={p.id || p.postId} post={p} className="home-article-card" />
      ))}
    </>
  );
}
