import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/common/AvatarDropdown.css";
import resolveUrl from '@utils/resolveUrl';
import { getDefaultAvatar } from '@utils/avatarUtils';
import { useTheme } from '../../contexts/useTheme';


const sexIconMap = {
  男: resolveUrl("/icons/sex/男.svg"),
  女: resolveUrl("/icons/sex/女.svg"),
  保密: resolveUrl("/icons/sex/保密.svg"),
};

function getSexIcon(gender) {
  if (gender === '男' || gender === '女' || gender === '保密') {
    return sexIconMap[gender];
  }
  return sexIconMap['保密'];
}


export default function AvatarDropdown({ user, onLogout }) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleSelfSpace = () => {
    navigate("/selfspace");
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate("/welcome");
  };

  const handleThemeChange = (e) => {
    setTheme(e.target.value);
  };

  // 直接显示后端昵称
  const displayName = user.nickname;
  // 性别图标
  const sexIcon = getSexIcon(user.gender);

  return (
    <div className="avatar-dropdown">
      <div className="dropdown-header">
        <img
          className="dropdown-avatar-img"
          src={resolveUrl(user.avatar) || getDefaultAvatar(user.id)}
          alt={displayName}
          onError={(e) => { e.target.src = getDefaultAvatar(user.id); }}
        />
        <div className="dropdown-user-info">
          <span className="dropdown-name">{displayName}</span>
          <img className="sex-icon" src={sexIcon} alt={user.gender} />
        </div>
      </div>
      <div className="dropdown-section theme-section">
        <span className="theme-label">主题模式</span>
        <select value={theme} onChange={handleThemeChange} className="theme-select">
          <option value="light">🌞 浅色</option>
          <option value="dark">🌙 深色</option>
          <option value="system">💻 跟随系统</option>
        </select>
      </div>
      <button className="dropdown-btn" onClick={() => navigate('/friends')}>我的好友</button>
      <button className="dropdown-btn" onClick={() => navigate('/follows')}>我的关注</button>
      <button className="dropdown-btn" onClick={handleSelfSpace}>
        个人空间
      </button>
      <button className="dropdown-btn" onClick={() => navigate('/security')}>
        安全中心
      </button>
      <button className="dropdown-btn logout" onClick={handleLogout}>
        退出登录
      </button>
    </div>
  );
}
