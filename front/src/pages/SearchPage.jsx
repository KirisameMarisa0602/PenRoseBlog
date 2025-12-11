import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ArticleCard from '@components/common/ArticleCard';
import UserSearch from './UserSearch'; // Reuse existing UserSearch page component
import '@styles/home/Home.css'; // Reuse Home styles for article list

export default function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') || 'articles';
    const initialQuery = searchParams.get('q') || '';

    const [activeTab, setActiveTab] = useState(initialTab);
    const [keyword, setKeyword] = useState(initialQuery); // Input value
    const [executedQuery, setExecutedQuery] = useState(initialQuery); // Actual search query
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    // Sync URL with executed query
    useEffect(() => {
        setSearchParams({ tab: activeTab, q: executedQuery });
    }, [activeTab, executedQuery, setSearchParams]);

    // Fetch Articles
    useEffect(() => {
        if (activeTab !== 'articles' || !executedQuery.trim()) return;

        setLoading(true);
        fetch(`/api/blogpost?keyword=${encodeURIComponent(executedQuery)}&page=${page}&size=10`)
            .then(r => r.json())
            .then(j => {
                if (j && (j.code === 200 || j.status === 200)) {
                    const list = j.data?.list || j.data || [];
                    if (page === 0) setArticles(list);
                    else setArticles(prev => [...prev, ...list]);

                    if (list.length < 10) setHasMore(false);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [activeTab, executedQuery, page]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(0);
        setHasMore(true);
        setExecutedQuery(keyword);
    };

    return (
        <div className="search-page-container" style={{ paddingTop: '80px', minHeight: '100vh', maxWidth: '1200px', margin: '0 auto', paddingLeft: '20px', paddingRight: '20px' }}>
            <div className="search-header" style={{ marginBottom: '20px', textAlign: 'center' }}>
                <div className="search-tabs" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
                    <button
                        className={`tab-btn ${activeTab === 'articles' ? 'active' : ''}`}
                        onClick={() => setActiveTab('articles')}
                        style={{ padding: '10px 20px', fontSize: '16px', borderBottom: activeTab === 'articles' ? '2px solid var(--theme-color)' : 'none', fontWeight: activeTab === 'articles' ? 'bold' : 'normal' }}
                    >
                        文章
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                        style={{ padding: '10px 20px', fontSize: '16px', borderBottom: activeTab === 'users' ? '2px solid var(--theme-color)' : 'none', fontWeight: activeTab === 'users' ? 'bold' : 'normal' }}
                    >
                        用户
                    </button>
                </div>

                {activeTab === 'articles' && (
                    <form onSubmit={handleSearch} style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '30px' }}>
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="搜索文章..."
                            style={{ padding: '10px', width: '300px', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
                        <button type="submit" style={{ padding: '10px 20px', backgroundColor: 'var(--theme-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            搜索
                        </button>
                    </form>
                )}
            </div>

            <div className="search-content">
                {activeTab === 'articles' && (
                    <div className="articles-list">
                        {articles.map(post => (
                            <ArticleCard key={post.id} post={post} />
                        ))}
                        {articles.length === 0 && !loading && executedQuery && (
                            <div style={{ textAlign: 'center', color: '#666' }}>未找到相关文章</div>
                        )}
                        {hasMore && articles.length > 0 && (
                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                <button onClick={() => setPage(p => p + 1)} disabled={loading}>
                                    {loading ? '加载中...' : '加载更多'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="users-search-wrapper">
                        {/* We can reuse UserSearch but we might need to adjust it to accept initial keyword or just let it be independent */}
                        <UserSearch />
                    </div>
                )}
            </div>
        </div>
    );
}
