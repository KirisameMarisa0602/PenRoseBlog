import React from 'react';

export default function Header({ settingsOpen, onToggleSettings, collapsed, onToggleCollapsed }) {
  return (
    <div className="maid-header">
      <div className="maid-header-actions">
        <button
          className={`maid-iconbtn${settingsOpen ? ' maid-iconbtn-active' : ''}`}
          onClick={onToggleSettings}
          title="设置"
          aria-label="设置"
          aria-expanded={settingsOpen}
        >
          <img src="/icons/maid/config.svg" alt="设置" />
        </button>
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
