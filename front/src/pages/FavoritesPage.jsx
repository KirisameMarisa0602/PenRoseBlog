import React, { useState, useCallback } from 'react';
import { useAuthState } from '@hooks/useAuthState';
import { BLOG_CATEGORIES } from '@utils/constants';
import ArticleCard from '@components/common/ArticleCard';
import '@styles/pages/FavoritesPage.css';

export default function FavoritesPage() {
    const { user } = useAuthState();
    const userId = user?.id ? String(user.id) : null;

    const [activeCategory, setActiveCategory] = useState(null);

    const [categoryData, setCategoryData] = useState({});
    const [paginationMap, setPaginationMap] = useState({});
    const [loadingMap, setLoadingMap] = useState({});

    // Split categories into 2 rows of 6
    const row1 = BLOG_CATEGORIES.slice(0, 6);
    const row2 = BLOG_CATEGORIES.slice(6, 12);

    const fetchFavorites = useCallback((category, pageNum) => {
        if (!userId) return;
        if (loadingMap[category]) return;

        setLoadingMap(prev => ({ ...prev, [category]: true }));

        fetch(`/api/blogpost/favorites?userId=${userId}&categoryName=${encodeURIComponent(category)}&page=${pageNum}&size=10`)
            .then(r => r.json())
            .then(j => {
                if (j && (j.code === 200 || j.status === 200)) {
                    const list = j.data?.list || j.data || [];

                    setCategoryData(prev => {
                        const existing = prev[category] || [];
                        // Filter duplicates
                        const newItems = list.filter(item => !existing.some(ex => ex.id === item.id));
                        return { ...prev, [category]: pageNum === 0 ? list : [...existing, ...newItems] };
                    });

                    setPaginationMap(prev => ({
                        ...prev,
                        [category]: {
                            page: pageNum,
                            hasMore: list.length === 10
                        }
                    }));
                }
            })
            .catch(console.error)
            .finally(() => {
                setLoadingMap(prev => ({ ...prev, [category]: false }));
            });
    }, [userId, loadingMap]);

    const handleMouseEnter = (category) => {
        setActiveCategory(category);
        if (!categoryData[category]) {
            fetchFavorites(category, 0);
        }
    };

    const handleScroll = (e, category) => {
        const { scrollTop, clientHeight, scrollHeight } = e.target;
        if (scrollHeight - scrollTop <= clientHeight + 50) {
            const pageInfo = paginationMap[category];
            if (pageInfo && pageInfo.hasMore && !loadingMap[category]) {
                fetchFavorites(category, pageInfo.page + 1);
            }
        }
    };

    const renderCategoryCard = (category) => {
        const isActive = activeCategory === category;
        return (
            <div
                className={`favorites-card ${isActive ? 'active' : ''}`}
                key={category}
                onMouseEnter={() => handleMouseEnter(category)}
            >
                <div className="card-bg">
                    <img
                        src={`/imgs/categories/${category}.jpg`}
                        alt={category}
                        className="bg-image"
                        onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <div className="bg-overlay"></div>
                    <div className="card-label">
                        <span>{category}</span>
                    </div>
                </div>

                <div
                    className={`favorites-content-area ${isActive ? 'visible' : ''}`}
                    onScroll={(e) => isActive && handleScroll(e, category)}
                >
                    <div className="content-inner">
                        <div className="articles-grid">
                            {categoryData[category] && categoryData[category].length > 0 ? (
                                categoryData[category].map(post => (
                                    <ArticleCard
                                        key={post.id}
                                        post={post}
                                        mode="vertical"
                                        className="fav-article-card"
                                    />
                                ))
                            ) : (
                                !loadingMap[category] && <div className="no-data">暂无收藏</div>
                            )}
                            {loadingMap[category] && (
                                <div className="favorites-loading-container">
                                    <div className="loading-spinner"></div>
                                    <span className="loading-text">加载中...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="favorites-page-container anime-neon-bg">
            <div className="favorites-row">
                {row1.map(renderCategoryCard)}
            </div>
            <div className="favorites-row">
                {row2.map(renderCategoryCard)}
            </div>
        </div>
    );
}
