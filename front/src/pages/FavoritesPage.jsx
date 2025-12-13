import React, { useEffect, useState } from 'react';
import ArticleCard from '@components/common/ArticleCard';
import { useAuthState } from '@hooks/useAuthState';
import '@styles/pages/FavoritesPage.css';
import Category3DCarousel from '@components/selfspace/Category3DCarousel';
import { BLOG_CATEGORIES } from '@utils/constants';

export default function FavoritesPage() {
    const { user } = useAuthState();
    const userId = user?.id ? String(user.id) : null;

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    // Default to '全部' so the carousel highlights it
    const [selectedCategory, setSelectedCategory] = useState('全部');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [viewMode, setViewMode] = useState('horizontal'); // 'horizontal' or 'grid'
    const size = 12;

    // Add '全部' to the categories list
    const displayCategories = ['全部', ...BLOG_CATEGORIES];

    // Fetch favorites
    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        let url = `/api/blogpost/favorites?userId=${userId}&page=${page}&size=${size}`;
        
        // Only append categoryName if it's NOT '全部'
        if (selectedCategory && selectedCategory !== '全部') {
            url += `&categoryName=${encodeURIComponent(selectedCategory)}`;
        }

        fetch(url)
            .then(r => r.json())
            .then(j => {
                if (j && (j.code === 200 || j.status === 200)) {
                    const list = j.data?.list || j.data || [];
                    if (page === 0) {
                        setPosts(list);
                    } else {
                        setPosts(prev => [...prev, ...list]);
                    }
                    if (list.length < size) setHasMore(false);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [userId, page, selectedCategory]);

    const handleCategoryChange = (cat) => {
        if (selectedCategory === cat) return;
        
        setSelectedCategory(cat);
        setPage(0);
        setHasMore(true);
        setPosts([]);
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            setPage(p => p + 1);
        }
    };

    return (
        <div className="favorites-page-container">
            <div className="favorites-content">
                <div className="favorites-header">
                    <h2 className="favorites-title">我的收藏</h2>
                    <div className="favorites-view-toggle">
                        <button 
                            className={`view-toggle-btn ${viewMode === 'horizontal' ? 'active' : ''}`}
                            onClick={() => setViewMode('horizontal')}
                        >
                            横向滑动
                        </button>
                        <button 
                            className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                        >
                            网格视图
                        </button>
                    </div>
                </div>

                {/* 3D Category Carousel */}
                <div className="favorites-carousel-container">
                    <Category3DCarousel 
                        categories={displayCategories} 
                        selectedCategory={selectedCategory}
                        onSelect={handleCategoryChange}
                    />
                </div>

                {/* Post List Container */}
                <div className="favorites-list-wrapper">
                    <div className={`favorites-list-scroll mode-${viewMode}`}>
                        {posts.map(post => (
                            <ArticleCard key={post.id} post={post} className="favorites-card-item" />
                        ))}
                        
                        {posts.length === 0 && !loading && (
                            <div className="favorites-empty-state">
                                {selectedCategory && selectedCategory !== '全部' 
                                    ? `"${selectedCategory}" 分类下暂无收藏` 
                                    : '暂无收藏文章'}
                            </div>
                        )}
                        
                        {hasMore && (
                            <div className="favorites-load-more">
                                <button 
                                    className="load-more-btn"
                                    onClick={loadMore} 
                                    disabled={loading}
                                >
                                    {loading ? '加载中...' : '加载更多'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
