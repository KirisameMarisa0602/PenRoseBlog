import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useBackground } from '../../contexts/useBackground';
import '../../styles/common/GlobalBackground.css';
import '../../styles/loading/Loading.css';
import resolveUrl from '@utils/resolveUrl';

const GlobalBackground = () => {
  const location = useLocation();
  const { activeBackground } = useBackground();
  const [loading, setLoading] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);

  const isWelcomePage = location.pathname === '/welcome';
  const effectiveBackground = isWelcomePage
    ? { id: 'welcome', type: 'image', src: resolveUrl('/background/img00.png') }
    : activeBackground;

  useEffect(() => {
    if (effectiveBackground?.src && effectiveBackground.src !== currentSrc) {
      setLoading(true);
      setCurrentSrc(effectiveBackground.src);

      if (effectiveBackground.type !== 'video') {
        const img = new Image();
        img.src = effectiveBackground.src;
        img.onload = () => setLoading(false);
        img.onerror = () => setLoading(false);
      }
    }
  }, [effectiveBackground, currentSrc]);

  if (!effectiveBackground) return null;

  return (
    <>
      {loading && (
        <div className="loading-overlay" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 99999 }}>
          <div className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }}></div>
        </div>
      )}
      <div className="global-background-layer">
        {effectiveBackground.type === 'video' ? (
          <video
            key={effectiveBackground.src}
            autoPlay
            loop
            muted
            playsInline
            className="global-background-video"
            onLoadedData={() => setLoading(false)}
            onError={() => setLoading(false)}
          >
            <source src={effectiveBackground.src} type="video/mp4" />
          </video>
        ) : (
          <div
            className="global-background-image"
            style={{ backgroundImage: `url(${effectiveBackground.src})` }}
          />
        )}
        {/* Overlay for better text readability */}
        <div className="global-background-overlay" />
      </div>
    </>
  );
};

export default GlobalBackground;
