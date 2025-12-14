import React from 'react';
import '@styles/home/HeroSection.css';

const HeroSection = () => {
  return (
    <div className="hero-section">
      <div className="hero-background"></div>
      <div className="hero-content">
        {/* Content can be added here later, e.g., title, subtitle */}
        <h1 className="hero-title">Lovely Firefly!</h1>
        <p className="hero-subtitle">In Reddened Chrysalis, I Once Rest</p>
      </div>
      <div className="hero-clouds"></div>
    </div>
  );
};

export default HeroSection;
