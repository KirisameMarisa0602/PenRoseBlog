import React, { useEffect, useState } from 'react';
import ArticleCard from '@components/common/ArticleCard';
import { useAuthState } from '@hooks/useAuthState';
import '@styles/selfspace/SelfSpace.css'; // Reuse SelfSpace styles for grid
import Category3DCarousel from '@components/selfspace/Category3DCarousel';
import { BLOG_CATEGORIES } from '@utils/constants';

export default function FavoritesPage() {
    const { user } = useAuthState();
    const userId = user?.id ? String(user.id) : null;

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const size = 12;

    // Fetch favorites
    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        let url = `/api/blogpost/favorites?userId=${userId}&page=${page}&size=${size}`;
        if (selectedCategory) url += `&categoryName=${encodeURIComponent(selectedCategory)}`;

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
        <div className="selfspace-container" style={{ paddingTop: '80px', minHeight: '100vh' }}>
            <div className="selfspace-content" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '20px', color: '#333', textAlign: 'center' }}>我的收藏</h2>

                {/* 3D Category Carousel */}
                <div style={{ marginBottom: '40px' }}>
                    <Category3DCarousel 
                        categories={BLOG_CATEGORIES} 
                        selectedCategory={selectedCategory}
                        onSelect={(cat) => {
                            const newCat = (selectedCategory === cat) ? '' : cat;
                            handleCategoryChange(newCat);
                        }}
                    />
                </div>

                {/* Post Grid */}
                <div className="selfspace-posts-grid">
                    {posts.map(post => (
                        <ArticleCard key={post.id} post={post} />
                    ))}
                </div>

                {posts.length === 0 && !loading && (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        {selectedCategory ? `"${selectedCategory}" 分类下暂无收藏` : '暂无收藏文章'}
                    </div>
                )}
                
                {hasMore && (
                    <div style={{ textAlign: 'center', marginTop: '30px', marginBottom: '50px' }}>
                        <button 
                            onClick={loadMore} 
                            disabled={loading}
                            style={{
                                padding: '10px 30px',
                                borderRadius: '20px',
                                border: '1px solid #ddd',
                                background: '#fff',
                                cursor: 'pointer',
                                color: '#666'
                            }}
                        >
                            {loading ? '加载中...' : '加载更多'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
