import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/common/ArticleCard.css';
import resolveUrl from '@utils/resolveUrl';

// Icons - use absolute paths directly since assets are served by Nginx
const iconView = '/icons/blogpost/浏览.svg';
const iconLike = '/icons/blogpost/点赞.svg';
const iconComment = '/icons/blogpost/评论.svg';
const iconFavorite = '/icons/blogpost/收藏.svg';
const iconForward = '/icons/blogpost/转发.svg';

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

export default function ArticleCard({ post, className }) {
    const coverSrc = resolveUrl(post.coverImageUrl) || null;
    const avatar = resolveUrl(post.authorAvatarUrl || post.avatarUrl);
    const author = post.authorNickname || post.authorName || post.author || post.username || '匿名';
    const created = post.createdAt || post.created || post.createTime;
    const likeCount = post.likeCount || post.likes || 0;
    const commentCount = post.commentCount || post.comments || 0;
    const favoriteCount = post.favoriteCount || 0;
    const shareCount = post.shareCount || post.repostCount || 0;
    const viewCount = post.viewCount || 0;
    const id = post.id || post.postId;

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    return (
        <div className={`article-card-new ${className || ''}`}>
            <Link to={`/post/${id}`} className="article-card-link">
                <div className="article-card-cover-wrapper">
                    {coverSrc ? (
                        <img src={coverSrc} alt={post.title} className="article-card-cover" />
                    ) : (
                        <div className="article-card-cover-placeholder" />
                    )}
                    {post.status === 'DRAFT' && (
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
                </div>
                <div className="article-card-info">
                    <h3 className="article-card-title" title={post.title}>{truncateByUnits(post.title, 40)}</h3>

                    <div className="article-card-meta-top">
                        <div className="article-card-author">
                            <img src={avatar || '/default-avatar.png'} alt={author} className="article-card-avatar" />
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