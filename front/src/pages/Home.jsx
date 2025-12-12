import React, { useEffect, useState } from 'react';
import '@styles/home/Home.css';
import HomeSortTabs from '@components/home/HomeSortTabs';
import HomeCategoryTabs from '@components/home/HomeCategoryTabs';
import HomeArticleList from '@components/home/HomeArticleList';
import HomePagination from '@components/home/HomePagination';
import { fetchPosts } from '@utils/api/postService';
import { useAuthState } from '@hooks/useAuthState';

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [sortMode, setSortMode] = useState('latest'); // 'latest' | 'hot'
  const [selectedCategory, setSelectedCategory] = useState('首页');
  const size = 5; // 每页 5 篇
  const { user } = useAuthState();
  const userId = user?.id || null;

  // totalCount 仅用于可能的前端分页界限（非必须）
  const [totalCount, setTotalCount] = useState(null);
  // 记录最近一次请求返回的条数，用于在没有 total 时判断是否有下一页
  const [lastFetchedCount, setLastFetchedCount] = useState(0);
  const handleSortChange = (mode) => { setSortMode(mode); setPage(0); };
  const handleCategoryChange = (cat) => { setSelectedCategory(cat); setPage(0); };

  useEffect(() => {
    let mounted = true;

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
            setTotalCount(list.length);
            const start = page * size;
            const paged = list.slice(start, start + size);
            setPosts(paged);
            setLastFetchedCount(paged.length);
          } else {
            // 非 hot 模式或后端已返回已排好序的列表（分页） -> 直接使用后端返回的这一页
            setPosts(list);
            setLastFetchedCount(list.length);
            // 若后端返回 total/分页信息，可在这里设置 totalCount（容错处理）
            if (j.data && typeof j.data.total === 'number') {
              setTotalCount(j.data.total);
            } else if (!fetchAllForHot) {
              // 如果后端没有 total 字段，我们无法精确计算总页数，这里设为 null
              setTotalCount(null);
            }
          }
        } else {
          setPosts([]);
          setTotalCount(null);
          setLastFetchedCount(0);
        }
      })
      .catch(err => {
        console.error('[Home] 获取文章失败', err);
        if (mounted) {
          setPosts([]);
          setTotalCount(null);
          setLastFetchedCount(0);
        }
      });

    return () => { mounted = false; };
  }, [page, size, userId, sortMode, selectedCategory]);

  // 分页控制判断：若后端提供 total 则用 total 判断，否则用 lastFetchedCount === size 推断是否还有下一页
  const canPrev = page > 0;
  const canNext = totalCount !== null
    ? ((page + 1) * size < totalCount)
    : (lastFetchedCount === size);

  const handlePrevPage = () => { if (canPrev) setPage(Math.max(0, page - 1)); };
  const handleNextPage = () => { if (canNext) setPage(page + 1); };

  // 隐藏 Home 页滚动条（不影响滚动），离开时恢复
  useEffect(() => {
    try { document.body.classList.add('hide-scrollbar'); } catch (err) { void err; }
    return () => { try { document.body.classList.remove('hide-scrollbar'); } catch (err) { void err; } };
  }, []);

  return (
    <>
      <div className="home-page-wrapper">
        <HomeCategoryTabs selectedCategory={selectedCategory} onSelectCategory={handleCategoryChange} />
        
        <div className="home-articles-container">
          <HomeSortTabs sortMode={sortMode} onChange={handleSortChange} />
          
          <div className="home-articles-list">
            <HomeArticleList posts={posts} />
          </div>
          <HomePagination
            page={page}
            canPrev={canPrev}
            canNext={canNext}
            onPrev={handlePrevPage}
            onNext={handleNextPage}
          />
        </div>
      </div>
    </>
  );
};

export default Home;