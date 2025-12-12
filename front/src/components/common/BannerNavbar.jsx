import React, { useEffect, useRef, useState, useMemo } from 'react';
import '../../styles/common/BannerNavbar.css';
import '../../styles/common/NavAvatar.css';
import '../../styles/common/SplitButton.css';
import NavAvatar from './NavAvatar.jsx';
import NotificationBell from '@components/common/NotificationBell.jsx';
import { useAuthState } from '@hooks/useAuthState';
import { fetchUnreadTotal, markConversationRead } from '@utils/api/messageService';
import { notificationApi } from '@utils/api/notificationApi';
import ExampleSpring from './examples/ExampleSpring.jsx';
import ExampleAutumn from './examples/ExampleAutumn.jsx';
import ExampleWinter from './examples/ExampleWinter.jsx';
import { Link } from 'react-router-dom';
import resolveUrl from '@utils/resolveUrl';

const SplitNavItem = ({ to, text, badge }) => (
  <div className="nav-item-cell split-btn-wrapper">
    <div className="split-btn-top">{text}</div>
    <div className="split-btn-bottom">{text}</div>
    {to ? (
      <Link to={to} className="split-btn-link">
        {text}
        {badge > 0 && <span className="nav-badge-dot" style={{ position: 'absolute', top: '-5px', right: '-10px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff4d4f' }}></span>}
      </Link>
    ) : (
      <span className="split-btn-link" style={{ cursor: 'default', color: 'rgba(255,255,255,0.6)' }}>{text}</span>
    )}
  </div>
);

export default function BannerNavbar({ bannerId }) {
  const { isLoggedIn, user } = useAuthState();
  const userId = user?.id ? String(user.id) : null;
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;   // ← 保留原有兜底
  const BASE_WIDTH = 1650;
  const [navHidden, setNavHidden] = useState(false);
  const [manifest, setManifest] = useState([]);
  const [index, setIndex] = useState(0);
  const [layers, setLayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [sysUnread, setSysUnread] = useState(0);

  const lastScrollRef = useRef(0);
  const prevHiddenRef = useRef(false);
  const initializedRef = useRef(false);
  const containerRef = useRef(null);
  const baseHeightRef = useRef(180);
  const layerRefs = useRef([]);
  const compTransformsRef = useRef([]);
  const mediaSizeRef = useRef([]);
  const compensateRef = useRef(1);
  const moveXRef = useRef(0);
  const animStateRef = useRef({ homing: false, startTime: 0, duration: 300 });

  useEffect(() => {
    let dead = false;
    setError(null);
    fetch(resolveUrl('/banner/manifest.json?_=' + Date.now()))
      .then(r => (r.ok ? r.json() : []))
      .then(list => { if (!dead) setManifest(Array.isArray(list) ? list : []); })
      .catch(e => { console.error(e); if (!dead) setManifest([]); });
    return () => { dead = true; };
  }, [navHidden]);

  useEffect(() => {
    if (!manifest.length) return;
    if (bannerId !== undefined && bannerId !== null) {
      let start = -1;
      if (typeof bannerId === 'number') start = Number.isFinite(bannerId) ? bannerId : -1;
      else if (typeof bannerId === 'string') {
        start = manifest.findIndex(x => String(x?.id || x?.name || '').toLowerCase() === bannerId.toLowerCase());
      }
      if (start >= 0 && start < manifest.length && start !== index) setIndex(start);
      else if (start === -1 && index !== 0) setIndex(0);
    } else if (index >= manifest.length) {
      setIndex(0);
    }
  }, [manifest, bannerId, index]);

  useEffect(() => {
    // 更稳健的滚动处理：除了 window 外，自动为页面中所有可滚动容器添加监听器，
    // 这样在使用内部滚动容器（如侧边面板或右侧主内容区）时也能正确响应导航显示/隐藏。
    let ticking = false;
    const handleScrollEvent = (source) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        try {
          const current = Math.max(
            0,
            (typeof source.scrollTop === 'number' ? source.scrollTop : (window.pageYOffset || 0))
          );
          const last = lastScrollRef.current || 0;
          const goingDown = current > last;
          const delta = Math.abs(current - last);
          if (current <= 0) {
            setNavHidden(false);
          } else if (goingDown && delta > 3 && current > 50) {
            setNavHidden(true);
          } else if (!goingDown && delta > 3) {
            setNavHidden(false);
          }
          lastScrollRef.current = current;
        } catch {
          // ignore
        }
        ticking = false;
      });
    };

    const listeners = new Map();
    const addListener = (el) => {
      if (!el || listeners.has(el)) return;
      const fn = () => handleScrollEvent(el);
      try {
        el.addEventListener('scroll', fn, { passive: true });
        listeners.set(el, fn);
      } catch {
        // ignore
      }
    };

    // add common containers
    addListener(window);
    // const docEl = document.scrollingElement || document.documentElement || document.body;
    // addListener(docEl);

    // initialize lastScrollRef from scrolling element
    try { lastScrollRef.current = window.pageYOffset || 0; } catch { /* ignore init error */ }

    return () => {
      // remove all listeners
      listeners.forEach((fn, el) => {
        try { el.removeEventListener('scroll', fn); } catch { /* ignore */ }
      });
      listeners.clear();
    };
  }, []);

  useEffect(() => {
    const prev = prevHiddenRef.current;
    if (initializedRef.current && prev === true && navHidden === false && manifest.length > 0) {
      setIndex(i => (i + 1) % manifest.length);
    }
    // 将 navHidden 状态同步到根节点 class，便于页面其它组件根据导航栏收起状态调整样式
    try {
      if (navHidden) document.documentElement.classList.add('banner-is-hidden');
      else document.documentElement.classList.remove('banner-is-hidden');
    } catch {
      // ignore
    }
    prevHiddenRef.current = navHidden;
    if (!initializedRef.current) initializedRef.current = true;
  }, [navHidden, manifest.length]);
  const activeId = useMemo(() => (manifest.length ? manifest[index]?.id : null), [manifest, index]);
  const isExample = useMemo(() => ['example-spring', 'example-autumn', 'example-winter'].includes(String(activeId)), [activeId]);

  useEffect(() => {
    let dead = false;
    setLoading(true); setError(null); setLayers([]);
    if (!activeId) { setLoading(false); return; }
    if (['example-spring', 'example-autumn', 'example-winter'].includes(String(activeId))) {
      setLoading(false);
      return;
    }
    fetch(`/banner/assets/${activeId}/data.json?_=${Date.now()}`)
      .then(r => { if (!r.ok) throw new Error(r.status + ' ' + r.statusText); return r.json(); })
      .then(json => {
        if (dead) return;
        const init = Array.isArray(json) ? json.map(item => {
          const [m11 = 1, m12 = 0, m21 = 0, m22 = 1, tx = 0, ty = 0] = Array.isArray(item.transform) ? item.transform : [1, 0, 0, 1, 0, 0];
          return {
            ...item,
            m11, m12, m21, m22,
            baseTx: tx, baseTy: ty,
            tx: tx, ty: ty, rot: 0,
            accel: item.a ?? 0,
            deg: item.deg ?? 0,
            g: item.g ?? 0,
            f: item.f ?? 0
          };
        }) : [];
        const firstH = init[0]?.height ? Number(init[0].height) : null;
        const maxH = init.reduce((m, l) => (Number(l.height) > m ? Number(l.height) : m), 0);
        baseHeightRef.current = Number.isFinite(firstH) && firstH > 0 ? firstH : (maxH > 0 ? maxH : 180);
        setLayers(init);
      })
      .catch(e => { console.error(e); if (!dead) setError(e.message || '加载失败'); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [activeId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !layers.length) return;
    if (isExample) return;
    function layout() {
      const w = Number(window.innerWidth) || Number(document.documentElement.clientWidth) || Number(el.clientWidth) || Number(BASE_WIDTH);
      const compensate = w > BASE_WIDTH ? w / Number(BASE_WIDTH) : 1;
      compensateRef.current = compensate;
      const compT = [];
      const mSizes = [];
      for (let i = 0; i < layers.length; i++) {
        const item = layers[i];
        const t = Array.isArray(item.transform) ? item.transform.slice() : [1, 0, 0, 1, 0, 0];
        t[4] = (t[4] || 0) * compensate;
        t[5] = (t[5] || 0) * compensate;
        compT[i] = t;
        mSizes[i] = [Math.round((Number(item.width) || 0) * compensate), Math.round((Number(item.height) || 0) * compensate)];
      }
      compTransformsRef.current = compT;
      mediaSizeRef.current = mSizes;
      for (let i = 0; i < layerRefs.current.length; i++) {
        const layerEl = layerRefs.current[i];
        if (!layerEl) continue;
        const media = layerEl.firstElementChild;
        if (!media) continue;
        const [mw, mh] = mSizes[i] || [0, 0];
        media.style.width = mw ? mw + 'px' : '';
        media.style.height = mh ? mh + 'px' : '';
        media.style.filter = `blur(${layers[i]?.blur || 0}px)`;
        const baseM = new DOMMatrix(compT[i] || [1, 0, 0, 1, 0, 0]);
        layerEl.style.transform = baseM.toString();
        const op = Array.isArray(layers[i]?.opacity) ? parseFloat(layers[i].opacity[0]) : 1;
        layerEl.style.opacity = String(op);
      }
    }
    layout();
    window.addEventListener('resize', layout);
    return () => window.removeEventListener('resize', layout);
  }, [layers, isExample]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !layers.length) return;
    if (isExample) return;
    let raf = null;
    let initX = null;
    let wasInside = false;
    const duration = animStateRef.current.duration;
    const lerp = (a, b, t) => a + (b - a) * t;
    const within = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX, y = e.clientY;
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };
    const onMove = (e) => {
      const inside = within(e);
      if (!inside) {
        initX = null;
        if (!animStateRef.current.homing) {
          animStateRef.current.homing = true;
          animStateRef.current.startTime = 0;
          if (!raf) raf = requestAnimationFrame(homing);
        }
        wasInside = false;
        return;
      }
      if (!wasInside) {
        initX = e.pageX;
        wasInside = true;
      }
      if (initX == null) initX = e.pageX;
      moveXRef.current = (e.pageX - initX);
      animStateRef.current.homing = false;
      if (!raf) raf = requestAnimationFrame(animate);
    };
    const onLeave = () => {
      wasInside = false;
      animStateRef.current.homing = true;
      animStateRef.current.startTime = 0;
      if (!raf) raf = requestAnimationFrame(homing);
    };
    function applyFor(progress) {
      const compT = compTransformsRef.current || [];
      for (let i = 0; i < layerRefs.current.length; i++) {
        const layerEl = layerRefs.current[i];
        if (!layerEl) continue;
        const item = layers[i];
        if (!item) continue;
        const base = new DOMMatrix(compT[i] || [1, 0, 0, 1, 0, 0]);
        let moveX = moveXRef.current;
        let s = item.f ? item.f * moveX + 1 : 1;
        let g = (item.g || 0) ? item.g * moveX : 0;
        let move = (item.a || 0) * moveX;
        let m = base.multiply(new DOMMatrix([base.a * s, base.b, base.c, base.d * s, move, g]));
        if (item.deg) {
          const deg = item.deg * moveX;
          m = m.multiply(new DOMMatrix([
            Math.cos(deg),
            Math.sin(deg),
            -Math.sin(deg),
            Math.cos(deg),
            0,
            0,
          ]));
        }
        if (typeof progress === 'number') {
          const backMove = lerp((moveX * (item.a || 0)) + (compT[i]?.[4] || 0), (compT[i]?.[4] || 0), progress);
          const backG = lerp((item.g || 0) * moveX, 0, progress);
          const backS = lerp(item.f ? item.f * moveX + 1 : 1, 1, progress);
          let mm = new DOMMatrix([base.a * backS, base.b, base.c, base.d * backS, backMove - (compT[i]?.[4] || 0), backG]);
          if (item.deg) {
            const d = lerp(item.deg * moveX, 0, progress);
            mm = mm.multiply(new DOMMatrix([
              Math.cos(d),
              Math.sin(d),
              -Math.sin(d),
              Math.cos(d),
              0,
              0,
            ]));
          }
          m = base.multiply(mm);
        }
        if (item.opacity) {
          const o0 = parseFloat(item.opacity[0] || 1);
          const o1 = parseFloat(item.opacity[1] || o0);
          const rectW = Number(window.innerWidth) || Number(document.documentElement.clientWidth) || Number(BASE_WIDTH);
          const ratio = Math.min(Math.abs(moveXRef.current) / rectW * 2, 1);
          const val = typeof progress === 'number'
            ? (moveXRef.current > 0 ? lerp(o1, o0, progress) : lerp(o0, o1, progress))
            : (moveXRef.current > 0 ? lerp(o0, o1, ratio) : lerp(o0, o1, ratio));
          layerEl.style.opacity = String(val);
        }
        layerEl.style.transform = m.toString();
      }
    }
    function animate() {
      raf = null;
      applyFor();
    }
    function homing(timestamp) {
      if (!animStateRef.current.startTime) animStateRef.current.startTime = timestamp;
      const elapsed = timestamp - animStateRef.current.startTime;
      const progress = Math.min(elapsed / Number(duration), 1);
      applyFor(progress);
      if (progress < 1) raf = requestAnimationFrame(homing); else raf = null;
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('blur', onLeave);
    if (!raf) raf = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [layers, isExample]);

  // 新增：封装成函数，便于复用
  const refreshUnreadTotal = React.useCallback(() => {
    if (!userId) { 
      setUnreadTotal(0); 
      setSysUnread(0);
      return; 
    }
    fetchUnreadTotal()
      .then(j => { if (j && j.code === 200) setUnreadTotal(Number(j.data) || 0); })
      .catch((err) => { void err; });
      
    notificationApi.getUnreadCount()
      .then(res => {
        if (res && res.code === 200) {
           setSysUnread(typeof res.data === 'number' ? res.data : (res.data?.count || 0));
        }
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) { setUnreadTotal(0); setSysUnread(0); return; }
    refreshUnreadTotal();
  }, [userId, refreshUnreadTotal]);

  // 新增：订阅全局通知 SSE（后端已由 NotificationService 推送 PRIVATE_MESSAGE）
  useEffect(() => {
    if (!userId) return;
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : `?token=`;
    let es = null;
    try { es = new EventSource(`/api/friends/subscribe${tokenParam}`); } catch (err) { void err; es = null; }

    const onMsg = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data && data.type === 'PRIVATE_MESSAGE') {
          // 若正处于该会话页面
          const m = (window.location.pathname || '').match(/\/conversation\/(\d+)/);
          const currentOtherId = m ? m[1] : null;
          const isCurrentConv = currentOtherId && String(currentOtherId) === String(data.senderId);

          if (isCurrentConv) {
            // 仅标记已读，不立刻刷新未读总数，避免红点闪一下
            markConversationRead(data.senderId).catch(() => { });
          } else {
            // 其他会话来消息：正常刷新未读总数
            refreshUnreadTotal();
          }

          // 广播给其它页面（会话列表/会话详情）更新
          try {
            window.dispatchEvent(new CustomEvent('pm-event', { detail: data }));
          } catch (err) { void err; }
        }
      } catch (err) {
        console.error('[BannerNavbar SSE message error]', err);
      }
    };
    if (es) es.onmessage = onMsg;

    // 监听“外部请求刷新未读”的自定义事件（进入会话等场景）
    const onRefresh = () => refreshUnreadTotal();
    window.addEventListener('pm-unread-refresh', onRefresh);

    return () => {
      try { if (es) es.close(); } catch (err) { void err; }
      window.removeEventListener('pm-unread-refresh', onRefresh);
    };
  }, [userId, token, refreshUnreadTotal]);

  const resolveSrc = (src) => {
    if (!src) return '';
    if (/^\.\/assets\//.test(src)) return src.replace(/^\.\/assets\//, '/banner/assets/');
    if (/^https?:\/\//i.test(src) || src.startsWith('/')) return src;
    return src;
  };

  return (
    <nav className={`banner-navbar${navHidden ? ' is-hidden' : ''}`} aria-label="主导航">
      <div ref={containerRef} className="bili-banner" aria-hidden="true">
        {loading && <div className="bili-banner-loading">Loading...</div>}
        {error && !loading && <div className="bili-banner-error">{error}</div>}
        {!loading && !error && !isExample && layers.map((layer, i) => (
          <div className="bili-layer" key={i} ref={el => (layerRefs.current[i] = el)}>
            {layer.tagName === 'video' ? (
              <video className="bili-media" autoPlay loop muted playsInline>
                <source src={resolveSrc(layer.src)} />
              </video>
            ) : layer.tagName === 'iframe' ? (
              <iframe
                className="bili-media"
                src={resolveSrc(layer.src)}
                title={`banner-iframe-${i}`}
                frameBorder="0"
                loading="lazy"
              />
            ) : (
              <img className="bili-media" src={resolveSrc(layer.src)} alt="banner layer" draggable={false} />
            )}
          </div>
        ))}
        {!loading && !error && isExample && (
          <div className="example-host">
            {activeId === 'example-spring' && <ExampleSpring />}
            {activeId === 'example-autumn' && <ExampleAutumn />}
            {activeId === 'example-winter' && <ExampleWinter />}
          </div>
        )}
      </div>
      <div className="nav-inner">
        {/* 1. Logo + Home Text */}
        <div className="nav-brand" aria-label="站点标识" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <a href="/" className="penrose-logo" aria-label="返回首页" title="返回首页">
            <div className="penrose-scale">
              <div className="penrose-shell">
                <div className="penrose-wrapper">
                  <div className="penrose-a" />
                  <div className="penrose-b" />
                  <div className="penrose-c" />
                </div>
                <div className="penrose-wrapper2">
                  <div className="penrose-a" />
                  <div className="penrose-b" />
                  <div className="penrose-c" />
                  <div className="penrose-d" />
                  <div className="penrose-e" />
                  <div className="penrose-f" />
                </div>
                <div className="penrose-wrapper3">
                  <div className="penrose-a" />
                  <div className="penrose-b" />
                  <div className="penrose-c" />
                  <div className="penrose-d" />
                  <div className="penrose-e" />
                  <div className="penrose-f" />
                </div>
              </div>
            </div>
          </a>
          <span style={{ fontSize: '12px', color: '#fff', marginTop: '4px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>首页</span>
        </div>

        {/* 2. Messages */}
        <SplitNavItem to="/messages" text="消息" badge={unreadTotal} />

        {/* 3. Favorites */}
        <SplitNavItem to="/favorites" text="我的收藏" />

        {/* 4. Search */}
        <SplitNavItem to="/search" text="搜索" />

        {/* 5. Notifications */}
        <SplitNavItem to="/notifications" text="系统通知" badge={sysUnread} />

        {/* 6. Publish */}
        <SplitNavItem to="/blog-edit" text="发布文章" />

        {/* 7. Placeholder */}
        <SplitNavItem text="更多功能" />

        {/* 8. Avatar */}
        <div className="nav-avatar-cell">
          <NavAvatar isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </nav>
  );
}
