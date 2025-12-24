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
          className={`home-sort-tab ${sortMode === 'hot' ? 'active' : ''}`}
          onClick={() => onChange && onChange('hot')}
        >
          最热文章
        </button>
      </div>
    </div>
  );
}
