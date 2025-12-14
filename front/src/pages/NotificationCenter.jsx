import React, { useEffect, useState } from 'react';
import { notificationApi } from '../utils/api/notificationApi';
import { getComment, getReply } from '../utils/api/commentService';
import { useNavigate } from 'react-router-dom';
import resolveUrl from '../utils/resolveUrl';
import { getDefaultAvatar } from '../utils/avatarUtils';
import '@styles/pages/NotificationCenter.css';
import MessageList from './MessageList';
import PendingFriendRequests from './PendingFriendRequests';
import NeonBackground from '@components/common/NeonBackground';
import '@styles/common/AnimeBackground.css';

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [activeTab, setActiveTab] = useState('ALL');
    const [unreadStatus, setUnreadStatus] = useState({
        ALL: false,
        LIKES: false,
        COMMENTS: false,
        FOLLOW: false,
        MESSAGES: false,
        REQUESTS: false
    });
    const navigate = useNavigate();

    const getTypes = (tab) => {
        switch (tab) {
            case 'LIKES': return ['POST_LIKE', 'POST_FAVORITE', 'COMMENT_LIKE', 'REPLY_LIKE'];
            case 'COMMENTS': return ['POST_COMMENT', 'COMMENT_REPLY'];
            case 'FOLLOW': return ['FOLLOW', 'UNFOLLOW'];
            case 'REQUESTS': return ['FRIEND_REQUEST', 'FRIEND_REQUEST_ACCEPTED', 'FRIEND_REQUEST_REJECTED'];
            default: return [];
        }
    };

    useEffect(() => {
        // Check unread status for tabs using the new stats API
        const checkUnread = async () => {
            try {
                const res = await notificationApi.getUnreadStats();
                if (res && res.code === 200 && res.data) {
                    const stats = res.data;
                    setUnreadStatus(prev => ({
                        ...prev,
                        ALL: (stats.ALL || 0) > 0,
                        LIKES: (stats.LIKES || 0) > 0,
                        COMMENTS: (stats.COMMENTS || 0) > 0,
                        FOLLOW: (stats.FOLLOW || 0) > 0,
                        REQUESTS: (stats.REQUESTS || 0) > 0
                        // MESSAGES is handled by global context or separate logic usually
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch unread stats", err);
            }
        };
        checkUnread();
    }, [activeTab]); // Refresh when tab changes to ensure sync

    useEffect(() => {
        if (activeTab === 'MESSAGES') {
            return;
        }
        setNotifications([]);
        setPage(0);
        setHasMore(true);
        loadNotifications(0, activeTab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const loadNotifications = async (pageNum, tab) => {
        if (loading) return;
        setLoading(true);
        try {
            const types = getTypes(tab);
            const res = await notificationApi.getNotifications(pageNum, 20, types);
            if (res.code === 200) {
                const newNotes = res.data.list || res.data.content || [];
                if (pageNum === 0) {
                    setNotifications(newNotes);
                } else {
                    setNotifications(prev => [...prev, ...newNotes]);
                }

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
            const types = activeTab === 'ALL' ? [] : getTypes(activeTab);
            await notificationApi.markAllAsRead(types);
            // Optimistic update: mark all loaded notifications as read
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));

            // Clear unread badges for current tab
            setUnreadStatus(prev => {
                if (activeTab === 'ALL') {
                    return {
                        ALL: false,
                        LIKES: false,
                        COMMENTS: false,
                        FOLLOW: false,
                        MESSAGES: false,
                        REQUESTS: false
                    };
                }
                return { ...prev, [activeTab]: false };
            });

            const userId = localStorage.getItem('userId');
            if (userId) {
                localStorage.setItem(`notification_unread_count_${userId}`, '0');
                window.dispatchEvent(new Event('pm-unread-refresh'));
            }

            // Force reload stats to ensure sync
            setTimeout(() => {
                const checkUnread = async () => {
                    try {
                        const res = await notificationApi.getUnreadStats();
                        if (res && res.code === 200 && res.data) {
                            const stats = res.data;
                            setUnreadStatus(prev => ({
                                ...prev,
                                ALL: (stats.ALL || 0) > 0,
                                LIKES: (stats.LIKES || 0) > 0,
                                COMMENTS: (stats.COMMENTS || 0) > 0,
                                FOLLOW: (stats.FOLLOW || 0) > 0,
                                REQUESTS: (stats.REQUESTS || 0) > 0
                            }));
                        }
                    } catch (err) { console.error(err); }
                };
                checkUnread();
            }, 500);

        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadNotifications(nextPage, activeTab);
    };

    const handleNotificationClick = async (note) => {
        // Mark as read if not already
        if (!note.read) {
            try {
                await notificationApi.markAsRead(note.requestId);
                setNotifications(prev => prev.map(n => n.requestId === note.requestId ? { ...n, read: true } : n));
                // Trigger global unread count refresh
                window.dispatchEvent(new Event('pm-unread-refresh'));
            } catch (e) {
                console.error("Failed to mark notification as read", e);
            }
        }

        let targetPath = null;

        if (note.type === 'POST_LIKE' || note.type === 'POST_FAVORITE') {
            if (note.referenceId) targetPath = `/post/${note.referenceId}`;
        } else if (note.type === 'POST_COMMENT') {
            if (note.referenceId) {
                targetPath = `/post/${note.referenceId}?commentId=${note.referenceExtraId}`;
            }
        } else if (note.type === 'COMMENT_LIKE') {
            if (note.referenceId) {
                targetPath = `/post/${note.referenceId}?commentId=${note.referenceExtraId}`;
            } else if (note.referenceExtraId) {
                // Fallback
                try {
                    const res = await getComment(note.referenceExtraId);
                    if (res && res.code === 200 && res.data) {
                        targetPath = `/post/${res.data.blogPostId}?commentId=${note.referenceExtraId}`;
                    }
                } catch (e) { console.error(e); }
            }
        } else if (note.type === 'COMMENT_REPLY' || note.type === 'REPLY_LIKE') {
            if (note.referenceId) {
                targetPath = `/post/${note.referenceId}?replyId=${note.referenceExtraId}`;
            } else if (note.referenceExtraId) {
                // Fallback
                try {
                    const res = await getReply(note.referenceExtraId);
                    if (res && res.code === 200 && res.data) {
                        const reply = res.data;
                        const commentRes = await getComment(reply.commentId);
                        if (commentRes && commentRes.code === 200 && commentRes.data) {
                            targetPath = `/post/${commentRes.data.blogPostId}?replyId=${note.referenceExtraId}`;
                        }
                    }
                } catch (e) { console.error(e); }
            }
        } else if (note.type === 'FRIEND_REQUEST') {
            // Already in REQUESTS tab or will stay there
        } else if (note.type === 'FOLLOW') {
            targetPath = `/selfspace?userId=${note.senderId}`;
        }

        if (targetPath) {
            navigate(targetPath);
        }
    };

    const renderNotificationItem = (note) => {
        let iconSrc = resolveUrl('/icons/message/notification.svg');
        let actionText = '';

        switch (note.type) {
            case 'POST_LIKE':
                iconSrc = resolveUrl('/icons/message/like.svg');
                actionText = '赞了你的文章';
                break;
            case 'POST_FAVORITE':
                iconSrc = resolveUrl('/icons/message/favorite.svg');
                actionText = '收藏了你的文章';
                break;
            case 'POST_COMMENT':
                iconSrc = resolveUrl('/icons/message/comment.svg');
                actionText = '评论了你的文章';
                break;
            case 'COMMENT_REPLY':
                iconSrc = resolveUrl('/icons/message/reply.svg');
                actionText = '回复了你的评论';
                break;
            case 'COMMENT_LIKE':
            case 'REPLY_LIKE':
                iconSrc = resolveUrl('/icons/message/点赞.svg');
                actionText = '赞了你的评论';
                break;
            case 'FRIEND_REQUEST':
                iconSrc = resolveUrl('/icons/message/加好友.svg');
                actionText = '请求添加你为好友';
                break;
            case 'FRIEND_REQUEST_ACCEPTED':
                iconSrc = resolveUrl('/icons/message/接受.svg');
                actionText = '接受了你的好友请求';
                break;
            case 'FRIEND_REQUEST_REJECTED':
                iconSrc = resolveUrl('/icons/message/拒绝.svg');
                actionText = '拒绝了你的好友请求';
                break;
            case 'FRIEND_DELETE':
                iconSrc = resolveUrl('/icons/message/解除好友.svg');
                actionText = '解除了好友关系';
                break;
            case 'FOLLOW':
                iconSrc = resolveUrl('/icons/message/关注.svg');
                actionText = '关注了你';
                break;
            case 'UNFOLLOW':
                iconSrc = resolveUrl('/icons/message/关注.svg');
                actionText = '取消关注了你';
                break;
            default:
                actionText = '新通知';
        }

        const avatarUrl = note.senderAvatarUrl
            ? resolveUrl(note.senderAvatarUrl)
            : getDefaultAvatar(note.senderId);

        return (
            <div className={`notification-item ${!note.read ? 'unread' : ''}`} key={note.requestId || note.id} onClick={() => handleNotificationClick(note)}>
                <div className="notification-avatar">
                    <img
                        src={avatarUrl}
                        alt="avatar"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = getDefaultAvatar(note.senderId);
                        }}
                    />
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
                    <img src={iconSrc} alt="icon" style={{ width: 24, height: 24 }} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
            </div>
        );
    };

    return (
        <div className="notification-layout anime-neon-bg">
            <NeonBackground />
            <div className="notification-sidebar">
                <div className="sidebar-title" style={{ padding: '20px 24px', fontSize: '1.2rem', fontWeight: 'bold' }}>通知中心</div>
                <div className={`notification-sidebar-item ${activeTab === 'ALL' ? 'active' : ''}`} onClick={() => setActiveTab('ALL')}>
                    全部通知
                    {unreadStatus.ALL && <span className="sidebar-badge-dot"></span>}
                </div>
                <div className={`notification-sidebar-item ${activeTab === 'LIKES' ? 'active' : ''}`} onClick={() => setActiveTab('LIKES')}>
                    赞与收藏
                    {unreadStatus.LIKES && <span className="sidebar-badge-dot"></span>}
                </div>
                <div className={`notification-sidebar-item ${activeTab === 'COMMENTS' ? 'active' : ''}`} onClick={() => setActiveTab('COMMENTS')}>
                    评论与回复
                    {unreadStatus.COMMENTS && <span className="sidebar-badge-dot"></span>}
                </div>
                <div className={`notification-sidebar-item ${activeTab === 'FOLLOW' ? 'active' : ''}`} onClick={() => setActiveTab('FOLLOW')}>
                    关注通知
                    {unreadStatus.FOLLOW && <span className="sidebar-badge-dot"></span>}
                </div>
                <div className="notification-sidebar-item" onClick={() => navigate('/messages')}>
                    好友消息
                    {unreadStatus.MESSAGES && <span className="sidebar-badge-dot"></span>}
                </div>
                <div className={`notification-sidebar-item ${activeTab === 'REQUESTS' ? 'active' : ''}`} onClick={() => setActiveTab('REQUESTS')}>
                    好友申请
                    {unreadStatus.REQUESTS && <span className="sidebar-badge-dot"></span>}
                </div>
            </div>

            <div className="notification-content-wrapper">
                <div className="notification-center-container">
                    {activeTab === 'REQUESTS' && <PendingFriendRequests />}

                    <div className="notification-center-header">
                        <h2>
                            {activeTab === 'ALL' && '全部通知'}
                            {activeTab === 'LIKES' && '赞与收藏'}
                            {activeTab === 'COMMENTS' && '评论与回复'}
                            {activeTab === 'FOLLOW' && '关注通知'}
                            {activeTab === 'REQUESTS' && '申请记录'}
                        </h2>
                        <button className="mark-read-btn" onClick={markAllRead}>
                            {/* <img src={resolveUrl('/icons/message/read.svg')} alt="" style={{ width: 16, height: 16 }} onError={(e) => { e.target.style.display = 'none'; }} /> */}
                            全部已读
                        </button>
                    </div>

                    <div className="notification-list">
                        {notifications.length === 0 && !loading ? (
                            <div className="no-notifications">
                                <img
                                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cpath fill='%23a0c4ff' d='M32 2C15.4 2 2 15.4 2 32s13.4 30 30 30 30-13.4 30-30S48.6 2 32 2zm0 56C17.6 58 6 46.4 6 32S17.6 6 32 6s26 11.6 26 26-11.6 26-26 26z'/%3E%3Cpath fill='%23ffadad' d='M44 24H20c-2.2 0-4 1.8-4 4v16c0 2.2 1.8 4 4 4h24c2.2 0 4-1.8 4-4V28c0-2.2-1.8-4-4-4zm0 20H20V28h24v16z'/%3E%3Cpath fill='%23bdb2ff' d='M32 38l-12-8h24l-12 8z'/%3E%3C/svg%3E"
                                    alt="暂无通知"
                                    style={{ width: 120, height: 120, opacity: 0.8, marginBottom: 16 }}
                                />
                                <div>暂无通知</div>
                            </div>
                        ) : (
                            notifications.map(renderNotificationItem)
                        )}
                    </div>
                    {hasMore && notifications.length > 0 && (
                        <button className="load-more-btn" onClick={handleLoadMore} disabled={loading}>
                            {loading ? '加载中...' : '加载更多'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
