import React, { useState, useRef, useEffect } from 'react';
import '../../styles/blogeditor/CategoryWheel.css';

const CategoryWheel = ({ categories, selected, onChange }) => {
  const containerRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startRotation = useRef(0);
  const velocity = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const rafId = useRef(null);
  const rotationRef = useRef(rotation);
  const listenersRef = useRef({});
  const hasMoved = useRef(false);

  // Keep rotationRef in sync
  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  const CATEGORY_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#F1948A', '#82E0AA', '#85C1E9'
  ];

  // Configuration
  const RADIUS = 120; // Radius of the cylinder
  const ANGLE_STEP = 30; // Angle between items

  // Find index of selected item to set initial rotation
  // Only run on mount or if selection changes externally (not during drag)
  useEffect(() => {
    if (!isDragging.current && !velocity.current) {
      const index = categories.indexOf(selected);
      if (index !== -1) {
        // We need to find the closest multiple of 360 to keep rotation smooth
        // But for initial load, just setting it is fine.
        // For external updates, we might want to animate, but let's keep it simple.
        // To support infinite scroll, we don't just set to -index * step.
        // We find the current "virtual" index and adjust.

        // const currentVirtualIndex = -rotationRef.current / ANGLE_STEP;
        // const currentCycle = Math.floor(currentVirtualIndex / categories.length);

        // Target is index + currentCycle * length
        // But we might be closer to next cycle
        // Let's just set it directly for now to avoid complexity on external change
        // setRotation(-index * ANGLE_STEP); 
      }
    }
  }, [selected, categories]);

  const handleMouseDown = (e) => {
    e.preventDefault(); // Prevent default drag behavior
    isDragging.current = true;
    hasMoved.current = false;
    startY.current = e.clientY;
    startRotation.current = rotation;
    lastY.current = e.clientY;
    lastTime.current = Date.now();
    velocity.current = 0;

    if (rafId.current) cancelAnimationFrame(rafId.current);

    listenersRef.current = { move: handleMouseMove, up: handleMouseUp };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e) => {
    isDragging.current = true;
    hasMoved.current = false;
    startY.current = e.touches[0].clientY;
    startRotation.current = rotation;
    lastY.current = e.touches[0].clientY;
    lastTime.current = Date.now();
    velocity.current = 0;

    if (rafId.current) cancelAnimationFrame(rafId.current);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const deltaY = e.clientY - startY.current;
    if (Math.abs(deltaY) > 2) hasMoved.current = true;

    // Reduced sensitivity from 0.5 to 0.2
    const newRotation = startRotation.current + deltaY * 0.2;
    setRotation(newRotation);

    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      const dy = e.clientY - lastY.current;
      velocity.current = dy / dt;
      lastY.current = e.clientY;
      lastTime.current = now;
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const deltaY = e.touches[0].clientY - startY.current;
    if (Math.abs(deltaY) > 2) hasMoved.current = true;

    const newRotation = startRotation.current + deltaY * 0.2;
    setRotation(newRotation);

    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      const dy = e.touches[0].clientY - lastY.current;
      velocity.current = dy / dt;
      lastY.current = e.touches[0].clientY;
      lastTime.current = now;
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    const { move, up } = listenersRef.current;
    if (move) document.removeEventListener('mousemove', move);
    if (up) document.removeEventListener('mouseup', up);
    listenersRef.current = {};

    if (hasMoved.current) {
      startInertia();
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (hasMoved.current) {
      startInertia();
    }
  };

  const startInertia = () => {
    const friction = 0.95;
    const step = () => {
      if (Math.abs(velocity.current) > 0.01) {
        velocity.current *= friction;
        setRotation(prev => prev + velocity.current * 10);
        rafId.current = requestAnimationFrame(step);
      } else {
        snapToNearest();
      }
    };
    rafId.current = requestAnimationFrame(step);
  };

  const snapToNearest = () => {
    // Snap to nearest slot (ANGLE_STEP)
    const currentRot = rotationRef.current;
    const snapIndex = Math.round(currentRot / ANGLE_STEP);
    const targetRotation = snapIndex * ANGLE_STEP;

    animateTo(targetRotation, () => {
      // Calculate which category is selected
      // rotation = -index * step (usually)
      // But here rotation is positive for dragging down?
      // Let's normalize:
      // index = - (rotation / step)
      // We need to handle modulo for infinite loop

      const rawIndex = -Math.round(targetRotation / ANGLE_STEP);
      // Python-style modulo for negative numbers: ((n % m) + m) % m
      const len = categories.length;
      const index = ((rawIndex % len) + len) % len;

      if (categories[index] !== selected) {
        onChange(categories[index]);
      }
    });
  };

  const animateTo = (target, callback) => {
    let startTime = Date.now();
    const duration = 300;
    const startRot = rotationRef.current;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      const newRot = startRot + (target - startRot) * ease;
      setRotation(newRot);

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      } else {
        if (callback) callback();
      }
    };
    rafId.current = requestAnimationFrame(animate);
  };

  // Clean up
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      const { move, up } = listenersRef.current;
      if (move) document.removeEventListener('mousemove', move);
      if (up) document.removeEventListener('mouseup', up);
    };
  }, []);

  // Virtual Scroll Rendering
  // We want to render items that are visible within [-90, 90] degrees relative to camera
  // Camera is at 0 degrees.
  // Item angle = itemIndex * step + rotation
  // We want -90 < itemIndex * step + rotation < 90
  // -90 - rotation < itemIndex * step < 90 - rotation
  // (-90 - rotation)/step < itemIndex < (90 - rotation)/step

  const renderItems = () => {
    const visibleRange = 100; // Degrees
    const startAngle = -rotation - visibleRange;
    const endAngle = -rotation + visibleRange;

    const startIndex = Math.floor(startAngle / ANGLE_STEP);
    const endIndex = Math.ceil(endAngle / ANGLE_STEP);

    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      // Map virtual index i to actual category index
      const len = categories.length;
      const catIndex = ((i % len) + len) % len;
      const cat = categories[catIndex];

      const itemAngle = i * ANGLE_STEP;
      const currentAngle = rotation + itemAngle; // Should be around 0 for visible items

      // Calculate opacity/scale
      // Angle relative to center (0)
      // We want items at 0 to be fully visible
      // Items at +/- 90 to be invisible

      // Normalize angle for calculation (it should be small since we filtered by range)
      const dist = Math.abs(currentAngle);
      if (dist > 90) continue; // Double check

      const opacity = Math.max(0, 1 - dist / 90);
      const scale = 0.8 + 0.2 * opacity;
      const isActive = dist < (ANGLE_STEP / 2);
      const color = CATEGORY_COLORS[catIndex % CATEGORY_COLORS.length];

      items.push(
        <div
          key={i} // Use virtual index as key to maintain identity during scroll
          className={`category-wheel-item ${isActive ? 'active' : ''}`}
          style={{
            transform: `rotateX(${-currentAngle}deg) translateZ(${RADIUS}px) scale(${scale})`,
            opacity: opacity,
            zIndex: Math.round(100 - dist), // Ensure front items are on top
            backgroundColor: color,
            color: '#fff', // Ensure text is readable
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (hasMoved.current) return;
            // Animate to this item's center
            // We want currentAngle to become 0
            // rotation + itemAngle = 0 => rotation = -itemAngle
            // But we want to animate rotation
            animateTo(-itemAngle, () => onChange(cat));
          }}
        >
          {cat}
        </div>
      );
    }
    return items;
  };

  return (
    <div
      className="category-wheel-container"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="category-wheel-overlay" />
      <div className="category-wheel-stage">
        {renderItems()}
      </div>

      {/* Optional: Side indicators */}
      {/* <div className="category-wheel-indicator">
        {categories.map((_, i) => (
          <span key={i} className={categories[i] === selected ? 'active' : ''} />
        ))}
      </div> */}
    </div>
  );
};

export default CategoryWheel;
