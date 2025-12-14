import React from 'react';
import ArticleCard from '@components/common/ArticleCard';
import '@styles/home/HomeArticleList.css';

export default function HomeArticleList({ posts, selectedCategory }) {
  if (!posts || posts.length === 0) {
    return <div className="home-articles-empty">暂无文章</div>;
  }

  return (
    <div className="home-article-grid">
      {posts.map((p, index) => {
        // Assume 5 columns for desktop layout to calculate row index
        const colCount = 5;
        const rowIndex = Math.floor(index / colCount);
        const colIndex = index % colCount;
        return (
          <ArticleCard 
            key={p.id || p.postId} 
            post={p} 
            className="home-article-card" 
            mode="vertical" 
            state={{ fromCategory: selectedCategory }}
            style={{ 
              '--row-index': rowIndex,
              '--col-index': colIndex,
              '--item-index': index 
            }}
          />
        );
      })}
    </div>
  );
}
