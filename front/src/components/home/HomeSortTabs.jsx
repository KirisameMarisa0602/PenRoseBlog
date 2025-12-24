import React from 'react';
import '../../styles/components/home/HomeSortTabs.css';

export default function HomeSortTabs({ sortMode, onChange }) {
  return (
    <div className="home-sort-tabs-container">
      <div className="home-sort-tabs">
        <button
          className={`home-sort-tab ${sortMode === 'latest' ? 'active' : ''}`}
          onClick={() => onChange && onChange('latest')}
        >
          最新文章
        </button>
        <button
          className={`home-sort-tab ${sortMode === 'mostLikes' ? 'active' : ''}`}
          onClick={() => onChange && onChange('mostLikes')}
        >
          最多点赞
        </button>
        <button
          className={`home-sort-tab ${sortMode === 'mostFavorites' ? 'active' : ''}`}
          onClick={() => onChange && onChange('mostFavorites')}
        >
          最多收藏
        </button>
        <button
          className={`home-sort-tab ${sortMode === 'mostViews' ? 'active' : ''}`}
          onClick={() => onChange && onChange('mostViews')}
        >
          最多浏览
        </button>
      </div>
    </div>
  );
}
