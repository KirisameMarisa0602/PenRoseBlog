import React from 'react';
import { createPortal } from 'react-dom';

export default function ExpandHandle({ onClick }) {
  // 使用 portal，保证拉手始终挂在 body 右侧，不受父元素影响
  return createPortal(
    <button className="maid-expand-handle" title="展开助手" aria-label="展开助手" onClick={onClick}>
      <img src="/icons/maid/aiservant.svg" alt="展开助手" />
    </button>,
    document.body,
  );
}
