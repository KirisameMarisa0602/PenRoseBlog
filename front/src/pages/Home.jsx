import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '@styles/home/Home.css';
import '@styles/home/HomeHero.css';
import '@styles/common/AnimeBackground.css';
import HeroSection from '@components/home/HeroSection';
import HomeSortTabs from '@components/home/HomeSortTabs';
import HomeCategoryTabs from '@components/home/HomeCategoryTabs';
import HomeArticleList from '@components/home/HomeArticleList';
import HomeCarousel from '@components/home/HomeCarousel';
import ArticleCard from '@components/common/ArticleCard';
import ScrollControls from '@components/common/ScrollControls';
import { fetchPosts } from '@utils/api/postService';
import { useAuthState } from '@hooks/useAuthState';

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [heroPosts, setHeroPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [sortMode, setSortMode] = useState('latest'); // 'latest' | 'hot'
  const [selectedCategory, setSelectedCategory] = useState('首页');
  const size = 15; // 每页 15 篇，适应 5 列网格布局 (3行)
  const { user } = useAuthState();
  const userId = user?.id || null;
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Initialize category from location state if available
  useEffect(() => {
    if (location.state?.category) {
      setSelectedCategory(location.state.category);
    }
    if (location.state?.scrollToCarousel) {
      const carouselElement = document.querySelector('.home-hero-carousel');
      if (carouselElement) {
        carouselElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location.state]);

  const handleSortChange = (mode) => { setSortMode(mode); setPage(0); setPosts([]); setHasMore(true); };
  
  const handleCategoryChange = (cat) => { 
    // Update history state so back button works
    navigate('.', { state: { category: cat }, replace: true });
    setSelectedCategory(cat); 
    setPage(0); 
    setPosts([]); 
    setHasMore(true); 
  };

  // 专门获取 Hero 区右侧的文章（始终显示最新/热门的前6个）
  // 增加换一换功能：每次随机获取6个
  const fetchHeroPosts = useCallback(() => {
    const categoryParam = selectedCategory === '首页' ? null : selectedCategory;
    // Fetch a larger pool (e.g., 20) and pick 6 random ones client-side, or rely on backend randomization if available.
    // Since backend API is fixed, we'll fetch 'hot' posts (which are usually static top posts) 
    // but maybe we can fetch a larger page size and slice randomly.
    // Or just fetch page 0, size 20.
    fetchPosts({ page: 0, size: 20, sortMode: 'hot', category: categoryParam })
        .then(res => {
            if (res && res.code === 200) {
                let list = res.data && res.data.list ? res.data.list : (res.data || []);
                if (!Array.isArray(list) && Array.isArray(res.data)) list = res.data;
                // Shuffle list and take 6
                const shuffled = list.sort(() => 0.5 - Math.random()).slice(0, 6);
                setHeroPosts(shuffled);
            }
        });
  }, [selectedCategory]);

  useEffect(() => {
    fetchHeroPosts();
  }, [fetchHeroPosts]);

  // Infinite Scroll Logic
  useEffect(() => {
    let mounted = true;
    setLoadingMore(true);

    // 当为 hot 模式时，我们尝试拉取尽可能多的文章到前端进行全局排序。
    // 设一个较大的 fetchSize（根据项目规模可调）。
    const fetchAllForHot = sortMode === 'hot';
    const fetchSize = fetchAllForHot ? 10000 : size;
    const fetchPage = fetchAllForHot ? 0 : page;

    const categoryParam = selectedCategory === '首页' ? null : selectedCategory;

    fetchPosts({ page: fetchPage, size: fetchSize, sortMode, category: categoryParam })
      .then(async j => {
        if (!mounted) return;
        if (j && (j.code === 200 || j.status === 200)) {
          let list = j.data && j.data.list ? j.data.list : (j.data || []);
          if (!Array.isArray(list) && Array.isArray(j.data)) list = j.data;

          if (fetchAllForHot && list.length) {
            try {
              // 批量获取所有文章的浏览量并按自定义热度排序（view + like*30）
              const ids = list.map(p => (p.id || p.postId));
              
              const viewMap = new Map();
              try {
                  const batchRes = await fetch('/api/blogview/batch', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(ids)
                  }).then(r => r.ok ? r.json() : null);
                  
                  if (batchRes && batchRes.code === 200 && batchRes.data) {
                      Object.entries(batchRes.data).forEach(([k, v]) => {
                          viewMap.set(String(k), Number(v));
                      });
                  }
              } catch (e) {
                  console.error('[hot排序] 批量获取浏览量失败', e);
              }

              list = list.slice().sort((a, b) => {
                const va = (viewMap.get(String(a.id || a.postId)) || 0) + ((a.likeCount || a.likes || 0) * 30);
                const vb = (viewMap.get(String(b.id || b.postId)) || 0) + ((b.likeCount || b.likes || 0) * 30);
                return vb - va;
              });
            } catch (e) {
              console.error('[hot排序] 获取浏览量失败', e);
            }

            // 记录总条数，并在前端做分页切片展示
            const start = page * size;
            const paged = list.slice(start, start + size);
            
            if (page === 0) {
                setPosts(paged);
            } else {
                setPosts(prev => [...prev, ...paged]);
            }
            
            setHasMore(start + size < list.length);
          } else {
            // 非 hot 模式或后端已返回已排好序的列表（分页） -> 直接使用后端返回的这一页
            if (page === 0) {
                setPosts(list);
            } else {
                setPosts(prev => [...prev, ...list]);
            }
            // 若后端返回 total/分页信息，可在这里设置 totalCount（容错处理）
            if (j.data && typeof j.data.total === 'number') {
              // Use functional update or just rely on page * size logic to avoid dependency on posts
              // Actually, we can just check if we reached the total
              // Better: (page * size) + list.length < j.data.total
              // But wait, page is 0-indexed.
              // If page=0, we have list.length items.
              // If page=1, we have size + list.length items.
              // So total fetched so far is (page * size) + list.length
              setHasMore((page * size) + list.length < j.data.total);
            } else if (!fetchAllForHot) {
              // 如果后端没有 total 字段，我们无法精确计算总页数，这里设为 null
              setHasMore(list.length === size);
            }
          }
        } else {
            if (page === 0) setPosts([]);
            setHasMore(false);
        }
        setLoadingMore(false);
      })
      .catch(err => {
        console.error('[Home] 获取文章失败', err);
        if (mounted) {
            if (page === 0) setPosts([]);
            setLoadingMore(false);
            setHasMore(false);
        }
      });

    return () => { mounted = false; };
  }, [page, size, userId, sortMode, selectedCategory]);

  // Infinite Scroll Handler
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 200) {
        if (!loadingMore && hasMore) {
          setPage(prev => prev + 1);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore]);

  // 隐藏 Home 页滚动条（不影响滚动），离开时恢复
  useEffect(() => {
    try { document.body.classList.add('hide-scrollbar'); } catch (err) { void err; }
    return () => { try { document.body.classList.remove('hide-scrollbar'); } catch (err) { void err; } };
  }, []);

  return (
    <div className="anime-neon-bg">
      <HeroSection />
      <div className="home-page-wrapper">
        <HomeCategoryTabs selectedCategory={selectedCategory} onSelectCategory={handleCategoryChange} />
        
        <div className="home-articles-container">
          {/* Hero Section: Carousel + Top Grid */}
          <div className="home-hero-section">
            <div className="home-hero-carousel">
                <HomeCarousel />
            </div>
            <div className="home-hero-grid-container">
                <div className="home-hero-grid-header">
                    <button className="home-hero-refresh-btn" onClick={fetchHeroPosts}>
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                        换一换
                    </button>
                </div>
                <div className="home-hero-grid">
                    {heroPosts.map(p => (
                        <ArticleCard 
                            key={p.id || p.postId} 
                            post={p} 
                            className="home-hero-card" 
                            mode="vertical" 
                        />
                    ))}
                </div>
            </div>
          </div>

          <HomeSortTabs sortMode={sortMode} onChange={handleSortChange} />
          
          <div className="home-articles-list">
            <HomeArticleList posts={posts} selectedCategory={selectedCategory} />
            {loadingMore && <div className="home-loading-more">加载中...</div>}
            {!hasMore && posts.length > 0 && <div className="home-no-more">没有更多了</div>}
          </div>
        </div>
      </div>
      <ScrollControls showComments={false} />
    </div>
  );
};

export default Home;