import React, { useEffect, useRef } from 'react';
import '../../styles/common/NeonBackground.css';

const NeonBackground = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (containerRef.current) {
                const x = e.clientX;
                const y = e.clientY;
                containerRef.current.style.setProperty('--mouse-x', `${x}px`);
                containerRef.current.style.setProperty('--mouse-y', `${y}px`);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <div className="neon-background-overlay" ref={containerRef}>
            <div className="neon-ambient-flow"></div>
            <div className="neon-cursor-glow"></div>
        </div>
    );
};

export default NeonBackground;
