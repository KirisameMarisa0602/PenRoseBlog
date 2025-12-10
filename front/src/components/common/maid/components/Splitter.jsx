import React from 'react';

export default function Splitter({ onPointerDown, onDoubleClick, onKeyDown, value, min = 0, max = 1 }) {
  return (
    <div
      className="maid-splitter"
      role="separator"
      aria-orientation="horizontal"
      tabIndex={0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={typeof value === 'number' ? value : undefined}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
    />
  );
}
