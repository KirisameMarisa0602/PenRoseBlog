import React from 'react';

export default function Header({ collapsed, onToggleCollapsed }) {
  return (
    <div className="maid-header">
      <div className="maid-header-actions">
        <button
          className="maid-toggle maid-btn"
          aria-pressed={collapsed}
          onClick={onToggleCollapsed}
          title={collapsed ? '展开' : '收起'}
        >
          {collapsed ? '展开' : '收起'}
        </button>
      </div>
    </div>
  );
}
