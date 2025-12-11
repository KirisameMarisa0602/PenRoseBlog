import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import '@styles/welcome/Welcome.css';
import { login, fetchUserProfile, register } from '@utils/api/userService';
import { setAuthState } from '@hooks/useAuthState';

export default function Welcome() {
  const navigate = useNavigate();
  const [showRegister, setShowRegister] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return !!localStorage.getItem('rememberLogin');
  });
  const [loginData, setLoginData] = useState(() => {
    const saved = localStorage.getItem('rememberLogin');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { username: '', password: '' };
      }
    }
    return { username: '', password: '' };
  });
  const [registerData, setRegisterData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    gender: '',
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const [phoneLoginData, setPhoneLoginData] = useState({
    phoneNumber: '',
    verificationCode: '',
  });
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 2000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);
  const genderItems = [
    { key: '男', img: '/imgs/loginandwelcomepanel/1.png' },
    { key: '女', img: '/imgs/loginandwelcomepanel/2.png' },
    { key: '保密', img: '/imgs/loginandwelcomepanel/3.png' },
  ];
  const selectedGenderIndex = Math.max(0, genderItems.findIndex(g => g.key === registerData.gender));

  // 登录逻辑
  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');
    try {
      const res = await login({ username: loginData.username, password: loginData.password });
      setMessage(res.msg);
      setMessageType(res.code === 200 ? 'success' : 'error');
      if (res.code === 200 && res.data) {
        let token = res.data;
        if (typeof token === 'object' && token !== null && token.token) {
          token = token.token;
        }
        // 登录成功后强制清理 localStorage，避免多账号残留
        localStorage.clear();

        // 解析 userId（假设JWT里有userId、id或sub字段）
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
        if (rememberMe) {
          localStorage.setItem('rememberLogin', JSON.stringify({ username: loginData.username, password: loginData.password }));
        } else {
          localStorage.removeItem('rememberLogin');
        }
        navigate('/home');
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setMessage(err.response.data.message);
        setMessageType('error');
      } else {
        setMessage('服务器错误');
        setMessageType('error');
      }
    }
  };

  // 注册逻辑
  const avatarFiles = [
    "三花猫.svg", "傻猫.svg", "博学猫.svg", "布偶.svg", "无毛猫.svg", "暹罗猫.svg",
    "橘猫.svg", "波斯猫.svg", "牛奶猫.svg", "狸花猫.svg", "猫.svg", "田园猫.svg",
    "白猫.svg", "眯眯眼猫.svg", "缅因猫.svg", "美短.svg", "英短猫.svg", "蓝猫.svg",
    "黄猫.svg", "黑猫.svg"
  ];

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');
    if (!registerData.username.match(/^[A-Za-z0-9_]{5,15}$/)) {
      setMessage('用户名必须为5-15位，仅支持数字、字母、下划线');
      setMessageType('error');
      return;
    }
    if (!registerData.password.match(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,12}$/)) {
      setMessage('密码必须为8-12位，且包含数字和字母，不允许其他字符');
      setMessageType('error');
      return;
    }
    if (registerData.gender && !['男', '女', '保密'].includes(registerData.gender)) {
      setMessage('性别只能为男、女或保密');
      setMessageType('error');
      return;
    }
    if (registerData.password !== registerData.confirmPassword) {
      setMessage('两次密码不一致');
      setMessageType('error');
      return;
    }

    // 随机选择占位头像（public 下的静态资源路径）
    const randomFile = avatarFiles[Math.floor(Math.random() * avatarFiles.length)];
    const avatarUrl = encodeURI(`/icons/avatar_no_sign_in/${randomFile}`);

    try {
      const res = await register({
        username: registerData.username,
        password: registerData.password,
        gender: registerData.gender,
        avatarUrl,
      });
      setMessage(res.msg);
      setMessageType(res.code === 200 ? 'success' : 'error');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setMessage(err.response.data.message);
        setMessageType('error');
      } else {
        setMessage('服务器错误');
        setMessageType('error');
      }
    }
  };

  // QQ登录
  const handleQQLogin = () => {
    const qqAppId = import.meta.env.VITE_QQ_APP_ID;
    if (!qqAppId || qqAppId === 'YOUR_QQ_APP_ID') {
      setMessage('QQ登录未配置，请联系管理员');
      setMessageType('error');
      return;
    }
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/qq/callback');
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('oauth_state', state);
    window.location.href = `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${qqAppId}&redirect_uri=${redirectUri}&state=${state}&scope=get_user_info`;
  };

  // GitHub登录
  const handleGitHubLogin = () => {
    const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!githubClientId || githubClientId === 'YOUR_GITHUB_CLIENT_ID') {
      setMessage('GitHub登录未配置，请联系管理员');
      setMessageType('error');
      return;
    }
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/github/callback');
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('oauth_state', state);
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&state=${state}&scope=read:user`;
  };

  // 微信登录
  const handleWeChatLogin = () => {
    const wechatAppId = import.meta.env.VITE_WECHAT_APP_ID;
    if (!wechatAppId || wechatAppId === 'YOUR_WECHAT_APP_ID') {
      setMessage('微信登录未配置，请联系管理员');
      setMessageType('error');
      return;
    }
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/wechat/callback');
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('oauth_state', state);
    window.location.href = `https://open.weixin.qq.com/connect/qrconnect?appid=${wechatAppId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
  };

  // 发送验证码
  const handleSendVerificationCode = async () => {
    if (!phoneLoginData.phoneNumber.match(/^1[3-9]\d{9}$/)) {
      setMessage('请输入正确的手机号');
      setMessageType('error');
      return;
    }

    setSendingCode(true);
    try {
      const response = await fetch('/api/auth/verification-code/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneLoginData.phoneNumber }),
      });
      const data = await response.json();

      if (data.code === 200) {
        setMessage('验证码已发送');
        setMessageType('success');
        setCountdown(60);
      } else {
        setMessage(data.msg || '发送失败');
        setMessageType('error');
      }
    } catch {
      setMessage('发送失败');
      setMessageType('error');
    } finally {
      setSendingCode(false);
    }
  };

  // 手机号登录
  const handlePhoneLogin = async () => {
    if (!phoneLoginData.phoneNumber.match(/^1[3-9]\d{9}$/)) {
      setMessage('请输入正确的手机号');
      setMessageType('error');
      return;
    }
    if (!phoneLoginData.verificationCode.match(/^\d{6}$/)) {
      setMessage('请输入6位验证码');
      setMessageType('error');
      return;
    }

    try {
      const response = await fetch('/api/auth/phone/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(phoneLoginData),
      });
      const res = await response.json();

      setMessage(res.msg);
      setMessageType(res.code === 200 ? 'success' : 'error');

      if (res.code === 200 && res.data) {
        let token = res.data;
        if (typeof token === 'object' && token !== null && token.token) {
          token = token.token;
        }
        localStorage.clear();

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

        navigate('/home');
      }
    } catch {
      setMessage('登录失败');
      setMessageType('error');
    }
  };

  return (
    <div className="container">
      <div className="welcome">
        <div className={`pinkbox${showRegister ? ' show-register' : ''}`}>
          <div className={`signup${showRegister ? '' : ' nodisplay'}`}>
            <h1>Register</h1>
            <form autoComplete="off" onSubmit={handleRegister}>
              <div className="form-grid">
                <div className="form-fields">
                  <input type="text" placeholder="Username" value={registerData.username} onChange={e => setRegisterData({ ...registerData, username: e.target.value })} autoComplete="username" />
                  <input type="password" placeholder="Password" value={registerData.password} onChange={e => setRegisterData({ ...registerData, password: e.target.value })} autoComplete="new-password" />
                  <input type="password" placeholder="Confirm Password" value={registerData.confirmPassword} onChange={e => setRegisterData({ ...registerData, confirmPassword: e.target.value })} autoComplete="new-password" />
                </div>
                <div className="form-gender">
                  <div className="gender-selector" role="group" aria-label="Gender">
                    <div className="gender-top">
                      <ul className="gender-main" style={{ left: `${selectedGenderIndex * -100}%` }}>
                        {genderItems.map(item => (
                          <li key={item.key}>
                            <div className="gender-figure">
                              <img src={item.img} alt={item.key} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <ul className="gender-bottom">
                      {genderItems.map((item, idx) => (
                        <li key={item.key} className={`gender-item${selectedGenderIndex === idx ? ' active' : ''}`}>
                          <button
                            type="button"
                            className="gender-btn"
                            onClick={() => setRegisterData({ ...registerData, gender: item.key })}
                            aria-pressed={selectedGenderIndex === idx}
                            aria-label={item.key}
                          >
                            <img src={item.img} alt={item.key} />
                            <span className="gender-text">{item.key}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <button className="button submit" type="submit">Create Account</button>
            </form>
          </div>
          <div className={`signin${showRegister ? ' nodisplay' : ''}`}>
            <h1>Sign In</h1>
            <form className="more-padding" autoComplete="off" onSubmit={handleLogin}>
              <input type="text" placeholder="Username" value={loginData.username} onChange={e => setLoginData({ ...loginData, username: e.target.value })} autoComplete="username" />
              <input type="password" placeholder="Password" value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} autoComplete="current-password" />
              <div className="checkbox">
                <input type="checkbox" id="remember" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                <label htmlFor="remember">Remember Me</label>
              </div>
              <button className="button sumbit" type="submit">Login</button>
            </form>
            <div className="third-party-login">
              <p className="divider"><span>或使用第三方登录</span></p>
              <div className="third-party-buttons">
                <button type="button" className="qq-login-btn" onClick={handleQQLogin} title="QQ登录">
                  <img src="/site_assets/icons/sign/qq登陆.svg" alt="QQ" className="icon" />
                </button>
                <button type="button" className="wechat-login-btn" onClick={handleWeChatLogin} title="微信登录">
                  <img src="/site_assets/icons/sign/微信登陆.svg" alt="WeChat" className="icon" />
                </button>
                <button type="button" className="github-login-btn" onClick={handleGitHubLogin} title="GitHub登录">
                  <img src="/site_assets/icons/sign/github登陆.svg" alt="GitHub" className="icon" />
                </button>
                <button type="button" className="phone-login-btn" onClick={() => setShowPhoneLogin(!showPhoneLogin)} title="手机验证码登录">
                  <img src="/site_assets/icons/sign/手机号登陆.svg" alt="Phone" className="icon" />
                </button>
              </div>
            </div>
            {showPhoneLogin && (
              <div className="phone-login-panel">
                <input
                  type="tel"
                  placeholder="手机号"
                  value={phoneLoginData.phoneNumber}
                  onChange={e => setPhoneLoginData({ ...phoneLoginData, phoneNumber: e.target.value })}
                />
                <div className="verification-code-group">
                  <input
                    type="text"
                    placeholder="验证码"
                    value={phoneLoginData.verificationCode}
                    onChange={e => setPhoneLoginData({ ...phoneLoginData, verificationCode: e.target.value })}
                  />
                  <button
                    type="button"
                    className="send-code-btn"
                    onClick={handleSendVerificationCode}
                    disabled={sendingCode || countdown > 0}
                  >
                    {countdown > 0 ? `${countdown}秒后重试` : sendingCode ? '发送中...' : '发送验证码'}
                  </button>
                </div>
                <button type="button" className="button" onClick={handlePhoneLogin}>手机号登录</button>
              </div>
            )}
          </div>
          {message && (
            <p
              role="alert"
              aria-live="polite"
              className={`form-message ${messageType === 'error' ? 'error-message' : messageType === 'success' ? 'success-message' : ''}`}
            >
              {message}
            </p>
          )}
        </div>
        <div className="leftbox">
          <h2 className="title"><span>BLOOM</span>&<br />BOUQUET</h2>
          <p className="desc">Pick your perfect <span>bouquet</span></p>
          <img className="flower smaller" src="/imgs/loginandwelcomepanel/flower01.png" alt="flower" />
          <p className="account">Have an account?</p>
          <button className="button" onClick={() => setShowRegister(false)}>Login</button>
        </div>
        <div className="rightbox">
          <h2 className="title"><span>BLOOM</span>&<br />BOUQUET</h2>
          <p className="desc">Pick your perfect <span>bouquet</span></p>
          <img className="flower" src="/imgs/loginandwelcomepanel/flower02.png" alt="flower" />
          <p className="account">Don't have an account?</p>
          <button className="button" onClick={() => setShowRegister(true)}>Sign Up</button>
        </div>
      </div>
    </div>
  );
}
