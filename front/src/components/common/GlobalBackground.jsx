import React, { useState, useEffect } from 'react';
import { useBackground } from '../../contexts/useBackground';
import '../../styles/common/GlobalBackground.css';
import '../../styles/loading/Loading.css';

const GlobalBackground = () => {
  const { activeBackground } = useBackground();
  const [loading, setLoading] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);

  useEffect(() => {
    if (activeBackground?.src && activeBackground.src !== currentSrc) {
      setLoading(true);
      setCurrentSrc(activeBackground.src);

      if (activeBackground.type !== 'video') {
        const img = new Image();
        img.src = activeBackground.src;
        img.onload = () => setLoading(false);
        img.onerror = () => setLoading(false);
      }
    }
  }, [activeBackground, currentSrc]);

  if (!activeBackground) return null;

  return (
    <>
      {loading && (
        <div className="loading-overlay" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 99999 }}>
          <div className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }}></div>
        </div>
      )}
      <div className="global-background-layer">
        {activeBackground.type === 'video' ? (
          <video
            key={activeBackground.src}
            autoPlay
            loop
            muted
            playsInline
            className="global-background-video"
            onLoadedData={() => setLoading(false)}
            onError={() => setLoading(false)}
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
    </>
  );
};

export default GlobalBackground;
