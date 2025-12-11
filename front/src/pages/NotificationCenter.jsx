import React, { useEffect, useState } from 'react';
import { notificationApi } from '../utils/api/notificationApi';
import { useNavigate } from 'react-router-dom';
import resolveUrl from '../utils/resolveUrl';
import '@styles/pages/NotificationCenter.css';

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadNotifications(0);
        markAllRead();
    }, []);

    const loadNotifications = async (pageNum) => {
        try {
            const res = await notificationApi.getNotifications(pageNum, 20);
            if (res.code === 200) {
                // Support both PageImpl (content) and PageResult (list)
                const newNotes = res.data.list || res.data.content || [];
                if (pageNum === 0) {
                    setNotifications(newNotes);
                } else {
                    setNotifications(prev => [...prev, ...newNotes]);
                }

                // Calculate hasMore
                let isLast = false;
                if (res.data.last !== undefined) {
                    isLast = res.data.last;
                } else if (res.data.total !== undefined) {
                    const { total, page, size } = res.data;
                    isLast = (page + 1) * size >= total;
                }
                setHasMore(!isLast);
            }
        } catch (error) {
            console.error("Failed to load notifications", error);
        } finally {
            setLoading(false);
        }
    };

    const markAllRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            // Update local storage count if needed
            const userId = localStorage.getItem('userId');
            if (userId) {
                localStorage.setItem(`notification_unread_count_${userId}`, '0');
            }
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadNotifications(nextPage);
    };

    const handleNotificationClick = (note) => {
        // Navigate based on type
        if (note.type === 'POST_LIKE' || note.type === 'POST_FAVORITE' || note.type === 'POST_COMMENT') {
            navigate(`/post/${note.referenceId}`);
        } else if (note.type === 'COMMENT_REPLY' || note.type === 'COMMENT_LIKE' || note.type === 'REPLY_LIKE') {
            navigate(`/post/${note.referenceId}`); // Ideally scroll to comment
        } else if (note.type === 'FRIEND_REQUEST') {
            navigate(`/friends/pending`);
        } else if (note.type === 'FOLLOW') {
            navigate(`/selfspace?userId=${note.senderId}`);
        }
    };

    const renderNotificationContent = (note) => {
        let iconSrc = '/site_assets/icons/message/notification.svg';
        let actionText = '';

        switch (note.type) {
            case 'POST_LIKE':
                iconSrc = '/site_assets/icons/message/like.svg';
                actionText = '赞了你的文章';
                break;
            case 'POST_FAVORITE':
                iconSrc = '/site_assets/icons/message/favorite.svg';
                actionText = '收藏了你的文章';
                break;
            case 'POST_COMMENT':
                iconSrc = '/site_assets/icons/message/comment.svg';
                actionText = '评论了你的文章';
                break;
            case 'COMMENT_REPLY':
                iconSrc = '/site_assets/icons/message/reply.svg';
                actionText = '回复了你的评论';
                break;
            case 'COMMENT_LIKE':
            case 'REPLY_LIKE':
                iconSrc = '/site_assets/icons/message/点赞.svg';
                actionText = '赞了你的评论';
                break;
            case 'FRIEND_REQUEST':
                iconSrc = '/site_assets/icons/message/加好友.svg';
                actionText = '请求添加你为好友';
                break;
            case 'FRIEND_REQUEST_ACCEPTED':
                iconSrc = '/site_assets/icons/message/接受.svg';
                actionText = '接受了你的好友请求';
                break;
            case 'FRIEND_REQUEST_REJECTED':
                iconSrc = '/site_assets/icons/message/拒绝.svg';
                actionText = '拒绝了你的好友请求';
                break;
            case 'FRIEND_DELETE':
                iconSrc = '/site_assets/icons/message/解除好友.svg';
                actionText = '解除了好友关系';
                break;
            case 'FOLLOW':
                iconSrc = '/site_assets/icons/message/关注.svg';
                actionText = '关注了你';
                break;
            case 'UNFOLLOW':
                iconSrc = '/site_assets/icons/message/取关.svg';
                actionText = '取消关注了你';
                break;
            default:
                iconSrc = '/site_assets/icons/message/通知.svg';
                actionText = '新通知';
        }

        return (
            <div className="notification-item" key={note.requestId || note.id} onClick={() => handleNotificationClick(note)}>
                <div className="notification-avatar">
                    <img src={resolveUrl(note.senderAvatarUrl) || '/imgs/loginandwelcomepanel/1.png'} alt="avatar" onError={(e) => { e.target.onerror = null; e.target.src = '/imgs/loginandwelcomepanel/1.png' }} />
                </div>
                <div className="notification-content">
                    <div className="notification-header">
                        <span className="notification-sender">{note.senderNickname || '未知用户'}</span>
                        <span className="notification-action">{actionText}</span>
                        <span className="notification-time">{new Date(note.createdAt).toLocaleString('zh-CN', { hour12: false })}</span>
                    </div>
                    {note.message && <div className="notification-message">{note.message}</div>}
                </div>
                <div className="notification-icon">
                    <img src={iconSrc} alt="icon" style={{ width: 24, height: 24 }} />
                </div>
            </div>
        );
    };

    return (
        <div className="notification-center-container">
            <div className="notification-center-header">
                <h2>通知中心</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => navigate('/friends/pending')} className="mark-read-btn" style={{ background: '#e6f7ff', color: '#1890ff' }}>
                        好友申请
                    </button>
                    <button onClick={markAllRead} className="mark-read-btn">全部已读</button>
                </div>
            </div>
            <div className="notification-list">
                {notifications.length === 0 && !loading ? (
                    <div className="no-notifications">
                        <div className="no-notifications-icon">📭</div>
                        <div>暂无通知</div>
                    </div>
                ) : (
                    notifications.map(renderNotificationContent)
                )}
            </div>
            {hasMore && notifications.length > 0 && (
                <button className="load-more-btn" onClick={handleLoadMore} disabled={loading}>
                    {loading ? '加载中...' : '加载更多'}
                </button>
            )}
        </div>
    );
}
