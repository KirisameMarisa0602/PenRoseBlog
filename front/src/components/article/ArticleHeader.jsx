import React from 'react';
import { Link } from 'react-router-dom';
import resolveUrl from '@utils/resolveUrl';
import '../../styles/article/ArticleDetail.css';

export default function ArticleHeader({ post, isOwner, onDelete }) {
    if (!post) return null;
    return (
        <div className="article-header">
            <div className="article-header-top">
                <div className="article-meta-info">
                    {post.authorAvatarUrl ? (
                        <Link
                            to={`/selfspace?userId=${
                                post.authorId ||
                                post.userId ||
                                post.authorUserId ||
                                post.uid ||
                                ''
                            }`}
                            className="article-author-avatar-link"
                        >
                            <img
                                src={resolveUrl(post.authorAvatarUrl)}
                                alt="avatar"
                                className="article-author-avatar"
                            />
                        </Link>
                    ) : (
                        <div className="article-author-avatar-placeholder" />
                    )}
                    <div className="article-meta-text">
                        <Link
                            to={`/selfspace?userId=${
                                post.authorId ||
                                post.userId ||
                                post.authorUserId ||
                                post.uid ||
                                ''
                            }`}
                            className="article-author-name"
                        >
                            {post.authorNickname ||
                                post.nickname ||
                                post.authorName ||
                                '用户' + (post.userId || '')}
                        </Link>
                        <span className="article-date">
                            {post.createdAt || post.createTime}
                        </span>
                    </div>
                </div>
                
                {isOwner && (
                    <div className="article-owner-actions">
                        <Link
                            to={`/blog-edit?id=${post.id || post.postId}`}
                            className="edit-post-btn"
                        >
                            编辑
                        </Link>
                        <button
                            type="button"
                            onClick={onDelete}
                            className="delete-post-btn"
                        >
                            删除
                        </button>
                    </div>
                )}
            </div>
            
            <h1 className="article-title-text">{post.title}</h1>

            <div className="article-tags-row">
                {post.directory && (
                    <span className="article-tag-chip article-tag-directory">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        {post.directory}
                    </span>
                )}
                {post.categoryName && (
                    <span className="article-tag-chip article-tag-category">
                        {post.categoryName}
                    </span>
                )}
                {post.tags && post.tags.map((tag, idx) => (
                    <span key={idx} className="article-tag-chip article-tag-pill">
                        #{tag}
                    </span>
                ))}
            </div>
        </div>
    );
}
