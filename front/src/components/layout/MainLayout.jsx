import React from 'react';
import { useLocation } from 'react-router-dom';
import Maid from '@components/common/maid/Maid';
import BannerNavbar from '@components/common/BannerNavbar';
import GlobalUploadIndicator from '@components/common/GlobalUploadIndicator';
import GlobalBackground from '@components/common/GlobalBackground';
import '../../styles/components/MainLayout.css';

export default function MainLayout({ children, onMaidLoaded }) {
  const location = useLocation();
  const isWelcomePage = location.pathname === '/welcome';
  const isHomePage = location.pathname === '/';
  const isSearchPage = location.pathname === '/search';
  const isBlogEditorPage = location.pathname === '/blog-edit';

  // 这些页面不需要顶部导航栏占位（padding-top）
  const isNoPaddingPage = isHomePage || isSearchPage || isBlogEditorPage;

  const mainClassName = isWelcomePage 
    ? 'app-main' 
    : (isNoPaddingPage ? 'app-main app-main--home' : 'app-main app-main--default');
  const [sidebarWidth, setSidebarWidth] = React.useState(0);

  return (
    <div className={`app-layout${isWelcomePage ? ' app-layout--welcome' : (isNoPaddingPage ? ' app-layout--home' : '')}`}>
      <GlobalBackground />
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
