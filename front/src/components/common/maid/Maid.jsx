import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Application, Ticker } from 'pixi.js';
import '../../../styles/common/aimaid/Maid.css';
import MaidAiChat from './MaidAiChat';
import Header from './components/Header';
import Splitter from './components/Splitter';
import CanvasArea from './components/CanvasArea';
import ControlBar from './components/ControlBar';
import SettingsPanel from './components/SettingsPanel';
import EmotionPanel from './components/EmotionPanel';
import ExpandHandle from './components/ExpandHandle';
import { DEFAULT_CONFIG_KEY, modelConfigs, RATIO_MIN, RATIO_MAX, WIDTH_KEY as WIDTH_KEY_CONST, SPLIT_KEY as SPLIT_KEY_CONST, MIN_TOP_PX as MIN_TOP_PX_CONST, MIN_BOTTOM_PX as MIN_BOTTOM_PX_CONST } from './constants';
import { Live2DModel } from 'pixi-live2d-display/cubism4';
import usePanelWidth from './hooks/usePanelWidth';
import useLayoutSplit from './hooks/useLayoutSplit';
import ensureCubismCoreReady from './utils/ensureCubismCoreReady';
import resolveUrl from '@utils/resolveUrl';

// 确保 Live2D 使用 Pixi 的全局 Ticker 驱动动画（需要传入 Ticker 类，而非实例）
if (!Live2DModel._tickerRegistered) {
  Live2DModel.registerTicker(Ticker);
  // 标记避免重复注册（非公开属性，仅内部使用）
  Live2DModel._tickerRegistered = true;
}

// ensureCubismCoreReady 已通过 utils 引入，移除本地重复定义

export default function Maid({ defaultCollapsed = true, onModelLoaded, onWidthChange }) {
  const COLLAPSED_RESERVE_PX = 72; // reserve space for the expand handle + shadow so it doesn't occlude content
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const modelRef = useRef(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const preloadedRef = useRef(new Map());
  const modelUrlRef = useRef('');
  const expJsonCacheRef = useRef(new Map());
  const compositeTargetRef = useRef(new Map());
  const enforcerOnRef = useRef(false);
  const enforcerFnRef = useRef(null);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const WIDTH_KEY = WIDTH_KEY_CONST;
  const { panelWidth, setPanelWidth, onResizerPointerDown } = usePanelWidth(WIDTH_KEY);

  // Notify parent about width changes
  useEffect(() => {
    if (onWidthChange) {
      onWidthChange(collapsed ? COLLAPSED_RESERVE_PX : panelWidth);
    }
  }, [panelWidth, collapsed, onWidthChange]);

  const [userScale] = useState(1); // UI 不再暴露
  const basePosRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const SPLIT_KEY = SPLIT_KEY_CONST;
  const { splitRatio, innerHeight, setInnerHeight, onSplitPointerDown, onSplitDoubleClick, onSplitKeyDown, calcHeights } = useLayoutSplit({ RATIO_MIN, RATIO_MAX, MIN_TOP_PX: MIN_TOP_PX_CONST, MIN_BOTTOM_PX: MIN_BOTTOM_PX_CONST });
  const [controlbarH, setControlbarH] = useState(0);
  const MIN_TOP_PX = MIN_TOP_PX_CONST;
  const MIN_BOTTOM_PX = MIN_BOTTOM_PX_CONST;


  const [selectedExpression, setSelectedExpression] = useState('');
  const [selectedClothes, setSelectedClothes] = useState([]);
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedScene, setSelectedScene] = useState('');
  const [openPanel, setOpenPanel] = useState('');
  const [currentModelKey, setCurrentModelKey] = useState(DEFAULT_CONFIG_KEY);

  // 移除前端模型选择，固定使用后端配置对应的默认模型
  const getCurrentConfig = useCallback(
    () => modelConfigs[currentModelKey] || modelConfigs[DEFAULT_CONFIG_KEY],
    [currentModelKey],
  );

  const getCategorizedExpressions = useCallback(() => {
    const cfg = getCurrentConfig();
    return cfg.expressions;
  }, [getCurrentConfig]);

  const fitAndPlace = useCallback(() => {
    const app = appRef.current;
    const container = containerRef.current;
    const model = modelRef.current;
    if (!app || !container || !model || !app.renderer) return;

    const canvasEl =
      container.querySelector('.maid-canvas-area .maid-canvas-wrap') ||
      container.querySelector('.maid-canvas-wrap');
    const viewW = (canvasEl && canvasEl.clientWidth) || 300;
    const viewH = (canvasEl && canvasEl.clientHeight) || 400;

    // 使用 pixi-live2d 内部计算出的模型基准宽高来自适应，而不是 CanvasInfo（单位差异会导致过大）
    const baseW = Number(model?.internalModel?.width) || 1;
    const baseH = Number(model?.internalModel?.height) || 1;
    let finalScale = Math.min(viewW / baseW, viewH / baseH) * 0.95;
    if (!Number.isFinite(finalScale) || finalScale <= 0) finalScale = 0.35;
    finalScale = Math.max(0.01, finalScale * (Number(userScale) || 1));

    if (model.anchor && typeof model.anchor.set === 'function') model.anchor.set(0.5, 0.5);
    model.scale.set(finalScale, finalScale);
    const baseX = viewW / 2;
    const scaledH = baseH * finalScale;
    const bottomMargin = 8;
    const baseY = Math.max(scaledH / 2 + bottomMargin, viewH - bottomMargin - (scaledH / 2));
    basePosRef.current = { x: baseX, y: baseY };
    model.x = baseX + (offsetRef.current?.x || 0);
    model.y = baseY + (offsetRef.current?.y || 0);
  }, [userScale]);

  const startIdle = useCallback(async (model) => {
    if (!model) return false;
    let groups = [];
    try {
      const settings = model?.internalModel?.settings || model?.internalModel?._settings;
      const motions = settings?.motions || settings?.Motions || settings?._motions;
      if (motions && typeof motions === 'object') groups = Object.keys(motions);
    } catch { /* ignore */ }
    if (!groups.length) return false;
    const exactPref = ['Idle', 'idle', 'IDLE', '待机', '待机动画', '待機'];
    let group = exactPref.find((g) => groups.includes(g));
    if (!group) group = groups.find((g) => /idle|待机|待機/i.test(g));
    if (!group) return false;
    try {
      try { model?.internalModel?.motionManager?.stopAllMotions?.(); } catch { /* ignore */ }
      await model.motion(group);
      return true;
    } catch { /* ignore */ }
    return false;
  }, []);

  const fitAndPlaceMemo = useCallback(() => { try { fitAndPlace(); } catch { /* ignore */ } }, [fitAndPlace]);

  const loadAndShowModel = useCallback(async (path) => {
    const cfgPath = path || getCurrentConfig().modelPath;
    const app = appRef.current;
    // 修复：确保 app 实例及其 stage 存在
    if (!app || app.destroyed || !app.stage) return;

    // Prevent reloading same model
    if (modelUrlRef.current === cfgPath && modelRef.current) {
      if (onModelLoaded) onModelLoaded();
      return;
    }

    try {
      await ensureCubismCoreReady();
      setStatus('加载模型资源…'); setError('');
      console.debug('[Maid] Loading model:', cfgPath);

      // 再次检查 app 状态，因为 await 期间可能已被销毁
      if (!appRef.current || appRef.current.destroyed || !appRef.current.stage) return;

      if (modelRef.current && app && app.stage) {
        try { modelRef.current.autoUpdate = false; } catch { /* ignore */ }
        try { app.stage.removeChild(modelRef.current); } catch { /* ignore */ }
        try {
          const oldPath = modelUrlRef.current;
          if (oldPath && oldPath !== cfgPath) {
            try { modelRef.current.destroy(true); } catch { /* ignore */ }
            try { preloadedRef.current.delete(oldPath); } catch { /* ignore */ }
          }
        } catch { /* ignore */ }
      }
      try { app.stage.removeChildren(); } catch { /* ignore */ }
      let model = preloadedRef.current.get(cfgPath);
      if (!model) {
        // 使用 resolveUrl 处理模型路径，支持 COS
        const resolvedPath = resolveUrl(cfgPath);
        model = await Live2DModel.from(resolvedPath, { autoInteract: false, autoUpdate: false });
        model.interactive = true;
        if (model.anchor && typeof model.anchor.set === 'function') model.anchor.set(0.5, 0.5);
        try {
          if (!model._ticker && Ticker?.shared) model._ticker = Ticker.shared;
          model.autoUpdate = true;
        } catch { /* ignore */ }
        preloadedRef.current.set(cfgPath, model);
      }

      // 再次检查 app 状态
      if (!appRef.current || appRef.current.destroyed || !appRef.current.stage) return;

      modelRef.current = model; modelUrlRef.current = cfgPath;
      model.visible = true;
      if (app && app.stage) {
        if (model.parent !== app.stage) app.stage.addChild(model);
      } else return;
      try {
        if (!model._ticker && Ticker?.shared) model._ticker = Ticker.shared;
        model.autoUpdate = true;
      } catch { /* ignore */ }
      // 已移除 currentModelKey 同步逻辑
      fitAndPlaceMemo();
      try { Ticker.shared.remove(enforcerFnRef.current); } catch { /* ignore */ }
      enforcerOnRef.current = false; compositeTargetRef.current = new Map();
      try { expJsonCacheRef.current = new Map(); } catch { /* ignore */ }
      await startIdle(modelRef.current);
      if (onModelLoaded) onModelLoaded();
      setStatus(''); setError('');
      try {
        const { emotionList } = getCategorizedExpressions();
        setSelectedExpression(emotionList[0]?.name || '');
        setSelectedClothes([]);
        setSelectedAction('');
        setSelectedScene('');
      } catch { /* ignore */ }
    } catch (e) { console.error('[Maid] 加载模型失败:', e); setError(e?.message || '加载模型失败'); setStatus(''); }
  }, [getCurrentConfig, fitAndPlaceMemo, getCategorizedExpressions, startIdle, onModelLoaded]);

  // 初始化 Pixi 应用并挂载到 CanvasArea 的 .maid-canvas-wrap
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const container = containerRef.current; if (!container) return undefined;

    // 尝试清理页面上可能残留的重复 Maid DOM（防止出现两个看板娘）
    try {
      const allMaids = document.querySelectorAll('.maid-widget');
      if (allMaids.length > 1) {
        allMaids.forEach(el => {
          if (el !== container && el.parentElement) {
            el.parentElement.removeChild(el);
          }
        });
      }
    } catch { /* ignore */ }

    const canvasEl = container.querySelector('.maid-canvas-area .maid-canvas-wrap') || container.querySelector('.maid-canvas-wrap');
    if (!canvasEl) return undefined;

    setStatus('初始化渲染器…'); setError('');
    const app = new Application({
      resizeTo: canvasEl,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: 3,
      roundPixels: true,
      powerPreference: 'high-performance',
    });
    appRef.current = app;
    // 清理可能存在的旧 canvas，防止重复添加
    while (canvasEl.firstChild) {
      canvasEl.removeChild(canvasEl.firstChild);
    }
    try { if (app.view && app.view.parentNode !== canvasEl) canvasEl.appendChild(app.view); } catch { /* ignore */ }

    const handleResize = () => {
      if (!app || !canvasEl || !app.renderer) return;
      try { app.renderer.resize(canvasEl.clientWidth, canvasEl.clientHeight); } catch { /* ignore */ }
      try { fitAndPlaceMemo(); } catch { /* ignore */ }
    };

    window.addEventListener('resize', handleResize);

    const preloadedAtMount = preloadedRef.current;

    return () => {
      window.removeEventListener('resize', handleResize);
      try { Ticker.shared.remove(enforcerFnRef.current); } catch { /* ignore */ }
      enforcerOnRef.current = false; compositeTargetRef.current = new Map();
      try {
        if (modelRef.current && app && app.stage) {
          try { app.stage.removeChild(modelRef.current); } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
      try {
        preloadedAtMount.forEach((m) => {
          try {
            if (m && m.parent) m.parent.removeChild(m);
            m && m.destroy && m.destroy(true);
          } catch { /* ignore */ }
        });
        app.destroy(true, { children: true, texture: true, baseTexture: true });
      } catch { /* ignore */ }
      appRef.current = null;
    };
  }, [fitAndPlaceMemo]); // 仅依赖 fitAndPlaceMemo (通常稳定)，移除 loadAndShowModel 以避免重建 App

  // 监听模型配置变化，加载模型
  useEffect(() => {
    const timer = setTimeout(() => {
      if (appRef.current && !appRef.current.destroyed) {
        void loadAndShowModel();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [loadAndShowModel]);

  // 面板尺寸、分割比例变动时，调整 renderer 并重新布局模型
  useEffect(() => {
    const app = appRef.current; const container = containerRef.current; if (!app || !container || !app.renderer) return;
    const visibleWrap = container.querySelector('.maid-canvas-area .maid-canvas-wrap') || container.querySelector('.maid-canvas-wrap');
    const canvasEl = visibleWrap; if (!canvasEl) return;
    try { app.renderer.resize(canvasEl.clientWidth, canvasEl.clientHeight); } catch { /* ignore */ }
    try { fitAndPlaceMemo(); } catch { /* ignore */ }
  }, [panelWidth, collapsed, userScale, splitRatio, innerHeight, fitAndPlaceMemo]);


  const resolveExpressionUrl = useCallback((file) => {
    const f = String(file || '').replace(/\\/g, '/');
    if (/^https?:\/\//i.test(f) || f.startsWith('/')) return f;

    // 优先使用当前配置的模型路径，避免切换模型时 modelUrlRef 尚未更新导致路径解析错误
    const cfg = getCurrentConfig();
    const modelUrl = cfg ? cfg.modelPath : (modelUrlRef.current || modelConfigs[DEFAULT_CONFIG_KEY].modelPath);

    const i = modelUrl.lastIndexOf('/'); const base = i >= 0 ? modelUrl.slice(0, i + 1) : '/';
    return base + f;
  }, [getCurrentConfig, modelUrlRef]);

  const getExpressionJson = useCallback(async (file) => {
    const url = resolveExpressionUrl(file);
    const cache = expJsonCacheRef.current; if (cache.has(url)) return cache.get(url);
    const res = await fetch(url, { cache: 'no-cache' }); if (!res.ok) throw new Error(`加载表达式失败: ${url}`);
    const json = await res.json(); cache.set(url, json); return json;
  }, [resolveExpressionUrl, expJsonCacheRef]);

  const applyCompositeFromSelections = useCallback(async () => {
    const model = modelRef.current; if (!model) return;
    const { clothesList, actionList, sceneList } = getCategorizedExpressions();
    const need = new Map(); const pushNeed = (list) => list.forEach((it) => it && need.set(it.name, { file: it.file, json: null }));
    pushNeed(clothesList); pushNeed(actionList); pushNeed(sceneList);
    await Promise.all([...need.entries()].map(async ([, v]) => { try { v.json = await getExpressionJson(v.file); } catch { v.json = null; } }));
    const getParamIds = (names) => { const s = new Set(); names.forEach((n) => { const j = need.get(n)?.json; (j?.Parameters || j?.parameters || []).forEach((p) => { const id = p?.Id || p?.id; if (id) s.add(id); }); }); return s; };
    const clothesNames = clothesList.map(x => x.name); const actionNames = actionList.map(x => x.name); const sceneNames = sceneList.map(x => x.name);
    const clothesParams = getParamIds(clothesNames); const actionParams = getParamIds(actionNames); const sceneParams = getParamIds(sceneNames);
    const target = new Map(); const setParamsFrom = () => (n) => { const j = need.get(n)?.json; if (!j) return; for (const p of (j.Parameters || j.parameters || [])) { const id = p?.Id || p?.id; if (!id) continue; const v = Number(p?.Value ?? p?.value ?? 0); target.set(id, v); } };
    selectedClothes.forEach(setParamsFrom()); clothesParams.forEach((id) => { if (!target.has(id)) target.set(id, 0); });
    if (selectedAction) setParamsFrom()(selectedAction); actionParams.forEach((id) => { if (!selectedAction || !target.has(id)) target.set(id, 0); });
    if (selectedScene) setParamsFrom()(selectedScene); sceneParams.forEach((id) => { if (!selectedScene || !target.has(id)) target.set(id, 0); });
    compositeTargetRef.current = target;
    if (!target.size) { try { Ticker.shared.remove(enforcerFnRef.current); } catch (err) { void err; } enforcerOnRef.current = false; return; }
    const composite = { Type: 'Live2D Expression', FadeInTime: 0.12, FadeOutTime: 0.1, Parameters: Array.from(target.entries()).map(([Id, Value]) => ({ Id, Value, Blend: 'Overwrite' })), };
    try { await model.expression(composite); } catch (err) { void err; }
    if (!enforcerOnRef.current) {
      const fn = () => { try { const m = modelRef.current; if (!m) return; const core = m?.internalModel?.coreModel; if (!core) return; for (const [id, v] of compositeTargetRef.current.entries()) { try { if (core.setParameterValueById) core.setParameterValueById(id, v); else if (core.setParameterById) core.setParameterById(id, v); } catch (err) { void err; } } } catch (err) { void err; } };
      enforcerFnRef.current = fn; try { Ticker.shared.add(fn); } catch (err) { void err; }
      enforcerOnRef.current = true;
    }
  }, [getCategorizedExpressions, getExpressionJson, selectedClothes, selectedAction, selectedScene, compositeTargetRef, enforcerFnRef, enforcerOnRef, modelRef]);

  useEffect(() => { void applyCompositeFromSelections(); }, [applyCompositeFromSelections, selectedClothes, selectedAction, selectedScene]);

  useEffect(() => { fitAndPlaceMemo(); }, [fitAndPlaceMemo]);

  useEffect(() => {
    const el = containerRef.current; if (!el) return; const bar = el.querySelector('.maid-controlbar'); if (!bar) return; const btns = Array.from(bar.querySelectorAll('button.maid-btn'));
    btns.forEach((b, i) => { try { b.style.setProperty('--i', String(i)); } catch (err) { void err; } }); try { bar.style.setProperty('--btnCount', String(btns.length)); } catch (err) { void err; }
    try { setControlbarH(bar.offsetHeight || 0); } catch (err) { void err; }
  }, [setInnerHeight]);

  // 在尺寸、分割比例变化时，更新控制栏高度（确保画布高度 = 底部区高度 - 控制栏高度）
  useEffect(() => {
    const el = containerRef.current; if (!el) return; const bar = el.querySelector('.maid-controlbar');
    try { setControlbarH((bar && bar.offsetHeight) || 0); } catch (err) { void err; }
  }, [innerHeight, splitRatio, panelWidth]);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      if (next) {
        try {
          const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
          const defaultW = Math.round(vw * 0.25); // 展开时初始化为 1/4 视窗宽度
          const minW = Math.round(vw * 0.125);
          const maxW = Math.round(vw * 0.333);
          const clamped = Math.min(Math.max(defaultW, minW), maxW);
          if (clamped > 0) {
            // 主动覆盖一次面板宽度，避免历史 localStorage 记录导致默认值偏大
            document.documentElement.style.setProperty('--maid-sidebar-width', clamped + 'px');
            // 通过 hook 的 setPanelWidth 更新内部状态与持久化
            try { if (typeof setPanelWidth === 'function') setPanelWidth(clamped); } catch { /* ignore */ }
          }
        } catch { /* ignore */ }
      }
      return next;
    });
  };
  const toggleSettings = () => { setCollapsed(false); setSettingsOpen((v) => !v); };

  const onResizerDown = (e) => onResizerPointerDown(e, containerRef.current);

  // 持久化已在 usePanelWidth 内处理

  // 分割条逻辑已移至 useLayoutSplit

  useEffect(() => {
    // 根据收起状态与当前面板宽度，设置页面级 CSS 变量以控制右侧占位宽度
    try {
      const w = Math.min(panelWidth || 0, Math.round((typeof window !== 'undefined' ? window.innerWidth : 0) * 0.33));
      const value = collapsed ? `${COLLAPSED_RESERVE_PX}px` : `${w}px`;
      document.documentElement.style.setProperty('--maid-sidebar-width', value);
    } catch { /* ignore */ }
  }, [panelWidth, collapsed]);

  useEffect(() => () => {
    // 卸载时清理占位宽度，避免残留挤压
    try { document.documentElement.style.removeProperty('--maid-sidebar-width'); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const onResize = () => {
      try {
        // 计算面板内可用高度（去除顶部栏高度）
        const el = containerRef.current; if (el) {
          const header = el.querySelector('.maid-header');
          const h = el.clientHeight - (header?.offsetHeight || 0);
          setInnerHeight(h > 0 ? h : 0);
        }
      } catch { /* noop */ }
    };
    window.addEventListener('resize', onResize);
    // 初次计算
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, [setInnerHeight]);


  const triggerMotion = useCallback(async (groupName) => {
    const model = modelRef.current;
    if (!model) return;
    try {
      // 动作/表情映射表
      // 优先匹配表情(Expression)，因为该模型主要依靠表情进行交互
      const mappings = {
        thinking: ['星星眼', '眼镜', 'Thinking', 'TapBody'], // 思考时：星星眼(期待) 或 戴眼镜
        happy: ['爱心眼', '害羞', 'Happy', 'TapHead'],       // 开心时：爱心眼 或 害羞
        surprise: ['流泪', '黑脸', '生气', 'Surprise', 'FlickHead'] // 错误/惊讶时：流泪 或 黑脸
      };

      const candidates = mappings[groupName] || [groupName];

      // 尝试播放表情或动作
      // 注意：pixi-live2d-display 中 expression() 接收的是 model3.json 中定义的 Name 或文件名(无后缀)
      // 我们遍历候选列表，尝试触发
      for (const name of candidates) {
        // 1. 尝试作为表情触发
        try {
          // model.expression() 返回 Promise
          const res = await model.expression(name);
          if (res) return; // 如果成功触发表情，则结束
        } catch (e) { /* ignore */ }

        // 2. 尝试作为动作触发
        try {
          // 检查动作组是否存在
          const settings = model?.internalModel?.settings || model?.internalModel?._settings;
          const motions = settings?.motions || settings?.Motions || settings?._motions;
          if (motions && (motions[name] || Object.keys(motions).some(k => k.toLowerCase() === name.toLowerCase()))) {
            await model.motion(name);
            return; // 成功触发动作则结束
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // ignore global error
    }
  }, []);

  // 计算上下区以及画布区高度（扣除控制栏高度）
  const { topHeightPx, bottomHeightPx, canvasAreaHeightPx } = calcHeights(controlbarH);

  return (
    <div ref={containerRef} className={`maid-widget maid-float${collapsed ? ' maid-collapsed' : ''}`} style={{ width: panelWidth ? `${panelWidth}px` : undefined }}>
      <div className="maid-resizer" role="separator" aria-orientation="vertical" onPointerDown={onResizerDown} />

      {/* 顶部栏：动作（设置/收起） */}
      <Header collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />

      {/* 主体：上部聊天，下部看板娘，可拖拽分割；高度完全由 calcHeights 控制，保证拖拽条位置精确 */}
      <div className="maid-top" style={{ height: innerHeight ? topHeightPx + 'px' : undefined }}>
        <div className="maid-ai-chat-wrap">
          <MaidAiChat visible={!collapsed} triggerMotion={triggerMotion} />
        </div>
      </div>
      <Splitter
        onPointerDown={onSplitPointerDown}
        onDoubleClick={onSplitDoubleClick}
        onKeyDown={onSplitKeyDown}
        value={splitRatio}
        min={RATIO_MIN}
        max={RATIO_MAX}
      />
      <div className="maid-bottom" style={{ height: innerHeight ? bottomHeightPx + 'px' : undefined }}>
        <CanvasArea heightPx={canvasAreaHeightPx} />
        <ControlBar
          getCategorizedExpressions={getCategorizedExpressions}
          openPanel={openPanel}
          setOpenPanel={setOpenPanel}
          settingsOpen={settingsOpen}
          onToggleSettings={toggleSettings}
        />
        {status && <div className="maid-status" role="status">{status}</div>}
        {error && !status && <div className="maid-error" role="alert">{error}</div>}
      </div>

      {settingsOpen && !collapsed && (
        <SettingsPanel
          currentModelKey={currentModelKey}
          setModelKey={setCurrentModelKey}
        />
      )}
      <EmotionPanel
        collapsed={collapsed}
        openPanel={openPanel}
        getCategorizedExpressions={getCategorizedExpressions}
        selectedExpression={selectedExpression}
        setSelectedExpression={(v) => { setSelectedExpression(v); setOpenPanel(''); }}
        selectedClothes={selectedClothes}
        setSelectedClothes={setSelectedClothes}
        selectedAction={selectedAction}
        setSelectedAction={(v) => { setSelectedAction(v); setOpenPanel(''); }}
        selectedScene={selectedScene}
        setSelectedScene={(v) => { setSelectedScene(v); setOpenPanel(''); }}
        modelRef={modelRef}
        getExpressionJson={getExpressionJson}
      />
      {/* 收起时仍显示的固定展开控件 */}
      {collapsed && <ExpandHandle onClick={() => setCollapsed(false)} />}
    </div>
  );
}
