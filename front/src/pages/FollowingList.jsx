import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '@styles/message/MessageList.css';
import '@styles/pages/FollowingList.css';
import { fetchFollowing } from '@utils/api/friendService';
import { unfollow } from '@utils/api/followService';
import { useAuthState } from '@hooks/useAuthState';
import resolveUrl from '@utils/resolveUrl';
import { getDefaultAvatar } from '@utils/avatarUtils';

export default function FollowingList() {
  const [list, setList] = useState([]);
  const [error, setError] = useState(null);
  const { user } = useAuthState();
  const navigate = useNavigate();

  const handleUnfollow = async (targetId) => {
    try {
      const j = await unfollow(targetId, user?.id ? Number(user.id) : undefined);
      const ok = j && (j.code === 200 || j.status === 200);
      if (ok) {
        setList(prev => prev.filter(u => String(u.id) !== String(targetId)));
      } else {
        alert((j && (j.message || j.msg)) || '取消关注失败');
      }
    } catch (e) {
      console.error(e);
      alert('网络错误');
    }
  };

  // 新增：进入会话后自动刷新一次，确保布局正常
  const gotoConversationWithRefresh = (id) => {
    if (!id) return;
    navigate(`/conversation/${id}`);
    setTimeout(() => {
      try { window.location.reload(); } catch (err) {
        console.error('[FollowingList reload failed]', err);
      }
    }, 0);
  };

  useEffect(() => {
    const loadFollowing = async () => {
      try {
        const j = await fetchFollowing();
        if (j && j.code === 200) {
          setList(j.data?.list || j.data || []);
        } else {
          setError(j && (j.message || j.msg) ? (j.message || j.msg) : '获取失败');
        }
      } catch (e) {
        setError('网络错误');
        console.error(e);
      }
    };
    loadFollowing();
  }, []);

  return (
    <>
      <div className="message-list-container">
        <h2 className="message-list-title">我的关注</h2>
        {error ? (
          <div className="message-list-empty error-text">{error}</div>
        ) : list.length === 0 ? (
          <div className="message-list-empty">暂无关注</div>
        ) : (
          <ul className="message-list-ul">
            {list.map(u => (
              <li key={u.id} className="message-list-item">
                <Link to={`/selfspace?userId=${u.id}`} title="查看主页" className="avatar-link">
                  <img
                    src={resolveUrl(u.avatarUrl || '') || getDefaultAvatar(u.id)}
                    alt="avatar"
                    className="message-list-avatar clickable"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = getDefaultAvatar(u.id);
                    }}
                  />
                </Link>
                <div className="user-info-container">
                  <div>
                    <div className="message-list-nickname">{u.nickname || u.username}</div>
                    <div className="user-bio">{u.bio || ''}</div>
                  </div>
                  <div className="action-buttons">
                    <button
                      type="button"
                      className="message-list-linkbtn unfollow-btn"
                      onClick={() => handleUnfollow(u.id)}
                    >
                      取消关注
                    </button>
                    {/* 原 Link 改为按钮，点击后跳转并刷新一次 */}
                    <button
                      type="button"
                      className="message-list-linkbtn"
                      onClick={() => gotoConversationWithRefresh(u.id)}
                    >
                      私信
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
