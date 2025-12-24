import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '@styles/selfspace/SelfSpace.css';
import SelfspaceProfileAccordion from '@components/selfspace/SelfspaceProfileAccordion/SelfspaceProfileAccordion.jsx';
import ArticleFolderTree from '@components/selfspace/ArticleFolderTree.jsx';
import { useAuthState } from '@hooks/useAuthState';
import resolveUrl from '@utils/resolveUrl';
import { getDefaultAvatar, isValidAvatar } from '@utils/avatarUtils';
import httpClient from '@utils/api/httpClient';
import { fetchPosts } from '@utils/api/postService';

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
    httpClient.get(`/user/profile/${effectiveUserId}`)
      .then(res => {
        const j = res?.data;
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

    fetchPosts({ page: fetchPage, size: fetchSize, userId: effectiveUserId, currentUserId })
      .then(async j => {
        if (!mounted) return;
        if (j && (j.code === 200 || j.status === 200)) {
          let list = j.data && j.data.list ? j.data.list : (j.data || []);
          if (!Array.isArray(list) && Array.isArray(j.data)) list = j.data;

          // Filter by user ID (handle userId, authorId, uid and type mismatch)
          list = list.filter(p => {
            const pUserId = p.userId || p.authorId || p.uid;
            return String(pUserId) === String(effectiveUserId);
          });

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
      <div className="selfspace-page anime-neon-bg" data-page="selfspace">
        <aside className="selfspace-left-panel" aria-label="个人空间侧边栏">
          <div className="selfspace-left-panel-inner">
            <SelfspaceProfileAccordion
              panelWidth="100%"
              panelHeight="100%"
              viewUserId={effectiveUserId}
              hideEditPanel={!isOwner}
            />
          </div>
        </aside>

        <main className="selfspace-right-panel" aria-label="个人空间内容区">
          {/* 文章目录树 (包含文章卡片) */}
          <div className="selfspace-tree-full" style={{ width: '100%' }}>
            <ArticleFolderTree
              posts={allPosts}
              onFilterChange={() => { }} // No longer needed for filtering right side
            />
          </div>
        </main>
      </div>
    </>
  );
}
