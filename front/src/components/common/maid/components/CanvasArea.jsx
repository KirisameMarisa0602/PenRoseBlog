import React from 'react';

export default function CanvasArea({ heightPx }) {
  const style = {};
  // 初始渲染或计算暂未就绪时，避免把高度固定为 0，
  // 让其回退到 CSS 的 flex 布局自然占位，待计算完成后再设置确切高度。
  if (Number(heightPx) > 0) style.height = heightPx + 'px';
  return (
    <div className="maid-canvas-area" style={style}>
      <div className="maid-canvas-wrap" />
    </div>
  );
}
