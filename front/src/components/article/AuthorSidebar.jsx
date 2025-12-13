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
        const msg = prompt('请输入验证消息:');
        if (msg === null) return;
        try {
            const res = await sendFriendRequest(authorId, msg);
            if (res && res.code === 200) {
                alert('好友请求已发送');
            } else {
                alert(res?.message || '发送失败');
            }
        } catch (e) {
            console.error('Friend request failed', e);
            alert('网络错误');
        }
    };

    return (
        <div className="author-sidebar">
            <div className="author-card-container">
                <div className="author-card" style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                    {backgroundUrl && <div className="author-card-overlay"></div>}
                    
                    <div className="author-content-wrapper">
                        <div className="author-header">
                            <Link to={`/selfspace?userId=${authorId}`} className="author-avatar-link">
                                <img src={avatarUrl} alt={nickname} className="author-avatar" />
                            </Link>
                            <div className="author-info">
                                <Link to={`/selfspace?userId=${authorId}`} className="author-name">
                                    {nickname}
                                </Link>
                                <div className="author-bio">
                                    {post.authorBio || authorProfile?.bio || "这个人很懒，什么都没有写~"}
                                </div>
                            </div>
                        </div>

                        <div className="author-details-panel">
                            <div className="author-stats">
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

                            {String(currentUserId) !== String(authorId) && (
                                <div className="author-actions">
                                    <button 
                                        className={`action-btn follow-btn ${isFollowing ? 'following' : ''}`}
                                        onClick={handleFollow}
                                    >
                                        {isFollowing ? '已关注' : '关注'}
                                    </button>
                                    <button 
                                        className="action-btn friend-btn"
                                        onClick={handleAddFriend}
                                        disabled={isFriendStatus}
                                    >
                                        {isFriendStatus ? '已是好友' : '加好友'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
