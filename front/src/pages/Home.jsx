import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '@styles/home/Home.css';
import '@styles/home/HomeHero.css';
import HeroSection from '@components/home/HeroSection';
import HomeSortTabs from '@components/home/HomeSortTabs';
import HomeCategoryTabs from '@components/home/HomeCategoryTabs';
import HomeArticleList from '@components/home/HomeArticleList';
import HomeCarousel from '@components/home/HomeCarousel';
import ArticleCard from '@components/common/ArticleCard';
import ScrollControls from '@components/common/ScrollControls';
import { fetchPosts } from '@utils/api/postService';
import { fetchBlogViewBatch } from '@utils/api/blogViewService';
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sortTabsRef = useRef(null);

  // Hot 模式一次性拉取过多会导致首页白屏/卡顿；限制最大拉取数量（可按数据规模调整）
  const HOT_MODE_MAX_FETCH = 600;

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

  const handleSortChange = (mode) => {
    setSortMode(mode);
    setPage(0);
    setPosts([]);
    setHasMore(true);
    if (sortTabsRef.current) {
      sortTabsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
          const shuffled = [...list].sort(() => 0.5 - Math.random()).slice(0, 6);
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

    const fetchSize = size;
    const fetchPage = page;
    const categoryParam = selectedCategory === '首页' ? null : selectedCategory;

    fetchPosts({ page: fetchPage, size: fetchSize, sortMode, category: categoryParam })
      .then(async j => {
        if (!mounted) return;
        if (j && (j.code === 200 || j.status === 200)) {
          let list = j.data && j.data.list ? j.data.list : (j.data || []);
          if (!Array.isArray(list) && Array.isArray(j.data)) list = j.data;

          if (page === 0) {
            setPosts(list);
          } else {
            setPosts(prev => [...prev, ...list]);
          }

          if (j.data && typeof j.data.total === 'number') {
            setHasMore((page * size) + list.length < j.data.total);
          } else {
            setHasMore(list.length === size);
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
  }, [page, size, user?.id, sortMode, selectedCategory]);

  // Infinite Scroll Handler
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 200) {
        // Guard: after switching sort/category we clear posts; don't auto-increment page
        // before the first page of the new mode has loaded.
        if (!loadingMore && hasMore && posts.length > 0) {
          setPage(prev => prev + 1);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, posts.length]);

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
          <div className="home-hero-toolbar">
            <button className="home-hero-refresh-btn" onClick={fetchHeroPosts}>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              换一换
            </button>
          </div>
          <div className="home-hero-section">
            <div className="home-hero-carousel">
              <HomeCarousel />
            </div>
            <div className="home-hero-grid-container">
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

          <div ref={sortTabsRef}>
            <HomeSortTabs sortMode={sortMode} onChange={handleSortChange} />
          </div>

          <div className="home-articles-list">
            <HomeArticleList posts={posts} selectedCategory={selectedCategory} />
            {loadingMore && <div className="home-loading-more">{'\u52a0\u8f7d\u4e2d...'}</div>}
            {!hasMore && posts.length > 0 && <div className="home-no-more">没有更多了</div>}
          </div>
        </div>
      </div>
      <ScrollControls showComments={false} />
    </div>
  );
};

export default Home;