import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '@styles/message/MessageList.css';
import '@styles/pages/FriendsList.css';
import { fetchFriendsList, deleteFriend } from '@utils/api/friendService';
import resolveUrl from '@utils/resolveUrl';
import { getDefaultAvatar } from '@utils/avatarUtils';

export default function FriendsList() {
  const [list, setList] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // 删除好友 = 调用新的 deleteFriend 接口（双向解除 + 通知）
  const handleRemoveFriend = async (targetId) => {
    try {
      const j = await deleteFriend(targetId);
      const ok = j && (j.code === 200 || j.status === 200);
      if (ok) {
        setList(prev => prev.filter(u => String(u.id) !== String(targetId)));
      } else {
        alert((j && (j.message || j.msg)) || '删除好友失败');
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
    // 让路由渲染完成后刷新
    setTimeout(() => {
      try { window.location.reload(); } catch (err) { void err; }
    }, 0);
  };

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const j = await fetchFriendsList();
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
    fetchFriends();
  }, []);

  return (
    <>
      <div className="message-list-container">
        <h2 className="message-list-title">我的好友</h2>
        {error ? (
          <div className="message-list-empty error-text">{error}</div>
        ) : list.length === 0 ? (
          <div className="message-list-empty">暂无好友</div>
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
                      className="message-list-linkbtn delete-friend-btn"
                      onClick={() => handleRemoveFriend(u.id)}
                    >
                      删除好友
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
