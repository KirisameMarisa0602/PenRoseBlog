import React, { useEffect, useState } from 'react';
import '@styles/message/MessageList.css';
import { fetchConversations } from '@utils/api/messageService';
import { useAuthState } from '@hooks/useAuthState';
import resolveUrl from '@utils/resolveUrl';

export default function MessageList() {
  const [conversations, setConversations] = useState([]);
  const { user } = useAuthState();
  const userId = user?.id || null;

  useEffect(() => {
    if (!userId) return;
    fetchConversations()
      .then(j => { if (j && j.code === 200) setConversations(j.data.list || []); })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    const refresh = () => {
      if (!userId) return;
      fetchConversations()
        .then(j => { if (j && j.code === 200) setConversations(j.data.list || []); })
        .catch(() => {});
    };
    window.addEventListener('pm-event', refresh);
    window.addEventListener('pm-unread-refresh', refresh);
    return () => {
      window.removeEventListener('pm-event', refresh);
      window.removeEventListener('pm-unread-refresh', refresh);
    };
  }, [userId]);

  return (
    <div className="message-list-page">
      {/* 顶部导航占位已由全局 `index.css` 的 `padding-top` 提供，无需额外占位元素 */}
      <div className="message-list-container">
        <h2 className="message-list-title">我的私信</h2>
        <ul className="message-list-ul">
          {conversations.length === 0 ? (
            <li className="message-list-empty">暂无会话</li>
          ) : (
            conversations.map(conv => (
              <li key={conv.otherId} className="message-list-item">
                <a href={`/conversation/${conv.otherId}`} className="message-list-link">
                  <img
                    src={resolveUrl(conv.avatarUrl || '') || '/imgs/loginandwelcomepanel/1.png'}
                    alt="avatar"
                    className="message-list-avatar"
                    onError={(e) => { e.target.onerror = null; e.target.src = '/imgs/loginandwelcomepanel/1.png'; }}
                  />
                  <span className="message-list-nickname">{conv.nickname}</span>
                  <span className="message-list-lastmsg">{conv.lastMessage}</span>
                  {conv.unreadCount > 0 && (
                    <span className="message-badge">{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>
                  )}
                </a>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
