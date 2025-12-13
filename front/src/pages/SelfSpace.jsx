import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '@styles/selfspace/SelfSpace.css';
import SelfspaceProfileAccordion from '@components/selfspace/SelfspaceProfileAccordion/SelfspaceProfileAccordion.jsx';
import ArticleFolderTree from '@components/selfspace/ArticleFolderTree.jsx';
import { useAuthState } from '@hooks/useAuthState';
import resolveUrl from '@utils/resolveUrl';
import { getDefaultAvatar, isValidAvatar } from '@utils/avatarUtils';

// SelfSpace 页面：左侧 25vw 手风琴资料面板 + 右侧内容区域
export default function SelfSpace() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const urlUserId = params.get('userId');                 // 被查看用户ID（可能为空）
  // const urlCategory = params.get('category');             // URL中的分类参数 (已废弃)
  const { user } = useAuthState();
  const myId = user?.id ? String(user.id) : null;
  const isOwner = !urlUserId || String(urlUserId) === String(myId);
  const effectiveUserId = isOwner ? myId : urlUserId;     // 传给手风琴的实际 userId

  // 仅在“查看别人主页”时，拉取其资料用于上方信息条
  const [viewProfile, setViewProfile] = useState(null);
  useEffect(() => {
    if (!effectiveUserId || isOwner) { setViewProfile(null); return; }
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    fetch(`/api/user/profile/${effectiveUserId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => r.json())
      .then(j => {
        if (j && (j.code === 200 || j.status === 200)) setViewProfile(j.data || null);
      })
      .catch(() => { });
  }, [effectiveUserId, isOwner]);

  // 文章列表相关
  const [allPosts, setAllPosts] = useState([]); // 存储所有文章用于构建树
  const currentUserId = myId;

  useEffect(() => {
    let mounted = true;
    if (!effectiveUserId) { setAllPosts([]); return; }

    // 始终全量拉取该用户所有文章，前端分页
    const fetchSize = 10000;
    const fetchPage = 0;

    // 移除所有过滤条件，获取全量数据
    let url = `/api/blogpost?userId=${effectiveUserId}&page=${fetchPage}&size=${fetchSize}`;
    if (currentUserId) url += `&currentUserId=${currentUserId}`;

    fetch(url)
      .then(r => r.json())
      .then(async j => {
        if (!mounted) return;
        if (j && (j.code === 200 || j.status === 200)) {
          let list = j.data && j.data.list ? j.data.list : (j.data || []);
          if (!Array.isArray(list) && Array.isArray(j.data)) list = j.data;

          // 只保留当前用户的文章
          list = list.filter(p => String(p.userId) === String(effectiveUserId));
          
          // 存储全量数据
          setAllPosts(list);
        } else {
          setAllPosts([]);
        }
      })
      .catch(err => {
        console.error('[SelfSpace] 获取文章失败', err);
        if (mounted) { setAllPosts([]); }
      });

    return () => { mounted = false; };
  }, [effectiveUserId, currentUserId]); // 仅依赖用户ID，不依赖筛选条件

  return (
    <>
      <div className="selfspace-page" data-page="selfspace">
        <aside className="selfspace-left-panel" aria-label="个人空间侧边栏">
          <div className="selfspace-left-panel-inner">
            {/* 非本人时：在手风琴上方展示一个简介条 */}
            {!isOwner && viewProfile && (
              <div className="selfspace-user-brief">
                <img
                  className="selfspace-user-brief-avatar"
                  src={isValidAvatar(viewProfile.avatarUrl) ? resolveUrl(viewProfile.avatarUrl) : getDefaultAvatar(effectiveUserId)}
                  alt="avatar"
                  onError={e => { e.currentTarget.src = getDefaultAvatar(effectiveUserId); }}
                />
                <div className="selfspace-user-brief-info">
                  <div className="nick">{viewProfile.nickname || viewProfile.username || `用户${effectiveUserId}`}</div>
                  <div className="uname">@{viewProfile.username || ''}</div>
                </div>
              </div>
            )}
            <SelfspaceProfileAccordion
              panelWidth="100%"
              panelHeight="100%"
              viewUserId={effectiveUserId}
              hideEditPanel={!isOwner}
            />
          </div>
        </aside>

        <main className="selfspace-right-panel" aria-label="个人空间内容区">
          <div className="selfspace-articles-wrap">
            {/* 文章目录树 (包含文章卡片) */}
            <div className="selfspace-tree-full">
               <ArticleFolderTree 
                  posts={allPosts}
                  onFilterChange={() => {}} // No longer needed for filtering right side
                />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
