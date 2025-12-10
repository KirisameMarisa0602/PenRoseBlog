// 更贴近业务的封装，供 ConversationDetail.jsx 调用。

import {
    saveMessagesToCache,
    loadRecentMessagesFromCache,
    upsertConversationSummary,
    loadConversationSummaries,
    buildConversationKey
} from './pmIndexedDb';

/**
 * 从本地缓存预加载某会话的最近 N 条消息。
 */
export async function preloadConversationMessages(meId, otherId, limit = 1000) {
    if (!meId || !otherId) return [];
    try {
        const rows = await loadRecentMessagesFromCache(meId, otherId, limit);
        rows.sort((a, b) => {
            const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
            return ta - tb;
        });
        return rows;
    } catch (e) {
        console.error('[localPmCacheService] preloadConversationMessages error', e);
        return [];
    }
}

/**
 * 将从后端拉到的一页消息合并写入本地缓存。
 */
export async function cacheConversationMessages(meId, otherId, messages, limitPerConversation = 1000) {
    if (!meId || !otherId) return;
    try {
        await saveMessagesToCache(meId, otherId, messages, limitPerConversation);
    } catch (e) {
        console.error('[localPmCacheService] cacheConversationMessages error', e);
    }
}

/**
 * 根据 /conversation/list 响应，写入/更新本地会话摘要。
 */
export async function cacheConversationSummaries(meId, list) {
    if (!meId || !Array.isArray(list)) return;
    try {
        for (const c of list) {
            if (!c || c.otherId == null) continue;
            const conversationKey = buildConversationKey(meId, c.otherId);
            await upsertConversationSummary({
                conversationKey,
                otherId: c.otherId,
                nickname: c.nickname || '',
                avatarUrl: c.avatarUrl || '',
                lastMessage: c.lastMessage || '',
                lastAt: c.lastAt || null,
                unreadCount: c.unreadCount || 0
            });
        }
    } catch (e) {
        console.error('[localPmCacheService] cacheConversationSummaries error', e);
    }
}

/**
 * 读取本地缓存的所有会话摘要。
 */
export async function loadCachedConversationSummaries() {
    try {
        return await loadConversationSummaries();
    } catch (e) {
        console.error('[localPmCacheService] loadCachedConversationSummaries error', e);
        return [];
    }
}