import React from 'react';
import { useLocation } from 'react-router-dom';
import Maid from '@components/common/maid/Maid';
import BannerNavbar from '@components/common/BannerNavbar';
import GlobalUploadIndicator from '@components/common/GlobalUploadIndicator';
import '../../styles/components/MainLayout.css';

export default function MainLayout({ children, onMaidLoaded }) {
  const location = useLocation();
  const isWelcomePage = location.pathname === '/welcome';
  const isHomePage = location.pathname === '/';
  const mainClassName = isWelcomePage 
    ? 'app-main' 
    : (isHomePage ? 'app-main app-main--home' : 'app-main app-main--default');
  const [sidebarWidth, setSidebarWidth] = React.useState(0);

  return (
    <div className={`app-layout${isWelcomePage ? ' app-layout--welcome' : (isHomePage ? ' app-layout--home' : '')}`}>
      {!isWelcomePage && <BannerNavbar />}
      <div className={mainClassName}>
        {children}
      </div>
      {/* 右侧列仅用于对齐，实际 Maid 作为全局 overlay 固定在右侧 */}
      {!isWelcomePage && <div className="app-ai-sidebar" aria-hidden="true" style={{ width: sidebarWidth, flexShrink: 0 }} />}
      {!isWelcomePage && <Maid defaultCollapsed={true} onModelLoaded={onMaidLoaded} onWidthChange={setSidebarWidth} />}
      <GlobalUploadIndicator />
    </div>
  );
}
