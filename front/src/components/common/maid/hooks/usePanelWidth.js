import { useEffect, useRef, useState } from 'react';

export default function usePanelWidth(initialKey = 'maid.panelWidth') {
  const WIDTH_KEY = initialKey;
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return 360;
    try {
      const saved = localStorage.getItem(WIDTH_KEY);
      const vw = window.innerWidth;
      const defaultW = Math.round(vw * 0.25); // 默认 1/4 视窗宽度
      const w = saved ? parseInt(saved, 10) : defaultW;
      const minW = Math.round(vw * 0.125); // 最小 1/8 视窗宽度
      const maxW = Math.round(vw * 0.333); // 最大 1/3 视窗宽度
      return Math.min(Math.max(w || defaultW, minW), maxW);
    } catch {
      return Math.round((typeof window !== 'undefined' ? window.innerWidth : 1440) * 0.25);
    }
  });
  const resizingRef = useRef(false);
  const resizerStartXRef = useRef(0);
  const resizerStartWRef = useRef(0);

  useEffect(() => {
    try { localStorage.setItem(WIDTH_KEY, String(panelWidth)); } catch (err) { void err; }
  }, [panelWidth, WIDTH_KEY]);

  const onResizerPointerDown = (e, containerEl) => {
    try {
      if (typeof e.target.setPointerCapture === 'function' && e.pointerId != null) e.target.setPointerCapture(e.pointerId);
    } catch { /* ignore */ }
    resizingRef.current = true;
    resizerStartXRef.current = e.clientX;
    resizerStartWRef.current = (containerEl && containerEl.clientWidth) || panelWidth;
    try { document.body.style.cursor = 'ew-resize'; } catch { /* ignore */ }
  };

  useEffect(() => {
    const onPointerMove = (e) => {
      if (!resizingRef.current) return;
      try {
        const dx = resizerStartXRef.current - e.clientX;
        const vw = window.innerWidth;
        const minW = Math.round(vw * 0.125);
        const maxW = Math.round(vw * 0.333);
        const next = Math.max(minW, Math.min(maxW, resizerStartWRef.current + dx));
        setPanelWidth(Math.round(next));
      } catch { /* ignore */ }
    };
    const onPointerUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      try { document.body.style.cursor = ''; } catch (err) { void err; }
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  return { panelWidth, setPanelWidth, onResizerPointerDown };
}
