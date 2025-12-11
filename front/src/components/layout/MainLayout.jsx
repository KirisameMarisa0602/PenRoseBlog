import React from 'react';
import { useLocation } from 'react-router-dom';
import Maid from '@components/common/maid/Maid';
import BannerNavbar from '@components/common/BannerNavbar';
import '../../styles/components/MainLayout.css';

export default function MainLayout({ children, onMaidLoaded }) {
  const location = useLocation();
  const isWelcomePage = location.pathname === '/welcome';
  const mainClassName = isWelcomePage ? 'app-main' : 'app-main app-main--default';

  return (
    <div className="app-layout">
      {!isWelcomePage && <BannerNavbar />}
      <div className={mainClassName}>
        {children}
      </div>
      {/* 右侧列仅用于对齐，实际 Maid 作为全局 overlay 固定在右侧 */}
      <div className="app-ai-sidebar" aria-hidden="true" />
      {!isWelcomePage && <Maid defaultCollapsed={true} onModelLoaded={onMaidLoaded} />}
    </div>
  );
}
