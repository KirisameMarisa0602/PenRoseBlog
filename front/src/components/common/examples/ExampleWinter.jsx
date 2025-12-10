import React, { useEffect, useRef } from 'react';

export default function ExampleWinter() {
  const hostRef = useRef(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let startingPoint = null;
    const reset = () => {
      host.classList.remove('moving');
      host.style.setProperty('--percentage', 0.5);
      startingPoint = null;
    };
    const onMove = (e) => {
      const rect = host.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) { reset(); return; }
      if (startingPoint === null) startingPoint = e.clientX;
      host.classList.add('moving');
      const relX = (e.clientX - rect.left);
      const percentage = (relX - (startingPoint - rect.left)) / rect.width + 0.5;
      host.style.setProperty('--percentage', String(percentage));
    };
    const onLeave = () => reset();
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('blur', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, []);
  return (
    <div ref={hostRef} className="example-winter example-banner">
      <div className="view morning"><img src="/banner/assets/example-winter/bilibili-winter-view-1.jpg" alt="" /></div>
      <div className="view afternoon"><img src="/banner/assets/example-winter/bilibili-winter-view-2.jpg" alt="" /></div>
      <div className="view">
        <video src="/banner/assets/example-winter/bilibili-winter-view-3.webm" autoPlay loop muted playsInline />
        <img className="window-cover" src="/banner/assets/example-winter/bilibili-winter-view-3-snow.png" alt="" />
      </div>
      <div className="tree"><img src="/banner/assets/example-winter/bilibili-winter-tree-1.png" alt="" /></div>
      <div className="tree"><img src="/banner/assets/example-winter/bilibili-winter-tree-2.png" alt="" /></div>
      <div className="tree"><img src="/banner/assets/example-winter/bilibili-winter-tree-3.png" alt="" /></div>
    </div>
  );
}
