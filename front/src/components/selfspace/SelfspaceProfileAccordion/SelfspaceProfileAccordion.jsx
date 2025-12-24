import React, { useState, useRef, useEffect } from 'react';
import resolveUrl from '@utils/resolveUrl';
import '@styles/selfspace/SelfspaceProfileAccordion/selfspaceProfileAccordion.css';
import httpClient from '@utils/api/httpClient';
import { useAuthState } from '@hooks/useAuthState';
import { getDefaultAvatar } from '@utils/avatarUtils';
import FollowButton from '@components/user/FollowButton';
import FriendRequestButton from '@components/user/FriendRequestButton';

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
  const handleProfileSave = async () => {
    if (!userId) {
      setEditMsg('用户ID无效，请重新登录');
      return;
    }
    setEditLoading(true);
    setEditMsg('正在保存...');

    // 初始使用当前 profile 中可能已有的 url
    let avatarUrl = profile.avatarUrl || '';
    let backgroundUrl = profile.backgroundUrl || '';
    let qqQrCode = profile.qqQrCode || '';
    let wechatQrCode = profile.wechatQrCode || '';

    try {
      // 1) 上传头像（如有）
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        const res = await httpClient.post(`/user/profile/${userId}/avatar`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const uploadData = res.data && res.data.data;
        if (res.data && res.data.code === 200 && uploadData) {
          if (typeof uploadData === 'string') avatarUrl = uploadData;
          else if (typeof uploadData === 'object') avatarUrl = uploadData.avatarUrl || uploadData.path || avatarUrl;
          localStorage.setItem('avatarUrl', avatarUrl || '');
        } else {
          throw new Error(res.data?.msg || '头像上传失败');
        }
      }

      // 2) 上传背景（如有）
      if (backgroundFile) {
        const formData = new FormData();
        formData.append('file', backgroundFile);
        const res = await httpClient.post(`/user/profile/${userId}/background`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const uploadData = res.data && res.data.data;
        if (res.data && res.data.code === 200 && uploadData) {
          if (typeof uploadData === 'string') backgroundUrl = uploadData;
          else if (typeof uploadData === 'object') backgroundUrl = uploadData.backgroundUrl || uploadData.path || backgroundUrl;
          localStorage.setItem('backgroundUrl', backgroundUrl || '');
        } else {
          throw new Error(res.data?.msg || '背景上传失败');
        }
      }

      // 3) 上传QQ二维码（如有）
      if (qqQrFile) {
        const formData = new FormData();
        formData.append('file', qqQrFile);
        const res = await httpClient.post(`/user/profile/${userId}/qq-qrcode`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data && res.data.code === 200) {
          qqQrCode = res.data.data;
        } else {
          throw new Error(res.data?.msg || 'QQ二维码上传失败');
        }
      }

      // 4) 上传微信二维码（如有）
      if (wechatQrFile) {
        const formData = new FormData();
        formData.append('file', wechatQrFile);
        const res = await httpClient.post(`/user/profile/${userId}/wechat-qrcode`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data && res.data.code === 200) {
          wechatQrCode = res.data.data;
        } else {
          throw new Error(res.data?.msg || '微信二维码上传失败');
        }
      }

      // 5) 最后保存 profile
      const newProfile = {
        ...profile,
        avatarUrl,
        backgroundUrl,
        qqQrCode,
        wechatQrCode
      };

      console.log('[ProfileAccordion] PUT /user/profile/', userId, newProfile);
      const res = await httpClient.put(`/user/profile/${userId}`, newProfile);

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
      console.error('[ProfileAccordion] 保存异常:', err);
      const serverMsg = err?.response?.data?.msg || err?.response?.data?.message || err.message;
      setEditMsg(serverMsg || '保存异常');
    } finally {
      setEditLoading(false);
      setTimeout(() => setEditMsg(''), 3000);
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
                    marginBottom: isActive ? 5 : 0,
                    transition: 'all 0.3s ease'
                  }}>{profile.nickname}</div>
                  {isActive && (
                    <div className="profile-username-large" style={{
                      fontSize: '0.9rem',
                      opacity: 0.8,
                      marginBottom: 10,
                      transition: 'all 0.3s ease'
                    }}>@{profile.username || profile.id}</div>
                  )}
                  {isActive && profile.signature && (
                    <div className="profile-signature-large" style={{
                      fontSize: '0.9rem',
                      opacity: 0.9,
                      marginBottom: 15,
                      maxWidth: '80%',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {profile.signature}
                    </div>
                  )}

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

                  {isActive && isLoggedIn && user?.id && userId && String(user.id) !== String(userId) && (
                    <div className="profile-actions-row" style={{
                      display: 'flex',
                      gap: '12px',
                      marginTop: '20px',
                      opacity: 1,
                      transition: 'opacity 0.3s ease'
                    }}>
                      <FollowButton targetId={userId} />
                      <FriendRequestButton targetId={userId} />
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
                  <div className="profilepanel-useredit-panel profilepanel-useredit-layout">
                    {/* Sidebar */}
                    <div className="profilepanel-edit-sidebar profilepanel-edit-sidebar--tabs">
                      <div style={{ flex: 1 }}>
                        {['profile', 'tags', 'media', 'contact'].map(tab => (
                          <div
                            key={tab}
                            className={`edit-tab-item ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                          >
                            {tab === 'profile' && '个人资料'}
                            {tab === 'tags' && '个性标签'}
                            {tab === 'media' && '头像背景'}
                            {tab === 'contact' && '联系方式'}
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: '10px 5px' }}>
                        <button
                          onClick={() => handleProfileSave()}
                          disabled={editLoading}
                          className="profilepanel-save-btn"
                        >
                          {editLoading ? '保存...' : '保存资料'}
                        </button>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="profilepanel-edit-content">
                      <h4 className="profilepanel-edit-title">
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
                          className="profilepanel-useredit-form profilepanel-edit-form"
                          onSubmit={e => { e.preventDefault(); handleProfileSave(activeTab); }}
                        >
                          {activeTab === 'profile' && (
                            <div className="profilepanel-edit-scroll">
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
                                <div className="profile-gender-options">
                                  {genderItems.map(item => (
                                    <div
                                      key={item.key}
                                      className={`profile-gender-card ${profile.gender === item.key ? 'active' : ''}`}
                                      onClick={() => handleProfileChange({ target: { name: 'gender', value: item.key } })}
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
                              {editMsg && <div className="form-msg" style={{ marginTop: 15, color: editMsg.includes('成功') ? '#52c41a' : '#ff4d4f', textAlign: 'center', fontWeight: '500' }}>{editMsg}</div>}
                            </div>
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
                              {editMsg && <div className="form-msg" style={{ marginTop: 15, color: editMsg.includes('成功') ? '#52c41a' : '#ff4d4f', textAlign: 'center', fontWeight: '500' }}>{editMsg}</div>}
                            </div>
                          )}

                          {activeTab === 'media' && (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'hidden', paddingRight: '5px' }}>
                              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                {/* Avatar Section */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <label className="profile-form-label" style={{ marginBottom: '15px', display: 'block', width: '100%', textAlign: 'left' }}>头像设置</label>
                                  <div
                                    className="avatar-upload-preview"
                                    style={{
                                      position: 'relative',
                                      width: '160px',
                                      height: '160px',
                                      borderRadius: '50%',
                                      cursor: 'pointer',
                                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                                      border: '4px solid #fff',
                                      overflow: 'hidden',
                                      transition: 'transform 0.3s',
                                      background: '#f8f8f8'
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
                                  <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#999' }}>
                                    点击上方图片更换头像
                                  </div>
                                </div>

                                {/* Background Section */}
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <label className="profile-form-label" style={{ marginBottom: '15px', display: 'block' }}>背景设置</label>
                                  <div
                                    className="bg-upload-preview"
                                    style={{
                                      position: 'relative',
                                      width: '100%',
                                      aspectRatio: '16/9',
                                      borderRadius: '12px',
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                                      border: '1px solid #eee',
                                      transition: 'all 0.3s',
                                      background: '#f0f0f0'
                                    }}
                                    onClick={() => document.getElementById('bg-upload-hidden').click()}
                                    onMouseEnter={e => {
                                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                                      e.currentTarget.querySelector('.bg-overlay').style.opacity = 1;
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                                      e.currentTarget.querySelector('.bg-overlay').style.opacity = 0;
                                    }}
                                  >
                                    {(() => {
                                      const url = backgroundPreview || profile.backgroundUrl;
                                      if (url) {
                                        if (/\.(mp4|webm)$/i.test(url)) {
                                          return <video src={resolveUrl(url)} className="profilepanel-bg-video" style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000' }} muted loop autoPlay />;
                                        } else {
                                          return <img src={resolveUrl(url)} alt="Background" className="profilepanel-bg-img" style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#f8f8f8' }} />;
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
                                  <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#999', textAlign: 'center' }}>
                                    点击上方区域更换背景
                                  </div>
                                </div>
                              </div>
                              {editMsg && <div className="form-msg" style={{ marginTop: 15, color: editMsg.includes('成功') ? '#52c41a' : '#ff4d4f', textAlign: 'center', fontWeight: '500' }}>{editMsg}</div>}
                            </div>
                          )}

                          {activeTab === 'contact' && (
                            <>
                              <div className="profilepanel-edit-contact-body">
                                {/* Inputs Grid */}
                                <div className="profilepanel-edit-contact-grid">
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
                                <div className="profilepanel-edit-qr-grid">
                                  <div className="form-group" style={{ marginBottom: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label className="profile-form-label" style={{ marginBottom: '8px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>QQ二维码</label>
                                    <div
                                      className="qr-upload-box"
                                      onClick={() => document.getElementById('qq-qr-upload').click()}
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
                  <div className="profilepanel-info-panel profilepanel-about-panel">
                    <h3 className="profilepanel-section-title">关于我</h3>

                    <div className="profile-about-content">
                      <div className="profile-tags-section">
                        <div className="profile-tags-display">
                          {tagsList && tagsList.length > 0 ? (
                            <div className="profile-tags-bubble-card" aria-label="个人标签">
                              <div className="profile-tags-bubble-wrap">
                                {tagsList.map((tag, index) => (
                                  <span
                                    key={`${tag}-${index}`}
                                    className="profile-tag-bubble"
                                    style={{ '--i': index }}
                                    title={tag}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="no-tags-placeholder">暂无标签</div>
                          )}
                        </div>
                      </div>

                      <div className="profile-bio-section">
                        <h4 className="profile-bio-title">
                          <span className="title-accent"></span>
                          个人简介
                        </h4>
                        <div className="profile-bio-text-area">
                          {profile.bio || '这个人很懒，什么都没有写~'}
                        </div>
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
                  <div className="profilepanel-contact-panel profilepanel-contact-panel--view">
                    <h3 className="profilepanel-section-title profilepanel-section-title--sm">联系方式</h3>

                    <div className="profile-contact-list">
                      {/* QQ */}
                      {(profile.qq || profile.qqQrCode) && (
                        <div className="contact-item contact-item--column">
                          <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: profile.qqQrCode ? '12px' : '0' }}>
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '10px', background: '#e6f7ff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', flexShrink: 0
                            }}>
                              <img src={resolveUrl('/icons/contect/qq.svg')} alt="QQ" style={{ width: '24px', height: '24px' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#333', marginBottom: '2px' }}>QQ</div>
                              {profile.qq && <div style={{ fontSize: '0.85rem', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.qq}</div>}
                            </div>
                          </div>

                          {profile.qqQrCode && (
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                              <img src={resolveUrl(profile.qqQrCode)} alt="QQ QR" style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '4px' }} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* WeChat */}
                      {(profile.wechat || profile.wechatQrCode) && (
                        <div className="contact-item contact-item--column">
                          <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: profile.wechatQrCode ? '12px' : '0' }}>
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '10px', background: '#e9f7ef',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', flexShrink: 0
                            }}>
                              <img src={resolveUrl('/icons/contect/微信.svg')} alt="WeChat" style={{ width: '24px', height: '24px' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#333', marginBottom: '2px' }}>微信</div>
                              {profile.wechat && <div style={{ fontSize: '0.85rem', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.wechat}</div>}
                            </div>
                          </div>

                          {profile.wechatQrCode && (
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                              <img src={resolveUrl(profile.wechatQrCode)} alt="WeChat QR" style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '4px' }} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* GitHub */}
                      {profile.githubLink && (
                        <a href={profile.githubLink} target="_blank" rel="noopener noreferrer" className="contact-item contact-item--link">
                          <div style={{
                            width: '48px', height: '48px', borderRadius: '12px', background: '#f0f0f0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px', flexShrink: 0
                          }}>
                            <img src={resolveUrl('/icons/contect/github.svg')} alt="GitHub" style={{ width: '28px', height: '28px' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>GitHub</div>
                            <div style={{ fontSize: '0.85rem', color: '#1890ff', background: 'rgba(24, 144, 255, 0.1)', display: 'inline-block', padding: '2px 8px', borderRadius: '4px' }}>点击访问主页</div>
                          </div>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </a>
                      )}

                      {/* Bilibili */}
                      {profile.bilibiliLink && (
                        <a href={profile.bilibiliLink} target="_blank" rel="noopener noreferrer" className="contact-item contact-item--link">
                          <div style={{
                            width: '48px', height: '48px', borderRadius: '12px', background: '#fff0f6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px', flexShrink: 0
                          }}>
                            <img src={resolveUrl('/icons/contect/bilibili.svg')} alt="Bilibili" style={{ width: '28px', height: '28px' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>Bilibili</div>
                            <div style={{ fontSize: '0.85rem', color: '#fb7299', background: 'rgba(251, 114, 153, 0.1)', display: 'inline-block', padding: '2px 8px', borderRadius: '4px' }}>点击访问主页</div>
                          </div>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </a>
                      )}
                    </div>

                    {!profile.qq && !profile.qqQrCode && !profile.wechat && !profile.wechatQrCode && !profile.githubLink && !profile.bilibiliLink && (
                      <div className="profile-contact-empty">暂无联系方式</div>
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
