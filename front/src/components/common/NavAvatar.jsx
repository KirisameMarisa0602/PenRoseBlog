import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AvatarDropdown from './AvatarDropdown';
import { useAuthState } from '@hooks/useAuthState';
import resolveUrl from '@utils/resolveUrl';
import { getDefaultAvatar } from '@utils/avatarUtils';

/**
 * 导航栏右上角头像/入口组件 NavAvatar
 * 功能：
 *  - 未登录：显示“去登录 / 注册”点击跳转 /welcome
 *  - 已登录无头像：根据ID确定占位图片（public/icons/avatar_no_sign_in）
 *  - 已登录有头像：显示该头像
 * 样式：src/styles/common/NavAvatar.css 仅通过类名切换，不在此写内联样式
 */
export default function NavAvatar({
  size, // 可选：覆盖尺寸 CSS 变量 --size
  alt = '用户头像',
  onClick,
}) {
  // 集成全局用户信息
  const { isLoggedIn, user, logout } = useAuthState();
  const navigate = useNavigate();
  const location = useLocation();

  // 可选尺寸变量
  const style = size ? { ['--size']: typeof size === 'number' ? `${size}px` : size } : undefined;

  // 已登录但没有头像时根据ID确定（首次渲染稳定）
  const randomFallback = useMemo(() => {
    if (!isLoggedIn || (user && user.avatar)) return '';
    return getDefaultAvatar(user.id);
  }, [isLoggedIn, user]);

  // ===== 用户资料（昵称 / 用户ID / 性别）读取 =====
  // 下拉面板已移除，这些资料在头像处暂未展示，预留以后扩展时再启用

  // 键盘可访问
  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleClick = () => {
    if (!isLoggedIn) {
      navigate('/welcome');
      return;
    }
    if (onClick) {
      onClick();
      return;
    }
    // 在个人空间中：点击头像相当于刷新当前页面
    if (location.pathname.startsWith('/selfspace')) {
      window.location.reload();
      return;
    }
    // 其余页面：默认进入个人空间
    navigate('/selfspace');
  };


  // 下拉面板显示控制
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // 状态类名
  const stateClass = !isLoggedIn
    ? 'nav-avatar--guest'
    : user && user.avatar
      ? 'nav-avatar--withavatar'
      : 'nav-avatar--noavatar';

  return (
    <div
      className="nav-avatar-wrapper"
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => isLoggedIn && setDropdownOpen(true)}
      onMouseLeave={() => isLoggedIn && setDropdownOpen(false)}
    >
      <div
        className={`nav-avatar ${stateClass}`}
        style={style}
        role="button"
        tabIndex={0}
        aria-label={alt}
        onClick={handleClick}
        onKeyDown={handleKey}
      >
        {/* 未登录 CTA */}
        {!isLoggedIn && (
          <div className="nav-avatar__cta">去登录 / 注册</div>
        )}
        {/* 有头像 */}
        {isLoggedIn && user && user.avatar && (
          <img className="nav-avatar__img" src={resolveUrl(user.avatar)} alt={alt} draggable={false} />
        )}
        {/* 无头像占位随机图 */}
        {isLoggedIn && (!user || !user.avatar) && randomFallback && (
          <img className="nav-avatar__img" src={resolveUrl(randomFallback)} alt="占位头像" draggable={false} />
        )}
      </div>
      {/* 下拉面板 */}
      {isLoggedIn && dropdownOpen && user && (
        <div
          onClick={e => e.stopPropagation()}
          style={{position: 'absolute', top: '100%', right: 0, zIndex: 10000}}
        >
          <AvatarDropdown user={user} onLogout={logout} />
        </div>
      )}
    </div>
  );
}
