import React, { useState, useEffect } from 'react';
import { useAuthState } from '@hooks/useAuthState';
import { unfollow } from '@utils/api/followService';
import { isFriend as fetchIsFriend, sendFriendRequest } from '@utils/api/friendService';

export default function FriendRequestButton({ targetId, onSent, initialFriend = false }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [isFriendFlag, setIsFriendFlag] = useState(initialFriend);
  const { user, isLoggedIn } = useAuthState();

  useEffect(() => { setIsFriendFlag(!!initialFriend); }, [initialFriend]);

  // 若未能从外部判定好友，调用“是否好友”接口兜底（后端以好友申请机制为准）
  useEffect(() => {
    if (initialFriend) return;
    fetchIsFriend(targetId)
      .then(j => { if (j && (j.code === 200 || j.status === 200)) setIsFriendFlag(!!j.data); })
      .catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, user?.id]);

  const send = async () => {
    if (!isLoggedIn || !user?.id) {
      alert('请先登录');
      return;
    }
    if (!isFriendFlag && sent) return; // 申请中勿重复

    setLoading(true);
    try {
      if (isFriendFlag) {
        // 取消我对TA的关注 => 破坏互关，即“删除好友”
        const j = await unfollow(targetId);
        if (j && (j.code === 200 || j.status === 200)) {
          setIsFriendFlag(false); setSent(false);
        } else {
          alert((j && (j.message || j.msg)) || '删除失败');
        }
      } else {
        // 发送好友申请
        const j = await sendFriendRequest(targetId, '');
        if (j && (j.code === 200 || j.status === 200)) {
          setSent(true);
          if (onSent) onSent(j.data);
        } else {
          const msg = j && (j.message || j.msg) ? (j.message || j.msg) : '发送失败';
          alert(msg);
          console.warn('FriendRequest failed', j);
        }
      }
    } catch (e) {
      console.error(e);
      alert('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`friend-request-btn ${sent ? 'sent' : ''}`}
      onClick={send}
      disabled={loading || (!isFriendFlag && sent)}
      title={isFriendFlag ? '删除与该用户的好友关系' : ''}
    >
      {isFriendFlag ? (loading ? '删除中...' : '删除好友') : (sent ? '已申请' : (loading ? '发送中...' : '加好友'))}
    </button>
  );
}
