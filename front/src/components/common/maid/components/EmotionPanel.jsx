import React from 'react';

export default function EmotionPanel({
  collapsed,
  openPanel,
  getCategorizedExpressions,
  selectedExpression,
  setSelectedExpression,
  selectedClothes,
  setSelectedClothes,
  selectedAction,
  setSelectedAction,
  selectedScene,
  setSelectedScene,
  modelRef,
  getExpressionJson,
}) {
  if (collapsed || !openPanel) return null;
  const { emotionList, clothesList, actionList, sceneList } = getCategorizedExpressions();
  let list = []; let title = '';
  switch (openPanel) {
    case 'emotion': title = '表情'; list = emotionList; break;
    case 'clothes': title = '装扮'; list = clothesList; break;
    case 'action': title = '动作'; list = actionList; break;
    case 'scene': title = '场景'; list = sceneList; break;
    default: break;
  }
  if (!list.length) return null;

  return (
    <div className="maid-emotion-panel maid-emotion-panel-in" role="menu" aria-label={`选择${title}`}>
      <div className="maid-section-title">{title}</div>
      <ul className="maid-emotion-list" role="listbox" aria-activedescendant={selectedExpression || undefined}>
        {list.map((e) => {
          let isActive = false;
          switch (openPanel) {
            case 'clothes': isActive = selectedClothes.includes(e.name); break;
            case 'action': isActive = selectedAction === e.name; break;
            case 'scene': isActive = selectedScene === e.name; break;
            default: isActive = selectedExpression === e.name; break;
          }
          const handleClick = async () => {
            const model = modelRef.current;
            switch (openPanel) {
              case 'clothes': {
                setSelectedClothes((prev) => {
                  const exist = prev.includes(e.name);
                  return exist ? prev.filter((n) => n !== e.name) : [...prev, e.name];
                });
                break;
              }
              case 'action': {
                setSelectedAction((prev) => (prev === e.name ? '' : e.name));
                break;
              }
              case 'scene': {
                setSelectedScene((prev) => (prev === e.name ? '' : e.name));
                break;
              }
              default: {
                setSelectedExpression(e.name);
                try {
                  if (model) { await model.expression(e.name); }
                } catch {
                  try {
                    if (model) { const json = await getExpressionJson(e.file); await model.expression(json); }
                  } catch (err2) { console.warn('应用表情失败', err2); }
                }
              }
            }
          };
          return (
            <li key={e.name} role="option" aria-selected={isActive}>
              <button type="button" className={`maid-emotion-item${isActive ? ' active' : ''}`} onClick={handleClick} title={`应用${title}：${e.displayName || e.name}`}>
                {e.displayName || e.name}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
