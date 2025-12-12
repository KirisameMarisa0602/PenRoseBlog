import React, { useState, useRef, useEffect } from 'react';
import resolveUrl from '@utils/resolveUrl';
import '@styles/selfspace/SelfspaceProfileAccordion/selfspaceProfileAccordion.css';
import httpClient from '@utils/api/httpClient';
import { useAuthState } from '@hooks/useAuthState';

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

  // 保存用户信息（统一上传头像/背景并保存）
  const handleProfileSave = async () => {
    console.log('[ProfileAccordion] 保存资料 userId:', userId, 'profile:', profile);
    if (!userId) {
      setEditMsg('用户ID无效，请重新登录');
      return;
    }
    setEditLoading(true);
    setEditMsg('');
    console.log('[ProfileAccordion] 保存资料');

    // 初始使用当前 profile 中可能已有的 url
    let avatarUrl = profile.avatarUrl || '';
    let backgroundUrl = profile.backgroundUrl || '';
    let qqQrCode = profile.qqQrCode || '';
    let wechatQrCode = profile.wechatQrCode || '';

    try {
      // 1) 上传头像（如有）
      if (avatarFile) {
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

      // 2) 上传背景（如有）
      if (backgroundFile) {
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

      // 3) 上传QQ二维码（如有）
      if (qqQrFile) {
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

      // 4) 上传微信二维码（如有）
      if (wechatQrFile) {
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

        // 清空本地文件和预览
        setAvatarFile(null);
        setAvatarPreview('');
        setBackgroundFile(null);
        setBackgroundPreview('');
        setQqQrFile(null);
        setQqQrPreview('');
        setWechatQrFile(null);
        setWechatQrPreview('');

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
                {profile.backgroundUrl && (
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
                    transition: 'all 0.3s ease'
                  }}>
                    <img src={resolveUrl(profile.avatarUrl)} alt={profile.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    <div className="profilepanel-edit-sidebar" style={{ width: '120px', borderRight: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', background: 'rgba(249,249,249,0.8)', padding: '10px 0' }}>
                      {['profile', 'tags', 'media', 'contact'].map(tab => (
                        <div 
                          key={tab}
                          className={`edit-tab-item ${activeTab === tab ? 'active' : ''}`} 
                          onClick={() => setActiveTab(tab)} 
                          style={{ 
                            padding: '12px 10px', 
                            cursor: 'pointer', 
                            textAlign: 'center', 
                            background: activeTab === tab ? '#e6f7ff' : 'transparent', 
                            color: activeTab === tab ? '#1890ff' : '#555', 
                            fontSize: '0.95rem', 
                            fontWeight: activeTab === tab ? '600' : 'normal',
                            margin: '4px 8px',
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
                    <div className="profilepanel-edit-content" style={{ flex: 1, padding: '25px', overflowY: 'auto' }}>
                      <h4 style={{ marginTop: 0, marginBottom: 25, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 15, color: '#333', fontSize: '1.2rem' }}>
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
                          onSubmit={e => { e.preventDefault(); handleProfileSave(); }}
                          style={{ maxWidth: '600px' }}
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
                            </>
                          )}

                          {activeTab === 'tags' && (
                            <div className="form-group">
                                <label className="profile-form-label">个人标签（最多10个）</label>
                              <div className="profile-tags-wrapper" style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
                                  {tagsList.map(tag => (
                                    <span key={tag} className="profile-tag-chip" style={{ 
                                      background: '#e6f7ff', 
                                      color: '#1890ff', 
                                      padding: '5px 10px', 
                                      borderRadius: '15px', 
                                      fontSize: '0.9rem', 
                                      display: 'flex', 
                                      alignItems: 'center' 
                                    }}>
                                      {tag}
                                      <button type="button" onClick={() => handleRemoveTag(tag)} style={{ marginLeft: '5px', background: 'none', border: 'none', color: '#1890ff', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}>&times;</button>
                                    </span>
                                  ))}
                                </div>
                                {tagsList.length < 10 && (
                                  <div className="profile-tag-input-group" style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                      type="text"
                                      placeholder={tagsList.length === 0 ? "输入标签按回车添加" : "添加新标签"}
                                      value={tagInput}
                                      onChange={e => setTagInput(e.target.value)}
                                      onKeyDown={handleTagKeyDown}
                                      className="profile-tag-input"
                                      maxLength={10}
                                      style={{ flex: 1 }}
                                    />
                                    <button type="button" onClick={handleAddTag} className="profile-add-tag-btn" disabled={!tagInput.trim()} style={{ padding: '0 15px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                      添加
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {activeTab === 'media' && (
                            <>
                              <div className="form-group">
                                <label className="profile-form-label">头像</label>
                                <div className="profile-file-input-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                  {(avatarPreview || profile.avatarUrl) && (
                                    <div className="profilepanel-avatar-preview">
                                      <img
                                        src={avatarPreview || resolveUrl(profile.avatarUrl)}
                                        alt="头像预览"
                                        className="profilepanel-avatar-img"
                                        style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                      />
                                    </div>
                                  )}
                                  <div style={{ flex: 1 }}>
                                    <div className="upload-zone" style={{ minHeight: '100px', padding: '15px', flexDirection: 'row', gap: '15px', justifyContent: 'flex-start' }}>
                                      <input type="file" accept="image/*,image/gif" onChange={handleAvatarSelect} id="avatar-upload" />
                                      <div className="upload-zone-icon" style={{ fontSize: '24px', marginBottom: 0 }}>📷</div>
                                      <div style={{ textAlign: 'left' }}>
                                        <div className="upload-zone-text">点击更换头像</div>
                                        <div className="upload-zone-subtext">支持 JPG, PNG, GIF</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="form-group" style={{ marginTop: '25px' }}>
                                <label className="profile-form-label">背景图/视频</label>
                                <div className="upload-zone">
                                  <input type="file" accept="image/*,image/gif,video/mp4,video/webm" onChange={handleBackgroundSelect} id="bg-upload" />
                                  <div className="upload-zone-icon">🖼️</div>
                                  <div className="upload-zone-text">点击上传背景图片或视频</div>
                                  <div className="upload-zone-subtext">支持图片或 MP4/WebM 视频</div>
                                </div>
                                {(backgroundPreview || profile.backgroundUrl) && (
                                  <div className="profilepanel-bg-preview" style={{ marginTop: '15px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #eee', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                    {(() => {
                                      const url = backgroundPreview || profile.backgroundUrl;
                                      if (/\.(mp4|webm)$/i.test(url)) {
                                        return <video src={resolveUrl(url)} controls className="profilepanel-bg-video" style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block' }} />;
                                      } else {
                                        return <img src={resolveUrl(url)} alt="背景预览" className="profilepanel-bg-img" style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block' }} />;
                                      }
                                    })()}
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {activeTab === 'contact' && (
                            <>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group">
                                  <label className="profile-form-label">QQ号</label>
                                  <input type="text" name="qq" value={profile.qq || ''} onChange={handleProfileChange} className="profile-form-input" placeholder="QQ号码" />
                                </div>
                                <div className="form-group">
                                  <label className="profile-form-label">微信号</label>
                                  <input type="text" name="wechat" value={profile.wechat || ''} onChange={handleProfileChange} className="profile-form-input" placeholder="微信号码" />
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
                                <div className="form-group">
                                  <label className="profile-form-label">QQ二维码</label>
                                  <div className="upload-zone" style={{ minHeight: '160px' }}>
                                    <input type="file" accept="image/*" onChange={handleQqQrSelect} id="qq-qr-upload" />
                                    {(qqQrPreview || profile.qqQrCode) ? (
                                       <img 
                                        src={qqQrPreview || resolveUrl(profile.qqQrCode)} 
                                        alt="QQ QR" 
                                        style={{ width: '100px', height: '100px', objectFit: 'contain', marginBottom: '10px' }}
                                        onError={e => { e.target.onerror = null; e.target.src = '/imgs/loginandwelcomepanel/1.png'; }}
                                      />
                                    ) : (
                                      <div className="upload-zone-icon">📱</div>
                                    )}
                                    <div className="upload-zone-text">{ (qqQrPreview || profile.qqQrCode) ? '点击更换二维码' : '上传QQ二维码' }</div>
                                  </div>
                                </div>
                                <div className="form-group">
                                  <label className="profile-form-label">微信二维码</label>
                                  <div className="upload-zone" style={{ minHeight: '160px' }}>
                                    <input type="file" accept="image/*" onChange={handleWechatQrSelect} id="wechat-qr-upload" />
                                    {(wechatQrPreview || profile.wechatQrCode) ? (
                                       <img 
                                        src={wechatQrPreview || resolveUrl(profile.wechatQrCode)} 
                                        alt="WeChat QR" 
                                        style={{ width: '100px', height: '100px', objectFit: 'contain', marginBottom: '10px' }}
                                        onError={e => { e.target.onerror = null; e.target.src = '/imgs/loginandwelcomepanel/1.png'; }}
                                      />
                                    ) : (
                                      <div className="upload-zone-icon">💬</div>
                                    )}
                                    <div className="upload-zone-text">{ (wechatQrPreview || profile.wechatQrCode) ? '点击更换二维码' : '上传微信二维码' }</div>
                                  </div>
                                </div>
                              </div>

                              <div className="form-group">
                                <label className="profile-form-label">GitHub主页</label>
                                <input type="text" name="githubLink" value={profile.githubLink || ''} onChange={handleProfileChange} className="profile-form-input" placeholder="https://github.com/..." />
                              </div>
                              <div className="form-group">
                                <label className="profile-form-label">B站主页</label>
                                <input type="text" name="bilibiliLink" value={profile.bilibiliLink || ''} onChange={handleProfileChange} className="profile-form-input" placeholder="https://space.bilibili.com/..." />
                              </div>
                            </>
                          )}

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
                        </form>
                      )}
                    </div>
                  </div>
                ) : <div className="profilepanel-empty-panel" />}
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
                  <div className="profilepanel-info-panel" style={{ padding: '30px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '25px', color: '#333', borderBottom: '2px solid #f0f0f0', paddingBottom: '15px', fontSize: '1.4rem' }}>关于我</h3>
                    
                    <div className="profile-tags-section" style={{ marginBottom: '35px' }}>
                      <h4 style={{ color: '#555', marginBottom: '15px', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>
                        <span style={{ width: '4px', height: '16px', background: '#1890ff', marginRight: '8px', borderRadius: '2px' }}></span>
                        个人标签
                      </h4>
                      <div className="profile-tags-display" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {tagsList && tagsList.length > 0 ? (
                          tagsList.map((tag, i) => (
                            <span key={i} style={{ 
                              background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', 
                              color: '#096dd9', 
                              padding: '8px 16px', 
                              borderRadius: '20px', 
                              fontSize: '0.95rem',
                              fontWeight: '500',
                              boxShadow: '0 2px 4px rgba(24, 144, 255, 0.1)'
                            }}>
                              {tag}
                            </span>
                          ))
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
                     justifyContent: 'center', 
                     height: '100%', 
                     color: '#fff', 
                     fontSize: '1.4rem', 
                     fontWeight: 'bold', 
                     textShadow: '0 2px 4px rgba(0,0,0,0.6)',
                     letterSpacing: '2px'
                   }}>
                      关于我
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
                    
                    <div className="profile-contact-grid" style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
                      gap: '20px',
                      flex: 1,
                      alignContent: 'start',
                      width: '100%'
                    }}>
                      {/* QQ */}
                      {(profile.qq || profile.qqQrCode) && (
                        <div className="contact-card" style={{ 
                          background: '#fff', 
                          padding: '30px', 
                          borderRadius: '16px', 
                          boxShadow: '0 8px 24px rgba(0,0,0,0.06)', 
                          border: '1px solid #f0f0f0', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center',
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                          height: 'fit-content'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-5px)';
                          e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)';
                        }}
                        >
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px', color: '#333', display: 'flex', alignItems: 'center' }}>
                            <img src={resolveUrl('/icons/contect/qq.svg')} alt="QQ" style={{ width: '28px', height: '28px', marginRight: '10px' }} />
                            QQ
                          </div>
                          {profile.qq && <div style={{ marginBottom: '15px', color: '#555', fontSize: '1.1rem', fontFamily: 'Consolas, monospace' }}>{profile.qq}</div>}
                          {profile.qqQrCode && (
                            <div style={{ padding: '10px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                              <img 
                                src={resolveUrl(profile.qqQrCode)} 
                                alt="QQ QR" 
                                style={{ width: '160px', height: '160px', objectFit: 'contain', display: 'block' }} 
                                onError={e => { e.target.onerror = null; e.target.src = resolveUrl('/imgs/loginandwelcomepanel/1.png'); }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* WeChat */}
                      {(profile.wechat || profile.wechatQrCode) && (
                        <div className="contact-card" style={{ 
                          background: '#fff', 
                          padding: '30px', 
                          borderRadius: '16px', 
                          boxShadow: '0 8px 24px rgba(0,0,0,0.06)', 
                          border: '1px solid #f0f0f0', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center',
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                          height: 'fit-content'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-5px)';
                          e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)';
                        }}
                        >
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px', color: '#333', display: 'flex', alignItems: 'center' }}>
                            <img src={resolveUrl('/icons/contect/微信.svg')} alt="WeChat" style={{ width: '28px', height: '28px', marginRight: '10px' }} />
                            微信
                          </div>
                          {profile.wechat && <div style={{ marginBottom: '15px', color: '#555', fontSize: '1.1rem', fontFamily: 'Consolas, monospace' }}>{profile.wechat}</div>}
                          {profile.wechatQrCode && (
                            <div style={{ padding: '10px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                              <img 
                                src={resolveUrl(profile.wechatQrCode)} 
                                alt="WeChat QR" 
                                style={{ width: '160px', height: '160px', objectFit: 'contain', display: 'block' }} 
                                onError={e => { e.target.onerror = null; e.target.src = resolveUrl('/imgs/loginandwelcomepanel/1.png'); }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* GitHub */}
                      {profile.githubLink && (
                        <a href={profile.githubLink} target="_blank" rel="noopener noreferrer" className="contact-card" style={{ 
                          textDecoration: 'none', 
                          background: '#fff', 
                          padding: '30px', 
                          borderRadius: '16px', 
                          boxShadow: '0 8px 24px rgba(0,0,0,0.06)', 
                          border: '1px solid #f0f0f0', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          cursor: 'pointer', 
                          transition: 'all 0.3s ease',
                          height: 'fit-content'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-5px)';
                          e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)';
                        }}
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
                        <a href={profile.bilibiliLink} target="_blank" rel="noopener noreferrer" className="contact-card" style={{ 
                          textDecoration: 'none', 
                          background: '#fff', 
                          padding: '30px', 
                          borderRadius: '16px', 
                          boxShadow: '0 8px 24px rgba(0,0,0,0.06)', 
                          border: '1px solid #f0f0f0', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          cursor: 'pointer', 
                          transition: 'all 0.3s ease',
                          height: 'fit-content'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-5px)';
                          e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)';
                        }}
                        >
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px', color: '#333', display: 'flex', alignItems: 'center' }}>
                            <img src={resolveUrl('/icons/contect/bilibili.svg')} alt="Bilibili" style={{ width: '28px', height: '28px', marginRight: '10px' }} />
                            Bilibili
                          </div>
                          <div style={{ color: '#fb7299', wordBreak: 'break-all', textAlign: 'center', fontSize: '1rem', background: '#fff0f6', padding: '8px 16px', borderRadius: '20px', fontWeight: '500' }}>点击访问主页</div>
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
                     justifyContent: 'center', 
                     height: '100%', 
                     color: '#fff', 
                     fontSize: '1.4rem', 
                     fontWeight: 'bold', 
                     textShadow: '0 2px 4px rgba(0,0,0,0.6)',
                     letterSpacing: '2px'
                   }}>
                      联系方式
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
