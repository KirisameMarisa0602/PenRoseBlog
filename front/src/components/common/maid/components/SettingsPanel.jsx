import React from 'react';
import { modelConfigs } from '../constants';

export default function SettingsPanel({ currentModelKey, setModelKey }) {
  return (
    <div id="maid-settings-panel" className="maid-settings-panel" role="dialog" aria-label="看板娘设置">
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
