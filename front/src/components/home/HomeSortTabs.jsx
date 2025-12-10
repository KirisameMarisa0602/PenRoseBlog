import React from 'react';
import '../../styles/components/home/HomeSortTabs.css'; // We will create this file or update Home.css

export default function HomeSortTabs({ sortMode, onChange }) {
  const handleChange = (e) => {
    if (onChange) onChange(e.target.value);
  };

  return (
    <div className="home-sort-dropdown-container">
      <select 
        className="home-sort-select"
        value={sortMode} 
        onChange={handleChange}
        aria-label="文章排序"
      >
        <option value="latest">最新文章</option>
        <option value="hot">最热文章</option>
      </select>
    </div>
  );
}
