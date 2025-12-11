import React, { useEffect, useState } from 'react';
import ArticleCard from '@components/common/ArticleCard';
import { useAuthState } from '@hooks/useAuthState';
import '@styles/selfspace/SelfSpace.css'; // Reuse SelfSpace styles for grid

export default function FavoritesPage() {
    const { user } = useAuthState();
    const userId = user?.id ? String(user.id) : null;

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const size = 12;

    // Fetch categories
    useEffect(() => {
        if (!userId) return;
        fetch(`/api/blogpost/favorites/categories?userId=${userId}`)
            .then(r => r.json())
            .then(j => {
                if (j && (j.code === 200 || j.status === 200)) {
                    setCategories(j.data || []);
                }
            })
            .catch(console.error);
    }, [userId]);

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
                <h2 style={{ marginBottom: '20px', color: '#333' }}>我的收藏</h2>

                {/* Category Filter */}
                <div className="selfspace-filter-bar">
                    <button
                        className={`filter-btn ${selectedCategory === '' ? 'active' : ''}`}
                        onClick={() => handleCategoryChange('')}
                    >
                        全部
                    </button>
                    {categories.map(c => (
                        <button
                            key={c}
                            className={`filter-btn ${selectedCategory === c ? 'active' : ''}`}
                            onClick={() => handleCategoryChange(c)}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                {/* Post Grid */}
                <div className="selfspace-posts-grid">
                    {posts.map(post => (
                        <ArticleCard key={post.id} post={post} />
                    ))}
                </div>

                {posts.length === 0 && !loading && (
                    <div className="empty-state">暂无收藏文章</div>
                )}

                {hasMore && (
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <button onClick={loadMore} disabled={loading} className="load-more-btn">
                            {loading ? '加载中...' : '加载更多'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
