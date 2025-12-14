import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import resolveUrl from '@utils/resolveUrl';
import { getDefaultAvatar } from '@utils/avatarUtils';
import { fetchUserProfile, fetchUserStats } from '@utils/api/userService';
import { follow, unfollow } from '@utils/api/followService';
import { sendFriendRequest, isFriend } from '@utils/api/friendService';
import '../../styles/article/ArticleSidebars.css';

export default function AuthorSidebar({ post, currentUserId }) {
    const authorId = post?.authorId || post?.userId || post?.authorUserId || post?.uid;
    
    const [stats, setStats] = useState({
        articles: 0,
        following: 0,
        followers: 0
    });
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFriendStatus, setIsFriendStatus] = useState(false);
    const [authorProfile, setAuthorProfile] = useState(null);

    // Tilt effect state
    const [tiltStyle, setTiltStyle] = useState({});

    useEffect(() => {
        if (!authorId) return;
        
        // Fetch user profile for background and bio
        fetchUserProfile(authorId).then(res => {
            if (res && res.code === 200 && res.data) {
                setAuthorProfile(res.data);
                setIsFollowing(res.data.isFollowing || false);
            }
        });

        // Fetch user stats
        fetchUserStats(authorId).then(res => {
            if (res && res.code === 200 && res.data) {
                setStats({
                    articles: res.data.articleCount || 0,
                    following: res.data.followingCount || 0,
                    followers: res.data.followerCount || 0
                });
            }
        });

        // Check friend status
        if (currentUserId && String(currentUserId) !== String(authorId)) {
            isFriend(authorId).then(res => {
                if (res && res.code === 200) {
                    setIsFriendStatus(res.data);
                }
            });
        }
    }, [authorId, currentUserId]);

    const handleMouseMove = (e) => {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -5; // Max 5 deg
        const rotateY = ((x - centerX) / centerX) * 5;

        setTiltStyle({
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`,
            transition: 'transform 0.1s ease-out'
        });
    };

    const handleMouseLeave = () => {
        setTiltStyle({
            transform: 'perspective(1000px) rotateX(0) rotateY(0) scale(1)',
            transition: 'transform 0.5s ease-out'
        });
    };

    if (!post) return null;

    const avatarUrl = resolveUrl(post.authorAvatarUrl) || getDefaultAvatar(authorId);
    const nickname = post.authorNickname || post.nickname || post.authorName || `用户${authorId}`;
    const backgroundUrl = authorProfile?.backgroundUrl ? resolveUrl(authorProfile.backgroundUrl) : null;

    const handleFollow = async () => {
        if (!currentUserId) {
            alert('请先登录');
            return;
        }
        try {
            if (isFollowing) {
                await unfollow(authorId);
                setIsFollowing(false);
                setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
            } else {
                await follow(authorId);
                setIsFollowing(true);
                setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
            }
        } catch (e) {
            console.error('Follow action failed', e);
            alert('操作失败');
        }
    };

    const handleAddFriend = async () => {
        if (!currentUserId) {
            alert('请先登录');
            return;
        }
        if (isFriendStatus) {
            alert('已经是好友了');
            return;
        }
        // 直接发送请求，不需要验证消息
        try {
            const res = await sendFriendRequest(authorId, '');
            if (res && res.code === 200) {
                alert('好友请求已发送');
            } else {
                alert(res?.msg || res?.message || '发送失败');
            }
        } catch (e) {
            console.error('Friend request failed', e);
            alert('网络错误');
        }
    };

    return (
        <aside className="author-sidebar">
            <div className="author-card-container">
                <div 
                    className="author-card"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={tiltStyle}
                >
                    {/* Background Image Layer */}
                    <div 
                        className="author-card-bg" 
                        style={{ 
                            backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' 
                        }}
                    ></div>
                    
                    <div className="author-content-wrapper">
                        <div className="author-header">
                            <Link to={`/selfspace?userId=${authorId}`} className="author-avatar-link">
                                <img src={avatarUrl} alt={nickname} className="author-avatar" />
                            </Link>
                            <Link to={`/selfspace?userId=${authorId}`} className="author-name">{nickname}</Link>
                            <div className="author-bio" title={authorProfile?.bio || '这个人很懒，什么都没写'}>
                                {authorProfile?.bio || '这个人很懒，什么都没写'}
                            </div>
                        </div>

                        <div className="author-stats-row">
                            <div className="stat-item">
                                <span className="stat-val">{stats.articles}</span>
                                <span className="stat-label">文章</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-val">{stats.followers}</span>
                                <span className="stat-label">粉丝</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-val">{stats.following}</span>
                                <span className="stat-label">关注</span>
                            </div>
                        </div>

                        <div className="author-actions">
                            {String(currentUserId) !== String(authorId) && (
                                <>
                                    <button 
                                        className={`action-btn follow-btn ${isFollowing ? 'following' : ''}`} 
                                        onClick={handleFollow}
                                    >
                                        {isFollowing ? '已关注' : '关注'}
                                    </button>
                                    {isFriendStatus ? (
                                        <button 
                                            className="action-btn message-btn"
                                            onClick={() => window.location.href = `/conversation/${authorId}`}
                                        >
                                            私信
                                        </button>
                                    ) : (
                                        <button 
                                            className="action-btn friend-btn"
                                            onClick={handleAddFriend}
                                        >
                                            加好友
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
