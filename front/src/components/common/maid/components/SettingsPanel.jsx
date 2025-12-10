import React from 'react';
import { modelConfigs } from '../constants';

export default function SettingsPanel({ dpi, setDpi, currentModelKey, setModelKey }) {
  return (
    <div id="maid-settings-panel" className="maid-settings-panel" role="dialog" aria-label="看板娘设置">
      <div className="maid-field">
        <label className="maid-controls-label" htmlFor="maidDpi">清晰度</label>
        <select id="maidDpi" className="maid-select" value={String(dpi)} onChange={(e) => setDpi(parseFloat(e.target.value))} title="调整渲染分辨率，数值越大越耗性能">
          <option value="1">1x</option>
          <option value="2">2x</option>
          <option value="3">3x</option>
        </select>
      </div>
      <div className="maid-field">
        <label className="maid-controls-label" htmlFor="maidModel">模型</label>
        <select
          id="maidModel"
          className="maid-select"
          value={currentModelKey}
          onChange={(e) => setModelKey(e.target.value)}
          title="切换看板娘模型"
        >
          {Object.entries(modelConfigs).map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
