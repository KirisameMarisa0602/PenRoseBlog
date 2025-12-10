import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { notificationApi } from '@utils/api/notificationApi';

/**
 * 通知铃组件：
 *
 * - 通过 /api/friends/subscribe 的 SSE 接收所有 NotificationDTO；
 * - 只监听命名事件 "notification"，避免 default message 导致一次操作计两条；
 * - 每条 NotificationDTO 视为一条通知，累加计数；
 * - 点击后跳转到 /notifications 页面（通知中心）。
 *
 * 注意：真正的“写入本地缓存”在 globalNotificationSubscriber.js 中集中处理；
 * 这里仅做 badge 计数展示，避免每个页面都实现缓存逻辑。
 */
export default function NotificationBell() {
    const [count, setCount] = useState(0);
    const token =
        typeof localStorage !== 'undefined'
            ? localStorage.getItem('token')
            : null;
    const userId =
        typeof localStorage !== 'undefined'
            ? localStorage.getItem('userId')
            : null;
    const storageKey = userId ? `notification_unread_count_${userId}` : null;
    const navigate = useNavigate();

    // 初始化时从 API 读取未读数
    useEffect(() => {
        if (userId) {
            notificationApi.getUnreadCount().then(res => {
                if (res.code === 200) {
                    setCount(res.data);
                    if (storageKey) localStorage.setItem(storageKey, res.data);
                }
            }).catch(err => console.error("Failed to fetch unread count", err));
        }
    }, [userId, storageKey]);

    useEffect(() => {
        if (!token || !userId) {
            setCount(0);
            return;
        }

        let es = null;
        const tokenParam = token ? `?token=${encodeURIComponent(token)}` : `?token=`;

        try {
            es = new EventSource(`/api/friends/subscribe${tokenParam}`);
        } catch {
            es = null;
        }

        if (!es) return;

        const onNotification = (e) => {
            try {
                const data = JSON.parse(e.data || '{}');
                if (!data) return;

                // 忽略私信类型的通知，私信使用专门的私信逻辑处理（避免铃铛重复接收到私信）
                if (data.type === 'PRIVATE_MESSAGE') {
                    return;
                }

                // 只统计发给当前用户的通知
                if (
                    data.receiverId != null &&
                    userId &&
                    String(data.receiverId) !== String(userId)
                ) {
                    return;
                }

                // 新通知，未读数+1，并写入 localStorage
                setCount((prev) => {
                    const next = prev + 1;
                    if (storageKey) localStorage.setItem(storageKey, next);
                    return next;
                });
            } catch {
                // ignore
            }
        };

        es.addEventListener('notification', onNotification);

        es.onerror = () => {
            if (es) {
                try {
                    es.close();
                } catch {
                    // ignore
                }
                es = null;
            }
        };

        return () => {
            if (es) {
                es.removeEventListener('notification', onNotification);
                try {
                    es.close();
                } catch {
                    // ignore
                }
            }
        };
    }, [token, userId, storageKey]);

    // 点击铃铛时清零未读数
    const handleClick = (e) => {
        setCount(0);
        if (storageKey) localStorage.setItem(storageKey, 0);
        // 跳转
        navigate('/notifications');
        e.preventDefault();
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                className="notification-bell"
                type="button"
                aria-label="查看通知"
                style={{ display: 'inline-block' }}
                onClick={handleClick}
            >
                🔔
            </button>
            {count > 0 && (
                <span
                    style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        background: '#ff4d4f',
                        color: '#fff',
                        borderRadius: 12,
                        padding: '2px 6px',
                        fontSize: 12,
                    }}
                >
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </div>
    );
}