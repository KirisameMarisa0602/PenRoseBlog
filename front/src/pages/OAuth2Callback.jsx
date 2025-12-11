import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { fetchUserProfile } from '@utils/api/userService';
import { setAuthState } from '@hooks/useAuthState';

export default function OAuth2Callback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('正在登录...');

  useEffect(() => {
    const handleOAuth2Callback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const storedState = localStorage.getItem('oauth_state');

      // Determine provider from URL path
      const path = window.location.pathname;
      let provider = '';
      if (path.includes('/qq/')) {
        provider = 'QQ';
      } else if (path.includes('/wechat/')) {
        provider = 'WECHAT';
      } else if (path.includes('/github/')) {
        provider = 'GITHUB';
      } else {
        setMessage('未知的登录提供者');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      // CSRF protection
      if (state !== storedState) {
        setMessage('状态验证失败，请重试');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      if (!code) {
        setMessage('未获取到授权码');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      try {
        // Send code to backend
        const response = await fetch('/api/auth/oauth2/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state, provider }),
        });

        const res = await response.json();

        if (res.code === 200 && res.data) {
          let token = res.data;
          if (typeof token === 'object' && token !== null && token.token) {
            token = token.token;
          }

          localStorage.clear();
          localStorage.removeItem('oauth_state');

          let userId = null;
          try {
            const payload = jwtDecode(token);
            userId = payload.userId || payload.id || payload.sub || null;
          } catch {
            // 解析失败
          }

          let profile = null;
          if (userId) {
            try {
              const profileRes = await fetchUserProfile(userId);
              profile = profileRes?.data || null;
            } catch {
              profile = null;
            }
          }

          setAuthState({
            token,
            userId,
            avatarUrl: profile?.avatarUrl,
            nickname: profile?.nickname,
            gender: profile?.gender,
            backgroundUrl: profile?.backgroundUrl,
          });

          setMessage('登录成功，正在跳转...');
          setTimeout(() => navigate('/home'), 1000);
        } else {
          setMessage(res.msg || '登录失败');
          setTimeout(() => navigate('/'), 2000);
        }
      } catch (err) {
        console.error('OAuth2 callback error:', err);
        setMessage('登录失败，请重试');
        setTimeout(() => navigate('/'), 2000);
      }
    };

    handleOAuth2Callback();
  }, [searchParams, navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '20px',
      color: '#666'
    }}>
      {message}
    </div>
  );
}
