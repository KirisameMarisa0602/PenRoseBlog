import React from 'react';
import '../../styles/components/home/HomeCategoryTabs.css';
import { BLOG_CATEGORIES } from '@utils/constants';

const CATEGORIES = ['首页', ...BLOG_CATEGORIES];

const HomeCategoryTabs = ({ selectedCategory, onSelectCategory }) => {
  return (
    <div className="home-category-bar">
      <div className="home-category-list">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`category-tab-item ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => onSelectCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomeCategoryTabs;
