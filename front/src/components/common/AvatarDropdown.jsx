
import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/common/AvatarDropdown.css";
import resolveUrl from '@utils/resolveUrl';


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

  const handleSelfSpace = () => {
    navigate("/selfspace");
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate("/welcome");
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
          src={resolveUrl(user.avatar)}
          alt={displayName}
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <div className="dropdown-user-info">
          <span className="dropdown-name">{displayName}</span>
          <img className="sex-icon" src={sexIcon} alt={user.gender} />
        </div>
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
