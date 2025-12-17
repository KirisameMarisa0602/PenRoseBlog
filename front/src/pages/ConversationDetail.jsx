import api from '../utils/api/httpClient';
import React, {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import '@styles/message/ConversationDetail.css';
import '@styles/home/HomeArticleList.css';
import { useAuthState } from '@hooks/useAuthState';
import { fetchConversationDetail, fetchConversations } from '@utils/api/messageService';
import resolveUrl from '@utils/resolveUrl';
import { getDefaultAvatar, isValidAvatar } from '@utils/avatarUtils';

// 本地缓存服务
import {
    preloadConversationMessages,
    cacheConversationMessages,
    cacheConversationSummaries,
    loadCachedConversationSummaries
} from '@utils/localPmCacheService';

import ArticleCardFetcher from '@components/common/ArticleCardFetcher';

export default function ConversationDetail({ embeddedOtherId, onConversationSelect }) {
    const { otherId: paramOtherId } = useParams();
    const otherId = embeddedOtherId || paramOtherId;
    const navigate = useNavigate();
    const location = useLocation();

    // 核心状态
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [otherInfo, setOtherInfo] = useState({ nickname: '', avatarUrl: '' });
    const otherInfoRef = useRef(otherInfo);
    useEffect(() => { otherInfoRef.current = otherInfo; }, [otherInfo]);

    const [conversations, setConversations] = useState([]); // 左侧会话摘要列表
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredConversations = useMemo(() => {
        if (!searchTerm) return conversations;
        const lower = searchTerm.toLowerCase();
        return conversations.filter(c => 
            (c.nickname || '').toLowerCase().includes(lower) ||
            String(c.otherId).includes(lower)
        );
    }, [conversations, searchTerm]);

    const { user } = useAuthState();
    const userId = user?.id || null;

    // 分页
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // 滚动
    const rightScrollRef = useRef(null);
    const leftScrollRef = useRef(null);
    const userScrollingUpRef = useRef(false);
    const autoScrollEnabledRef = useRef(true);
    const previousScrollHeightRef = useRef(0);

    const isNearBottom = (el, thresh = 40) => {
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight <= thresh;
    };

    // 上传
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);

    // 撤回相关
    const recalledLocalRef = useRef(new Set());
    const normId = (id) => String(id);

    // 会话视图（包含撤回/已删）
    const [viewRecords, setViewRecords] = useState([]);

    // 右键菜单（消息）
    const [menu, setMenu] = useState({ visible: false, x: 0, y: 0, msg: null });

    // 侧边栏头像菜单（拉黑/取消拉黑）
    const [sidebarMenu, setSidebarMenu] = useState({ visible: false, x: 0, y: 0, user: null, blocked: false });

    // 输入框高度
    const [inputHeight, setInputHeight] = useState(() => {
        const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
        return Math.max(56, Math.round(vh * 0.15));
    });
    const inputRef = useRef(null);

    // 新消息提示
    const [newTip, setNewTip] = useState({ visible: false, count: 0 });
    const lastSeenMaxTimeRef = useRef(0);
    const seenIdsRef = useRef(new Set());

    // 来自 ?text= 的初始文本（用于从文章详情转发）
    const [initialSharedText, setInitialSharedText] = useState('');
    const [initialSharedTextSent, setInitialSharedTextSent] = useState(false);

    // 表情选择器
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiList = ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾'];

    const onEmojiClick = (emoji) => {
        setText(prev => prev + emoji);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    /** ---------------- 工具方法 ---------------- */

    const mergeMessages = (oldList, newList) => {
        if ((!oldList || oldList.length === 0) && (!newList || newList.length === 0)) return [];
        const mergedArr = [];
        const seen = new Map();
        const keyOf = (m) => {
            if (!m) return null;
            if (m.id != null) return `id:${m.id}`;
            const time = m.createdAt ? String(m.createdAt) : '';
            const s = m.senderId != null ? String(m.senderId) : '';
            const r = m.receiverId != null ? String(m.receiverId) : '';
            const t = m.text != null ? String(m.text) : '';
            return `c:${time}|s:${s}|r:${r}|t:${t}`;
        };

        const pushIfNew = (m) => {
            const k = keyOf(m);
            if (!k) return;
            if (!seen.has(k)) {
                seen.set(k, true);
                mergedArr.push(m);
            }
        };

        (oldList || []).forEach(pushIfNew);
        (newList || []).forEach(pushIfNew);

        mergedArr.sort((a, b) => {
            const ta = a && a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b && b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return ta - tb;
        });

        return mergedArr;
    };

    const markReadCurrent = useCallback(() => {
        if (!userId || !otherId) return;
        // 使用 axios httpClient 统一处理
        api.post(`/messages/conversation/${otherId}/read`, null, {
            headers: { 'X-User-Id': userId }
        })
            .then(() => {
                setConversations(prev =>
                    (prev || []).map(x =>
                        String(x.otherId) === String(otherId) ? { ...x, unreadCount: 0 } : x
                    )
                );
                try {
                    window.dispatchEvent(new Event('pm-unread-refresh'));
                } catch (err) {
                    console.warn('pm-unread-refresh dispatch failed', err);
                }
            })
            .catch((err) => {
                console.warn('markReadCurrent failed', err);
            });
    }, [userId, otherId]);

    /** ---------------- Block API helpers ---------------- */

    const checkBlockStatus = async (targetId) => {
        if (!userId || !targetId) return false;
        try {
            const res = await api.get(`/block/status/${targetId}`);
            const j = res.data;
            if (j && j.code === 200) return !!j.data;
        } catch (err) {
            console.warn('checkBlockStatus failed', err);
        }
        return false;
    };

    const toggleBlockUser = async (targetId) => {
        if (!userId || !targetId) return null;
        try {
            const res = await api.post(`/block/toggle/${targetId}`);
            const j = res.data;
            if (j && j.code === 200) {
                setConversations(prev => {
                    if (!Array.isArray(prev)) return prev;
                    return prev.map(c => c && String(c.otherId) === String(targetId)
                        ? { ...c, blocked: j.data === true }
                        : c
                    );
                });
                return !!j.data;
            } else {
                alert((j && (j.msg || j.message)) || '操作失败');
            }
        } catch (err) {
            console.error('toggleBlockUser failed', err);
            alert('网络错误');
        }
        return null;
    };

    /** ---------------- 分页获取消息（带本地缓存） ---------------- */

    const fetchMessages = async (pageNum) => {
        if (!userId || !otherId) return;
        try {
            if (pageNum > 0) setIsLoadingHistory(true);

            const j = await fetchConversationDetail(otherId, { page: pageNum, size: 20 });

            if (j && j.code === 200 && j.data) {
                const newMsgs = j.data.list || [];

                setMessages(prev => {
                    const existingIds = new Set((prev || []).map(m => m.id));
                    const filteredNew = (newMsgs || []).filter(m => !existingIds.has(m.id));
                    const merged = [...filteredNew, ...(prev || [])];
                    return merged.sort((a, b) => {
                        const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return ta - tb;
                    });
                });

                cacheConversationMessages(userId, otherId, newMsgs, 1000)
                    .then(() => {
                        console.log(
                            '[PM] cacheConversationMessages written page',
                            pageNum,
                            'count=',
                            newMsgs.length
                        );
                    })
                    .catch(() => { });

                if (newMsgs.length < 20) {
                    setHasMore(false);
                }
            }
        } catch (e) {
            console.error('Fetch messages failed', e);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    /** ---------------- 视图刷新 ---------------- */

    const refreshView = useCallback(() => {
        if (!userId || !otherId) return;
        // 使用后端真实接口：/api/messages/conversation/{otherId}
        api.get(`/messages/conversation/${otherId}`, {
            params: { page: 0, size: 500 },
            headers: { 'X-User-Id': userId }
        })
            .then(res => {
                const j = res.data;
                if (j && j.code === 200 && j.data && Array.isArray(j.data.records || j.data.list)) {
                    const list = j.data.records || j.data.list;
                    const withLocal = list.map(r =>
                        recalledLocalRef.current.has(normId(r.id))
                            ? { ...r, recalled: true }
                            : r
                    );
                    setViewRecords(withLocal);
                }
            })
            .catch((err) => {
                console.warn('refreshView failed', err);
            });
    }, [userId, otherId]);

    /** ---------------- 从 URL 解析转发文本：增加“已自动发送”防重标记 ---------------- */

    // 生成当前分享 URL 的「已自动发送标记」key
    const buildShareSentKey = (raw) => {
        if (!userId || !otherId || !raw) return null;
        // 简单 hash：长度 + 前后 10 字符，避免 URL 太长
        const s = String(raw);
        const head = s.slice(0, 10);
        const tail = s.slice(-10);
        const len = s.length;
        return `pm_auto_shared_${userId}_${otherId}_${len}_${head}_${tail}`;
    };

    // 解析 URL 参数中的 ?text=（例如从博客转发时带过来的分享链接）
    useEffect(() => {
        if (!location) return;
        const sp = new URLSearchParams(location.search || '');
        const raw = sp.get('text');
        if (!raw) {
            setInitialSharedText('');
            setText('');
            setInitialSharedTextSent(false);
            return;
        }
        let parsed = raw;
        try {
            parsed = decodeURIComponent(raw);
        } catch {
            parsed = raw;
        }

        // 无论是否自动发送，都让输入框先带上这段文字，方便用户查看/编辑
        // setText(parsed); // 移除此处预填充，避免用户看到链接

        // 检查是否已对当前会话自动发送过这条分享链接
        let alreadySent = false;
        const key = buildShareSentKey(parsed);
        if (key && typeof window !== 'undefined' && window.sessionStorage) {
            try {
                alreadySent = window.sessionStorage.getItem(key) === '1';
            } catch {
                alreadySent = false;
            }
        }

        if (alreadySent) {
            // 已经自动发过了：不再触发自动发送，仅作为普通草稿存在
            setInitialSharedText('');
            setInitialSharedTextSent(true);
        } else {
            // 还没发过：标记为待自动发送
            setInitialSharedText(parsed);
            setInitialSharedTextSent(false);
        }

        // 让 textarea 聚焦到末尾
        setTimeout(() => {
            if (inputRef.current) {
                const v = inputRef.current.value || '';
                inputRef.current.focus();
                try {
                    inputRef.current.setSelectionRange(v.length, v.length);
                } catch (err) { void err; }
            }
        }, 100);
    }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

    // 尝试自动发送从博客转发过来的分享链接（只自动一次 & 有 sessionStorage 防重）
    useEffect(() => {
        if (!userId || !otherId) return;
        if (!initialSharedText || initialSharedTextSent) return;

        // 简单判断：是否为本站的 URL，如果不是则不自动发送
        let isSameOriginUrl = false;
        try {
            const u = new URL(initialSharedText);
            if (u.origin === window.location.origin) {
                isSameOriginUrl = true;
            }
        } catch (err) {
            void err;
            isSameOriginUrl = false;
        }

        if (!isSameOriginUrl) return;

        const key = buildShareSentKey(initialSharedText);

        // 如果 sessionStorage 里已经存在记录，再保险判断一次，避免极端情况重复发送
        if (key && typeof window !== 'undefined' && window.sessionStorage) {
            try {
                const flag = window.sessionStorage.getItem(key);
                if (flag === '1') {
                    setInitialSharedTextSent(true);
                    return;
                }
            } catch (err) {
                void err; // 忽略 storage 异常，继续走发送逻辑
            }
        }

        // 自动发送函数：直接调用发送接口，避免用户再手点一次
        const autoSendSharedText = async () => {
            try {
                const body = { text: initialSharedText };
                const res = await api.post(`/messages/text/${otherId}`, body, {
                    headers: { 'X-User-Id': userId }
                });
                const j = res.data;
                if (j && j.code === 200 && j.data) {
                    const msg = j.data;
                    setMessages(prev => mergeMessages(prev, [msg]));
                    cacheConversationMessages(userId, otherId, [msg], 1000)
                        .then(() => console.log('[PM] cache after auto-send shared text, id=', msg.id))
                        .catch(() => { });

                    setInitialSharedTextSent(true);
                    setText(''); // 自动发送后清空输入框中的链接

                    // 写入 sessionStorage，后续刷新或再次进入该会话，不再自动发送这条链接
                    if (key && typeof window !== 'undefined' && window.sessionStorage) {
                        try {
                            window.sessionStorage.setItem(key, '1');
                        } catch {
                            // 忽略 storage 异常
                        }
                    }

                    autoScrollEnabledRef.current = true;
                    refreshView();
                } else {
                    console.warn('auto send shared text failed', j);
                }
            } catch (err) {
                console.warn('auto send shared text error', err);
            }
        };

        autoSendSharedText();
    }, [userId, otherId, initialSharedText, initialSharedTextSent, refreshView]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!userId || !otherId) return;

        let cancelled = false;

        (async () => {
            const cached = await preloadConversationMessages(userId, otherId, 1000);
            if (cancelled) return;

            console.log(
                '[PM] preloadConversationMessages from IndexedDB:',
                cached.length,
                'records'
            );

            if (cached && cached.length > 0) {
                setMessages(cached);
            } else {
                setMessages([]);
            }

            setPage(0);
            setHasMore(true);
            fetchMessages(0);

            markReadCurrent();
        })();

        return () => {
            cancelled = true;
        };
        // fetchMessages 内部已使用 userId/otherId/页码自行管理，这里仅在会话主体变化时预加载
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, otherId, markReadCurrent]);

    useEffect(() => {
        markReadCurrent();
    }, [markReadCurrent]);

    /** ---------------- 左侧会话摘要：先本地、再远端 ---------------- */

    useEffect(() => {
        if (!userId) return;

        (async () => {
            const localList = await loadCachedConversationSummaries();
            if (localList && localList.length > 0) {
                const seen = new Set();
                const uniqLocal = localList.filter(c => {
                    if (!c || !c.otherId) return false;
                    const k = String(c.otherId);
                    if (seen.has(k)) return false;
                    seen.add(k);
                    return true;
                });
                setConversations(
                    uniqLocal.map(c => ({
                        otherId: c.otherId,
                        nickname: c.nickname,
                        avatarUrl: c.avatarUrl,
                        lastMessage: c.lastMessage,
                        lastAt: c.lastAt,
                        unreadCount: c.unreadCount || 0,
                        blocked: false
                    }))
                );
            }
        })();

        const loadList = async () => {
            try {
                const j = await fetchConversations();
                if (j && j.code === 200 && j.data && Array.isArray(j.data.list)) {
                    let list = j.data.list;

                    const exists = list.some(x => String(x.otherId) === String(otherId));
                    if (!exists && otherId) {
                        let profileNick = '';
                        let profileAvatar = '';
                        try {
                            const pr = await api.get(`/user/profile/${otherId}`);
                            const pj = pr.data;
                            if (pj && pj.code === 200 && pj.data) {
                                profileNick = pj.data.nickname || '';
                                profileAvatar = pj.data.avatarUrl || '';
                            }
                        } catch (err) {
                            console.warn('load profile failed', err);
                        }

                        list = [
                            {
                                otherId: Number(otherId),
                                nickname: profileNick || otherInfoRef.current?.nickname || '',
                                avatarUrl: profileAvatar || otherInfoRef.current?.avatarUrl || '',
                                lastMessage: '',
                                lastAt: null,
                                unreadCount: 0
                            },
                            ...list
                        ];
                    }

                    // 去重
                    const seen = new Set();
                    list = list.filter(x => {
                        if (!x || !x.otherId) return false;
                        const k = String(x.otherId);
                        if (seen.has(k)) return false;
                        seen.add(k);
                        return true;
                    });

                    list = await Promise.all(
                        list.map(async x => {
                            if (!x || String(x.otherId) !== String(otherId)) {
                                return { ...x, blocked: false };
                            }
                            if (x.nickname && x.avatarUrl) return { ...x, blocked: false };
                            try {
                                const pr = await api.get(`/user/profile/${x.otherId}`);
                                const pj = pr.data;
                                if (pj && pj.code === 200 && pj.data) {
                                    return {
                                        ...x,
                                        nickname: x.nickname || pj.data.nickname || '',
                                        avatarUrl: x.avatarUrl || pj.data.avatarUrl || '',
                                        blocked: false
                                    };
                                }
                            } catch (err) {
                                console.warn('补充 profile 失败', err);
                            }
                            return {
                                ...x,
                                nickname: x.nickname || otherInfoRef.current?.nickname || '',
                                avatarUrl: x.avatarUrl || otherInfoRef.current?.avatarUrl || '',
                                blocked: false
                            };
                        })
                    );

                    setConversations(list);
                    cacheConversationSummaries(userId, list).catch(() => { });
                }
            } catch (err) {
                console.warn('load conversation list failed', err);
            }
        };

        loadList();
    }, [userId, otherId]);

    useEffect(() => {
        const onDocClick = () => setSidebarMenu({ visible: false, x: 0, y: 0, user: null, blocked: false });
        document.addEventListener('click', onDocClick);
        return () => document.removeEventListener('click', onDocClick);
    }, []);

    useEffect(() => {
        refreshView();
    }, [refreshView]);

    /** ---------------- 视图与消息合成 finalMessages ---------------- */

    const messagesById = useMemo(() => {
        const map = new Map();
        (messages || []).forEach(m => {
            if (m && m.id != null) map.set(m.id, m);
        });
        return map;
    }, [messages]);

    const finalMessages = useMemo(() => {
        return (viewRecords || []).map(v => {
            const m = v?.id != null ? messagesById.get(v.id) : null;
            const merged = m
                ? { ...m }
                : {
                    id: v.id,
                    senderId: v.senderId,
                    receiverId: v.receiverId,
                    createdAt: v.createdAt,
                    text: v.displayText || '',
                    type: null,
                    mediaUrl: null,
                    senderNickname: (m && m.senderNickname) || '',
                    receiverNickname: (m && m.receiverNickname) || '',
                    senderAvatarUrl: (m && m.senderAvatarUrl) || '',
                    receiverAvatarUrl: (m && m.receiverAvatarUrl) || ''
                };
            const recalledFlag =
                v.recalled === true || v.recalled === 1 || v.recalled === 'true';
            merged.__recalled = recalledFlag;
            merged.__displayText = v.displayText || '';
            if (merged.__recalled) {
                if (m && m.text) merged.__originalText = m.text;
            }
            // NOTE: blogPreview 由后端 PrivateMessageDTO 返回
            if (m && m.blogPreview) {
                merged.blogPreview = m.blogPreview;
            }
            return merged;
        });
    }, [viewRecords, messagesById]);

    /** ---------------- 获取对方信息（优先接口获取，其次消息推断） ---------------- */

    // 1. 明确调用接口获取对方信息
    useEffect(() => {
        if (!otherId) return;
        api.get(`/user/profile/${otherId}`)
            .then(res => {
                if (res.data && res.data.code === 200) {
                    const u = res.data.data;
                    setOtherInfo(prev => ({
                        nickname: u.nickname || prev.nickname,
                        avatarUrl: u.avatarUrl || prev.avatarUrl
                    }));
                }
            })
            .catch(err => console.warn('Fetch other profile failed', err));
    }, [otherId]);

    // 2. 通过消息推断对方信息 (作为补充，但不覆盖已有信息为空的情况)
    useEffect(() => {
        if (!finalMessages || finalMessages.length === 0) return;
        for (let m of finalMessages) {
            if (m.senderId !== Number(userId)) {
                setOtherInfo(prev => ({
                    nickname: m.senderNickname || prev.nickname,
                    avatarUrl: m.senderAvatarUrl || prev.avatarUrl
                }));
                return;
            }
            if (m.receiverId !== Number(userId)) {
                setOtherInfo(prev => ({
                    nickname: m.receiverNickname || prev.nickname,
                    avatarUrl: m.receiverAvatarUrl || prev.avatarUrl
                }));
                return;
            }
        }
    }, [finalMessages, userId]);

    /** ---------------- 滚动监听/自动滚动/分页加载 ---------------- */

    useEffect(() => {
        const el = rightScrollRef.current;
        if (!el) return;
        const onScroll = () => {
            const near = isNearBottom(el);
            userScrollingUpRef.current = !near;
            autoScrollEnabledRef.current = near;
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        autoScrollEnabledRef.current = isNearBottom(el);
        userScrollingUpRef.current = !autoScrollEnabledRef.current;
        return () => el.removeEventListener('scroll', onScroll);
    }, []);

    const handleScroll = (e) => {
        const el = e.target;

        const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
        autoScrollEnabledRef.current = isBottom;

        if (el.scrollTop === 0 && hasMore && !isLoadingHistory && messages.length > 0) {
            previousScrollHeightRef.current = el.scrollHeight;
            const nextPage = page + 1;
            setPage(nextPage);
            fetchMessages(nextPage);
        }
    };

    useLayoutEffect(() => {
        const el = rightScrollRef.current;
        if (!el) return;

        if (isLoadingHistory === false && previousScrollHeightRef.current > 0) {
            const heightDiff = el.scrollHeight - previousScrollHeightRef.current;
            el.scrollTop = heightDiff;
            previousScrollHeightRef.current = 0;
        } else {
            if (autoScrollEnabledRef.current) {
                el.scrollTop = el.scrollHeight;
            }
        }
    }, [messages, isLoadingHistory]);

    useEffect(() => {
        const el = rightScrollRef.current;
        if (!el) return;
        if (autoScrollEnabledRef.current || isNearBottom(el)) {
            el.scrollTop = el.scrollHeight;
        }
        const imgs = Array.from(
            el.querySelectorAll('img.conversation-detail-msgmedia')
        );
        const vids = Array.from(
            el.querySelectorAll('video.conversation-detail-msgmedia')
        );
        const onLoaded = () => {
            if (autoScrollEnabledRef.current || isNearBottom(el)) {
                el.scrollTop = el.scrollHeight;
            }
        };
        imgs.forEach(img => {
            img.addEventListener('load', onLoaded);
        });
        vids.forEach(v => {
            v.addEventListener('loadedmetadata', onLoaded);
            v.addEventListener('loadeddata', onLoaded);
        });
        return () => {
            imgs.forEach(img => {
                img.removeEventListener('load', onLoaded);
            });
            vids.forEach(v => {
                v.removeEventListener('loadedmetadata', onLoaded);
                v.removeEventListener('loadeddata', onLoaded);
            });
        };
    }, [finalMessages]);

    useEffect(() => {
        const el = rightScrollRef.current;
        if (!el) return;
        const raf = requestAnimationFrame(() => {
            autoScrollEnabledRef.current = true;
            el.scrollTop = el.scrollHeight;
        });
        return () => cancelAnimationFrame(raf);
    }, [otherId]);

    useEffect(() => {
        const el = rightScrollRef.current;
        if (!el) return;

        const near = isNearBottom(el);
        const currentIds = new Set(
            (viewRecords || [])
                .map(r => r?.id)
                .filter(id => id != null)
        );

        if (autoScrollEnabledRef.current || near) {
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight;
            });
            seenIdsRef.current = currentIds;
            const maxTime = (viewRecords || []).reduce((acc, r) => {
                const t = r?.createdAt ? new Date(r.createdAt).getTime() : 0;
                return t > acc ? t : acc;
            }, 0);
            lastSeenMaxTimeRef.current = maxTime;
            setNewTip({ visible: false, count: 0 });
        } else {
            const seen = seenIdsRef.current || new Set();
            let inc = 0;
            currentIds.forEach(id => {
                if (!seen.has(id)) inc += 1;
            });
            if (inc > 0) {
                setNewTip({ visible: true, count: inc });
            }
        }
    }, [viewRecords]);

    /** ---------------- 发送文本消息（成功后写缓存） ---------------- */

    const handleSend = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        const body = { text };
        const res = await api.post(`/messages/text/${otherId}`, body, {
            headers: { 'X-User-Id': userId }
        });
        setText('');
        try {
            const j = res.data;
            if (j && j.code === 200 && j.data) {
                const msg = j.data;
                setMessages(prev => mergeMessages(prev, [msg]));
                cacheConversationMessages(userId, otherId, [msg], 1000)
                    .then(() => console.log('[PM] cache after send text, id=', msg.id))
                    .catch(() => { });
            } else {
                alert((j && (j.msg || j.message)) || '发送失败');
            }
        } catch (err) {
            console.warn('parse send text response failed', err);
            alert('发送失败');
        }
        autoScrollEnabledRef.current = true;
        refreshView();
    };

    const onInputKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const fakeEvent = { preventDefault: () => { } };
            handleSend(fakeEvent);
        }
    };

    /** ---------------- 带进度上传 & 发送媒体 ---------------- */

    const uploadFile = (file) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const form = new FormData();
            form.append('file', file);
            const oid = otherId ? String(otherId) : '';
            // 避免大文件经由 Vite 代理导致连接重置：直连后端 Origin
            const backendOrigin = (import.meta.env.VITE_BACKEND_ORIGIN)
                || (typeof window !== 'undefined' ? window.location.origin : '');
            console.log('[PM] uploadFile backendOrigin:', backendOrigin);
            const uploadUrl = oid
                ? `${backendOrigin}/api/messages/upload?otherId=${encodeURIComponent(oid)}`
                : `${backendOrigin}/api/messages/upload`;
            xhr.open('POST', uploadUrl);
            if (userId) xhr.setRequestHeader('X-User-Id', userId);
            try {
                const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
                if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            } catch { /* ignore */ }

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const p = Math.round((e.loaded / e.total) * 100);
                    setUploadProgress(p);
                }
            };
            xhr.onload = () => {
                try {
                    const res = JSON.parse(xhr.responseText || '{}');
                    if (res && res.code === 200 && res.data) {
                        resolve(res.data);
                    } else {
                        reject(new Error(res?.message || '上传失败'));
                    }
                } catch (err) {
                    // 可按需记录日志，这里仅为满足 eslint，避免未使用变量
                    void err;
                    reject(new Error('上传响应解析失败'));
                }
            };
            xhr.onerror = () => reject(new Error('网络错误，上传失败'));
            xhr.send(form);
        });
    };

    const handleFileChosen = async (e, type) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;

        setUploading(true);
        setUploadProgress(0);
        try {
            const url = await uploadFile(file);

            const body = { type, mediaUrl: url, text: '' };
            const res = await api.post(`/messages/media/${otherId}`, body, {
                headers: { 'X-User-Id': userId }
            });

            const j = res.data;
            if (j && j.code === 200 && j.data) {
                const dto = j.data;

                setMessages(prev => {
                    const next = Array.isArray(prev) ? prev.slice() : [];
                    next.push({
                        id: dto.id,
                        senderId: dto.senderId,
                        receiverId: dto.receiverId,
                        text: dto.text || '',
                        mediaUrl: dto.mediaUrl || '',
                        type: dto.type || type,
                        createdAt: dto.createdAt,
                        senderNickname: dto.senderNickname || '你',
                        senderAvatarUrl: dto.senderAvatarUrl || (otherInfo?.avatarUrl || ''),
                        receiverNickname: dto.receiverNickname || otherInfo?.nickname || '',
                        receiverAvatarUrl: dto.receiverAvatarUrl || (otherInfo?.avatarUrl || '')
                    });
                    next.sort((a, b) => {
                        const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return ta - tb;
                    });
                    return next;
                });

                setViewRecords(prev => {
                    const next = Array.isArray(prev) ? prev.slice() : [];
                    next.push({
                        id: dto.id,
                        senderId: dto.senderId,
                        receiverId: dto.receiverId,
                        createdAt: dto.createdAt,
                        recalled: false,
                        displayText: dto.text || ''
                    });
                    next.sort((a, b) => {
                        const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return ta - tb;
                    });
                    return next;
                });

                cacheConversationMessages(userId, otherId, [dto], 1000)
                    .then(() => console.log('[PM] cache after send media, id=', dto.id))
                    .catch(() => { });

                requestAnimationFrame(() => {
                    const el = rightScrollRef.current;
                    if (el) el.scrollTop = el.scrollHeight;
                });
            } else {
                alert((j && (j.message || j.msg)) || '发送失败');
            }
        } catch (err) {
            console.error(err);
            alert('上传或发送失败');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            refreshView();
        }
    };

    const onPickImageClick = () =>
        imageInputRef.current && imageInputRef.current.click();
    const onPickVideoClick = () =>
        videoInputRef.current && videoInputRef.current.click();

    /** ---------------- 撤回/删除/右键菜单 ---------------- */

    const reEditMessage = (msg) => {
        if (!msg || !msg.__originalText) return;
        setText(msg.__originalText);
        requestAnimationFrame(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                const len = inputRef.current.value.length;
                try {
                    inputRef.current.setSelectionRange(len, len);
                } catch (err) {
                    console.warn('setSelectionRange failed', err);
                }
            }
        });
    };

    const openContextMenu = (e, msg) => {
        e.preventDefault();
        setMenu({ visible: true, x: e.clientX, y: e.clientY, msg });
    };

    const closeContextMenu = () =>
        setMenu(m => ({ ...m, visible: false, msg: null }));

    useEffect(() => {
        const onDocClick = () => closeContextMenu();
        const onEsc = (ev) => {
            if (ev.key === 'Escape') closeContextMenu();
        };
        const onScrollAny = () => closeContextMenu();
        document.addEventListener('click', onDocClick);
        document.addEventListener('keydown', onEsc);
        document.addEventListener('scroll', onScrollAny, true);
        window.addEventListener('resize', onScrollAny);
        return () => {
            document.removeEventListener('click', onDocClick);
            document.removeEventListener('keydown', onEsc);
            document.removeEventListener('scroll', onScrollAny, true);
            window.removeEventListener('resize', onScrollAny);
        };
    }, []);

    const recallMessageAction = async (messageId) => {
        closeContextMenu();
        if (!messageId) return;
        try {
            const res = await api.post(`/messages/recall/${messageId}`);
            const j = res.data;
            if (j && (j.code === 200 || j.status === 200)) {
                recalledLocalRef.current.add(normId(messageId));
                setViewRecords(prev =>
                    prev.map(r =>
                        r && normId(r.id) === normId(messageId)
                            ? { ...r, recalled: true }
                            : r
                    )
                );
                refreshView();
            } else {
                alert((j && (j.msg || j.message)) || '撤回失败');
            }
        } catch (err) {
            console.error(err);
            alert('网络错误');
        }
    };

    const deleteMessageAction = async (messageId) => {
        closeContextMenu();
        if (!messageId) return;
        try {
            const res = await api.post(`/messages/delete/${messageId}`);
            const j = res.data;
            if (j && (j.code === 200 || j.status === 200)) {
                setViewRecords(prev => prev.filter(r => r && r.id !== messageId));
                refreshView();
            } else {
                alert((j && (j.msg || j.message)) || '删除失败');
            }
        } catch (err) {
            console.error(err);
            alert('网络错误');
        }
    };

    /** ---------------- 头像 / 会话跳转 ---------------- */

    const gotoConversation = (id) => {
        if (!id || String(id) === String(otherId)) return;
        if (onConversationSelect) {
            onConversationSelect(id);
        } else {
            navigate(`/conversation/${id}`);
        }
    };

    const openProfile = (uid) => {
        if (!uid) return;
        navigate(`/selfspace?userId=${uid}`);
    };

    /** ---------------- URL 处理 ---------------- */

    const toAbsUrl = (u) => {
        if (!u) return '';
        if (/^https?:\/\//i.test(u)) return u;
        const isFiles = u.startsWith('/files/');
        if (isFiles) {
            const loc = window.location;
            const backendOrigin = import.meta.env.VITE_BACKEND_ORIGIN || loc.origin;
            return backendOrigin + u;
        }
        // 兼容后端返回相对文件名或路径（如 "abc.jpg"、"3/abc.jpg"），补齐前缀
        if (!u.startsWith('/')) {
            u = `/files/messages/${u}`;
        }
        // 形如 "/3/abc.jpg" 也补前缀
        if (/^\/[0-9]+\//.test(u)) {
            u = `/files/messages${u}`;
        }
        try {
            return new URL(u, window.location.origin).toString();
        } catch (err) {
            console.warn('toAbsUrl failed', err);
            return u;
        }
    };

    /** ---------------- 输入框高度拖拽 ---------------- */

    const startResize = (e) => {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = inputHeight;
        const anchorMessagesBottom = () => {
            const el = rightScrollRef.current;
            if (!el) return;
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight - el.clientHeight;
            });
        };
        const onMove = (mv) => {
            const delta = startY - mv.clientY;
            const newHeight = Math.min(240, Math.max(56, startHeight + delta));
            if (newHeight !== inputHeight) {
                setInputHeight(newHeight);
                anchorMessagesBottom();
            }
        };
        const onUp = () => {
            anchorMessagesBottom();
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    /** ---------------- SSE/轮询 & 全局事件 ---------------- */

    useEffect(() => {
        if (!otherId || !userId) return;
        let es = null;
        let pollTimer = null;
        const subscribeUrl = `/api/messages/subscribe/${otherId}?userId=${encodeURIComponent(
            userId
        )}&_=${Date.now()}`;
        try {
            es = new EventSource(subscribeUrl);
        } catch (err) {
            console.warn('EventSource init failed, fallback to polling', err);
            es = null;
        }

        const onAny = () => {
            refreshView();
            try {
                window.dispatchEvent(new Event('pm-unread-refresh'));
            } catch (err) {
                console.warn('pm-unread-refresh dispatch failed', err);
            }
        };

        if (es) {
            es.addEventListener('init', onAny);
            es.addEventListener('update', onAny);
            es.onerror = () => {
                if (es) {
                    try {
                        es.close();
                    } catch (err) {
                        console.warn('EventSource close failed', err);
                    }
                    es = null;
                }
                if (!pollTimer) {
                    pollTimer = setInterval(() => {
                        refreshView();
                    }, 5000);
                }
            };
        } else {
            pollTimer = setInterval(() => {
                refreshView();
            }, 5000);
        }

        refreshView();

        return () => {
            if (es) {
                try {
                    es.removeEventListener('init', onAny);
                    es.removeEventListener('update', onAny);
                    es.close();
                } catch (err) {
                    console.warn('EventSource cleanup failed', err);
                }
            }
            if (pollTimer) clearInterval(pollTimer);
        };
    }, [otherId, userId, refreshView]);

    useEffect(() => {
        if (!userId) return;

        const onPm = (ev) => {
            const data = ev?.detail || {};
            const me = Number(userId);
            const partnerId = String(
                me === Number(data.receiverId) ? data.senderId : data.receiverId
            );

            fetchConversations()
                .then(j => {
                    if (j && j.code === 200 && j.data?.list) {
                        const raw = j.data.list;
                        const seen = new Set();
                        const uniq = raw.filter(x => {
                            if (!x || !x.otherId) return false;
                            const k = String(x.otherId);
                            if (seen.has(k)) return false;
                            seen.add(k);
                            return true;
                        });
                        setConversations(uniq);
                        cacheConversationSummaries(userId, uniq).catch(() => { });
                    }
                })
                .catch((err) => {
                    console.warn('pm-event load list failed', err);
                });

            if (String(partnerId) === String(otherId)) {
                refreshView();
                api.get(`/messages/conversation/${otherId}`, {
                    headers: { 'X-User-Id': userId }
                })
                    .then(res => {
                        const j = res.data;
                        if (j && j.code === 200 && j.data?.list) {
                            setMessages(prev => {
                                const merged = mergeMessages(prev, j.data.list);
                                return merged;
                            });
                            cacheConversationMessages(userId, otherId, j.data.list, 1000).catch(
                                () => { }
                            );
                        }
                    })
                    .catch((err) => {
                        console.warn('pm-event load messages failed', err);
                    });
                markReadCurrent();
            }
        };

        window.addEventListener('pm-event', onPm);
        return () => window.removeEventListener('pm-event', onPm);
    }, [userId, otherId, refreshView, markReadCurrent]);

    /** ---------------- “新消息”按钮 ---------------- */

    const jumpToLatest = () => {
        const el = rightScrollRef.current;
        if (!el) return;
        autoScrollEnabledRef.current = true;
        el.scrollTop = el.scrollHeight;
        seenIdsRef.current = new Set(
            (viewRecords || [])
                .map(r => r?.id)
                .filter(id => id != null)
        );
        const maxTime = (viewRecords || []).reduce((acc, r) => {
            const t = r?.createdAt ? new Date(r.createdAt).getTime() : 0;
            return t > acc ? t : acc;
        }, 0);
        lastSeenMaxTimeRef.current = maxTime;
        setNewTip({ visible: false, count: 0 });
    };

    /** ---------------- 渲染 ---------------- */

    return (
        <div className="conversation-detail-page">
            <div
                className="conversation-detail-container two-columns"
                style={{ ['--input-height']: `${inputHeight}px` }}
            >
                {/* 左侧会话列表 */}
                <aside
                    className="conversation-sidebar"
                    aria-label="会话列表"
                >
                    <div className="conversation-sidebar-header">
                        <div className="sidebar-search-wrapper">
                            <input 
                                type="text" 
                                className="sidebar-search-input" 
                                placeholder="Search conversations..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button className="sidebar-search-btn" title="Search">
                                🔍
                            </button>
                        </div>
                    </div>
                    <div className="conversation-sidebar-content" ref={leftScrollRef}>
                        {filteredConversations.map(c => (
                        <button
                            key={c.otherId}
                            className={`conversation-sidebar-item${String(c.otherId) ===
                                String(otherId)
                                ? ' active'
                                : ''}`}
                            title={c.nickname || ''}
                            onClick={() => gotoConversation(c.otherId)}
                        >
                            <img
                                src={isValidAvatar(c.avatarUrl) ? toAbsUrl(c.avatarUrl) : getDefaultAvatar(c.otherId)}
                                alt="avatar"
                                className="conversation-sidebar-avatar"
                                onError={(ev) => {
                                    const target = ev.target;
                                    target.onerror = null;
                                    target.src = getDefaultAvatar(c.otherId);
                                }}
                                onContextMenu={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const blocked = await checkBlockStatus(c.otherId);
                                    setSidebarMenu({
                                        visible: true,
                                        x: e.clientX,
                                        y: e.clientY,
                                        user: c,
                                        blocked
                                    });
                                }}
                            />
                            <span className="conversation-sidebar-name">
                                {c.nickname || `用户${c.otherId}`}
                            </span>
                            {c.unreadCount > 0 && (
                                <span
                                    className="conversation-sidebar-badge"
                                    title={`未读 ${c.unreadCount}`}
                                >
                                    {c.unreadCount > 99 ? '99+' : c.unreadCount}
                                </span>
                            )}
                            {c.blocked && (
                                <span className="conversation-sidebar-blocked" title="你已拉黑此用户">
                                    已拉黑
                                </span>
                            )}
                        </button>
                    ))}
                    </div>
                </aside>

                <div className="conversation-main-content">
                    {!otherId ? (
                        <div className="conversation-empty-state" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'#999'}}>
                            <div style={{fontSize:'48px',marginBottom:'16px'}}>💬</div>
                            <div>选择一个联系人开始聊天</div>
                        </div>
                    ) : (
                        <>
                    {/* 顶部用户信息栏 - 补充 Header */}
                    <div className="conversation-detail-header">
                        <img 
                            src={isValidAvatar(otherInfo.avatarUrl) ? resolveUrl(otherInfo.avatarUrl) : getDefaultAvatar(otherId)} 
                            alt={otherInfo.nickname}
                            className="conversation-header-avatar"
                            onError={(e) => { e.target.onerror = null; e.target.src = getDefaultAvatar(otherId); }}
                        />
                        <span className="conversation-header-name">
                            {otherInfo.nickname || `用户${otherId}`}
                        </span>
                    </div>

                    {/* 右侧消息区 */}
                    <div
                        className="conversation-detail-list"
                        ref={rightScrollRef}
                        onScroll={handleScroll}
                        style={{ ['--input-height']: inputHeight + 'px' }}
                    >
                        {isLoadingHistory && (
                            <div
                                style={{
                                    textAlign: 'center',
                                    padding: '10px',
                                    color: '#999'
                                }}
                            >
                                加载历史消息...
                            </div>
                        )}

                        {finalMessages.map(msg => {
                            const isSelf = msg.senderId === Number(userId);
                            const recalled = !!msg.__recalled;

                            if (recalled) {
                                return (
                                    <div className="conversation-detail-recall" key={msg.id}>
                                        <span className="txt">
                                            {isSelf ? '你撤回了一条消息' : '对方撤回了一条消息'}
                                        </span>
                                        {isSelf && msg.__originalText && (
                                            <button
                                                type="button"
                                                className="reedit"
                                                onClick={() => reEditMessage(msg)}
                                                title="重新编辑并发送"
                                            >
                                                重新编辑
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="recall-close"
                                            onClick={() => deleteMessageAction(msg.id)}
                                            title="删除这条记录"
                                        >
                                            ×
                                        </button>
                                    </div>
                                );
                            }

                            const hasPreview = msg.blogPreview && msg.blogPreview.blogId;
                            let blogIdFromText = null;
                            if (!hasPreview && msg.text) {
                                const match = msg.text.match(/\/post\/(\d+)/);
                                if (match) blogIdFromText = match[1];
                            }

                            return (
                                <div
                                    key={msg.id}
                                    className={`conversation-detail-msg${isSelf ? ' self' : ''}`}
                                    onContextMenu={(e) => openContextMenu(e, msg)}
                                    title="右键可撤回/删除"
                                >
                                    <div className="conversation-detail-msg-meta">
                                        <img
                                            src={
                                                isValidAvatar(msg.senderAvatarUrl)
                                                    ? resolveUrl(msg.senderAvatarUrl)
                                                    : (!isSelf && isValidAvatar(otherInfo.avatarUrl))
                                                        ? resolveUrl(otherInfo.avatarUrl)
                                                        : getDefaultAvatar(msg.senderId)
                                            }
                                            className={`conversation-detail-msg-avatar${!isSelf ? ' clickable' : ''}`}
                                            title={!isSelf ? '查看主页' : undefined}
                                            onClick={!isSelf ? () => openProfile(msg.senderId) : undefined}
                                            onError={(ev) => {
                                                const target = ev.target;
                                                target.onerror = null;
                                                target.src = getDefaultAvatar(msg.senderId);
                                            }}
                                        />
                                        {/* 移除昵称显示 */}
                                    </div>

                                    {hasPreview ? (
                                        <div className="pm-blog-preview-wrapper" style={{ width: '100%', maxWidth: '500px' }}>
                                            <ArticleCardFetcher
                                                blogId={msg.blogPreview.blogId}
                                                fallback={{
                                                    id: msg.blogPreview.blogId,
                                                    title: msg.blogPreview.title,
                                                    coverImageUrl: msg.blogPreview.coverImageUrl,
                                                    authorAvatarUrl: msg.blogPreview.authorAvatarUrl,
                                                    authorNickname: msg.blogPreview.authorNickname,
                                                    authorId: msg.blogPreview.authorId,
                                                    likeCount: msg.blogPreview.likeCount,
                                                    commentCount: msg.blogPreview.commentCount,
                                                    viewCount: msg.blogPreview.viewCount,
                                                    favoriteCount: msg.blogPreview.favoriteCount,
                                                    shareCount: msg.blogPreview.shareCount,
                                                    createdAt: msg.blogPreview.createdAt
                                                }}
                                                mode="vertical"
                                                className="chat-article-card"
                                                style={{ margin: 0, background: '#fff', borderRadius: '12px' }}
                                            />
                                        </div>
                                    ) : blogIdFromText ? (
                                        <div className="pm-blog-preview-wrapper" style={{ width: '100%', maxWidth: '500px' }}>
                                            <ArticleCardFetcher blogId={blogIdFromText} mode="vertical" className="chat-article-card" style={{ margin: 0, background: '#fff', borderRadius: '12px' }} />
                                        </div>
                                    ) : (
                                        <div className="conversation-detail-msgtext">
                                            {/* 文本 / 媒体 */}
                                            {msg?.type === 'IMAGE' && msg?.mediaUrl ? (
                                                <img
                                                    className="conversation-detail-msgmedia"
                                                    src={toAbsUrl(msg.mediaUrl)}
                                                    alt="image"
                                                    onError={(ev) => {
                                                        const target = ev.target;
                                                        target.onerror = null;
                                                        target.src = '';
                                                    }}
                                                />
                                            ) : msg?.type === 'VIDEO' && msg?.mediaUrl ? (
                                                <video
                                                    className="conversation-detail-msgmedia"
                                                    src={toAbsUrl(msg.mediaUrl)}
                                                    controls
                                                    preload="metadata"
                                                    playsInline
                                                    controlsList="nodownload"
                                                />
                                            ) : (
                                                msg?.text ||
                                                (msg?.type === 'IMAGE'
                                                    ? '[图片]'
                                                    : msg?.type === 'VIDEO'
                                                        ? '[视频]'
                                                        : '')
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* 移除时间显示 */}
                                </div>
                            );
                        })}

                        {newTip.visible && newTip.count > 0 && (
                            <button
                                type="button"
                                className="conversation-detail-sendbtn"
                                style={{
                                    position: 'sticky',
                                    float: 'right',
                                    bottom: '12px',
                                    right: '12px',
                                    marginTop: '12px',
                                    zIndex: 10
                                }}
                                onClick={jumpToLatest}
                                title="回到底部查看最新消息"
                            >
                                {newTip.count} 条新消息
                            </button>
                        )}
                    </div>

                    {/* 右侧输入区 */}
                    <form
                        className="conversation-detail-form"
                        onSubmit={handleSend}
                        style={{ ['--input-height']: inputHeight + 'px' }}
                    >
                        <div
                            className="conversation-inputbox-resize"
                            title="拖动上边界可加长输入框"
                            onMouseDown={startResize}
                        ></div>

                        <div className="conversation-toolbar" style={{position: 'relative'}}>
                            <button
                                type="button"
                                className="icon-btn emoji-btn"
                                title="表情"
                                disabled={uploading}
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            >😊</button>
                            {showEmojiPicker && (
                                <div className="emoji-picker-popover">
                                    {emojiList.map(emoji => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            className="emoji-item"
                                            onClick={() => onEmojiClick(emoji)}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <button
                                type="button"
                                className="icon-btn icon-image"
                                onClick={onPickImageClick}
                                title="发送图片"
                                disabled={uploading}
                            ></button>
                            <button
                                type="button"
                                className="icon-btn icon-video"
                                onClick={onPickVideoClick}
                                title="发送视频"
                                disabled={uploading}
                            ></button>
                        </div>

                        <textarea
                            ref={inputRef}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={onInputKeyDown}
                            placeholder=""
                            className="conversation-detail-input"
                            disabled={uploading}
                        />

                        <div className="conversation-actions">
                            <span style={{ fontSize: '12px', color: '#999', marginRight: 'auto', marginLeft: '12px' }}>按 Enter 发送</span>
                            <button
                                type="submit"
                                className="conversation-detail-sendbtn"
                                disabled={uploading}
                            >
                                发送
                            </button>
                        </div>

                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileChosen(e, 'IMAGE')}
                        />
                        <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileChosen(e, 'VIDEO')}
                        />
                    </form>

                    {uploading && (
                        <div
                            className="conversation-detail-uploadprogress"
                            aria-live="polite"
                        >
                            <div
                                className="bar"
                                style={{ width: `${uploadProgress}%` }}
                            />
                            <span className="pct">{uploadProgress}%</span>
                        </div>
                    )}
                        </>
                    )}
                </div>
            </div>

            {menu.visible && menu.msg && (
                <div
                    className="msg-context-menu"
                    style={{ left: menu.x, top: menu.y }}
                >
                    {menu.msg.senderId === Number(userId) &&
                        !menu.msg.__recalled &&
                        Number.isFinite(new Date(menu.msg.createdAt).getTime()) &&
                        Date.now() - new Date(menu.msg.createdAt).getTime() <=
                        2 * 60 * 1000 && (
                            <button onClick={() => recallMessageAction(menu.msg.id)}>撤回</button>
                        )}
                    <button onClick={() => deleteMessageAction(menu.msg.id)}>删除</button>
                </div>
            )}

            {sidebarMenu.visible && sidebarMenu.user && (
                <div
                    className="sidebar-context-menu"
                    style={{
                        position: 'fixed',
                        left: sidebarMenu.x,
                        top: sidebarMenu.y,
                        zIndex: 1200,
                        background: '#fff',
                        border: '1px solid #ddd',
                        padding: '6px',
                        borderRadius: 4
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                >
                    <button
                        onClick={async () => {
                            const targetId = sidebarMenu.user.otherId;
                            const result = await toggleBlockUser(targetId);
                            setSidebarMenu(s => ({ ...s, visible: false, user: null, blocked: !!result }));
                        }}
                    >
                        {sidebarMenu.blocked ? '取消拉黑该用户' : '拉黑该用户'}
                    </button>
                </div>
            )}
        </div>
    );
}