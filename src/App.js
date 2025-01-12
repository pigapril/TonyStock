// React 相關
import React, { useState, useEffect, useCallback } from 'react';
import { Link, Route, Routes, Navigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';

// 第三方庫
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns';
import 'chartjs-plugin-crosshair';
import { FaChartLine, FaChartBar, FaHeartbeat, FaBars, FaFacebook, FaList, FaHome, FaBook } from 'react-icons/fa';

// 樣式引入
import './App.css';
import './components/Auth/styles/SignInDialog.css';
import './styles/NewFeatureBadge.css';
import "react-datepicker/dist/react-datepicker.css";

// 自定義組件
import { Home } from './pages/Home'; 
import MarketSentimentIndex from './components/MarketSentimentIndex';
import PageContainer from './components/PageContainer';
import { AuthDialog } from './components/Auth/AuthDialog';
import { UserProfile } from './components/Auth/UserProfile';
import { PageViewTracker } from './components/Common/PageViewTracker';
import { About } from './pages/About';
import { Legal } from './pages/Legal';
import { WatchlistContainer } from './components/Watchlist/WatchlistContainer';
import { AdBanner } from './components/Common/AdBanner';
import { Footer } from './components/Common/Footer';

// 導入拆分後的價格標準差分析頁面
import { PriceAnalysis } from './components/PriceAnalysis';
import { Articles } from './pages/Articles';
import { ArticleDetail } from './pages/ArticleDetail';

// Context 和 Hooks
import { AuthProvider } from './contexts/AuthContext';
import { DialogProvider } from './contexts/DialogContext';
import { useAuth } from './hooks/useAuth';
import { useDialog } from './hooks/useDialog';
import { useNewFeatureNotification } from './hooks/useNewFeatureNotification';

// 工具函數
import { Analytics } from './utils/analytics';
import { handleApiError } from './utils/errorHandler';

// 設定 ChartJS
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

// 在 AppContent 之前加入 Overlay 元件定義
const Overlay = ({ isVisible, onClick }) => (
  <div 
    className={`overlay ${isVisible ? 'visible' : ''}`}
    onClick={onClick}
  />
);

// 建立 AppContent
function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const { openDialog } = useDialog();
  const { hasNewFeature, markFeatureAsSeen } = useNewFeatureNotification();
  const isMobile = useMediaQuery({ query: '(max-width: 1024px)' });

  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // 切換側邊欄
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // 未登入時，點「我的追蹤清單」需跳轉登入
  const handleWatchlistClick = (e) => {
    if (!user) {
      e.preventDefault();
      openDialog('auth', { returnPath: '/watchlist' });
    }
    markFeatureAsSeen();
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // 頁面追蹤
  React.useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'pageview',
      page: {
        path: window.location.pathname,
        title: document.title,
      },
    });
  }, []);

  return (
    <div className={`App ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <PageViewTracker />
      <div className="App-inner">
        {/* 側邊欄區塊 */}
        <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <ul>
            <li>
              <Link to="/" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaHome />
                <span>首頁</span>
              </Link>
            </li>
            <li>
              <Link to="/priceanalysis" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaChartLine />
                <span>樂活五線譜</span>
              </Link>
            </li>
            <li>
              <Link to="/market-sentiment" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaHeartbeat />
                <span>市場情緒分析</span>
              </Link>
            </li>
            <li>
              <Link to="/watchlist" onClick={handleWatchlistClick}>
                <div className="sidebar-item-content">
                  <FaList />
                  <span>我的追蹤清單</span>
                </div>
                {hasNewFeature && <span className="new-feature-badge">NEW</span>}
              </Link>
            </li>
            <li>
              <a
                href="https://vocus.cc/salon/daily_chart"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaChartBar />
                <span>關鍵圖表</span>
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/profile.php?id=61565751412240"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaFacebook />
                <span>Facebook 關鍵圖表</span>
              </a>
            </li>
            <li>
              <Link to="/articles" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaBook />
                <span>使用指南</span>
              </Link>
            </li>
            {/* 暫時註釋掉關於本站選項
            <li>
              <Link to="/about" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaInfoCircle />
                <span>關於本站</span>
              </Link>
            </li>
            */}
          </ul>
        </nav>

        {/* 主內容區域 */}
        <main className="main-content">
          {/* 頂部導航欄 */}
          <header className="top-nav">
            {/* Logo 區域 */}
            <div className="top-nav-logo">
              <Link to="/">
                <img src="/logo.png" alt="Logo" className="logo" />
              </Link>
            </div>
            
            {/* 桌面版導航項目 */}
            <div className="desktop-nav-items">
              <Link to="/priceanalysis">
                <FaChartLine />
                <span>樂活五線譜</span>
              </Link>
              <Link to="/market-sentiment" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaHeartbeat />
                <span>市場情緒分析</span>
              </Link>
              <Link to="/watchlist" onClick={handleWatchlistClick}>
                <FaList />
                <span>我的追蹤清單</span>
                {hasNewFeature && <span className="new-feature-badge">NEW</span>}
              </Link>
              <a href="https://vocus.cc/salon/daily_chart" target="_blank" rel="noopener noreferrer">
                <FaChartBar />
                <span>關鍵圖表</span>
              </a>
              <a href="https://www.facebook.com/profile.php?id=61565751412240" target="_blank" rel="noopener noreferrer">
                <FaFacebook />
                <span>Facebook 關鍵圖表</span>
              </a>
            </div>

            {/* 使用者操作和選單按鈕 */}
            <div className="user-actions">
              {user ? <UserProfile /> : <button className="btn-primary" onClick={() => openDialog('auth')}>登入</button>}
              {/* 只在手機版顯示漢堡選單 */}
              {isMobile && (
                <div className="menu-toggle-wrapper">
                  <FaBars className="menu-toggle" onClick={toggleSidebar} />
                  {hasNewFeature && <span className="notification-dot" />}
                </div>
              )}
            </div>
          </header>

          {/* 內容路由 */}
          <div className="content-area">
            <Routes>
              <Route path="/" element={
                <PageContainer>
                  <Home />
                </PageContainer>
              } />

              {/* 拆分後: PriceAnalysisPage 擔任標準差分析頁面 */}
              <Route path="/priceanalysis" element={<PriceAnalysis />} />

              <Route
                path="/market-sentiment"
                element={<MarketSentimentIndex />}
              />
              <Route
                path="/about"
                element={
                  <PageContainer>
                    <About />
                  </PageContainer>
                }
              />
              <Route
                path="/legal"
                element={
                  <PageContainer>
                    <Legal />
                  </PageContainer>
                }
              />
              <Route
                path="/watchlist"
                element={
                  isAuthenticated ? (
                    <PageContainer title="我的追蹤清單">
                      <WatchlistContainer />
                    </PageContainer>
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route path="/articles" element={
                <PageContainer title="使用指南">
                  <Articles />
                </PageContainer>
              } />
              <Route path="/articles/:slug" element={<ArticleDetail />} />
            </Routes>
          </div>
        </main>

        {/* 添加遮罩層 (mobile 狀態下點擊收合側邊欄) */}
        <Overlay isVisible={sidebarOpen && isMobile} onClick={closeSidebar} />
        
        {/* 將 Footer 移到這裡 */}
        <Footer />
      </div>
      <AuthDialog />
      {/* 暫時註釋掉廣告橫幅 
      <AdBanner />
      */}
    </div>
  );
}

// App 元件：包裹 Context
function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <AppContent />
      </DialogProvider>
    </AuthProvider>
  );
}

export default App;

