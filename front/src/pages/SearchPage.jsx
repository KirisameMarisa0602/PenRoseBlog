import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ArticleCard from '@components/common/ArticleCard';
import UserSearch from './UserSearch'; // Reuse existing UserSearch page component
import '@styles/home/Home.css'; // Reuse Home styles for article list
import '@styles/pages/SearchPage.css';

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
        if (activeTab !== 'articles') return;

        if (!executedQuery.trim()) {
            setArticles([]);
            setHasMore(false);
            return;
        }

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
        <div className="search-page-container">
            <div className="search-header">
                <div className="search-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'articles' ? 'active' : ''}`}
                        onClick={() => setActiveTab('articles')}
                    >
                        文章
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        用户
                    </button>
                </div>

                {activeTab === 'articles' && (
                    <form onSubmit={handleSearch} className="search-form">
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="搜索文章..."
                            className="search-input"
                        />
                        <button type="submit" className="search-btn">
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
                            <div style={{ textAlign: 'center', color: '#666', gridColumn: '1/-1' }}>未找到相关文章</div>
                        )}
                        {hasMore && articles.length > 0 && (
                            <div style={{ textAlign: 'center', marginTop: '20px', gridColumn: '1/-1' }}>
                                <button onClick={() => setPage(p => p + 1)} disabled={loading} className="load-more-btn">
                                    {loading ? '加载中...' : '加载更多'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'users' && (
                    <UserSearch embedded={true} />
                )}
            </div>
        </div>
    );
}
