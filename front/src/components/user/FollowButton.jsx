import React, { useEffect, useState } from 'react';
import { useAuthState } from '@hooks/useAuthState';
import { follow, unfollow } from '@utils/api/followService';
import { isFriend } from '@utils/api/friendService';

export default function FollowButton({ targetId, initialFollowing = null, onChange }) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const { user, isLoggedIn } = useAuthState();

  useEffect(() => {
    if (initialFollowing == null && isLoggedIn) {
      // 轻量：若用户与目标是好友，则也视为关注状态为真（业务可选）
      // 否则可在页面层使用 /api/follow/following 分页来初始化状态
      (async () => {
        try {
          const r = await isFriend(targetId);
          if (r && r.code === 200) {
            setIsFollowing(Boolean(r.data));
          }
        } catch (e) { void e; }
      })();
    } else {
      setIsFollowing(initialFollowing);
    }
  }, [initialFollowing, isLoggedIn, targetId]);

  const toggle = async () => {
    if (!isLoggedIn || !user?.id) {
      alert('请先登录');
      return;
    }
    setLoading(true);
    try {
      const j = isFollowing ? await unfollow(targetId) : await follow(targetId);
      if (j && j.code === 200) {
        setIsFollowing(prev => !prev);
        if (onChange) onChange(!isFollowing);
      } else {
        const msg = j && (j.message || j.msg) ? (j.message || j.msg) : '操作失败';
        alert(msg);
        console.warn('Follow toggle failed', j);
      }
    } catch (e) {
      console.error(e);
      alert('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={toggle} disabled={loading} className="follow-btn">
      {isFollowing ? '取消关注' : '关注'}
    </button>
  );
}
