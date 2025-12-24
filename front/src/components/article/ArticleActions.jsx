import React from 'react';

export default function ArticleActions({
    post,
    onToggleLike,
    onToggleFavorite,
    onShareClick,
    showShareMenu,
    onOpenForwardFriends,
    copying,
    onCopyLink,
    onScrollToComments
}) {
    if (!post) return null;
    return (
        <div className="article-actions-container">
            <div className="action-btn view-btn" style={{ cursor: 'default', opacity: '0.8' }}>
                <img src="/icons/blogpost/浏览.svg" alt="浏览" className="icon" />
                <span>浏览</span>
                <span className="count">{post.viewCount || 0}</span>
            </div>

            <button
                type="button"
                onClick={onToggleLike}
                className={`action-btn like-btn ${post.likedByCurrentUser ? 'liked' : ''}`}
            >
                <img src="/icons/blogpost/点赞.svg" alt="点赞" className="icon" />
                <span>{post.likedByCurrentUser ? '已赞' : '点赞'}</span>
                <span className="count">{post.likeCount || 0}</span>
            </button>

            <button
                type="button"
                onClick={onToggleFavorite}
                className={`action-btn favorite-btn ${post.favoritedByCurrentUser ? 'favorited' : ''}`}
            >
                <img src="/icons/blogpost/收藏.svg" alt="收藏" className="icon" />
                <span>{post.favoritedByCurrentUser ? '已收藏' : '收藏'}</span>
                <span className="count">{post.favoriteCount || 0}</span>
            </button>

            <div className="share-wrapper">
                <button type="button" onClick={onOpenForwardFriends} className="action-btn share-btn">
                    <img src="/icons/blogpost/转发.svg" alt="转发" className="icon" />
                    <span>转发</span>
                    <span className="count">{post.shareCount || 0}</span>
                </button>
            </div>

            <button
                type="button"
                onClick={onScrollToComments}
                className="action-btn comment-btn"
            >
                <img src="/icons/blogpost/评论.svg" alt="评论" className="icon" />
                <span>评论</span>
                <span className="count">{post.commentCount || 0}</span>
            </button>
        </div>
    );
}
