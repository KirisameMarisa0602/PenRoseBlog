import React from 'react';

export default function ControlBar({ getCategorizedExpressions, openPanel, setOpenPanel, settingsOpen, onToggleSettings }) {
  const { emotionList, clothesList, actionList, sceneList } = getCategorizedExpressions();
  const mkBtn = (type, icon, title, disabled) => (
    <button
      className={`maid-iconbtn maid-btn${openPanel === type ? ' maid-iconbtn-active' : ''}`}
      title={title}
      aria-label={title}
      aria-expanded={openPanel === type}
      disabled={disabled}
      onClick={() => setOpenPanel((p) => (p === type ? '' : type))}
    >
      <img src={icon} alt={title} />
    </button>
  );
  return (
    <div className="maid-controlbar">
      {mkBtn('emotion', '/icons/maid/emotion.svg', emotionList.length ? '表情' : '当前模型未提供表情', emotionList.length === 0)}
      {mkBtn('clothes', '/icons/maid/clothes.svg', clothesList.length ? '装扮' : '当前模型未提供装扮', clothesList.length === 0)}
      {mkBtn('action', '/icons/maid/action.svg', actionList.length ? '动作' : '当前模型未提供动作', actionList.length === 0)}
      {mkBtn('scene', '/icons/maid/sence.svg', sceneList.length ? '场景' : '当前模型未提供场景', sceneList.length === 0)}
      <button
        className={`maid-iconbtn maid-btn${settingsOpen ? ' maid-iconbtn-active' : ''}`}
        onClick={onToggleSettings}
        title="设置"
        aria-label="设置"
        aria-expanded={settingsOpen}
      >
        <img src="/icons/maid/config.svg" alt="设置" />
      </button>
    </div>
  );
}
