import React, { useState, useRef, useEffect } from 'react';
import resolveUrl from '@utils/resolveUrl';
import '@styles/selfspace/SelfspaceProfileAccordion/selfspaceProfileAccordion.css';
import httpClient from '@utils/api/httpClient';
import { useAuthState } from '@hooks/useAuthState';
import { getDefaultAvatar } from '@utils/avatarUtils';
import MatchboxTagEditor from '../MatchboxTagEditor';

// 个人空间左侧手风琴面板
export default function SelfspaceProfileAccordion({ panelWidth = '100%', panelHeight = '100%', viewUserId = null, hideEditPanel = false }) {
  const [hoverIdx, setHoverIdx] = useState(0);
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.offsetHeight);
    }
    let ro = null;
    try {
      if (window.ResizeObserver && containerRef.current) {
        ro = new ResizeObserver(entries => {
          for (let entry of entries) {
            const h = entry.contentRect ? entry.contentRect.height : (containerRef.current ? containerRef.current.offsetHeight : 0);
            setContainerHeight(h);
          }
        });
        ro.observe(containerRef.current);
      }
    } catch { /* empty */ ro = null; }

    const onWinResize = () => {
      if (containerRef.current) setContainerHeight(containerRef.current.offsetHeight);
    };
    window.addEventListener('resize', onWinResize);

    return () => {
      window.removeEventListener('resize', onWinResize);
      try { if (ro && ro.disconnect) ro.disconnect(); } catch { /* ignore */ }
    };
  }, [panelHeight]);

  const getPanelHeight = (idx) => {
    if (!containerHeight) return 100;
    return hoverIdx === idx ? containerHeight * 0.7 : containerHeight * 0.1;
  };

  const handleMouseLeave = () => { 
    if (hoverIdx !== 3) setHoverIdx(0); 
    // Reset background position
    if (bgRef.current) {
      bgRef.current.style.transform = 'scale(1.1) translate(0px, 0px)';
    }
  };

  const bgRef = useRef(null);
  const handleMouseMove = (e) => {
    if (hoverIdx !== 0 || !bgRef.current) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    
    // Calculate offset from center
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Max movement in pixels
    const maxMove = 15;
    
    const moveX = ((x - centerX) / centerX) * maxMove;
    const moveY = ((y - centerY) / centerY) * maxMove;
    
    // Apply transform (keep scale)
    bgRef.current.style.transform = `scale(1.1) translate(${-moveX}px, ${-moveY}px)`;
  };

  // 查看别人时不显示第4个“编辑资料”面板
  const panels = hideEditPanel ? [0, 1, 2] : [0, 1, 2, 3];

  // 用户信息编辑相关状态
  const initialProfile = React.useMemo(() => ({
    id: '',
    nickname: '',
    avatarUrl: '',
    backgroundUrl: '',
    gender: '',
    signature: '',
    bio: '',
    tags: '',
    qq: '',
    wechat: '',
    qqQrCode: '',
    wechatQrCode: '',
    githubLink: '',
    bilibiliLink: '',
  }), []);
  const [profile, setProfile] = useState(initialProfile);
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState('');
  const [activeTab, setActiveTab] = useState('profile'); // profile, tags, media, contact

  const genderItems = [
    { key: '男', label: '男', img: '/imgs/loginandwelcomepanel/1.png' },
    { key: '女', label: '女', img: '/imgs/loginandwelcomepanel/2.png' },
    { key: '保密', label: '保密', img: '/imgs/loginandwelcomepanel/3.png' },
  ];

  // Tags Logic
  const [tagsList, setTagsList] = useState([]);
  const [tagInput, setTagInput] = useState('');

  // Sync profile.tags string to tagsList array when profile loads
  useEffect(() => {
    if (profile.tags) {
      try {
        // Try parsing as JSON first
        if (profile.tags.trim().startsWith('[')) {
           const parsed = JSON.parse(profile.tags);
           if (Array.isArray(parsed)) {
             setTagsList(parsed);
             return;
           }
        }
        // Fallback: treat as comma-separated string
        const splitTags = profile.tags.split(/[,，]/).map(t => t.trim()).filter(t => t);
        if (splitTags.length > 0) {
            setTagsList(splitTags);
        } else {
            setTagsList([]);
        }
      } catch {
        // If JSON parse fails, try comma split
        const splitTags = profile.tags.split(/[,，]/).map(t => t.trim()).filter(t => t);
        setTagsList(splitTags);
      }
    } else {
      setTagsList([]);
    }
  }, [profile.id, profile.tags]); // Only sync on ID change or initial load to avoid loop with local updates

  const handleAddTag = () => {
    const val = tagInput.trim();
    if (val && !tagsList.includes(val) && tagsList.length < 10) {
      const newTags = [...tagsList, val];
      setTagsList(newTags);
      setTagInput('');
      // Update profile state
      setProfile(prev => ({ ...prev, tags: JSON.stringify(newTags) }));
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const newTags = tagsList.filter(tag => tag !== tagToRemove);
    setTagsList(newTags);
    setProfile(prev => ({ ...prev, tags: JSON.stringify(newTags) }));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // 本地暂存头像和背景文件及预览
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [backgroundPreview, setBackgroundPreview] = useState('');
  const [qqQrFile, setQqQrFile] = useState(null);
  const [qqQrPreview, setQqQrPreview] = useState('');
  const [wechatQrFile, setWechatQrFile] = useState(null);
  const [wechatQrPreview, setWechatQrPreview] = useState('');

  // 统计数据
  const [stats, setStats] = useState({ followingCount: 0, followerCount: 0, articleCount: 0 });

  // userId & token（可由外部传入 viewUserId，用于查看别人）
  const { user, isLoggedIn } = useAuthState();
  const rawUserId = viewUserId != null ? String(viewUserId) : user?.id || '';
  const userId = rawUserId && /^\d+$/.test(rawUserId) ? Number(rawUserId) : null;

  // 获取统计数据
  useEffect(() => {
    if (userId) {
      httpClient.get(`/user/${userId}/stats`)
        .then(res => {
          if (res.data && res.data.code === 200) {
            setStats(res.data.data || { followingCount: 0, followerCount: 0, articleCount: 0 });
          }
        })
        .catch(() => { });
    }
  }, [userId]);

  // 查看别人主页：组件挂载/切换用户时直接拉取其资料用于展示（背景、头像、昵称等）
  // 即使是自己 (!hideEditPanel)，也应该拉取最新资料以更新 localStorage 和显示
  useEffect(() => {
    if (!userId) return;
    // 如果是查看别人，或者查看自己（为了刷新数据）
    httpClient.get(`/user/profile/${userId}`)
      .then(res => {
        if (res?.data?.code === 200 && res.data.data) {
          const data = res.data.data;
          setProfile(data);
          // 如果是自己，更新 localStorage
          if (!hideEditPanel && isLoggedIn && String(userId) === String(user?.id)) {
            if (typeof localStorage !== 'undefined') {
              if (data.avatarUrl) localStorage.setItem('avatarUrl', data.avatarUrl);
              if (data.backgroundUrl) localStorage.setItem('backgroundUrl', data.backgroundUrl);
              if (data.nickname) localStorage.setItem('nickname', data.nickname);
              if (data.gender) localStorage.setItem('gender', data.gender);
              window.dispatchEvent(new Event('auth-changed'));
            }
          }
        }
      })
      .catch(() => { });
  }, [userId, hideEditPanel, isLoggedIn, user.id]);

  // 仅在第四个面板激活时加载用户信息
  useEffect(() => {
    if (!hideEditPanel && hoverIdx === 3) {
      console.log('[ProfileAccordion] 加载用户信息 userId:', userId);
      if (!userId || !isLoggedIn) {
        setEditMsg('用户信息无效，请重新登录');
        setProfile(initialProfile);
        return;
      }
      setEditMsg('');
      setEditLoading(true);
      httpClient.get(`/user/profile/${userId}`)
        .then(res => {
          console.log('[ProfileAccordion] 获取用户信息返回:', res.data);
          if (res.data && res.data.code === 200 && res.data.data) {
            setProfile(res.data.data);
          } else {
            setProfile(initialProfile);
            setEditMsg(res.data?.msg || res.data?.message || '获取用户信息失败');
          }
        })
        .catch((err) => {
          console.log('[ProfileAccordion] 获取用户信息异常:', err);
          setProfile(initialProfile);
          setEditMsg('获取用户信息异常');
        })
        .finally(() => setEditLoading(false));
    }
  }, [hoverIdx, userId, initialProfile, hideEditPanel, isLoggedIn]);

  // 组件挂载时从 localStorage 初始化 profile（用于快速显示）
  useEffect(() => {
    try {
      const storedAvatar = localStorage.getItem('avatarUrl') || '';
      const storedBackground = localStorage.getItem('backgroundUrl') || '';
      const storedNickname = localStorage.getItem('nickname') || '';
      const storedGender = localStorage.getItem('gender') || '';
      const storedId = localStorage.getItem('userId') || '';
      setProfile(prev => ({
        ...prev,
        id: storedId,
        nickname: storedNickname,
        avatarUrl: storedAvatar,
        backgroundUrl: storedBackground,
        gender: storedGender,
      }));
    } catch { /* ignore */ }
  }, []);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) {
      setEditMsg('仅支持图片/gif作为头像');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleBackgroundSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type) && !/^video\/(mp4|webm)$/.test(file.type)) {
      setEditMsg('背景仅支持图片/gif/mp4/webm');
      return;
    }
    setBackgroundFile(file);
    setBackgroundPreview(URL.createObjectURL(file));
  };

  const handleQqQrSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) {
      setEditMsg('仅支持图片/gif作为二维码');
      return;
    }
    setQqQrFile(file);
    setQqQrPreview(URL.createObjectURL(file));
  };

  const handleWechatQrSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) {
      setEditMsg('仅支持图片/gif作为二维码');
      return;
    }
    setWechatQrFile(file);
    setWechatQrPreview(URL.createObjectURL(file));
  };

  const handleRemoveQqQr = (e) => {
    e.stopPropagation();
    setQqQrFile(null);
    setQqQrPreview('');
    setProfile(prev => ({ ...prev, qqQrCode: '' }));
  };

  const handleRemoveWechatQr = (e) => {
    e.stopPropagation();
    setWechatQrFile(null);
    setWechatQrPreview('');
    setProfile(prev => ({ ...prev, wechatQrCode: '' }));
  };

  // 保存用户信息（统一上传头像/背景并保存）
  const handleProfileSave = async (section = null) => {
    console.log('[ProfileAccordion] 保存资料 userId:', userId, 'profile:', profile, 'section:', section);
    if (!userId) {
      setEditMsg('用户ID无效，请重新登录');
      return;
    }
    setEditLoading(true);
    setEditMsg('');

    // 初始使用当前 profile 中可能已有的 url
    let avatarUrl = profile.avatarUrl || '';
    let backgroundUrl = profile.backgroundUrl || '';
    let qqQrCode = profile.qqQrCode || '';
    let wechatQrCode = profile.wechatQrCode || '';

    try {
      // 1) 上传头像（如有） - 仅当 section 为 media 或 null 时
      if ((!section || section === 'media') && avatarFile) {
        setEditMsg('正在上传头像...');
        const formData = new FormData();
        formData.append('file', avatarFile);
        console.log('[ProfileAccordion] 上传头像 userId:', userId, 'file:', avatarFile);
        const res = await httpClient.post(`/user/profile/${userId}/avatar`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        console.log('[ProfileAccordion] 上传头像返回:', res.data);
        const uploadData = res.data && res.data.data;
        if (res.data && res.data.code === 200 && uploadData) {
          // 兼容后端返回两种常见格式：字符串路径 或 包含 avatarUrl 字段的对象
          if (typeof uploadData === 'string') {
            avatarUrl = uploadData;
          } else if (typeof uploadData === 'object') {
            avatarUrl = uploadData.avatarUrl || uploadData.path || avatarUrl;
          }
          // 持久化展示用
          localStorage.setItem('avatarUrl', avatarUrl || '');
        } else {
          setEditMsg(res.data?.msg || res.data?.message || '头像上传失败');
          setEditLoading(false);
          return;
        }
      }

      // 2) 上传背景（如有） - 仅当 section 为 media 或 null 时
      if ((!section || section === 'media') && backgroundFile) {
        setEditMsg('正在上传背景...');
        const formData = new FormData();
        formData.append('file', backgroundFile);
        console.log('[ProfileAccordion] 上传背景 userId:', userId, 'file:', backgroundFile);
        const res = await httpClient.post(`/user/profile/${userId}/background`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        console.log('[ProfileAccordion] 上传背景返回:', res.data);
        const uploadData = res.data && res.data.data;
        if (res.data && res.data.code === 200 && uploadData) {
          if (typeof uploadData === 'string') {
            backgroundUrl = uploadData;
          } else if (typeof uploadData === 'object') {
            backgroundUrl = uploadData.backgroundUrl || uploadData.path || backgroundUrl;
          }
          localStorage.setItem('backgroundUrl', backgroundUrl || '');
        } else {
          setEditMsg(res.data?.msg || res.data?.message || '背景上传失败');
          setEditLoading(false);
          return;
        }
      }

      // 3) 上传QQ二维码（如有） - 仅当 section 为 contact 或 null 时
      if ((!section || section === 'contact') && qqQrFile) {
        setEditMsg('正在上传QQ二维码...');
        const formData = new FormData();
        formData.append('file', qqQrFile);
        const res = await httpClient.post(`/user/profile/${userId}/qq-qrcode`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data && res.data.code === 200) {
          qqQrCode = res.data.data;
        } else {
          setEditMsg(res.data?.msg || 'QQ二维码上传失败');
          setEditLoading(false);
          return;
        }
      }

      // 4) 上传微信二维码（如有） - 仅当 section 为 contact 或 null 时
      if ((!section || section === 'contact') && wechatQrFile) {
        setEditMsg('正在上传微信二维码...');
        const formData = new FormData();
        formData.append('file', wechatQrFile);
        const res = await httpClient.post(`/user/profile/${userId}/wechat-qrcode`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data && res.data.code === 200) {
          wechatQrCode = res.data.data;
        } else {
          setEditMsg(res.data?.msg || '微信二维码上传失败');
          setEditLoading(false);
          return;
        }
      }

      // 5) 最后保存 profile（直接用合并出的 newProfile，保证包含刚拿到的路径）
      setEditMsg('正在保存信息...');
      const newProfile = { ...profile, avatarUrl, backgroundUrl, qqQrCode, wechatQrCode };
      console.log('[ProfileAccordion] PUT /user/profile/', userId, newProfile);
      const res = await httpClient.put(`/user/profile/${userId}`, newProfile);
      console.log('[ProfileAccordion] 保存资料返回:', res.data);
      if (res.data && res.data.code === 200) {
        setEditMsg('保存成功');
        localStorage.setItem('nickname', newProfile.nickname || '');
        localStorage.setItem('gender', newProfile.gender || '');
        window.dispatchEvent(new Event('auth-changed'));

        // 清空本地文件和预览 (仅清空已处理的 section)
        if (!section || section === 'media') {
          setAvatarFile(null);
          setAvatarPreview('');
          setBackgroundFile(null);
          setBackgroundPreview('');
        }
        if (!section || section === 'contact') {
          setQqQrFile(null);
          setQqQrPreview('');
          setWechatQrFile(null);
          setWechatQrPreview('');
        }

        // 更新组件 state（显示最新）
        setProfile(newProfile);
      } else {
        setEditMsg(res.data?.msg || res.data?.message || '保存失败');
      }
    } catch (err) {
      console.log('[ProfileAccordion] 保存异常:', err);
      // 如果后端返回了详细信息，尝试显示
      const serverMsg = err?.response?.data?.msg || err?.response?.data?.message;
      if (serverMsg) setEditMsg(serverMsg);
      else setEditMsg('保存异常');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div
      className="profilepanel-container selfspace-profilepanel-container"
      style={{ width: panelWidth, height: panelHeight }}
      ref={containerRef}
      onMouseLeave={handleMouseLeave}
    >
      {panels.map((idx) => {
        const isFirst = idx === 0;
        const isActive = hoverIdx === idx;
        const direction = idx > hoverIdx ? 'down' : 'up';

        if (isFirst) {
          return (
            <div
              key={idx}
              className={`profilepanel-section${isActive ? ' profilepanel-section-active' : ''}`}
              style={{
                height: getPanelHeight(idx),
                minHeight: getPanelHeight(idx),
                position: 'relative',
                overflow: 'hidden',
                background: 'transparent',
              }}
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseMove={handleMouseMove}
            >
              <div className={`profilepanel-content${isActive ? ' profilepanel-content-active' : ' profilepanel-content-collapsed'}`}>
                {profile.backgroundUrl ? (
                  /\.(mp4|webm)$/i.test(profile.backgroundUrl)
                    ? (
                      <video
                        ref={bgRef}
                        src={resolveUrl(profile.backgroundUrl)}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="profilepanel-bg-video"
                        style={{ 
                          position: 'absolute', 
                          left: 0, 
                          top: 0, 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover', 
                          zIndex: 0,
                          transform: 'scale(1.1)',
                          transition: 'transform 0.1s ease-out',
                          filter: isActive ? 'none' : 'blur(8px) brightness(0.8)'
                        }}
                      />
                    ) : (
                      <img
                        ref={bgRef}
                        src={resolveUrl(profile.backgroundUrl)}
                        alt="背景"
                        className="profilepanel-bg-img"
                        style={{ 
                          position: 'absolute', 
                          left: 0, 
                          top: 0, 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover', 
                          zIndex: 0,
                          transform: 'scale(1.1)',
                          transition: 'transform 0.1s ease-out',
                          filter: isActive ? 'none' : 'blur(8px) brightness(0.8)'
                        }}
                      />
                    )
                ) : (
                  <div
                    ref={bgRef}
                    className="profilepanel-bg-gradient"
                    style={{ 
                      position: 'absolute', 
                      left: 0, 
                      top: 0, 
                      width: '100%', 
                      height: '100%', 
                      zIndex: 0,
                      transform: 'scale(1.1)',
                      transition: 'transform 0.1s ease-out',
                      filter: isActive ? 'none' : 'blur(8px) brightness(0.8)',
                      background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'
                    }}
                  />
                )}
                <div className="profilepanel-info-overlay" style={{ 
                  position: 'relative', 
                  zIndex: 1, 
                  padding: '20px', 
                  color: '#fff', 
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)', 
                  display: 'flex', 
                  flexDirection: isActive ? 'column' : 'row', 
                  alignItems: 'center', 
                  justifyContent: isActive ? 'center' : 'flex-start', 
                  height: '100%', 
                  width: '100%',
                  transition: 'all 0.3s ease'
                }}>
                  <div className="profile-avatar-large" style={{ 
                    width: isActive ? 80 : 40, 
                    height: isActive ? 80 : 40, 
                    borderRadius: '50%', 
                    overflow: 'hidden', 
                    marginBottom: isActive ? 10 : 0, 
                    marginRight: isActive ? 0 : 15,
                    border: '2px solid #fff',
                    transition: 'all 0.3s ease',
                    background: '#fff'
                  }}>
                    <img 
                      src={profile.avatarUrl ? resolveUrl(profile.avatarUrl) : resolveUrl(getDefaultAvatar(profile.id || userId))} 
                      alt={profile.nickname} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                  <div className="profile-name-large" style={{ 
                    fontSize: isActive ? '1.5rem' : '1.1rem', 
                    fontWeight: 'bold', 
                    marginBottom: isActive ? 15 : 0,
                    transition: 'all 0.3s ease'
                  }}>{profile.nickname}</div>
                  
                  {isActive && (
                    <div className="profile-stats-row" style={{ display: 'flex', gap: '20px', opacity: 1, transition: 'opacity 0.3s ease' }}>
                      <div className="stat-item" style={{ textAlign: 'center' }}>
                        <div className="stat-val" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.followingCount}</div>
                        <div className="stat-label" style={{ fontSize: '0.8rem', opacity: 0.8 }}>关注</div>
                      </div>
                      <div className="stat-item" style={{ textAlign: 'center' }}>
                        <div className="stat-val" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.followerCount}</div>
                        <div className="stat-label" style={{ fontSize: '0.8rem', opacity: 0.8 }}>粉丝</div>
                      </div>
                      <div className="stat-item" style={{ textAlign: 'center' }}>
                        <div className="stat-val" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.articleCount}</div>
                        <div className="stat-label" style={{ fontSize: '0.8rem', opacity: 0.8 }}>文章</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // 第四个模块：用户信息编辑（仅本人可见）
        if (idx === 3) {
          return (
            <div
              key={idx}
              className={`profilepanel-section profilepanel-scroll-section${isActive ? ' profilepanel-section-active' : ''}`}
              style={{ height: getPanelHeight(idx), minHeight: getPanelHeight(idx) }}
              onMouseEnter={() => setHoverIdx(idx)}
            >
              <div
                className={
                  `profilepanel-content profilepanel-scroll-content${isActive ? ' profilepanel-scroll-active' : ' profilepanel-scroll-collapsed'
                  } profilepanel-scroll-${direction}`
                }
              >
                {isActive ? (
                  <div className="profilepanel-useredit-panel" style={{ display: 'flex', flexDirection: 'row', height: '100%', padding: 0, background: 'rgba(255,255,255,0.9)' }}>
                    {/* Sidebar */}
                    <div className="profilepanel-edit-sidebar" style={{ width: '90px', borderRight: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', background: 'rgba(249,249,249,0.8)', padding: '10px 0' }}>
                      {['profile', 'tags', 'media', 'contact'].map(tab => (
                        <div 
                          key={tab}
                          className={`edit-tab-item ${activeTab === tab ? 'active' : ''}`} 
                          onClick={() => setActiveTab(tab)} 
                          style={{ 
                            padding: '12px 2px', 
                            cursor: 'pointer', 
                            textAlign: 'center', 
                            background: activeTab === tab ? '#e6f7ff' : 'transparent', 
                            color: activeTab === tab ? '#1890ff' : '#555', 
                            fontSize: '0.95rem', 
                            fontWeight: activeTab === tab ? '600' : 'normal',
                            margin: '4px 5px',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {tab === 'profile' && '个人资料'}
                          {tab === 'tags' && '个性标签'}
                          {tab === 'media' && '头像背景'}
                          {tab === 'contact' && '联系方式'}
                        </div>
                      ))}
                    </div>

                    {/* Content Area */}
                    <div className="profilepanel-edit-content" style={{ flex: 1, padding: '25px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <h4 style={{ marginTop: 0, marginBottom: 25, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 15, color: '#333', fontSize: '1.2rem', flexShrink: 0 }}>
                        {activeTab === 'profile' && '编辑个人资料'}
                        {activeTab === 'tags' && '管理个性标签'}
                        {activeTab === 'media' && '设置头像与背景'}
                        {activeTab === 'contact' && '设置联系方式'}
                      </h4>
                      
                      {editLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#1890ff' }}>
                          <div className="loading-spinner" style={{ marginRight: '10px' }}></div> 加载中...
                        </div>
                      ) : (
                        <form
                          className="profilepanel-useredit-form"
                          onSubmit={e => { e.preventDefault(); handleProfileSave(activeTab); }}
                          style={{ maxWidth: '100%', width: '100%', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
                        >
                          {activeTab === 'profile' && (
                            <>
                              <div className="form-group">
                                <label className="profile-form-label">昵称</label>
                                <input type="text" name="nickname" value={profile.nickname || ''} onChange={handleProfileChange} className="profile-form-input" placeholder="请输入昵称" />
                              </div>
                              <div className="form-group">
                                <label className="profile-form-label">个性签名</label>
                                <input type="text" name="signature" maxLength={50} value={profile.signature || ''} onChange={handleProfileChange} placeholder="一句话介绍自己（最多50字）" className="profile-form-input" />
                              </div>
                              <div className="form-group">
                                <label className="profile-form-label">性别</label>
                                <div className="profile-gender-options" style={{ display: 'flex', gap: '15px' }}>
                                  {genderItems.map(item => (
                                    <div
                                      key={item.key}
                                      className={`profile-gender-card ${profile.gender === item.key ? 'active' : ''}`}
                                      onClick={() => handleProfileChange({ target: { name: 'gender', value: item.key } })}
                                      style={{ 
                                        flex: 1, 
                                        border: profile.gender === item.key ? '2px solid #1890ff' : '1px solid #eee',
                                        background: profile.gender === item.key ? '#e6f7ff' : '#fff',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      <div className="profile-gender-icon-wrapper" style={{ marginBottom: '5px' }}>
                                        <img src={item.img} alt={item.label} className="profile-gender-icon" style={{ width: '32px', height: '32px' }} />
                                      </div>
                                      <span className="profile-gender-label" style={{ fontSize: '0.9rem', color: profile.gender === item.key ? '#1890ff' : '#666' }}>{item.label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="form-group">
                                <label className="profile-form-label">自我介绍</label>
                                <textarea name="bio" maxLength={300} value={profile.bio || ''} onChange={handleProfileChange} placeholder="详细介绍一下自己吧（最多300字）" className="profile-form-textarea" style={{ minHeight: '120px', resize: 'vertical' }} />
                              </div>
                              <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid #eee' }}>
                                <button type="submit" disabled={editLoading} style={{ 
                                  width: '100%', 
                                  padding: '12px', 
                                  background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', 
                                  color: '#fff', 
                                  border: 'none', 
                                  borderRadius: '8px', 
                                  cursor: editLoading ? 'not-allowed' : 'pointer', 
                                  fontWeight: 'bold',
                                  fontSize: '1rem',
                                  boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
                                  transition: 'all 0.2s'
                                }}>
                                  {editLoading ? '保存中...' : '保存资料'}
                                </button>
                              </div>
                              {editMsg && <div className="form-msg" style={{ marginTop: 15, color: editMsg.includes('成功') ? '#52c41a' : '#ff4d4f', textAlign: 'center', fontWeight: '500' }}>{editMsg}</div>}
                            </>
                          )}

                          {activeTab === 'tags' && (
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', marginBottom: 0 }}>
                              <label className="profile-form-label" style={{ marginBottom: '10px', display: 'block', flexShrink: 0 }}>个人标签（最多10个）</label>
                              <div className="profile-tags-container" style={{ 
                                flex: 1, 
                                background: '#f9f9f9', 
                                borderRadius: '12px', 
                                padding: '15px',
                                border: '2px dashed #e0e0e0',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                transition: 'all 0.3s ease',
                                overflowY: 'auto',
                                scrollbarWidth: 'none', /* Firefox */
                                msOverflowStyle: 'none'  /* IE 10+ */
                              }}>
                                <style>{`
                                  .profile-tags-container::-webkit-scrollbar { 
                                    display: none; 
                                  }
                                `}</style>
                                {tagsList.map((tag, index) => (
                                  <div key={tag + index} className="profile-tag-item" style={{
                                    background: 'linear-gradient(to right, #e6f7ff, #ffffff)',
                                    color: '#096dd9',
                                    padding: '12px 20px',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    boxShadow: '0 2px 6px rgba(24, 144, 255, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'default',
                                    animation: 'fadeIn 0.3s ease-out',
                                    border: '1px solid #bae7ff',
                                    width: '100%',
                                    flexShrink: 0
                                  }}>
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tag}</span>
                                    <button 
                                      type="button" 
                                      onClick={() => handleRemoveTag(tag)}
                                      style={{ 
                                        marginLeft: '10px', 
                                        width: '24px', 
                                        height: '24px', 
                                        borderRadius: '50%', 
                                        background: 'rgba(24, 144, 255, 0.1)', 
                                        border: 'none', 
                                        color: '#1890ff', 
                                        cursor: 'pointer', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        fontSize: '16px',
                                        transition: 'all 0.2s'
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.background = '#ff4d4f'; e.currentTarget.style.color = '#fff'; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(24, 144, 255, 0.1)'; e.currentTarget.style.color = '#1890ff'; }}
                                    >
                                      &times;
                                    </button>
                                  </div>
                                ))}
                                
                                {tagsList.length < 10 && (
                                  <div className="profile-tag-add-wrapper" style={{ position: 'relative', width: '100%', flexShrink: 0 }}>
                                    <input
                                      id="tag-input-field"
                                      type="text"
                                      value={tagInput}
                                      onChange={e => setTagInput(e.target.value)}
                                      onKeyDown={handleTagKeyDown}
                                      placeholder="+ 添加新标签 (输入后回车)"
                                      maxLength={10}
                                      style={{
                                        width: '100%',
                                        padding: '12px 20px',
                                        borderRadius: '8px',
                                        border: '2px dashed #bbb',
                                        outline: 'none',
                                        fontSize: '1rem',
                                        background: '#fff',
                                        color: '#555',
                                        transition: 'all 0.2s',
                                        boxShadow: 'none'
                                      }}
                                      onFocus={e => {
                                        e.target.style.borderColor = '#1890ff';
                                        e.target.style.borderStyle = 'solid';
                                        e.target.style.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.2)';
                                      }}
                                      onBlur={e => {
                                        if (!tagInput) {
                                          e.target.style.borderColor = '#bbb';
                                          e.target.style.borderStyle = 'dashed';
                                          e.target.style.boxShadow = 'none';
                                        }
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                              <div style={{ marginTop: '10px', textAlign: 'right', fontSize: '0.85rem', color: '#999', flexShrink: 0 }}>
                                {tagsList.length}/10
                              </div>
                              <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid #eee' }}>
                                <button type="submit" disabled={editLoading} style={{ 
                                  width: '100%', 
                                  padding: '12px', 
                                  background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', 
                                  color: '#fff', 
                                  border: 'none', 
                                  borderRadius: '8px', 
                                  cursor: editLoading ? 'not-allowed' : 'pointer', 
                                  fontWeight: 'bold',
                                  fontSize: '1rem',
                                  boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
                                  transition: 'all 0.2s'
                                }}>
                                  {editLoading ? '保存中...' : '保存资料'}
                                </button>
                              </div>
                              {editMsg && <div className="form-msg" style={{ marginTop: 15, color: editMsg.includes('成功') ? '#52c41a' : '#ff4d4f', textAlign: 'center', fontWeight: '500' }}>{editMsg}</div>}
                            </div>
                          )}

                          {activeTab === 'media' && (
                            <>
                              <div className="form-group">
                                <label className="profile-form-label" style={{ marginBottom: '15px', display: 'block' }}>头像设置</label>
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                                  <div 
                                    className="avatar-upload-preview"
                                    style={{ 
                                      position: 'relative', 
                                      width: '140px', 
                                      height: '140px', 
                                      borderRadius: '50%', 
                                      cursor: 'pointer',
                                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                      border: '4px solid #fff',
                                      overflow: 'hidden',
                                      transition: 'transform 0.3s',
                                      background: '#fff'
                                    }}
                                    onClick={() => document.getElementById('avatar-upload-hidden').click()}
                                    onMouseEnter={e => {
                                      e.currentTarget.style.transform = 'scale(1.05)';
                                      e.currentTarget.querySelector('.avatar-overlay').style.opacity = 1;
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.transform = 'scale(1)';
                                      e.currentTarget.querySelector('.avatar-overlay').style.opacity = 0;
                                    }}
                                  >
                                    <img
                                      src={avatarPreview || (profile.avatarUrl ? resolveUrl(profile.avatarUrl) : resolveUrl(getDefaultAvatar(profile.id || userId)))}
                                      alt="Avatar"
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <div className="avatar-overlay" style={{
                                      position: 'absolute',
                                      top: 0, left: 0, width: '100%', height: '100%',
                                      background: 'rgba(0,0,0,0.5)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#fff',
                                      opacity: 0,
                                      transition: 'opacity 0.3s'
                                    }}>
                                      <span style={{ fontSize: '24px', marginBottom: '5px' }}>📷</span>
                                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>更换头像</span>
                                    </div>
                                    <input 
                                      type="file" 
                                      id="avatar-upload-hidden" 
                                      accept="image/*,image/gif" 
                                      onChange={handleAvatarSelect} 
                                      style={{ display: 'none' }} 
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="form-group" style={{ marginTop: '30px' }}>
                                <label className="profile-form-label" style={{ marginBottom: '15px', display: 'block' }}>背景图/视频设置</label>
                                <div 
                                  className="bg-upload-preview"
                                  style={{ 
                                    position: 'relative', 
                                    width: '100%', 
                                    height: '200px', 
                                    borderRadius: '16px', 
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                                    border: '1px solid #eee',
                                    transition: 'all 0.3s',
                                    background: '#f0f0f0'
                                  }}
                                  onClick={() => document.getElementById('bg-upload-hidden').click()}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.15)';
                                    e.currentTarget.querySelector('.bg-overlay').style.opacity = 1;
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                                    e.currentTarget.querySelector('.bg-overlay').style.opacity = 0;
                                  }}
                                >
                                  {(() => {
                                    const url = backgroundPreview || profile.backgroundUrl;
                                    if (url) {
                                        if (/\.(mp4|webm)$/i.test(url)) {
                                            return <video src={resolveUrl(url)} className="profilepanel-bg-video" style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted loop autoPlay />;
                                        } else {
                                            return <img src={resolveUrl(url)} alt="Background" className="profilepanel-bg-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                                        }
                                    } else {
                                        return (
                                            <div style={{ 
                                                width: '100%', 
                                                height: '100%', 
                                                background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' 
                                            }} />
                                        );
                                    }
                                  })()}
                                  
                                  <div className="bg-overlay" style={{
                                    position: 'absolute',
                                    top: 0, left: 0, width: '100%', height: '100%',
                                    background: 'rgba(0,0,0,0.4)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    opacity: 0,
                                    transition: 'opacity 0.3s',
                                    backdropFilter: 'blur(2px)'
                                  }}>
                                    <span style={{ fontSize: '32px', marginBottom: '10px' }}>🖼️</span>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px' }}>点击更换背景</span>
                                    <span style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>支持图片与视频</span>
                                  </div>
                                  <input 
                                    type="file" 
                                    id="bg-upload-hidden" 
                                    accept="image/*,image/gif,video/mp4,video/webm" 
                                    onChange={handleBackgroundSelect} 
                                    style={{ display: 'none' }} 
                                  />
                                </div>
                              </div>
                              <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid #eee' }}>
                                <button type="submit" disabled={editLoading} style={{ 
                                  width: '100%', 
                                  padding: '12px', 
                                  background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', 
                                  color: '#fff', 
                                  border: 'none', 
                                  borderRadius: '8px', 
                                  cursor: editLoading ? 'not-allowed' : 'pointer', 
                                  fontWeight: 'bold',
                                  fontSize: '1rem',
                                  boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
                                  transition: 'all 0.2s'
                                }}>
                                  {editLoading ? '保存中...' : '保存资料'}
                                </button>
                              </div>
                              {editMsg && <div className="form-msg" style={{ marginTop: 15, color: editMsg.includes('成功') ? '#52c41a' : '#ff4d4f', textAlign: 'center', fontWeight: '500' }}>{editMsg}</div>}
                            </>
                          )}

                          {activeTab === 'contact' && (
                            <>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                                {/* Inputs Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="profile-form-label" style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>QQ号</label>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                      <img src={resolveUrl('/icons/contect/qq.svg')} alt="QQ" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', opacity: 0.7 }} />
                                      <input type="text" name="qq" value={profile.qq || ''} onChange={handleProfileChange} className="profile-form-input" placeholder="QQ号码" style={{ paddingLeft: '44px', height: '42px', fontSize: '14px', color: '#333', fontWeight: '500', width: '100%' }} />
                                    </div>
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="profile-form-label" style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>微信号</label>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                      <img src={resolveUrl('/icons/contect/微信.svg')} alt="WeChat" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', opacity: 0.7 }} />
                                      <input type="text" name="wechat" value={profile.wechat || ''} onChange={handleProfileChange} className="profile-form-input" placeholder="微信号码" style={{ paddingLeft: '44px', height: '42px', fontSize: '14px', color: '#333', fontWeight: '500', width: '100%' }} />
                                    </div>
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="profile-form-label" style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>GitHub</label>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                      <img src={resolveUrl('/icons/contect/github.svg')} alt="GitHub" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', opacity: 0.7 }} />
                                      <input type="text" name="githubLink" value={profile.githubLink || ''} onChange={handleProfileChange} className="profile-form-input" placeholder="GitHub链接" style={{ paddingLeft: '44px', height: '42px', fontSize: '14px', color: '#333', fontWeight: '500', width: '100%' }} />
                                    </div>
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="profile-form-label" style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Bilibili</label>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                      <img src={resolveUrl('/icons/contect/bilibili.svg')} alt="Bilibili" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', opacity: 0.7 }} />
                                      <input type="text" name="bilibiliLink" value={profile.bilibiliLink || ''} onChange={handleProfileChange} className="profile-form-input" placeholder="B站主页链接" style={{ paddingLeft: '44px', height: '42px', fontSize: '14px', color: '#333', fontWeight: '500', width: '100%' }} />
                                    </div>
                                  </div>
                                </div>

                                {/* QR Codes */}
                                <div style={{ display: 'flex', gap: '20px' }}>
                                  <div className="form-group" style={{ marginBottom: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label className="profile-form-label" style={{ marginBottom: '8px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>QQ二维码</label>
                                    <div 
                                      className="qr-upload-box"
                                      onClick={() => document.getElementById('qq-qr-upload').click()}
                                      style={{ 
                                        width: '100%',
                                        maxWidth: '220px',
                                        aspectRatio: '1/1',
                                        margin: '0 auto',
                                        border: '2px dashed #d9d9d9', 
                                        borderRadius: '12px', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        cursor: 'pointer',
                                        background: '#fafafa',
                                        transition: 'all 0.3s',
                                        position: 'relative',
                                        overflow: 'hidden'
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#1890ff'; e.currentTarget.style.background = '#f0f5ff'; }}
                                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#d9d9d9'; e.currentTarget.style.background = '#fafafa'; }}
                                    >
                                      {(qqQrPreview || profile.qqQrCode) ? (
                                         <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                           <img 
                                            src={qqQrPreview || resolveUrl(profile.qqQrCode)} 
                                            alt="QQ QR" 
                                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }}
                                           />
                                           <button
                                              type="button"
                                              onClick={handleRemoveQqQr}
                                              style={{
                                                position: 'absolute',
                                                top: '8px',
                                                right: '8px',
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                background: 'rgba(0,0,0,0.5)',
                                                color: '#fff',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '16px',
                                                zIndex: 10
                                              }}
                                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                                            >
                                              &times;
                                            </button>
                                         </div>
                                      ) : (
                                        <>
                                          <img src={resolveUrl('/icons/profile/qqqr.svg')} alt="Upload" style={{ width: '40px', height: '40px', opacity: 0.5, marginBottom: '8px' }} />
                                          <span style={{ fontSize: '13px', color: '#888', fontWeight: '500' }}>点击上传</span>
                                        </>
                                      )}
                                      <input type="file" accept="image/*" onChange={handleQqQrSelect} id="qq-qr-upload" style={{ display: 'none' }} />
                                    </div>
                                  </div>

                                  <div className="form-group" style={{ marginBottom: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label className="profile-form-label" style={{ marginBottom: '8px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>微信二维码</label>
                                    <div 
                                      className="qr-upload-box"
                                      onClick={() => document.getElementById('wechat-qr-upload').click()}
                                      style={{ 
                                        width: '100%',
                                        maxWidth: '220px',
                                        aspectRatio: '1/1',
                                        margin: '0 auto',
                                        border: '2px dashed #d9d9d9', 
                                        borderRadius: '12px', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        cursor: 'pointer',
                                        background: '#fafafa',
                                        transition: 'all 0.3s',
                                        position: 'relative',
                                        overflow: 'hidden'
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#1890ff'; e.currentTarget.style.background = '#f0f5ff'; }}
                                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#d9d9d9'; e.currentTarget.style.background = '#fafafa'; }}
                                    >
                                      {(wechatQrPreview || profile.wechatQrCode) ? (
                                         <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                           <img 
                                            src={wechatQrPreview || resolveUrl(profile.wechatQrCode)} 
                                            alt="WeChat QR" 
                                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }}
                                           />
                                           <button
                                              type="button"
                                              onClick={handleRemoveWechatQr}
                                              style={{
                                                position: 'absolute',
                                                top: '8px',
                                                right: '8px',
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                background: 'rgba(0,0,0,0.5)',
                                                color: '#fff',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '16px',
                                                zIndex: 10
                                              }}
                                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                                            >
                                              &times;
                                            </button>
                                         </div>
                                      ) : (
                                        <>
                                          <img src={resolveUrl('/icons/profile/wechatqr.svg')} alt="Upload" style={{ width: '40px', height: '40px', opacity: 0.5, marginBottom: '8px' }} />
                                          <span style={{ fontSize: '13px', color: '#888', fontWeight: '500' }}>点击上传</span>
                                        </>
                                      )}
                                      <input type="file" accept="image/*" onChange={handleWechatQrSelect} id="wechat-qr-upload" style={{ display: 'none' }} />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid #eee' }}>
                                <button type="submit" disabled={editLoading} style={{ 
                                  width: '100%', 
                                  padding: '12px', 
                                  background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', 
                                  color: '#fff', 
                                  border: 'none', 
                                  borderRadius: '8px', 
                                  cursor: editLoading ? 'not-allowed' : 'pointer', 
                                  fontWeight: 'bold',
                                  fontSize: '1rem',
                                  boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
                                  transition: 'all 0.2s'
                                }}>
                                  {editLoading ? '保存中...' : '保存资料'}
                                </button>
                              </div>
                              {editMsg && <div className="form-msg" style={{ marginTop: 15, color: editMsg.includes('成功') ? '#52c41a' : '#ff4d4f', textAlign: 'center', fontWeight: '500' }}>{editMsg}</div>}
                            </>
                          )}
                        </form>
                      )}
                    </div>
                  </div>
                ) : (
                   <div className="profilepanel-collapsed-preview" style={{ 
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: 'space-between', 
                     padding: '0 30px',
                     height: '100%', 
                     color: '#fff', 
                     background: 'linear-gradient(to right, rgba(0,0,0,0.1), transparent)',
                     cursor: 'pointer'
                   }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ 
                           width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', 
                           display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
                        }}>
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                           </svg>
                        </div>
                        <span style={{ fontSize: '1.1rem', fontWeight: '600', letterSpacing: '1px', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>编辑资料</span>
                      </div>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                         <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                   </div>
                )}
              </div>
            </div>
          );
        }

        // 第二个模块：个人标签与简介
        if (idx === 1) {
          return (
            <div
              key={idx}
              className={`profilepanel-section profilepanel-scroll-section${isActive ? ' profilepanel-section-active' : ''}`}
              style={{ height: getPanelHeight(idx), minHeight: getPanelHeight(idx) }}
              onMouseEnter={() => setHoverIdx(idx)}
            >
              <div
                className={
                  `profilepanel-content profilepanel-scroll-content${isActive ? ' profilepanel-scroll-active' : ' profilepanel-scroll-collapsed'
                  } profilepanel-scroll-${direction}`
                }
              >
                {isActive ? (
                  <div className="profilepanel-info-panel" style={{ padding: '30px', width: '100%', boxSizing: 'border-box' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '25px', color: '#333', borderBottom: '2px solid #f0f0f0', paddingBottom: '15px', fontSize: '1.4rem' }}>关于我</h3>
                    
                    <div className="profile-tags-section" style={{ marginBottom: '35px' }}>
                      <div className="profile-tags-display" style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                        {tagsList && tagsList.length > 0 ? (
                          <MatchboxTagEditor tags={tagsList} readOnly={true} />
                        ) : (
                          <span style={{ color: '#999', fontStyle: 'italic', padding: '5px 0' }}>暂无标签</span>
                        )}
                      </div>
                    </div>

                    <div className="profile-bio-section">
                      <h4 style={{ color: '#555', marginBottom: '15px', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>
                        <span style={{ width: '4px', height: '16px', background: '#1890ff', marginRight: '8px', borderRadius: '2px' }}></span>
                        个人简介
                      </h4>
                      <div className="profile-bio-content" style={{ 
                        lineHeight: '1.8', 
                        color: '#444', 
                        background: '#f8f9fa', 
                        padding: '25px', 
                        borderRadius: '12px',
                        whiteSpace: 'pre-wrap',
                        fontSize: '1rem',
                        border: '1px solid #eee',
                        boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.02)'
                      }}>
                        {profile.bio || '这个人很懒，什么都没有写~'}
                      </div>
                    </div>
                  </div>
                ) : (
                   <div className="profilepanel-collapsed-preview" style={{ 
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: 'space-between', 
                     padding: '0 30px',
                     height: '100%', 
                     color: '#fff', 
                     background: 'linear-gradient(to right, rgba(0,0,0,0.1), transparent)',
                     cursor: 'pointer'
                   }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ 
                           width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', 
                           display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
                        }}>
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                           </svg>
                        </div>
                        <span style={{ fontSize: '1.1rem', fontWeight: '600', letterSpacing: '1px', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>关于我</span>
                      </div>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                         <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                   </div>
                )}
              </div>
            </div>
          );
        }

        // 第三个模块：联系方式
        if (idx === 2) {
          return (
            <div
              key={idx}
              className={`profilepanel-section profilepanel-scroll-section${isActive ? ' profilepanel-section-active' : ''}`}
              style={{ height: getPanelHeight(idx), minHeight: getPanelHeight(idx) }}
              onMouseEnter={() => setHoverIdx(idx)}
            >
              <div
                className={
                  `profilepanel-content profilepanel-scroll-content${isActive ? ' profilepanel-scroll-active' : ' profilepanel-scroll-collapsed'
                  } profilepanel-scroll-${direction}`
                }
              >
                {isActive ? (
                  <div className="profilepanel-contact-panel" style={{ padding: '30px', height: '100%', overflowY: 'auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '25px', color: '#333', borderBottom: '2px solid #f0f0f0', paddingBottom: '15px', fontSize: '1.4rem' }}>联系方式</h3>
                    
                    <div className="profile-contact-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {/* QQ */}
                      {(profile.qq || profile.qqQrCode) && (
                        <div className="contact-item" style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          background: '#fff', 
                          padding: '15px 20px', 
                          borderRadius: '12px', 
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          border: '1px solid #f0f0f0'
                        }}>
                          <img src={resolveUrl('/icons/contect/qq.svg')} alt="QQ" style={{ width: '32px', height: '32px', marginRight: '15px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#333' }}>QQ</div>
                            {profile.qq && <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '2px' }}>{profile.qq}</div>}
                          </div>
                          {profile.qqQrCode && (
                            <div className="qr-preview-hover" style={{ position: 'relative', cursor: 'pointer' }}>
                               <img src={resolveUrl('/icons/profile/qrcode_icon.svg')} alt="QR" style={{ width: '24px', height: '24px', opacity: 0.6 }} onError={(e) => { e.target.onerror = null; e.target.src = resolveUrl('/imgs/loginandwelcomepanel/1.png'); }} />
                               <div className="qr-popup" style={{ 
                                 position: 'absolute', 
                                 right: '0', 
                                 top: '100%', 
                                 marginTop: '10px', 
                                 background: '#fff', 
                                 padding: '10px', 
                                 borderRadius: '8px', 
                                 boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
                                 zIndex: 10,
                                 display: 'none',
                                 border: '1px solid #eee'
                               }}>
                                 <img src={resolveUrl(profile.qqQrCode)} alt="QQ QR" style={{ width: '150px', height: '150px', objectFit: 'contain', display: 'block' }} />
                               </div>
                               <style>{`
                                 .qr-preview-hover:hover .qr-popup { display: block !important; }
                               `}</style>
                            </div>
                          )}
                        </div>
                      )}

                      {/* WeChat */}
                      {(profile.wechat || profile.wechatQrCode) && (
                        <div className="contact-item" style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          background: '#fff', 
                          padding: '15px 20px', 
                          borderRadius: '12px', 
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          border: '1px solid #f0f0f0'
                        }}>
                          <img src={resolveUrl('/icons/contect/微信.svg')} alt="WeChat" style={{ width: '32px', height: '32px', marginRight: '15px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#333' }}>微信</div>
                            {profile.wechat && <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '2px' }}>{profile.wechat}</div>}
                          </div>
                          {profile.wechatQrCode && (
                            <div className="qr-preview-hover" style={{ position: 'relative', cursor: 'pointer' }}>
                               <img src={resolveUrl('/icons/profile/qrcode_icon.svg')} alt="QR" style={{ width: '24px', height: '24px', opacity: 0.6 }} onError={(e) => { e.target.onerror = null; e.target.src = resolveUrl('/imgs/loginandwelcomepanel/1.png'); }} />
                               <div className="qr-popup" style={{ 
                                 position: 'absolute', 
                                 right: '0', 
                                 top: '100%', 
                                 marginTop: '10px', 
                                 background: '#fff', 
                                 padding: '10px', 
                                 borderRadius: '8px', 
                                 boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
                                 zIndex: 10,
                                 display: 'none',
                                 border: '1px solid #eee'
                               }}>
                                 <img src={resolveUrl(profile.wechatQrCode)} alt="WeChat QR" style={{ width: '150px', height: '150px', objectFit: 'contain', display: 'block' }} />
                               </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* GitHub */}
                      {profile.githubLink && (
                        <a href={profile.githubLink} target="_blank" rel="noopener noreferrer" className="contact-item" style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          background: '#fff', 
                          padding: '15px 20px', 
                          borderRadius: '12px', 
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          border: '1px solid #f0f0f0',
                          textDecoration: 'none',
                          transition: 'transform 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateX(5px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                        >
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px', color: '#333', display: 'flex', alignItems: 'center' }}>
                            <img src={resolveUrl('/icons/contect/github.svg')} alt="GitHub" style={{ width: '28px', height: '28px', marginRight: '10px' }} />
                            GitHub
                          </div>
                          <div style={{ color: '#1890ff', wordBreak: 'break-all', textAlign: 'center', fontSize: '1rem', background: '#e6f7ff', padding: '8px 16px', borderRadius: '20px', fontWeight: '500' }}>点击访问主页</div>
                        </a>
                      )}

                      {/* Bilibili */}
                      {profile.bilibiliLink && (
                        <a href={profile.bilibiliLink} target="_blank" rel="noopener noreferrer" className="contact-item" style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          background: '#fff', 
                          padding: '15px 20px', 
                          borderRadius: '12px', 
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          border: '1px solid #f0f0f0',
                          textDecoration: 'none',
                          transition: 'transform 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateX(5px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                        >
                          <img src={resolveUrl('/icons/contect/bilibili.svg')} alt="Bilibili" style={{ width: '32px', height: '32px', marginRight: '15px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#333' }}>Bilibili</div>
                            <div style={{ fontSize: '0.9rem', color: '#fb7299', marginTop: '2px' }}>点击访问主页</div>
                          </div>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </a>
                      )}
                    </div>
                    
                    {!profile.qq && !profile.qqQrCode && !profile.wechat && !profile.wechatQrCode && !profile.githubLink && !profile.bilibiliLink && (
                       <div style={{ textAlign: 'center', color: '#999', padding: '60px 0', fontSize: '1.1rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>暂无联系方式</div>
                    )}
                  </div>
                ) : (
                   <div className="profilepanel-collapsed-preview" style={{ 
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: 'space-between', 
                     padding: '0 30px',
                     height: '100%', 
                     color: '#fff', 
                     background: 'linear-gradient(to right, rgba(0,0,0,0.1), transparent)',
                     cursor: 'pointer'
                   }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ 
                           width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', 
                           display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
                        }}>
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                              <polyline points="22,6 12,13 2,6"></polyline>
                           </svg>
                        </div>
                        <span style={{ fontSize: '1.1rem', fontWeight: '600', letterSpacing: '1px', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>联系方式</span>
                      </div>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                         <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                   </div>
                )}
              </div>
            </div>
          );
        }

        // 其他模块保持原样
        return (
          <div
            key={idx}
            className={`profilepanel-section profilepanel-scroll-section${isActive ? ' profilepanel-section-active' : ''}`}
            style={{ height: getPanelHeight(idx), minHeight: getPanelHeight(idx) }}
            onMouseEnter={() => setHoverIdx(idx)}
          >
            <div
              className={
                `profilepanel-content profilepanel-scroll-content${isActive ? ' profilepanel-scroll-active' : ' profilepanel-scroll-collapsed'
                } profilepanel-scroll-${direction}`
              }
            >
              <div className="profilepanel-empty-panel" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
