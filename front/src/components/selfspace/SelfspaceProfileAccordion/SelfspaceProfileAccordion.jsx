import React, { useState, useRef, useEffect } from 'react';
import resolveUrl from '@utils/resolveUrl';
import '@styles/selfspace/SelfspaceProfileAccordion/selfspaceProfileAccordion.css';
import httpClient from '@utils/api/httpClient';
import { changePassword } from '@utils/api/userService';
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

  const handleMouseLeave = () => { if (hoverIdx !== 3) setHoverIdx(0); };

  // 查看别人时不显示第4个“编辑资料”面板
  const panels = hideEditPanel ? [0, 1, 2] : [0, 1, 2, 3];

  // 用户信息编辑相关状态
  const initialProfile = React.useMemo(() => ({
    id: '',
    nickname: '',
    avatarUrl: '',
    backgroundUrl: '',
    gender: '',
  }), []);
  const [profile, setProfile] = useState(initialProfile);
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState('');

  // 本地暂存头像和背景文件及预览
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [backgroundPreview, setBackgroundPreview] = useState('');

  // 修改密码相关状态
  const [pwdData, setPwdData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // userId & token（可由外部传入 viewUserId，用于查看别人）
  const { user, isLoggedIn } = useAuthState();
  const rawUserId = viewUserId != null ? String(viewUserId) : user?.id || '';
  const userId = rawUserId && /^\d+$/.test(rawUserId) ? Number(rawUserId) : null;

  // 查看别人主页：组件挂载/切换用户时直接拉取其资料用于展示（背景、头像、昵称等）
  useEffect(() => {
    if (!userId || !hideEditPanel) return;
    httpClient.get(`/user/profile/${userId}`)
      .then(res => {
        if (res?.data?.code === 200 && res.data.data) setProfile(res.data.data);
      })
      .catch(() => {});
  }, [userId, hideEditPanel]);

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

  const handlePwdChange = async (e) => {
    e.preventDefault();
    if (!pwdData.oldPassword || !pwdData.newPassword) {
      setPwdMsg('请输入旧密码和新密码');
      return;
    }
    if (pwdData.newPassword !== pwdData.confirmPassword) {
      setPwdMsg('两次输入的新密码不一致');
      return;
    }
    // 简单的正则校验，与后端保持一致
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,12}$/.test(pwdData.newPassword)) {
      setPwdMsg('密码必须为8-12位，包含至少一个字母和一个数字');
      return;
    }

    setPwdLoading(true);
    setPwdMsg('');
    try {
      const res = await changePassword({
        oldPassword: pwdData.oldPassword,
        newPassword: pwdData.newPassword
      });
      if (res && res.code === 200) {
        setPwdMsg('密码修改成功');
        setPwdData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPwdMsg(res?.msg || res?.message || '密码修改失败');
      }
    } catch (err) {
      console.error('修改密码异常:', err);
      setPwdMsg(err?.response?.data?.msg || '修改密码异常');
    } finally {
      setPwdLoading(false);
    }
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

      // 3) 最后保存 profile（直接用合并出的 newProfile，保证包含刚拿到的路径）
      setEditMsg('正在保存信息...');
      const newProfile = { ...profile, avatarUrl, backgroundUrl };
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
            >
              <div className={`profilepanel-content${isActive ? ' profilepanel-content-active' : ' profilepanel-content-collapsed'}`}>
                {profile.backgroundUrl && (
                  /\.(mp4|webm)$/i.test(profile.backgroundUrl)
                    ? (
                      <video
                        src={resolveUrl(profile.backgroundUrl)}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="profilepanel-bg-video"
                        style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
                      />
                    ) : (
                      <img
                        src={resolveUrl(profile.backgroundUrl)}
                        alt="背景"
                        className="profilepanel-bg-img"
                        style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
                      />
                    )
                )}
                <div className="profilepanel-empty-panel" style={{ position: 'relative', zIndex: 1 }} />
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
                  `profilepanel-content profilepanel-scroll-content${
                    isActive ? ' profilepanel-scroll-active' : ' profilepanel-scroll-collapsed'
                  } profilepanel-scroll-${direction}`
                }
              >
                {isActive ? (
                  <div className="profilepanel-useredit-panel">
                    <h4>编辑个人信息</h4>
                    {editLoading ? <div>加载中...</div> : (
                      <form
                        className="profilepanel-useredit-form"
                        onSubmit={e => { e.preventDefault(); handleProfileSave(); }}
                      >
                        <div className="form-group">
                          <label>昵称：</label>
                          <input name="nickname" value={profile.nickname || ''} onChange={handleProfileChange} />
                        </div>
                        <div className="form-group">
                          <label>头像：</label>
                          <input type="file" accept="image/*,image/gif" onChange={handleAvatarSelect} style={{ marginTop: 4 }} />
                          {(avatarPreview || profile.avatarUrl) && (
                            <div className="profilepanel-avatar-preview">
                              <img
                                src={avatarPreview || resolveUrl(profile.avatarUrl)}
                                alt="头像预览"
                                className="profilepanel-avatar-img"
                              />
                            </div>
                          )}
                        </div>
                        <div className="form-group">
                          <label>背景：</label>
                          <input type="file" accept="image/*,image/gif,video/mp4,video/webm" onChange={handleBackgroundSelect} style={{ marginTop: 4 }} />
                          {(backgroundPreview || profile.backgroundUrl) && (
                            <div className="profilepanel-bg-preview">
                              {(() => {
                                const url = backgroundPreview || profile.backgroundUrl;
                                if (/\.(mp4|webm)$/i.test(url)) {
                                  return <video src={url} controls className="profilepanel-bg-video" />;
                                } else {
                                  return <img src={url} alt="背景预览" className="profilepanel-bg-img" />;
                                }
                              })()}
                            </div>
                          )}
                        </div>
                        <div className="form-group">
                          <label>性别：</label>
                          <select name="gender" value={profile.gender || ''} onChange={handleProfileChange}>
                            <option value="保密">保密</option>
                            <option value="男">男</option>
                            <option value="女">女</option>
                          </select>
                        </div>
                        <button type="submit" disabled={editLoading}>保存资料</button>
                        {editMsg && <div className="form-msg">{editMsg}</div>}
                      </form>
                    )}

                    <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid rgba(255,255,255,0.2)' }} />
                    
                    <h4>修改密码</h4>
                    <form className="profilepanel-useredit-form" onSubmit={handlePwdChange}>
                      <div className="form-group">
                        <label>旧密码：</label>
                        <input 
                          type="password" 
                          value={pwdData.oldPassword} 
                          onChange={e => setPwdData({...pwdData, oldPassword: e.target.value})} 
                          placeholder="请输入旧密码"
                        />
                      </div>
                      <div className="form-group">
                        <label>新密码：</label>
                        <input 
                          type="password" 
                          value={pwdData.newPassword} 
                          onChange={e => setPwdData({...pwdData, newPassword: e.target.value})} 
                          placeholder="8-12位，含字母和数字"
                        />
                      </div>
                      <div className="form-group">
                        <label>确认新密码：</label>
                        <input 
                          type="password" 
                          value={pwdData.confirmPassword} 
                          onChange={e => setPwdData({...pwdData, confirmPassword: e.target.value})} 
                          placeholder="再次输入新密码"
                        />
                      </div>
                      <button type="submit" disabled={pwdLoading}>修改密码</button>
                      {pwdMsg && <div className="form-msg">{pwdMsg}</div>}
                    </form>
                  </div>
                ) : <div className="profilepanel-empty-panel" />}
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
                `profilepanel-content profilepanel-scroll-content${
                  isActive ? ' profilepanel-scroll-active' : ' profilepanel-scroll-collapsed'
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
