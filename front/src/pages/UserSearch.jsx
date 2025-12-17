import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import FollowButton from '@components/user/FollowButton';
import FriendRequestButton from '@components/user/FriendRequestButton';
import '@styles/user/UserSearch.css';
import { searchUsers } from '@utils/api/userService';
import { useAuthState } from '@hooks/useAuthState';
import { fetchFriendIds, fetchFollowingIds } from '@utils/api/friendService';
import resolveUrl from '@utils/resolveUrl';
import { getDefaultAvatar } from '@utils/avatarUtils';

export default function UserSearch({ embedded = false, externalKeyword = '', externalMode = 'nickname', searchTrigger = 0 }) {
  const [mode, setMode] = useState('nickname'); // 默认优先按昵称搜索
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [friendIds, setFriendIds] = useState(new Set());
  const { user } = useAuthState();
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const userId = user?.id ? String(user.id) : null;

  // Sync with external props if embedded
  React.useEffect(() => {
    if (embedded) {
      setKeyword(externalKeyword);
      setMode(externalMode);
    }
  }, [embedded, externalKeyword, externalMode]);

  // Trigger search from parent
  React.useEffect(() => {
    if (embedded && searchTrigger > 0) {
      doSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTrigger]);

  // 简单：每次搜索后顺便刷新一次关系集合
  const refreshRelations = async () => {
    if (!userId || !token) return;
    try {
      const [followingJson, friendsJson] = await Promise.all([
        fetchFollowingIds().catch(() => null),
        fetchFriendIds().catch(() => null),
      ]);
      const following = Array.isArray(followingJson?.data) ? followingJson.data : [];
      const friends = Array.isArray(friendsJson?.data) ? friendsJson.data : [];
      setFollowingIds(new Set(following.map(n => Number(n))));
      setFriendIds(new Set(friends.map(n => Number(n))));
    } catch {
      // 忽略关系刷新失败
    }
  };

  const doSearch = async () => {
    // Allow empty keyword check to be handled by UI or allow empty search if API supports it (usually not)
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const j = await searchUsers({ [mode]: keyword.trim() });
      if (j && j.code === 200 && j.data) {
        setResults(j.data.list || []);
        setError(null);
        // 搜索成功后刷新一次当前用户的关注/好友关系
        refreshRelations();
      } else {
        setResults([]);
        setError(j?.message || '搜索失败');
      }
    } catch {
      setResults([]);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={embedded ? "user-search-embedded" : "user-search-page"}>
      <div className={embedded ? "user-search-container-embedded" : "user-search-container"}>
        {!embedded && (
          <div className="user-search-controls">
            <select value={mode} onChange={e => setMode(e.target.value)} className="search-select">
              <option value="username">按用户名</option>
              <option value="nickname">按昵称</option>
            </select>
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder={mode === 'username' ? '输入用户名' : '输入昵称'}
              className="search-input"
            />
            <button onClick={doSearch} disabled={loading} className="search-btn">
              {loading ? '搜索中...' : '搜索'}
            </button>
          </div>
        )}
        <ul className="user-search-results">
          {error ? (
            <li className="empty" style={{ color: 'red' }}>{error}</li>
          ) : results.length === 0 ? (
            <li className="empty">没有找到用户</li>
          ) : (
            results.map(u => {
              const avatar = resolveUrl(u.avatarUrl || '') || getDefaultAvatar(u.id);
              return (
                <li key={u.id} className="user-item">
                  <img
                    src={avatar}
                    alt={u.nickname || u.username}
                    title={u.nickname || u.username}
                    className="user-avatar"
                    onError={e => { e.currentTarget.src = getDefaultAvatar(u.id); }}
                  />
                  <div className="user-info">
                    <div className="user-nick">{u.nickname || u.username}</div>
                    <div className="user-username">@{u.username}</div>
                  </div>
                  <div className="user-actions">
                    {userId && String(u.id) !== String(userId) && (
                      <>
                        <FriendRequestButton
                          targetId={u.id}
                          initialFriend={friendIds.has(Number(u.id))}
                        />
                        <FollowButton
                          targetId={u.id}
                          initialFollowing={followingIds.has(Number(u.id))}
                        />
                      </>
                    )}
                    <Link to={`/selfspace?userId=${u.id}`} className="btn outline">查看</Link>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
