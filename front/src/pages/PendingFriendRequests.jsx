import React, { useEffect, useState } from 'react';
import '@styles/message/MessageList.css';
import '@styles/Notification/PendingFriendRequests.css';
import resolveUrl from '@utils/resolveUrl';
import { fetchPendingFriendRequests, respondToFriendRequest } from '@utils/api/friendService';

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

    return (
        <div className="message-list-page pf-page">
            <div className="message-list-container pf-container">
                <h2 className="message-list-title pf-title">好友申请</h2>

                {error && <div className="message-list-empty pf-error">{error}</div>}

                {!error && requests.length === 0 && (
                    <div className="message-list-empty pf-empty">暂无待处理的好友申请</div>
                )}

                {!error && requests.length > 0 && (
                    <div className="pf-main">
                        <section className="pf-center" style={{ width: '100%' }}>
                            <ul className="message-list-ul pf-list">
                                {requests.map((req) => {
                                    const id = req.id || req.requestId;
                                    const sender = req.sender || {};
                                    const nickname = req.senderNickname || sender.nickname || sender.username || 'Unknown';
                                    const avatar = req.senderAvatarUrl || sender.avatarUrl || '/icons/message/admin.svg';
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
                                                    e.target.src = '/icons/message/admin.svg';
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
        </div>
    );
}
