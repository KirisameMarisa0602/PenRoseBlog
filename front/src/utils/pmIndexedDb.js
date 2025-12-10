// 基于原生 IndexedDB 的轻量封装，用于私信本地缓存。

const DB_NAME = 'pm_db_v1';
const DB_VERSION = 1;

const STORE_MESSAGES = 'messages';
const STORE_CONVERSATIONS = 'conversations';
const STORE_META = 'meta';

let dbPromise = null;

export function openPmDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB not supported'));
            return;
        }

        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
                const store = db.createObjectStore(STORE_MESSAGES, {
                    keyPath: 'id'
                });
                // 复合索引：conversationKey + createdAt(毫秒数)
                store.createIndex('by_conversation', 'conversationKey', { unique: false });
                store.createIndex(
                    'by_conversation_createdAt',
                    ['conversationKey', 'createdAt'],
                    { unique: false }
                );
            }

            if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
                const store = db.createObjectStore(STORE_CONVERSATIONS, {
                    keyPath: 'conversationKey'
                });
                store.createIndex('by_lastAt', 'lastAt', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORE_META)) {
                db.createObjectStore(STORE_META, { keyPath: 'conversationKey' });
            }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return dbPromise;
}

export function buildConversationKey(meId, otherId) {
    return `${String(meId)}:${String(otherId)}`;
}

/**
 * 批量写入消息到本地。
 */
export async function saveMessagesToCache(meId, otherId, messages, limitPerConversation = 1000) {
    if (!Array.isArray(messages) || messages.length === 0) return;
    const db = await openPmDb();
    const conversationKey = buildConversationKey(meId, otherId);

    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_MESSAGES, STORE_META], 'readwrite');
        const msgStore = tx.objectStore(STORE_MESSAGES);
        const metaStore = tx.objectStore(STORE_META);

        messages.forEach((m) => {
            if (!m || m.id == null) return;
            const created =
                m.createdAt != null
                    ? // 统一转成毫秒时间戳（数字）
                    typeof m.createdAt === 'number'
                        ? m.createdAt
                        : new Date(m.createdAt).getTime() || Date.now()
                    : Date.now();

            const record = {
                ...m,
                createdAt: created,
                conversationKey
            };
            msgStore.put(record);
        });

        metaStore.get(conversationKey).onsuccess = (ev) => {
            const oldMeta = ev.target.result || {};
            const nextMeta = {
                ...oldMeta,
                conversationKey,
                initialized: true
            };
            metaStore.put(nextMeta);
        };

        tx.oncomplete = async () => {
            try {
                await trimMessagesIfNeeded(conversationKey, limitPerConversation);
                resolve();
            } catch (e) {
                console.error('[pmIndexedDb] trim error', e);
                resolve();
            }
        };
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * 读取最近 N 条（按时间升序）。
 */
export async function loadRecentMessagesFromCache(meId, otherId, limit = 1000) {
    const db = await openPmDb();
    const conversationKey = buildConversationKey(meId, otherId);

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_MESSAGES, 'readonly');
        const store = tx.objectStore(STORE_MESSAGES);
        const index = store.index('by_conversation_createdAt');

        // 使用毫秒时间戳作为范围：从 0 到一个足够大的时间（比如 8.7e15）
        const lower = [conversationKey, 0];
        const upper = [conversationKey, 8_640_000_000_000_000]; // 约公元 275760 年

        const range = IDBKeyRange.bound(lower, upper);

        const result = [];
        index.openCursor(range, 'next').onsuccess = (event) => {
            const cursor = event.target.result;
            if (!cursor) {
                if (result.length > limit) {
                    resolve(result.slice(result.length - limit));
                } else {
                    resolve(result);
                }
                return;
            }
            result.push(cursor.value);
            cursor.continue();
        };

        tx.onerror = () => reject(tx.error);
    });
}

/**
 * 裁剪超出 limit 的旧消息。
 */
export async function trimMessagesIfNeeded(conversationKey, limit) {
    const db = await openPmDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_MESSAGES, 'readwrite');
        const store = tx.objectStore(STORE_MESSAGES);
        const index = store.index('by_conversation_createdAt');

        const lower = [conversationKey, 0];
        const upper = [conversationKey, 8_640_000_000_000_000];

        const range = IDBKeyRange.bound(lower, upper);

        const allKeys = [];
        index.openKeyCursor(range, 'next').onsuccess = (event) => {
            const cursor = event.target.result;
            if (!cursor) {
                const over = allKeys.length - limit;
                if (over > 0) {
                    for (let i = 0; i < over; i++) {
                        store.delete(allKeys[i]);
                    }
                }
                return;
            }
            allKeys.push(cursor.primaryKey);
            cursor.continue();
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * 会话摘要 upsert。
 */
export async function upsertConversationSummary(conversation) {
    if (!conversation || !conversation.conversationKey) return;
    const db = await openPmDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
        const store = tx.objectStore(STORE_CONVERSATIONS);
        store.put(conversation);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * 按 lastAt 降序读取会话摘要。
 */
export async function loadConversationSummaries() {
    const db = await openPmDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CONVERSATIONS, 'readonly');
        const store = tx.objectStore(STORE_CONVERSATIONS);
        const index = store.index('by_lastAt');
        const list = [];

        index.openCursor(null, 'prev').onsuccess = (event) => {
            const cursor = event.target.result;
            if (!cursor) {
                resolve(list);
                return;
            }
            list.push(cursor.value);
            cursor.continue();
        };

        tx.onerror = () => reject(tx.error);
    });
}

/**
 * 清空某个会话缓存（目前没在组件里用到）。
 */
export async function clearConversationCache(meId, otherId) {
    const db = await openPmDb();
    const conversationKey = buildConversationKey(meId, otherId);
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_MESSAGES, STORE_META, STORE_CONVERSATIONS], 'readwrite');
        const msgStore = tx.objectStore(STORE_MESSAGES);
        const metaStore = tx.objectStore(STORE_META);
        const convStore = tx.objectStore(STORE_CONVERSATIONS);

        const index = msgStore.index('by_conversation');
        const range = IDBKeyRange.only(conversationKey);
        index.openKeyCursor(range).onsuccess = (event) => {
            const cursor = event.target.result;
            if (!cursor) return;
            msgStore.delete(cursor.primaryKey);
            cursor.continue();
        };

        metaStore.delete(conversationKey);
        convStore.delete(conversationKey);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}