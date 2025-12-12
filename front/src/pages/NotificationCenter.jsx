import React, { useEffect, useState } from 'react';
import { notificationApi } from '../utils/api/notificationApi';
import { useNavigate } from 'react-router-dom';
import resolveUrl from '../utils/resolveUrl';
import '@styles/pages/NotificationCenter.css';
import MessageList from './MessageList';
import PendingFriendRequests from './PendingFriendRequests';

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [activeTab, setActiveTab] = useState('ALL');
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
            await notificationApi.markAllAsRead();
            const userId = localStorage.getItem('userId');
            if (userId) {
                localStorage.setItem(`notification_unread_count_${userId}`, '0');
                window.dispatchEvent(new Event('pm-unread-refresh'));
            }
            if (activeTab !== 'MESSAGES') {
                setPage(0);
                loadNotifications(0, activeTab);
            }
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadNotifications(nextPage, activeTab);
    };

    const handleNotificationClick = (note) => {
        if (note.type === 'POST_LIKE' || note.type === 'POST_FAVORITE' || note.type === 'POST_COMMENT') {
            navigate(`/post/${note.referenceId}`);
        } else if (note.type === 'COMMENT_REPLY' || note.type === 'COMMENT_LIKE' || note.type === 'REPLY_LIKE') {
            navigate(`/post/${note.referenceId}`);
        } else if (note.type === 'FRIEND_REQUEST') {
            // Already in REQUESTS tab or will stay there
        } else if (note.type === 'FOLLOW') {
            navigate(`/selfspace?userId=${note.senderId}`);
        }
    };

    const renderNotificationItem = (note) => {
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
            <div className={`notification-item ${!note.read ? 'unread' : ''}`} key={note.requestId || note.id} onClick={() => handleNotificationClick(note)}>
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
                    <img src={iconSrc} alt="icon" style={{ width: 24, height: 24 }} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
            </div>
        );
    };

    return (
        <div className="notification-layout">
            <div className="notification-sidebar">
                <div className="sidebar-title" style={{ padding: '20px 24px', fontSize: '1.2rem', fontWeight: 'bold' }}>通知中心</div>
                <div className={`notification-sidebar-item ${activeTab === 'ALL' ? 'active' : ''}`} onClick={() => setActiveTab('ALL')}>全部通知</div>
                <div className={`notification-sidebar-item ${activeTab === 'LIKES' ? 'active' : ''}`} onClick={() => setActiveTab('LIKES')}>赞与收藏</div>
                <div className={`notification-sidebar-item ${activeTab === 'COMMENTS' ? 'active' : ''}`} onClick={() => setActiveTab('COMMENTS')}>评论与回复</div>
                <div className={`notification-sidebar-item ${activeTab === 'FOLLOW' ? 'active' : ''}`} onClick={() => setActiveTab('FOLLOW')}>关注通知</div>
                <div className={`notification-sidebar-item ${activeTab === 'MESSAGES' ? 'active' : ''}`} onClick={() => setActiveTab('MESSAGES')}>好友消息</div>
                <div className={`notification-sidebar-item ${activeTab === 'REQUESTS' ? 'active' : ''}`} onClick={() => setActiveTab('REQUESTS')}>好友申请</div>
            </div>

            <div className="notification-content-wrapper">
                <div className="notification-center-container">
                    {activeTab === 'MESSAGES' ? (
                        <MessageList isEmbedded={true} />
                    ) : (
                        <>
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
                                    <img src="/site_assets/icons/message/read.svg" alt="" style={{ width: 16, height: 16 }} onError={(e) => { e.target.style.display = 'none'; }} />
                                    全部已读
                                </button>
                            </div>

                            <div className="notification-list">
                                {notifications.length === 0 && !loading ? (
                                    <div className="no-notifications">
                                        <div className="no-notifications-icon">📭</div>
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
