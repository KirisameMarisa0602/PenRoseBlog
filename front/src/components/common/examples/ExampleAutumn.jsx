import React, { useEffect, useRef } from 'react';

export default function ExampleAutumn() {
  const hostRef = useRef(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const images = Array.from(host.querySelectorAll('div > img'));
    const reset = () => {
      images.forEach((image) => {
        image.style.setProperty('--offset', `0px`);
        image.style.setProperty('--blur', `2px`);
      });
    };
    const onMove = (e) => {
      const rect = host.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) { reset(); return; }
      let percentage = (e.clientX - rect.left) / rect.width;
      let offset = 10 * percentage;
      let blur = 20;
      images.forEach((image, index) => {
        offset *= 1.3;
        let blurValue = Math.pow((index / images.length - percentage), 2) * blur;
        image.style.setProperty('--offset', `${offset}px`);
        image.style.setProperty('--blur', `${blurValue}px`);
      });
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
    <div ref={hostRef} className="example-autumn example-banner">
      <div><img src="/banner/assets/example-autumn/bilibili-autumn-1.png" alt="" /></div>
      <div><img src="/banner/assets/example-autumn/bilibili-autumn-2.png" alt="" /></div>
      <div><img src="/banner/assets/example-autumn/bilibili-autumn-3.png" alt="" /></div>
      <div><img src="/banner/assets/example-autumn/bilibili-autumn-4.png" alt="" /></div>
      <div><img src="/banner/assets/example-autumn/bilibili-autumn-5.png" alt="" /></div>
      <div><img src="/banner/assets/example-autumn/bilibili-autumn-6.png" alt="" /></div>
    </div>
  );
}
