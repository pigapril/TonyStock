// React 相關
import React, { useState, useEffect, useCallback } from 'react';
import { Link, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';

// 第三方庫
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns';
import 'chartjs-plugin-crosshair';
import { FaChartLine, FaChartBar, FaHeartbeat, FaBars, FaFacebook, FaList, FaHome, FaBook, FaPiggyBank } from 'react-icons/fa';

// 樣式引入
import './App.css';
import './components/Auth/styles/SignInDialog.css';
import './styles/NewFeatureBadge.css';
import "react-datepicker/dist/react-datepicker.css";

// 自定義組件
import { Home } from './pages/Home'; 
import MarketSentimentIndex from './components/MarketSentimentIndex/MarketSentimentIndex';
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
import { PriceAnalysis } from './components/PriceAnalysis/PriceAnalysis';
import { Articles } from './pages/Articles';
import { ArticleDetail } from './pages/ArticleDetail';
import { SponsorUs } from './pages/SponsorUs';
import { SponsorSuccess } from './pages/SponsorSuccess';
import { GoogleTrendsSymbolPage } from './pages/GoogleTrendsSymbolPage';

// Context 和 Hooks
import { AuthProvider } from './components/Auth/AuthContext';
import { DialogProvider } from './contexts/DialogContext';
import { useAuth } from './components/Auth/useAuth'; // 更新路徑
import { useDialog } from './hooks/useDialog';
import { useNewFeatureNotification, FEATURES } from './hooks/useNewFeatureNotification';

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
  const { 
    hasNewFeature: hasNewWatchlist, 
    markFeatureAsSeen: markWatchlistSeen 
  } = useNewFeatureNotification(FEATURES.WATCHLIST);
  const { 
    hasNewFeature: hasNewArticles, 
    markFeatureAsSeen: markArticlesSeen 
  } = useNewFeatureNotification(FEATURES.ARTICLES);
  const isMobile = useMediaQuery({ query: '(max-width: 1024px)' });
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // 切換側邊欄
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // 處理追蹤清單點擊
  const handleWatchlistClick = (e) => {
    if (!user) {
      e.preventDefault();
      openDialog('auth', { returnPath: '/watchlist' });
    }
    markWatchlistSeen();
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // 處理文章點擊
  const handleArticlesClick = () => {
    markArticlesSeen();
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

  // 每次路由改變時滾動到頂部
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className={`App ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <PageViewTracker />
      <div className="App-inner">
        {/* 側邊欄區塊 */}
        <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <ul>
            <li className="sidebar-item-1">
              <Link to="/" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaHome />
                <span>首頁</span>
              </Link>
            </li>
            <li className="sidebar-item-2">
              <Link to="/priceanalysis" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaChartLine />
                <span>樂活五線譜</span>
              </Link>
            </li>
            <li className="sidebar-item-3">
              <Link to="/market-sentiment" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaHeartbeat />
                <span>市場情緒分析</span>
              </Link>
            </li>
            <li className="sidebar-item-4">
              <Link to="/googletrends" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaChartLine />
                <span>Google 搜尋熱度</span>
              </Link>
            </li>
            <li className="sidebar-item-5">
              <Link to="/watchlist" onClick={handleWatchlistClick}>
                <div className="sidebar-item-content">
                  <FaList />
                  <span>我的追蹤清單</span>
                </div>
                {hasNewWatchlist && <span className="new-feature-badge">NEW</span>}
              </Link>
            </li>
            <li className="sidebar-item-6">
              <Link to="/articles" onClick={handleArticlesClick}>
                <div className="sidebar-item-content">
                  <FaChartBar />
                  <span>分析專欄</span>
                </div>
                {hasNewArticles && <span className="new-feature-badge">NEW</span>}
              </Link>
            </li>
            <li className="sidebar-item-7">
              <Link to="/sponsor-us" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaPiggyBank />
                <span>小豬撲滿</span>
              </Link>
            </li>
            <li className="sidebar-item-8">
              <a
                href="https://www.facebook.com/profile.php?id=61565751412240"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaFacebook />
                <span>Facebook 關鍵圖表</span>
              </a>
            </li>
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
              <Link to="/googletrends">
                <FaChartLine />
                <span>Google 搜尋熱度</span>
              </Link>
              <Link to="/watchlist" onClick={handleWatchlistClick}>
                <FaList />
                <span>我的追蹤清單</span>
                {hasNewWatchlist && <span className="new-feature-badge">NEW</span>}
              </Link>
              <Link to="/articles" onClick={handleArticlesClick}>
                <FaChartBar />
                <span>分析專欄</span>
                {hasNewArticles && <span className="new-feature-badge">NEW</span>}
              </Link>
              <Link to="/sponsor-us">
                <FaPiggyBank />
                <span>小豬撲滿</span>
              </Link>
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
                  {hasNewWatchlist && <span className="notification-dot" />}
                </div>
              )}
            </div>
          </header>

          {/* 內容路由 */}
          <div className="content-area">
            <Routes>
              <Route path="/" element={
                <PageContainer title="首頁" description="市場情緒追蹤平台。">
                  <Home />
                </PageContainer>
              } />

              {/* 拆分後: PriceAnalysisPage 擔任標準差分析頁面 */}
              <Route path="/priceanalysis" element={
                <PageContainer title="樂活五線譜" description="分析股價的長期趨勢，判斷價格高低點。">
                  <PriceAnalysis />
                </PageContainer>
              } />

              <Route
                path="/market-sentiment"
                element={<PageContainer title="市場情緒分析" description="即時追蹤市場情緒指標，克服恐懼與貪婪。">
                  <MarketSentimentIndex />
                </PageContainer>
              } />
              <Route
                path="/about"
                element={
                  <PageContainer title="關於本站" description="了解 Sentiment Inside Out 的創立理念和目標。">
                    <About />
                  </PageContainer>
                }
              />
              <Route
                path="/legal"
                element={
                  <PageContainer title="法律聲明" description="網站使用條款和隱私權政策。">
                    <Legal />
                  </PageContainer>
                }
              />
              <Route
                path="/watchlist"
                element={
                  isAuthenticated ? (
                    <PageContainer title="我的追蹤清單" description="追蹤您感興趣的股票，快速掌握多個標的價格情緒。">
                      <WatchlistContainer />
                    </PageContainer>
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route path="/articles" element={
                <PageContainer title="分析專欄" description="分析市場情緒和投資策略。">
                  <Articles />
                </PageContainer>
              } />
              <Route path="/articles/:slug" element={<ArticleDetail />} />
              <Route path="/sponsor-us" element={
                <PageContainer title="贊助網站" description="支持 Sentiment Inside Out 的發展，一起幫助更多人。">
                  <SponsorUs />
                </PageContainer>
              } />
              <Route path="/sponsor-success" element={
                <PageContainer title="贊助成功" description="感謝您的贊助，您的支持是我們前進的動力！">
                  <SponsorSuccess />
                </PageContainer>
              } />
              <Route
                path="/googletrends"
                element={
                  <GoogleTrendsSymbolPage />
                }
              />
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

