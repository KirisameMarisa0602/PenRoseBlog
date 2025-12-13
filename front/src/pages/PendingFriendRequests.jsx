import React, { useEffect, useState } from 'react';
import '@styles/message/MessageList.css';
import '@styles/Notification/PendingFriendRequests.css';
import resolveUrl from '@utils/resolveUrl';
import { fetchPendingFriendRequests, respondToFriendRequest } from '@utils/api/friendService';
import { getDefaultAvatar } from '@utils/avatarUtils';

export default function PendingFriendRequests() {
    const [requests, setRequests] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const userId = typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null;

    useEffect(() => {
        if (!userId || !token) {
            setError('未登录');
            setLoading(false);
            return;
        }
        loadRequests();
    }, [userId, token]);

    const loadRequests = async () => {
        try {
            setLoading(true);
            const res = await fetchPendingFriendRequests();
            if (res && res.code === 200) {
                const list = res.data?.list || res.data || [];
                setRequests(Array.isArray(list) ? list : []);
                setError(null);
            } else {
                setError((res && (res.message || res.msg)) || '获取好友请求失败');
            }
        } catch (err) {
            console.error(err);
            setError('网络错误');
        } finally {
            setLoading(false);
        }
    };

    const respond = async (requestId, accept) => {
        if (!requestId) return;
        try {
            const res = await respondToFriendRequest(requestId, accept);
            if (res && res.code === 200) {
                // Remove from list
                setRequests(prev => prev.filter(r => (r.id || r.requestId) !== requestId));
            } else {
                alert((res && (res.message || res.msg)) || '处理失败');
            }
        } catch (e) {
            console.error(e);
            alert('网络错误');
        }
    };

    if (loading) return <div className="pf-loading">加载中...</div>;

    if (!error && requests.length === 0) {
        return null;
    }

    return (
        <div className="pf-embedded-list" style={{ marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#333' }}>待处理请求</h3>

            {error && <div className="message-list-empty pf-error">{error}</div>}

            {!error && requests.length > 0 && (
                <div className="pf-main">
                    <section className="pf-center" style={{ width: '100%', minHeight: 'auto' }}>
                        <ul className="message-list-ul pf-list">
                                {requests.map((req) => {
                                    const id = req.id || req.requestId;
                                    const sender = req.sender || {};
                                    const senderId = req.senderId || sender.id;
                                    const nickname = req.senderNickname || sender.nickname || sender.username || 'Unknown';
                                    const avatar = req.senderAvatarUrl || sender.avatarUrl || getDefaultAvatar(senderId);
                                    const message = req.message || '请求添加好友';
                                    const time = req.createdAt ? new Date(req.createdAt).toLocaleString() : '';

                                    return (
                                        <li key={id} className="message-list-item pf-item">
                                            <img
                                                src={resolveUrl(avatar)}
                                                alt="avatar"
                                                className="message-list-avatar pf-avatar"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = getDefaultAvatar(senderId);
                                                }}
                                            />
                                            <div className="pf-body">
                                                <div className="message-list-nickname pf-nick">{nickname}</div>
                                                <div className="pf-message">{message}</div>
                                                <div className="pf-created">{time}</div>
                                            </div>
                                            <div className="pf-actions">
                                                <button
                                                    className="pf-btn pf-accept"
                                                    onClick={() => respond(id, true)}
                                                >
                                                    接受
                                                </button>
                                                <button
                                                    className="pf-btn pf-reject"
                                                    onClick={() => respond(id, false)}
                                                >
                                                    拒绝
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    </div>
                )}
        </div>
    );
}
