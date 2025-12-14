import React, { useState, useEffect, useRef } from 'react';
import '../../styles/selfspace/Category3DCarousel.css';
import { CATEGORY_CONFIG, DEFAULT_CATEGORY_CONFIG } from '@utils/categoryConfig';

const Category3DCarousel = ({ categories, selectedCategory, onSelect }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  // Initialize active index based on selectedCategory
  useEffect(() => {
    const index = categories.indexOf(selectedCategory);
    if (index !== -1) {
      setActiveIndex(index);
    } else if (!selectedCategory && categories.length > 0) {
      setActiveIndex(0);
    }
  }, [selectedCategory, categories]);

  const handleCardClick = (index, category) => {
    setActiveIndex(index);
    onSelect(category);
  };

  const getCardStyle = (index) => {
    const total = categories.length;
    let offset = index - activeIndex;
    
    // Loop logic: find shortest path
    if (total > 0) {
      if (offset > total / 2) offset -= total;
      if (offset < -total / 2) offset += total;
    }

    const absOffset = Math.abs(offset);
    
    const isActive = offset === 0;
    const zIndex = 100 - absOffset;
    const scale = isActive ? 1.2 : Math.max(0.8 - absOffset * 0.1, 0.6);
    const opacity = Math.max(1 - absOffset * 0.3, 0);
    const rotateY = offset === 0 ? 0 : (offset > 0 ? -30 : 30); // Reduced rotation
    const translateX = offset * 160; // Increased spacing
    const translateZ = isActive ? 150 : -100 * absOffset;

    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
      zIndex: zIndex,
      opacity: opacity < 0.1 ? 0 : opacity,
      pointerEvents: opacity < 0.1 ? 'none' : 'auto',
      transition: 'all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)'
    };
  };

  return (
    <div className="category-3d-carousel-container" ref={containerRef}>
      <div className="carousel-stage">
        {categories.map((cat, index) => {
          const config = CATEGORY_CONFIG[cat] || DEFAULT_CATEGORY_CONFIG;
          const style = getCardStyle(index);
          const isActive = index === activeIndex;

          return (
            <div
              key={cat}
              className={`carousel-card ${isActive ? 'active' : ''}`}
              style={style}
              onClick={() => handleCardClick(index, cat)}
            >
              <div className="card-inner" style={{ background: config.bgImage, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="card-overlay"></div>
                <div className="card-content">
                  <div className="card-title-split">
                    <div className="split-text-layer split-text-top">{cat}</div>
                    <div className="split-text-layer split-text-bottom">{cat}</div>
                  </div>
                  {isActive && <div className="card-desc">{config.description}</div>}
                </div>
                <div className="card-shine"></div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Navigation Arrows */}
      <div className="carousel-controls">
         <button 
           className="nav-btn prev" 
           onClick={(e) => { 
             e.stopPropagation(); 
             const prevIndex = (activeIndex - 1 + categories.length) % categories.length;
             handleCardClick(prevIndex, categories[prevIndex]); 
           }}
         >
           &lt;
         </button>
         <button 
           className="nav-btn next" 
           onClick={(e) => { 
             e.stopPropagation(); 
             const nextIndex = (activeIndex + 1) % categories.length;
             handleCardClick(nextIndex, categories[nextIndex]); 
           }}
         >
           &gt;
         </button>
      </div>
    </div>
  );
};

export default Category3DCarousel;
