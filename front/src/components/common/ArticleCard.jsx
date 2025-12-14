import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/common/ArticleCard.css';
import resolveUrl from '@utils/resolveUrl';
import { getDefaultAvatar } from '@utils/avatarUtils';

// Icons - use absolute paths directly since assets are served by Nginx
const iconView = resolveUrl('/icons/blogpost/浏览.svg');
const iconLike = resolveUrl('/icons/blogpost/点赞.svg');
const iconComment = resolveUrl('/icons/blogpost/评论.svg');
const iconFavorite = resolveUrl('/icons/blogpost/收藏.svg');
const iconForward = resolveUrl('/icons/blogpost/转发.svg');

function truncateByUnits(text = '', limitUnits = 48) {
    let units = 0;
    let out = '';
    for (const ch of text) {
        const code = ch.codePointAt(0);
        const isAscii = code <= 0x007f;
        const add = isAscii ? 1 : 2;
        if (units + add > limitUnits) break;
        units += add;
        out += ch;
    }
    return out;
}

export default function ArticleCard({ post, className, onDelete, mode = 'horizontal', style, state }) {
    const coverSrc = resolveUrl(post.coverImageUrl) || null;
    const avatar = resolveUrl(post.authorAvatarUrl || post.avatarUrl) || getDefaultAvatar(post.userId || post.authorId);
    const author = post.authorNickname || post.authorName || post.author || post.username || '匿名';
    const created = post.createdAt || post.created || post.createTime;
    const likeCount = post.likeCount || post.likes || 0;
    const commentCount = post.commentCount || post.comments || 0;
    const favoriteCount = post.favoriteCount || 0;
    const shareCount = post.shareCount || post.repostCount || 0;
    const viewCount = post.viewCount || 0;
    const id = post.id || post.postId;
    const isDraft = post.status === 'DRAFT';
    const linkTarget = isDraft ? `/blog-edit?id=${id}` : `/post/${id}`;

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const handleDeleteClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onDelete) {
            onDelete(id);
        }
    };

    const isVertical = mode === 'vertical';

    return (
        <div className={`article-card-new ${isVertical ? 'article-card-vertical' : ''} ${className || ''}`} style={style}>
            <Link to={linkTarget} state={state} className="article-card-link">
                <div className="article-card-cover-wrapper">
                    {coverSrc ? (
                        <img src={coverSrc} alt={post.title} className="article-card-cover" />
                    ) : (
                        <div className="article-card-cover-placeholder" />
                    )}
                    {isDraft && (
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            backgroundColor: '#fbbf24',
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            zIndex: 10
                        }}>
                            草稿
                        </div>
                    )}
                    {onDelete && (
                        <button 
                            onClick={handleDeleteClick}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                left: '10px',
                                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                zIndex: 20,
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            title="删除"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            删除
                        </button>
                    )}
                </div>
                <div className="article-card-info">
                    <h3 className="article-card-title" title={post.title}>{truncateByUnits(post.title, 40)}</h3>

                    <div className="article-card-meta-top">
                        <div className="article-card-author">
                            <img src={avatar} alt={author} className="article-card-avatar" />
                            <span className="article-card-nickname">{author}</span>
                        </div>
                        <span className="article-card-time">{formatDate(created)}</span>
                    </div>

                    <div className="article-card-stats">
                        <div className="stat-item">
                            <img src={iconView} alt="浏览" />
                            <span>{viewCount}</span>
                        </div>
                        <div className="stat-item">
                            <img src={iconLike} alt="点赞" />
                            <span>{likeCount}</span>
                        </div>
                        <div className="stat-item">
                            <img src={iconFavorite} alt="收藏" />
                            <span>{favoriteCount}</span>
                        </div>
                        <div className="stat-item">
                            <img src={iconComment} alt="评论" />
                            <span>{commentCount}</span>
                        </div>
                        <div className="stat-item">
                            <img src={iconForward} alt="转发" />
                            <span>{shareCount}</span>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}