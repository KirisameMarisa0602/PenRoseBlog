import React from 'react';
import { useBackground } from '../../contexts/useBackground';
import '../../styles/common/GlobalBackground.css';

const GlobalBackground = () => {
  const { activeBackground } = useBackground();

  if (!activeBackground) return null;

  return (
    <div className="global-background-layer">
      {activeBackground.type === 'video' ? (
        <video
          key={activeBackground.src}
          autoPlay
          loop
          muted
          playsInline
          className="global-background-video"
        >
          <source src={activeBackground.src} type="video/mp4" />
        </video>
      ) : (
        <div 
          className="global-background-image"
          style={{ backgroundImage: `url(${activeBackground.src})` }}
        />
      )}
      {/* Overlay for better text readability */}
      <div className="global-background-overlay" />
    </div>
  );
};

export default GlobalBackground;
