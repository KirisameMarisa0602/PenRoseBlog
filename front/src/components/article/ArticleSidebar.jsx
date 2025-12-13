import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/article/ArticleSidebars.css';

export default function ArticleSidebar({ post, isOwner, onDelete, toc }) {
    const [activeId, setActiveId] = useState('');

    useEffect(() => {
        if (!post) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: '0px 0px -80% 0px' }
        );

        const headings = document.querySelectorAll('.article-content h1, .article-content h2, .article-content h3');
        headings.forEach((h) => observer.observe(h));

        return () => {
            headings.forEach((h) => observer.unobserve(h));
        };
    }, [toc, post]);

    if (!post) return null;

    const scrollToHeading = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setActiveId(id);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).replace(/\//g, '-');
        } catch {
            return dateString;
        }
    };

    return (
        <div className="article-sidebar">
            {/* Article Actions (Edit/Delete) */}
            {isOwner && (
                <div className="sidebar-card actions-card">
                    <div className="sidebar-title">管理</div>
                    <div className="owner-actions-grid">
                        <Link
                            to={`/blog-edit?id=${post.id || post.postId}`}
                            className="sidebar-action-btn edit-btn"
                        >
                            <img src="/icons/blogpost/编辑.svg" alt="" /> 编辑
                        </Link>
                        <button
                            type="button"
                            onClick={onDelete}
                            className="sidebar-action-btn delete-btn"
                        >
                            <img src="/icons/blogpost/删除.svg" alt="" /> 删除
                        </button>
                    </div>
                </div>
            )}

            {/* Table of Contents */}
            {toc && toc.length > 0 && (
                <div className="sidebar-card toc-card">
                    <div className="sidebar-title">目录</div>
                    <ul className="toc-list">
                        {toc.map((item) => (
                            <li 
                                key={item.id} 
                                className={`toc-item level-${item.level} ${activeId === item.id ? 'active' : ''}`}
                                onClick={() => scrollToHeading(item.id)}
                            >
                                {item.text}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Article Info (Category & Tags) */}
            <div className="sidebar-card info-card">
                <div className="sidebar-title">信息</div>
                
                {post.directory && (
                    <div className="info-group">
                        <div className="info-label">专栏</div>
                        <div className="info-content directory-tag">
                            {post.directory}
                        </div>
                    </div>
                )}

                {post.categoryName && (
                    <div className="info-group">
                        <div className="info-label">分类</div>
                        <div className="info-content category-tag">
                            {post.categoryName}
                        </div>
                    </div>
                )}

                {post.tags && post.tags.length > 0 && (
                    <div className="info-group">
                        <div className="info-label">标签</div>
                        <div className="tags-cloud">
                            {post.tags.map((tag, idx) => (
                                <span key={idx} className="tag-chip">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="info-group">
                    <div className="info-label">发布于</div>
                    <div className="info-content date-text">
                        {formatDate(post.createdAt || post.createTime)}
                    </div>
                </div>
            </div>
        </div>
    );
}
