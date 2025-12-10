import { useEffect, useRef, useState } from 'react';

export default function useLayoutSplit({ RATIO_MIN = 0.2, RATIO_MAX = 0.8, MIN_TOP_PX = 160, MIN_BOTTOM_PX = 160 }) {
  const [splitRatio, setSplitRatio] = useState(() => {
    if (typeof window === 'undefined') return 0.75;
    try {
      const s = localStorage.getItem('maid.splitRatio');
      const n = s ? parseFloat(s) : 0.75;
      if (!Number.isFinite(n)) return 0.75;
      return Math.min(RATIO_MAX, Math.max(RATIO_MIN, n));
    } catch {
      return 0.75;
    }
  });
  const [innerHeight, setInnerHeight] = useState(0);
  const draggingSplitRef = useRef(false);
  // 拖拽开始时的起点 Y（相对面板内部）和初始比例
  const dragStartLocalYRef = useRef(0);
  const dragStartRatioRef = useRef(0.5);

  useEffect(() => {
    try { localStorage.setItem('maid.splitRatio', String(splitRatio)); } catch { /* ignore */ }
  }, [splitRatio]);

  useEffect(() => {
    const onResize = () => {
      try {
        const el = document.querySelector('.maid-widget');
        if (el) {
          const header = el.querySelector('.maid-header');
          const h = el.clientHeight - (header?.offsetHeight || 0);
          setInnerHeight(h > 0 ? h : 0);
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingSplitRef.current) return;
      const el = document.querySelector('.maid-widget'); if (!el) return;
      const header = el.querySelector('.maid-header');
      const total = innerHeight || (el.clientHeight - (header?.offsetHeight || 0));
      if (!total || total <= 0) return;

      // 将鼠标位置映射到面板内部局部坐标
      const panelRect = el.getBoundingClientRect();
      const headerH = header?.offsetHeight || 0;
      const localY = e.clientY - panelRect.top - headerH;
      const deltaY = localY - dragStartLocalYRef.current;

      // 基于起始比例 + 位移计算新的比例
      const rawRatio = dragStartRatioRef.current + (deltaY / total);
      const lowerBound = Math.max(RATIO_MIN, total > 0 ? MIN_TOP_PX / total : RATIO_MIN);
      const upperBound = Math.min(RATIO_MAX, total > 0 ? 1 - (MIN_BOTTOM_PX / total) : RATIO_MAX);
      const ratio = Math.min(upperBound, Math.max(lowerBound, rawRatio));
      setSplitRatio(ratio);
    };
    const onUp = () => {
      if (!draggingSplitRef.current) return;
      draggingSplitRef.current = false;
      try { document.body.style.cursor = ''; } catch { /* ignore */ }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [innerHeight, RATIO_MIN, RATIO_MAX, MIN_TOP_PX, MIN_BOTTOM_PX, draggingSplitRef]);

  const onSplitPointerDown = (e) => {
    draggingSplitRef.current = true;
    try {
      const el = document.querySelector('.maid-widget');
      const header = el ? el.querySelector('.maid-header') : null;
      if (el) {
        const panelRect = el.getBoundingClientRect();
        const headerH = header?.offsetHeight || 0;
        // 记录拖拽起点在面板内部的局部 Y 坐标
        dragStartLocalYRef.current = e.clientY - panelRect.top - headerH;
      } else {
        dragStartLocalYRef.current = 0;
      }
      dragStartRatioRef.current = splitRatio;
    } catch {
      dragStartLocalYRef.current = 0;
      dragStartRatioRef.current = splitRatio;
    }
    try {
      if (typeof e?.target?.setPointerCapture === 'function' && e.pointerId != null) e.target.setPointerCapture(e.pointerId);
    } catch { /* ignore */ }
    try { document.body.style.cursor = 'ns-resize'; } catch { /* ignore */ }
  };

  const onSplitDoubleClick = () => {
    const el = document.querySelector('.maid-widget'); if (!el) { setSplitRatio(0.5); return; }
    const header = el.querySelector('.maid-header');
    const total = innerHeight || (el.clientHeight - (header?.offsetHeight || 0));
    const lowerBound = Math.max(RATIO_MIN, total > 0 ? MIN_TOP_PX / total : RATIO_MIN);
    const upperBound = Math.min(RATIO_MAX, total > 0 ? 1 - (MIN_BOTTOM_PX / total) : RATIO_MAX);
    const mid = 0.5;
    setSplitRatio(Math.min(upperBound, Math.max(lowerBound, mid)));
  };

  const onSplitKeyDown = (e) => {
    const key = e.key;
    const step = (key === 'PageUp' || key === 'PageDown') ? 0.1 : 0.02;
    let next = splitRatio;
    if (key === 'ArrowUp' || key === 'PageUp' || key === 'Home') next = key === 'Home' ? RATIO_MIN : splitRatio + step;
    if (key === 'ArrowDown' || key === 'PageDown' || key === 'End') next = key === 'End' ? RATIO_MAX : splitRatio - step;
    if (next === splitRatio) return;
    const el = document.querySelector('.maid-widget'); if (!el) { setSplitRatio(Math.min(RATIO_MAX, Math.max(RATIO_MIN, next))); return; }
    const header = el.querySelector('.maid-header');
    const total = innerHeight || (el.clientHeight - (header?.offsetHeight || 0));
    const lowerBound = Math.max(RATIO_MIN, total > 0 ? MIN_TOP_PX / total : RATIO_MIN);
    const upperBound = Math.min(RATIO_MAX, total > 0 ? 1 - (MIN_BOTTOM_PX / total) : RATIO_MAX);
    setSplitRatio(Math.min(upperBound, Math.max(lowerBound, next)));
    try { e.preventDefault(); } catch { /* ignore */ }
  };

  const calcHeights = (controlbarH) => {
    const topHeightPx = innerHeight ? Math.max(0, Math.round(innerHeight * splitRatio)) : 0;
    const bottomHeightPx = innerHeight ? Math.max(0, innerHeight - topHeightPx - 6) : 0;
    const canvasAreaHeightPx = Math.max(0, bottomHeightPx - (Number(controlbarH) || 0));
    return { topHeightPx, bottomHeightPx, canvasAreaHeightPx };
  };

  return { splitRatio, setSplitRatio, innerHeight, setInnerHeight, onSplitPointerDown, onSplitDoubleClick, onSplitKeyDown, calcHeights };
}
