import React, { useEffect, useRef } from 'react';

export default function ExampleSpring() {
  const hostRef = useRef(null);
  const initTransformsRef = useRef([]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const imgs = Array.from(host.querySelectorAll('.view img'));
    initTransformsRef.current = imgs.map((el) => {
      const cs = window.getComputedStyle(el);
      return {
        transform: cs.getPropertyValue('transform') || 'none',
        opacity: cs.getPropertyValue('opacity') || '1',
      };
    });
    let intX = null;
    const reset = () => {
      imgs.forEach((el, i) => {
        const init = initTransformsRef.current[i];
        el.setAttribute('style', `transform: ${init.transform}; opacity: ${init.opacity};`);
      });
    };
    const onMove = (e) => {
      const rect = host.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) {
        intX = null;
        reset();
        return;
      }
      if (intX === null) intX = e.clientX;
      imgs.forEach((el, i) => {
        const dm = Number(el.dataset.moveMultiple || '16');
        const dis = (intX - e.clientX) / dm;
        const init = initTransformsRef.current[i]?.transform || 'matrix(1, 0, 0, 1, 0, 0)';
        const arr = init.replace(/matrix\(|\)/g, '').split(',').map((s) => s.trim());
        if (arr.length >= 6) {
          const tx = Number(arr[4] || '0');
          arr[4] = String(tx + dis);
        }
        let styleStr = `transform: matrix(${arr.join(',')});`;
        if (el.dataset.isOpacity) {
          const hrefW = (host.clientWidth || window.innerWidth) / 2;
          const oDis = Number(el.dataset.isOpacity) ? intX - e.clientX : e.clientX - intX;
          const newO = Math.max(0, Math.min(1, oDis / hrefW));
          styleStr += ` opacity: ${newO};`;
        }
        el.setAttribute('style', styleStr);
      });
    };
    const onLeave = () => { intX = null; reset(); };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('blur', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let raf = null;
    const canvas = document.createElement('canvas');
    canvas.className = 'spring-sakura-canvas';
    host.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let W = 0, H = 0;
    const FLOW_SRC = [
      '/banner/assets/example-spring/bilibili-spring-flow-1.png',
      '/banner/assets/example-spring/bilibili-spring-flow-2.png',
    ];
    const SCALES = [0.03, 0.04, 0.05, 0.06, 0.07, 0.08];
    const SPEED_X = 2, SPEED_Y = 3;
    class Flower {
      constructor() {
        this.x = 0; this.y = 0;
        this.vx = 0; this.vy = 0;
        this.size = 10; this.img = null;
      }
      init() {
        this.x = Math.random() * W;
        this.y = Math.random() * H * 0.4;
        this.vx = Math.random() * SPEED_X;
        this.vy = Math.random() * SPEED_Y;
        const scale = SCALES[(Math.random() * (SCALES.length - 1)) | 0];
        this.size = 250 * scale;
        const src = FLOW_SRC[Math.random() * 10 > 5 ? 0 : 1];
        const img = new Image();
        img.src = src;
        this.img = img;
      }
      step() {
        this.x += this.vx; if (this.x > W) this.x = Math.random() * W;
        this.y += this.vy; if (this.y > H) this.y = 0;
      }
      draw() {
        if (!this.img) return;
        ctx.drawImage(this.img, this.x, this.y, this.size, this.size);
      }
    }
    const flowers = [];
    const MAX = 50;
    const resize = () => {
      const rect = host.getBoundingClientRect();
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const init = () => {
      flowers.length = 0;
      for (let i = 0; i < MAX; i++) {
        const f = new Flower();
        f.init();
        flowers.push(f);
      }
    };
    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < flowers.length; i++) {
        const f = flowers[i];
        f.step();
        f.draw();
      }
      raf = requestAnimationFrame(loop);
    };
    resize();
    init();
    raf = requestAnimationFrame(loop);
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      if (raf) cancelAnimationFrame(raf);
      canvas.remove();
    };
  }, []);

  return (
  <div ref={hostRef} className="example-spring example-banner">
      <div className="view"><img src="/banner/assets/example-spring/bilibili-spring-view-1.png" data-move-multiple="16.395" /></div>
      <div className="view"><img src="/banner/assets/example-spring/bilibili-spring-view-2.png" data-move-multiple="16.395" /></div>
      <div className="view"><img src="/banner/assets/example-spring/bilibili-spring-view-3.png" data-move-multiple="12.145" /></div>
      <div className="view"><img src="/banner/assets/example-spring/bilibili-spring-view-4.png" data-move-multiple="3.718" /></div>
      <div className="view"><img src="/banner/assets/example-spring/bilibili-spring-view-5.png" data-move-multiple="14.573" /></div>
      <div className="view"><img src="/banner/assets/example-spring/bilibili-spring-people-1.png" data-move-multiple="29.277" data-is-opacity="0" /></div>
      <div className="view"><img src="/banner/assets/example-spring/bilibili-spring-view-6.png" data-move-multiple="2.342" /></div>
      <div className="view"><img src="/banner/assets/example-spring/bilibili-spring-view-7.png" data-move-multiple="1.952" /></div>
      <div className="view"><img src="/banner/assets/example-spring/bilibili-spring-people-2.png" data-move-multiple="4.098" data-is-opacity="1" /></div>
      <div className="view"><img src="/banner/assets/example-spring/bilibili-spring-people-3.png" data-move-multiple="2.826" data-is-opacity="1" /></div>
      <div className="view"><img src="/banner/assets/example-spring/bilibili-spring-view-8.png" data-move-multiple="1.457" /></div>
      <div className="view"><img src="/banner/assets/example-spring/bilibili-spring-view-9.png" data-move-multiple="1.092" /></div>
      <div className="view"><img src="/banner/assets/example-spring/bilibili-spring-people-4.png" data-move-multiple="1.104" /></div>
      <div className="view"><img src="/banner/assets/example-spring/bilibili-spring-view-10.png" data-move-multiple="0.781" /></div>
      <div className="view"><img src="/banner/assets/example-spring/bilibili-spring-view-11.png" data-move-multiple="0.546" /></div>
    </div>
  );
}
