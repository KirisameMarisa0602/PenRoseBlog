import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import '@styles/article/ArticleDetail.css';
import ArticleHeader from '@components/article/ArticleHeader';
import ArticleActions from '@components/article/ArticleActions';
import CommentsSection from '@components/article/CommentsSection';
import ForwardFriendsModal from '@components/article/ForwardFriendsModal';
import { fetchPostDetail, recordPostView, toggleFavorite, sharePost, deletePost } from '@utils/api/postService';
// 评论操作改为使用 useArticleComments 提供的方法
import useArticleComments from '@hooks/useArticleComments';
import { fetchFriendsList } from '@utils/api/friendService';
import { useAuthState } from '@hooks/useAuthState';
import resolveUrl from '@utils/resolveUrl';
import ScrollControls from '@components/common/ScrollControls';

export default function ArticleDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthState();
    const userId = user?.id ? String(user.id) : null;
    const [post, setPost] = useState(null);
    const [notFound, setNotFound] = useState(false); // 标记文章不存在 / 已被删除
    const { comments, reload: reloadComments, submitComment, submitReply, getReplies } = useArticleComments(id);
    // 评论分页
    const [commentsPage, setCommentsPage] = useState(1);
    const commentsPerPage = 8;
    // repliesMap: { [commentId]: [reply,...] }
    const [repliesMap, setRepliesMap] = useState({});
    // 楼中楼分页 map：{ [commentId]: pageNumber }
    const [repliesPageMap, setRepliesPageMap] = useState({});
    const repliesPerPage = 6;
    // 热门回复缓存：{ [commentId]: [reply,...] }
    const [hotRepliesMap, setHotRepliesMap] = useState({});
    // which comment's replies panel is open
    const [openReplies, setOpenReplies] = useState({});
    // per-comment reply input text
    const [replyTextMap, setReplyTextMap] = useState({});
    // 存放待提交回复的目标用户 id（按父评论 id 索引）
    const [replyMentionMap, setReplyMentionMap] = useState({});
    const [commentText, setCommentText] = useState('');
    // 父评论排序方式：'hot' 或 'time'
    const [commentsSortMode, setCommentsSortMode] = useState('time');
    const recordedRef = useRef(false); // 防止同一组件实例重复并发记录

    // NEW: 转发相关状态
    const [shareUrl, setShareUrl] = useState('');
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [copying, setCopying] = useState(false);

    // NEW: 选择好友转发弹窗
    const [showForwardFriends, setShowForwardFriends] = useState(false);
    const [friends, setFriends] = useState([]);
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [friendsError, setFriendsError] = useState(null);

    // Cover image scroll effect
    const [coverOpacity, setCoverOpacity] = useState(1);
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const coverHeight = window.innerHeight;
            const newOpacity = Math.max(0, 1 - scrollTop / coverHeight);
            setCoverOpacity(newOpacity);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // ---------------- 加载文章 & 记录浏览 ----------------
    useEffect(() => {
        let cancelled = false;
        setPost(null);
        setNotFound(false); // 每次切换 id 时重�?
        fetchPostDetail(id, userId ? { currentUserId: userId } : {})
            .then(async (j) => {
                if (cancelled) return null;
                if (j && j.code === 200 && j.data) {
                    const p = j.data;
                    try {
                        // Parse markdown content
                        // Fix headers missing space (e.g. ##Title -> ## Title)
                        let fixedContent = (p.content || '').replace(/(^|\n)(#{1,6})([^\s#])/g, '$1$2 $3');
                        
                        // Fix: Handle headers wrapped in <p> tags (e.g. <p># Title</p> -> <h1>Title</h1>)
                        // This happens when users write markdown in Rich Text Editor
                        fixedContent = fixedContent.replace(/<p>(#{1,6})\s*(.*?)<\/p>/g, (match, hashes, text) => {
                            const level = hashes.length;
                            return `<h${level}>${text}</h${level}>`;
                        });

                        p.content = await marked.parse(fixedContent);
                    } catch (e) {
                        console.error('Markdown parsing failed', e);
                    }
                    setPost(p);
                    // Apply syntax highlighting
                    setTimeout(() => {
                        document.querySelectorAll('.article-content pre code').forEach((block) => {
                            hljs.highlightElement(block);
                        });
                    }, 100);
                } else if (j && j.code === 404) {
                    setNotFound(true);
                }
                return j;
            })
            .then(async (j) => {
                if (!j || j.code !== 200 || !j.data) return;
                try {
                    const VIEW_RECORD_EXPIRE_MS = 24 * 60 * 60 * 1000; // 24 hours
                    const key = `view_record_${id}_${userId || 'anon'}`;
                    const anonKey = `view_record_${id}_anon`;
                    const now = Date.now();
                    const last = Number(localStorage.getItem(key) || 0);
                    const lastAnon = Number(localStorage.getItem(anonKey) || 0);
                    
                    let recentlyViewed = false;
                    if (last && now - last < VIEW_RECORD_EXPIRE_MS) recentlyViewed = true;
                    if (userId && lastAnon && now - lastAnon < VIEW_RECORD_EXPIRE_MS) recentlyViewed = true;

                    if (recentlyViewed) {
                        console.debug('[浏览] 近期已记录，跳过', id);
                    } else if (!recordedRef.current) {
                        recordedRef.current = true;
                        localStorage.setItem(key, String(now));
                        const payload = { blogPostId: Number(id) };
                        if (userId) payload.userId = Number(userId);
                        
                        const jr = await recordPostView(payload);
                        if (jr && jr.code === 200 && jr.data) {
                            const vc = Number(jr.data.viewCount || 0);
                            setPost((prev) =>
                                prev ? { ...prev, viewCount: vc } : prev
                            );
                            try {
                                window.dispatchEvent(
                                    new CustomEvent('blogview-updated', {
                                        detail: { blogPostId: String(id), viewCount: vc },
                                    })
                                );
                            } catch {
                                // ignore
                            }
                        }
                        setTimeout(() => {
                            recordedRef.current = false;
                        }, 800);
                    }
                } catch (e) {
                    recordedRef.current = false;
                    console.error('[记录浏览失败]', e);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    // 网络错误，这里不标记 notFound，以免误判
                }
            });

        // 加载评论改为使用 hook
        reloadComments();

        return () => {
            cancelled = true;
        };
        // loadComments 只依�?id/userId，本 effect 已以这两个依赖为�?
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, userId]);

    // ---------------- 评论相关 ----------------
    // 删除本地的 loadComments，改为使用 reloadComments + 下方统计逻辑在需要时补充

    const loadReplies = useCallback(async (commentId) => {
        if (!commentId) return [];
        try {
            // getReplies 现在直接返回数组（已在 hook 中处理了 response 结构）
            const rawList = await getReplies(commentId);
            
            const normalized = (rawList || []).map((r) => ({
                ...(r || {}),
                likedByCurrentUser: Boolean(
                    r && (r.likedByCurrentUser || r.liked)
                ),
                replyCount: r.replyCount || 0,
            }));
            const list = (normalized || [])
                .slice()
                .sort(
                    (a, b) =>
                        new Date(a.createdAt || a.createTime).getTime() -
                        new Date(b.createdAt || b.createTime).getTime()
                );
            setRepliesMap((prev) => ({ ...prev, [commentId]: list }));

            try {
                const parent =
                    (comments || []).find(
                        (cm) => String(cm.id) === String(commentId)
                    ) || {};
                const parentLike = Number(parent.likeCount || 0);
                if (parentLike >= 2) {
                    const threshold = Math.floor(parentLike / 2);
                    const normalized2 = (list || []).map((r) => ({
                        ...(r || {}),
                        likeCount: Number(
                            r.likeCount || r.likes || 0
                        ),
                        createdAt: r.createdAt || r.createTime,
                    }));
                    const hot = (normalized2 || [])
                        .filter(
                            (rr) =>
                                Number(rr.likeCount || 0) >= threshold
                        )
                        .sort((a, b) => {
                            const la =
                                Number(b.likeCount || 0) -
                                Number(a.likeCount || 0);
                            if (la !== 0) return la;
                            return (
                                new Date(a.createdAt).getTime() -
                                new Date(b.createdAt).getTime()
                            );
                        })
                        .slice(0, 3);
                    if (hot && hot.length) {
                        setHotRepliesMap((prev) => ({
                            ...prev,
                            [commentId]: hot,
                        }));
                    } else {
                        setHotRepliesMap((prev) => {
                            const n = { ...prev };
                            delete n[commentId];
                            return n;
                        });
                    }
                } else {
                    setHotRepliesMap((prev) => {
                        const n = { ...prev };
                        delete n[commentId];
                        return n;
                    });
                }
            } catch (e) {
                console.warn(
                    '[loadReplies] compute hot replies failed',
                    e
                );
            }

            return list;
        } catch (e) {
            console.error('[loadReplies]', e);
        }
        return [];
    }, [comments, getReplies]);

    const openCommentReplyAndScroll = useCallback(async (commentId, replyId) => {
        try {
            let list = repliesMap[commentId];
            if (!Array.isArray(list) || list.length === 0) {
                list = (await loadReplies(commentId)) || [];
            }
            const idx = (list || []).findIndex((r) => String(r.id) === String(replyId));
            const pageForReply = idx >= 0 ? Math.floor(idx / repliesPerPage) + 1 : 1;
            setRepliesPageMap((prev) => ({ ...prev, [commentId]: pageForReply }));
            setOpenReplies((prev) => ({ ...prev, [commentId]: true }));

            // 统一清理旧的高亮
            clearAllHotHighlights();

            // 尝试定位并高亮回复元素；做少量重试以兼容 DOM 还未渲染的情况
            const tryScrollAndHighlight = () => {
                const el = document.getElementById(`reply-${replyId}`);
                if (el) {
                    try {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } catch (err) { void err; }
                    addHotHighlight(el);
                    // 确保父评论不被同时高亮（修复父评论一起高亮的问题�?
                    try {
                        const parentEl = document.getElementById(`comment-${commentId}`);
                        if (parentEl) parentEl.classList.remove('hot-highlight');
                    } catch (err) { void err; }
                    return true;
                }
                return false;
            };

            if (!tryScrollAndHighlight()) {
                // 二次尝试
                setTimeout(() => {
                    if (!tryScrollAndHighlight()) {
                        setTimeout(() => {
                            tryScrollAndHighlight();
                        }, 180);
                    }
                }, 120);
            }
        } catch (e) {
            // 出错时回退行为
            console.error('[openCommentReplyAndScroll] error', e);
            setOpenReplies((prev) => ({ ...prev, [commentId]: true }));
            setTimeout(() => {
                const el = document.getElementById(`reply-${replyId}`);
                if (el) {
                    try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (err) { void err; }
                    addHotHighlight(el);
                    try {
                        const parentEl = document.getElementById(`comment-${commentId}`);
                        if (parentEl) parentEl.classList.remove('hot-highlight');
                    } catch (err) { void err; }
                }
            }, 200);
        }
    }, [loadReplies, repliesMap, repliesPerPage]);

    function toggleRepliesPanel(commentId) {
        setOpenReplies((prev) => {
            const next = { ...prev, [commentId]: !prev[commentId] };
            if (next[commentId] && !repliesMap[commentId]) {
                loadReplies(commentId);
            }
            return next;
        });
    }

    function startReplyToReply(
        commentId,
        targetUserId,
        targetNickname
    ) {
        setOpenReplies((prev) => ({ ...prev, [commentId]: true }));
        setReplyTextMap((prev) => ({
            ...prev,
            [commentId]: `@${targetNickname} `,
        }));
        setReplyMentionMap((prev) => ({
            ...prev,
            [commentId]: Number(targetUserId) || prev[commentId],
        }));
        setTimeout(() => {
            const ta = document.querySelector(
                `#comment-${commentId} .reply-form-side textarea`
            );
            if (ta) ta.focus();
        }, 80);
    }

    async function handleSubmitReply(e, commentId) {
        e.preventDefault();
        if (!userId) {
            alert('请先登录');
            return;
        }
        const content = (replyTextMap[commentId] || '').trim();
        if (!content) {
            alert('请输入回复内容');
            return;
        }
        try {
            const replyToUserId = replyMentionMap[commentId];
            const ok = await submitReply(Number(commentId), content, replyToUserId ? Number(replyToUserId) : undefined);
            if (ok) {
                const newReplyId = undefined; // 由后续列表刷新后的最新项定位
                setReplyTextMap((prev) => ({
                    ...prev,
                    [commentId]: '',
                }));
                setReplyMentionMap((prev) => {
                    const n = { ...prev };
                    delete n[commentId];
                    return n;
                });

                // 强制重新加载该评论的回复列表，确保拿到最新数据
                // 先清空一下该评论的缓存，确保 loadReplies 会发起真实请求（如果 loadReplies 内部有缓存判断的话）
                setRepliesMap((prev) => {
                    const next = { ...prev };
                    delete next[commentId];
                    return next;
                });
                
                // 稍作延迟再加载，确保后端事务已提交
                await new Promise(r => setTimeout(r, 200));

                const list = (await loadReplies(commentId)) || [];
                
                // 更新状态
                setRepliesMap((prev) => ({ ...prev, [commentId]: list }));

                let idx = Math.max(0, (list || []).length - 1);
                const pageForNew = Math.max(
                    1,
                    Math.ceil((idx + 1) / repliesPerPage)
                );
                setRepliesPageMap((prev) => ({
                    ...prev,
                    [commentId]: pageForNew,
                }));
                setOpenReplies((prev) => ({
                    ...prev,
                    [commentId]: true,
                }));

                setTimeout(() => {
                    const targetId =
                        newReplyId || (list && list[idx] && list[idx].id);
                    if (targetId) {
                        const el = document.getElementById(
                            `reply-${targetId}`
                        );
                        if (el) {
                            el.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                            });
                            el.classList.add('hot-highlight');
                            setTimeout(() => {
                                try {
                                    el.classList.remove('hot-highlight');
                                } catch {
                                    // ignore
                                }
                            }, 2600);
                            return;
                        }
                    }
                    const last = document.querySelector(
                        `#comment-${commentId} .reply-list .reply-item:last-child`
                    );
                    if (last) {
                        last.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                        });
                        last.classList.add('hot-highlight');
                        setTimeout(() => {
                            try {
                                last.classList.remove('hot-highlight');
                            } catch {
                                // ignore
                            }
                        }, 2600);
                    }
                }, 120);
            } else {
                alert('回复失败');
            }
        } catch (e) {
            console.error(e);
            alert('网络错误');
        }
    }

    async function toggleCommentLike(commentId) {
        if (!userId) {
            alert('请先登录');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `/api/comment/${commentId}/like?userId=${userId}`,
                { 
                    method: 'POST',
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : ''
                    }
                }
            );
            const j = await res.json().catch(() => null);
            if (j && j.code === 200) {
                reloadComments();
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function toggleReplyLike(replyId, parentCommentId) {
        if (!userId) {
            alert('请先登录');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `/api/comment-reply/${replyId}/like?userId=${userId}`,
                { 
                    method: 'POST',
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : ''
                    }
                }
            );
            const j = await res.json().catch(() => null);
            if (j && j.code === 200) {
                await loadReplies(parentCommentId);
            }
        } catch (e) {
            console.error(e);
        }
    }

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!userId) {
            alert('请先登录');
            return;
        }
        try {
            const ok = await submitComment(commentText);
            if (ok) {
                const newCommentId =
                    undefined; // 由后续滚动逻辑按最新列表定位
                setCommentText('');
                try {
                    setCommentsSort('time');
                } catch {
                    setCommentsSortMode('time');
                    setCommentsPage(1);
                }
                await reloadComments();
                setTimeout(() => {
                    if (newCommentId) {
                        const el = document.getElementById(
                            `comment-${newCommentId}`
                        );
                        if (el) {
                            el.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                            });
                            return;
                        }
                    }
                    const first = document.querySelector(
                        '.comments-list .comment-item'
                    );
                    if (first) {
                        first.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                        });
                    }
                }, 80);
                return;
            } else {
                alert('评论失败');
            }
        } catch (e) {
            console.error(e);
            alert('网络错误');
        }
    };

    const toggleLike = async () => {
        if (!userId) {
            alert('请先登录');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `/api/blogpost/${id}/like?userId=${userId}`,
                { 
                    method: 'POST',
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : ''
                    }
                }
            );
            const j = await res.json();
            if (j && j.code === 200) {
                const data = await fetchPostDetail(id, { currentUserId: userId });
                if (data && data.code === 200) setPost(data.data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggleFavorite = async () => {
        if (!userId) {
            alert('请先登录');
            return;
        }
        try {
            const res = await toggleFavorite(id, userId);
            if (res && res.code === 200) {
                const data = await fetchPostDetail(id, { currentUserId: userId });
                if (data && data.code === 200) setPost(data.data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // ----- 删除博客 -----
    const handleDeletePost = async () => {
        if (!userId) {
            alert('请先登录');
            return;
        }
        const ownerId =
            post?.userId || post?.authorId || post?.authorUserId || post?.uid || null;
        if (!ownerId || String(ownerId) !== String(userId)) {
            alert('只有作者本人可以删除该博客');
            return;
        }
        const ok = window.confirm('确定要删除这篇博客吗？此操作不可恢复');
        if (!ok) return;
        try {
            const j = await deletePost(id, userId);
            if (j && j.code === 200 && j.data) {
                alert('删除成功');
                navigate('/');
            } else {
                alert((j && (j.message || j.msg)) || '删除失败');
            }
        } catch (e) {
            console.error('[删除博客失败]', e);
            alert('删除失败，网络错误');
        }
    };

    const totalComments = (comments || []).length;
    const commentsTotalPages = Math.max(
        1,
        Math.ceil(totalComments / commentsPerPage)
    );
    const sortedComments = (comments || [])
        .slice()
        .sort((a, b) => {
            if (commentsSortMode === 'hot') {
                const la =
                    Number(b.likeCount || 0) -
                    Number(a.likeCount || 0);
                if (la !== 0) return la;
                const ra =
                    Number(b.replyCount || 0) -
                    Number(a.replyCount || 0);
                if (ra !== 0) return ra;
                return (
                    new Date(b.createdAt || b.createTime).getTime() -
                    new Date(a.createdAt || a.createTime).getTime()
                );
            }
            return (
                new Date(b.createdAt || b.createTime).getTime() -
                new Date(a.createdAt || a.createTime).getTime()
            );
        });
    const displayedComments = sortedComments.slice(
        (commentsPage - 1) * commentsPerPage,
        commentsPage * commentsPerPage
    );

    function goCommentsPage(next) {
        const p = Math.min(Math.max(1, next), commentsTotalPages);
        setCommentsPage(p);
        setTimeout(() => {
            const el = document.querySelector('.article-comments');
            if (el)
                el.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
        }, 60);
    }
    function setCommentsSort(mode) {
        setCommentsSortMode(mode);
        setCommentsPage(1);
    }

    function getDisplayedReplies(commentId) {
        const page = repliesPageMap[commentId] || 1;
        const arr = repliesMap[commentId] || [];
        const total = arr.length;
        const totalPages = Math.max(
            1,
            Math.ceil(total / repliesPerPage)
        );
        const p = Math.min(Math.max(1, page), totalPages);
        const slice = arr.slice(
            (p - 1) * repliesPerPage,
            p * repliesPerPage
        );
        return { slice, page: p, totalPages, total };
    }

    function goRepliesPage(commentId, next) {
        const arr = repliesMap[commentId] || [];
        const totalPages = Math.max(
            1,
            Math.ceil(arr.length / repliesPerPage)
        );
        const p = Math.min(Math.max(1, next), totalPages);
        setRepliesPageMap((prev) => ({ ...prev, [commentId]: p }));
        setOpenReplies((prev) => ({ ...prev, [commentId]: true }));
        setTimeout(() => {
            const el = document.querySelector(
                `#comment-${commentId} .reply-list`
            );
            if (el)
                el.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
        }, 80);
    }

    // markdown-it removed; using ReactMarkdown below

    // ----- 根据 URL �?commentId 定位评论 -----
    const handledReplyRef = useRef(false);
    useEffect(() => {
        if (!comments || comments.length === 0) return;

        try {
            const search = window.location.search || '';
            const params = new URLSearchParams(search);
            const cid = params.get('commentId');
            const rid = params.get('replyId'); // 回复 id（可选）

            if (!cid) return;

            // 如果已经处理过同一�?reply，则不再重复处理（避免循环滚动）
            if (rid && handledReplyRef.current && String(handledReplyRef.current) === `${cid}:${rid}`) {
                // 已处理，直接返回
                return;
            }

            // 找出该评论在当前排序列表中的索引
            const idxInSorted = sortedComments.findIndex(
                (c) => String(c.id) === String(cid)
            );
            if (idxInSorted === -1) return;

            const targetPage =
                Math.floor(idxInSorted / commentsPerPage) + 1;
            setCommentsPage(targetPage);

            // 若带�?replyId，则使用 openCommentReplyAndScroll 定位并展开具体回复
            if (rid) {
                // 标记为已处理（以 "commentId:replyId" 形式�?
                handledReplyRef.current = `${cid}:${rid}`;

                // 等待 DOM / 评论加载与页面切换稳定后调用展开滚动
                setTimeout(() => {
                    try {
                        if (typeof openCommentReplyAndScroll === 'function') {
                            openCommentReplyAndScroll(cid, rid);
                        } else {
                            const el = document.getElementById(`comment-${cid}`);
                            if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                el.classList.add('hot-highlight');
                                setTimeout(() => {
                                    try { el.classList.remove('hot-highlight'); } catch (err) { void err; }
                                }, 2600);
                            }
                        }
                    } catch (err) {
                        console.error('[ArticleDetail scroll to reply error]', err);
                    }

                    // 调用后立刻把 URL 中的 replyId 参数移除，避免后续渲染重复触�?
                    try {
                        const newParams = new URLSearchParams(window.location.search);
                        newParams.delete('replyId');
                        // 可选择同时删除 commentId 或保�?commentId；这里保�?commentId
                        const newSearch = newParams.toString();
                        const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
                        window.history.replaceState(null, '', newUrl);
                    } catch (err) { void err; }
                }, 300);

                return;
            }

            // 没有 replyId 的情况：原有定位 comment 的高亮逻辑
            setTimeout(() => {
                const el = document.getElementById(`comment-${cid}`);
                if (el) {
                    el.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                    el.classList.add('hot-highlight');
                    setTimeout(() => {
                        try {
                            el.classList.remove('hot-highlight');
                        } catch (err) {
                            console.error('[ArticleDetail scroll highlight error]', err);
                        }
                    }, 2600);
                }
            }, 200);
        } catch (err) {
            console.error('[ArticleDetail handle comment from URL error]', err);
        }
    }, [comments, sortedComments, commentsPerPage, openCommentReplyAndScroll]);

    // ---------- 这里处理“不存在”和“加载中”两种状�?----------

    if (notFound) {
        return (
            <div className="article-detail-page">
                <div
                    style={{
                        minHeight: '60vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        color: '#555',
                    }}
                >
                    啊哦，博客消失了喵❤
                </div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="article-detail-page">
                <div
                    style={{
                        minHeight: '60vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        color: '#666',
                    }}
                >
                    加载�?..
                </div>
            </div>
        );
    }

    // 计算当前登录用户是否是作�?
    const ownerId =
        post.userId ||
        post.authorId ||
        post.authorUserId ||
        post.uid ||
        null;
    const isOwner =
        ownerId && userId && String(ownerId) === String(userId);

    // ---------------- 转发相关前端逻辑 ----------------

    // 从后端获取当前文章用于“私信预览”的分享 URL
    const ensureShareUrl = async () => {
        if (shareUrl) return shareUrl;
        try {
            const res = await fetch(`/api/blogpost/${id}/share-url`);
            const j = await res.json().catch(() => null);
            if (j && j.code === 200 && j.data) {
                setShareUrl(j.data);
                return j.data;
            }
        } catch (e) {
            console.error('[获取分享链接失败]', e);
        }
        const fallback = window.location.href;
        setShareUrl(fallback);
        return fallback;
    };

    const handleShareClick = async () => {
        const url = await ensureShareUrl();
        if (!url) {
            alert('暂时无法获取文章链接');
            return;
        }
        setShowShareMenu((v) => !v);
    };

    const getCopyableUrl = () => {
        try {
            const origin = window.location.origin;
            return `${origin}/post/${id}`;
        } catch {
            return window.location.href;
        }
    };

    const handleCopyLink = async () => {
        const url = getCopyableUrl();
        if (!url) {
            alert('暂时无法获取文章链接');
            return;
        }
        setCopying(true);
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
                alert('链接已复制到剪贴板');
                sharePost(id).then(res => {
                    if (res && res.code === 200) {
                        setPost(prev => prev ? { ...prev, shareCount: (prev.shareCount || 0) + 1 } : prev);
                    }
                });
            } else {
                const ok = window.prompt('复制以下链接:', url);
                if (!ok && ok !== null) {
                    // ignore
                }
            }
        } catch (e) {
            console.error('复制失败', e);
            const ok = window.prompt('复制以下链接:', url);
            if (!ok && ok !== null) {
                // ignore
            }
        } finally {
            setCopying(false);
            setShowShareMenu(false);
        }
    };

    const openForwardFriendsDialog = async () => {
        if (!userId) {
            alert('请先登录后再转发到私信');
            return;
        }
        setFriendsLoading(true);
        setFriendsError(null);
        setShowForwardFriends(true);
        try {
            const j = await fetchFriendsList();
            if (j && j.code === 200) {
                setFriends(j.data?.list || j.data || []);
            } else {
                setFriendsError(
                    (j && (j.message || j.msg)) || '获取好友列表失败'
                );
            }
        } catch (e) {
            console.error('[获取好友列表失败]', e);
            setFriendsError('网络错误');
        } finally {
            setFriendsLoading(false);
        }
    };

    const handleChooseFriendToForward = async (targetUserId) => {
        if (!targetUserId) return;
        const url = await ensureShareUrl();
        if (!url) {
            alert('暂时无法获取文章链接');
            return;
        }
        setShowForwardFriends(false);
        setShowShareMenu(false);
        navigate(
            `/conversation/${targetUserId}?text=${encodeURIComponent(
                url
            )}`
        );
        sharePost(id).then(res => {
            if (res && res.code === 200) {
                setPost(prev => prev ? { ...prev, shareCount: (prev.shareCount || 0) + 1 } : prev);
            }
        });
    };

    const handleScrollToComments = () => {
        const el = document.querySelector('.article-comments');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const coverUrl = post?.coverImageUrl ? resolveUrl(post.coverImageUrl) : null;

    return (
        <div className="article-detail-page">
            {coverUrl && (
                <div className="article-cover-wrapper" style={{ opacity: coverOpacity }}>
                    <img src={coverUrl} alt="Article Cover" />
                </div>
            )}
            <div className={`article-detail-container ${coverUrl ? 'has-cover' : ''}`}>
                <article className="article-main">
                    <ArticleHeader
                        post={post}
                        isOwner={isOwner}
                        onDelete={handleDeletePost}
                    />
                    <div className="article-content tiptap-content" dangerouslySetInnerHTML={{ __html: post.content || '' }} />

                    <ArticleActions
                        post={post}
                        onToggleLike={toggleLike}
                        onToggleFavorite={handleToggleFavorite}
                        onShareClick={handleShareClick}
                        showShareMenu={showShareMenu}
                        onOpenForwardFriends={openForwardFriendsDialog}
                        copying={copying}
                        onCopyLink={handleCopyLink}
                        onScrollToComments={handleScrollToComments}
                    />

                    <CommentsSection
                        userId={userId}
                        commentText={commentText}
                        setCommentText={setCommentText}
                        onSubmitComment={handleSubmitComment}
                        commentsSortMode={commentsSortMode}
                        setCommentsSort={setCommentsSort}
                        displayedComments={displayedComments}
                        totalComments={totalComments}
                        commentsPage={commentsPage}
                        commentsTotalPages={commentsTotalPages}
                        goCommentsPage={goCommentsPage}
                        openReplies={openReplies}
                        hotRepliesMap={hotRepliesMap}
                        openCommentReplyAndScroll={openCommentReplyAndScroll}
                        getDisplayedReplies={getDisplayedReplies}
                        repliesMap={repliesMap}
                        repliesPerPage={repliesPerPage}
                        goRepliesPage={goRepliesPage}
                        toggleReplyLike={toggleReplyLike}
                        startReplyToReply={startReplyToReply}
                        toggleCommentLike={toggleCommentLike}
                        toggleRepliesPanel={toggleRepliesPanel}
                        replyTextMap={replyTextMap}
                        setReplyTextMap={setReplyTextMap}
                        handleSubmitReply={handleSubmitReply}
                    />
                </article>
            </div>

            <ForwardFriendsModal
                show={showForwardFriends}
                onClose={() => setShowForwardFriends(false)}
                friends={friends}
                friendsLoading={friendsLoading}
                friendsError={friendsError}
                onChooseFriend={handleChooseFriendToForward}
            />
            <ScrollControls />
        </div>
    );
}

// ---------- hot highlight 管理（避免重复闪动） ----------
const hotHighlightTimers = new Map();

function addHotHighlight(el) {
  if (!el) return;
  const key = el.id || `${Math.random()}`;
  // 如果已有计时器，先清除旧计时器（重置高亮时长�?
    if (hotHighlightTimers.has(key)) {
        try { clearTimeout(hotHighlightTimers.get(key)); } catch (err) { void err; }
    }
    // �?class（如果已存在也没关系），然后设置新的移除计时�?
    try { el.classList.add('hot-highlight'); } catch (err) { void err; }
  const t = setTimeout(() => {
        try { el.classList.remove('hot-highlight'); } catch (err) { void err; }
    hotHighlightTimers.delete(key);
  }, 2600);
  hotHighlightTimers.set(key, t);
}

function clearAllHotHighlights() {
    // 清空所有计时器并移�?class
    for (const [key, t] of hotHighlightTimers.entries()) {
        try { clearTimeout(t); } catch (err) {
            console.error('[hot highlight clear timeout error]', err);
        }
        const el = document.getElementById(key);
        if (el) {
            try { el.classList.remove('hot-highlight'); } catch (err2) {
                console.error('[hot highlight remove class error]', err2);
            }
        }
    }
    hotHighlightTimers.clear();
}
