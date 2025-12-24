import { useEffect, useState } from 'react';
import resolveUrl from '@utils/resolveUrl';

function safeGetItem(key) {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * useAuthState
 * - 从 localStorage 读取登录状态与头像地址
 * - 监听 storage 与自定义 auth-changed 事件以便跨组件/页面及时刷新
 */
export function useAuthState() {
  const read = () => {
    const token = safeGetItem('token');
    const rawAvatar = safeGetItem('avatarUrl') || '';
    const nickname = safeGetItem('nickname') || '';
    const username = safeGetItem('username') || '';
    const gender = safeGetItem('gender') || 'other';
    const rawBackground = safeGetItem('backgroundUrl') || '';
    const userId = safeGetItem('userId') || '';
    const avatar = rawAvatar ? resolveUrl(rawAvatar) : '';
    const backgroundUrl = rawBackground ? resolveUrl(rawBackground) : '';
    return {
      isLoggedIn: !!token,
      user: {
        id: userId,
        username,
        avatar,
        nickname,
        gender,
        backgroundUrl,
      },
    };
  };

  const [{ isLoggedIn, user }, setState] = useState(read);

  useEffect(() => {
    const onStorage = (e) => {
      if (!e || (e.key !== null && !['token', 'avatarUrl', 'nickname', 'username', 'gender', 'backgroundUrl'].includes(e.key))) return;
      setState(read());
    };
    const onAuthChanged = () => setState(read());
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth-changed', onAuthChanged);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth-changed', onAuthChanged);
    };
  }, []);

  // 退出登录
  const logout = () => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('avatarUrl');
        localStorage.removeItem('nickname');
        localStorage.removeItem('username');
        localStorage.removeItem('gender');
        localStorage.removeItem('backgroundUrl');
        localStorage.removeItem('userId');
      } catch {
        // ignore
      }
    }
    window.dispatchEvent(new Event('auth-changed'));
  };

  return { isLoggedIn, user, logout };
}

export function setAuthState({ token, userId, username, avatarUrl, nickname, gender, backgroundUrl }) {
  if (typeof localStorage === 'undefined') return;
  try {
    if (token != null) localStorage.setItem('token', token);
    if (userId != null) localStorage.setItem('userId', String(userId));
    if (username != null) localStorage.setItem('username', username || '');
    if (avatarUrl != null) localStorage.setItem('avatarUrl', avatarUrl || '');
    if (nickname != null) localStorage.setItem('nickname', nickname || '');
    if (gender != null) localStorage.setItem('gender', gender || 'other');
    if (backgroundUrl != null) localStorage.setItem('backgroundUrl', backgroundUrl || '');
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event('auth-changed'));
}

