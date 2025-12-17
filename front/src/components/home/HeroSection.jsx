import React, { useEffect, useRef } from 'react';
import { useBackground } from '@contexts/useBackground';
import { BACKGROUND_DATA } from '@utils/backgroundData';
import '@styles/home/HeroSection.css';

const HeroSection = () => {
  const containerRef = useRef(null);
  const { backgrounds, activeBackground, nextBackground, prevBackground, setBackgroundById } = useBackground();

  useEffect(() => {
    const handleMove = (e) => {
      if (!containerRef.current) return;
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      // Calculate normalized coordinates (-1 to 1)
      const x = (clientX / innerWidth) * 2 - 1;
      const y = (clientY / innerHeight) * 2 - 1;
      
      containerRef.current.style.setProperty('--mouse-x', x);
      containerRef.current.style.setProperty('--mouse-y', y);
    };

    const handleScroll = () => {
      if (!containerRef.current) return;
      const scrollY = window.scrollY;
      containerRef.current.style.setProperty('--scroll-y', scrollY);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth'
    });
  };

  return (
    <div className="hero-section" ref={containerRef}>
      {/* Carousel Slider */}
      <div className="hero-slider">
        {backgrounds.map((bg) => (
          <div 
            key={bg.id} 
            className="hero-slide-box" 
            style={{ backgroundImage: `url(${bg.preview})` }}
          >
            <div className="hero-slide-content">
               {/* Optional content per slide */}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="hero-slider-buttons">
        <button className="hero-slider-prev" onClick={prevBackground}>&lt;</button>
        <button className="hero-slider-next" onClick={nextBackground}>&gt;</button>
      </div>

      {/* Bottom Right Preview List */}
      <div className="hero-preview-list">
        {BACKGROUND_DATA.map((bg) => (
          <div 
            key={bg.id}
            className={`hero-preview-item ${activeBackground?.id === bg.id ? 'active' : ''}`}
            onClick={() => setBackgroundById(bg.id)}
            title={bg.title}
          >
            <img src={bg.preview} alt={bg.title} />
          </div>
        ))}
      </div>

      <div className="hero-content">
        {/* Content can be added here later, e.g., title, subtitle */}
        <h1 className="hero-title">Lovely Firefly!</h1>
        <p className="hero-subtitle">In Reddened Chrysalis, I Once Rest</p>
      </div>
      
      <div className="hero-scroll-down" onClick={scrollToContent}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
        </svg>
      </div>

      <div className="hero-waves-container">
        <svg className="waves" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
          viewBox="0 10 150 45" preserveAspectRatio="none" shapeRendering="auto">
          <defs>
            <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
          </defs>
          <g className="parallax">
            <use xlinkHref="#gentle-wave" x="48" y="0" fill="rgba(240,240,240,0.3)" />
            <use xlinkHref="#gentle-wave" x="48" y="3" fill="rgba(255,255,255,0.4)" />
            <use xlinkHref="#gentle-wave" x="48" y="5" fill="rgba(220,220,220,0.5)" />
            <use xlinkHref="#gentle-wave" x="48" y="7" fill="rgba(255,255,255,0.7)" />
            <use xlinkHref="#gentle-wave" x="48" y="10" fill="#fff" />
          </g>
        </svg>
      </div>
    </div>
  );
};

export default HeroSection;
