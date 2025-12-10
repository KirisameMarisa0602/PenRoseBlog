import { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchComments, addComment, addReply, fetchReplies } from '@utils/api/commentService';
import { useAuthState } from './useAuthState';

export default function useArticleComments(postId) {
  const { user, isLoggedIn } = useAuthState();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const j = await fetchComments(postId, { size: 10000 });
      if (j && j.code === 200) {
        const list = Array.isArray(j.data) ? j.data : (j.data?.list || j.data?.records || j.data?.rows || []);
        setComments(list);
        setError(null);
      } else {
        setError(j?.message || j?.msg || '获取评论失败');
      }
    } catch (e) {
      console.error(e);
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  const submitComment = useCallback(async (content) => {
    if (!isLoggedIn || !user?.id) { alert('请先登录'); return false; }
    const j = await addComment({ postId, content, userId: user.id });
    if (j && j.code === 200) { await load(); return true; }
    alert(j?.message || j?.msg || '发表评论失败');
    return false;
  }, [isLoggedIn, user?.id, postId, load]);

  const submitReply = useCallback(async (commentId, content, mentionUserId) => {
    if (!isLoggedIn || !user?.id) { alert('请先登录'); return false; }
    const j = await addReply({ commentId, content, mentionUserId, userId: user.id });
    if (j && j.code === 200) { await load(); return true; }
    alert(j?.message || j?.msg || '回复失败');
    return false;
  }, [isLoggedIn, user?.id, load]);

  const getReplies = useCallback(async (commentId) => {
    try {
      const jr = await fetchReplies(commentId, { size: 10000 });
      if (jr && jr.code === 200) {
        // 兼容多种分页返回格式：直接数组、Page对象(list/records/rows/data)
        const raw = jr.data;
        if (Array.isArray(raw)) return raw;
        if (raw && Array.isArray(raw.list)) return raw.list;
        if (raw && Array.isArray(raw.records)) return raw.records;
        if (raw && Array.isArray(raw.rows)) return raw.rows;
        if (raw && Array.isArray(raw.data)) return raw.data;
        return [];
      }
    } catch (e) {
      console.error('[getReplies] error', e);
    }
    return [];
  }, []);

  return useMemo(() => ({ comments, loading, error, reload: load, submitComment, submitReply, getReplies }), [comments, loading, error, load, submitComment, submitReply, getReplies]);
}
