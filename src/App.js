// React 相關
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Link, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import { useTranslation } from 'react-i18next';

// 第三方庫
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns';
import 'chartjs-plugin-crosshair';
import { FaChartLine, FaChartBar, FaHeartbeat, FaBars, FaFacebook, FaList, FaHome, FaBook, FaPiggyBank, FaGlobe } from 'react-icons/fa';

// 樣式引入
import './App.css';
import './components/Auth/styles/SignInDialog.css';
import './components/NewFeatureBadge/NewFeatureBadge.css';
import "react-datepicker/dist/react-datepicker.css";

// 自定義組件
import { Home } from './components/Home/Home'; 
import MarketSentimentIndex from './components/MarketSentimentIndex/MarketSentimentIndex';
import PageContainer from './components/PageContainer/PageContainer';
import { AuthDialog } from './components/Auth/AuthDialog';
import { UserProfile } from './components/Auth/UserProfile';
import { PageViewTracker } from './components/Common/PageViewTracker';
import { About } from './components/About/About';
import { Legal } from './components/Legal/Legal';
import { WatchlistContainer } from './components/Watchlist/WatchlistContainer';
import { AdBanner } from './components/Common/AdBanner/AdBanner';
import { Footer } from './components/Common/Footer/Footer';
import FloatingSponsorButton from './components/FloatingSponsorButton/FloatingSponsorButton';
import ChatWidget from './components/ChatWidget/ChatWidget';
import LanguageSwitcher from './components/LanguageSwitcher/LanguageSwitcher';

// 導入拆分後的價格標準差分析頁面
import { PriceAnalysis } from './components/PriceAnalysis/PriceAnalysis';
import { Articles } from './components/Articles/Articles';
import { ArticleDetail } from './components/ArticleDetail/ArticleDetail';
import { SponsorUs } from './components/SponsorUs/SponsorUs';
import { SponsorSuccess } from './components/SponsorSuccess/SponsorSuccess';
import { GoogleTrendsSymbolPage } from './components/GoogleTrendsSymbolPage/GoogleTrendsSymbolPage';
import { GoogleTrendsMarketPage } from './components/GoogleTrendsMarketPage/GoogleTrendsMarketPage';

// Context 和 Hooks
import { AuthProvider } from './components/Auth/AuthContext';
import { DialogProvider } from './components/Common/Dialog/DialogContext';
import { useAuth } from './components/Auth/useAuth';
import { useDialog } from './components/Common/Dialog/useDialog';
import { useNewFeatureNotification, FEATURES } from './components/NewFeatureBadge/useNewFeatureNotification';
import { AdProvider } from './components/Common/InterstitialAdModal/AdContext';

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
  const { t, i18n } = useTranslation();
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
  const isHomePage = location.pathname === '/';

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [googleTrendsDropdownOpen, setGoogleTrendsDropdownOpen] = React.useState(false);

  // 當側邊欄關閉時，自動收合Google搜尋熱度下拉選單
  React.useEffect(() => {
    if (!sidebarOpen) {
      setGoogleTrendsDropdownOpen(false);
    }
  }, [sidebarOpen]);

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
                <span>{t('nav.home')}</span>
              </Link>
            </li>
            <li className="sidebar-item-2">
              <Link to="/priceanalysis" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaChartLine />
                <span>{t('nav.priceAnalysis')}</span>
              </Link>
            </li>
            <li className="sidebar-item-3">
              <Link to="/market-sentiment" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaHeartbeat />
                <span>{t('nav.marketSentiment')}</span>
              </Link>
            </li>
            {/*
            <li className="sidebar-item dropdown">
              <div
                className="sidebar-dropdown-title"
                onClick={() => setGoogleTrendsDropdownOpen(!googleTrendsDropdownOpen)}
              >
                <FaChartLine />
                <span>Google 搜尋熱度</span>
              </div>
              {googleTrendsDropdownOpen && (
                <ul className="dropdown-menu">
                  <li>
                    <Link
                      to="/googletrends"
                      onClick={() => {
                        setSidebarOpen(false);
                        setGoogleTrendsDropdownOpen(false);
                      }}
                    >
                      <span>單一標的熱度</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/googletrendsmarket"
                      onClick={() => {
                        setSidebarOpen(false);
                        setGoogleTrendsDropdownOpen(false);
                      }}
                    >
                      <span>整體市場熱度</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>
            */}
            <li className="sidebar-item-5">
              <Link to="/watchlist" onClick={handleWatchlistClick}>
                <div className="sidebar-item-content">
                  <FaList />
                  <span>{t('nav.watchlist')}</span>
                </div>
              </Link>
            </li>
            <li className="sidebar-item-6">
              <Link to="/articles" onClick={handleArticlesClick}>
                <div className="sidebar-item-content">
                  <FaChartBar />
                  <span>{t('nav.articles')}</span>
                </div>
              </Link>
            </li>
            <li className="sidebar-item-7">
              <Link to="/sponsor-us" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaPiggyBank />
                <span>{t('nav.sponsor')}</span>
              </Link>
            </li>
            <li className="sidebar-item-8">
              <a
                href="https://www.facebook.com/profile.php?id=61565751412240"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaFacebook />
                <span>{t('nav.facebook')}</span>
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
                <img src="/logo.png" alt={t('appName')} className="logo" />
              </Link>
            </div>
            
            {/* 桌面版導航項目 */}
            <div className="desktop-nav-items">
              <Link to="/priceanalysis">
                <FaChartLine />
                <span>{t('nav.priceAnalysis')}</span>
              </Link>
              <Link to="/market-sentiment" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaHeartbeat />
                <span>{t('nav.marketSentiment')}</span>
              </Link>
              {/*
              <div className="desktop-nav-item dropdown"
                onMouseEnter={() => setGoogleTrendsDropdownOpen(true)}
                onMouseLeave={() => setGoogleTrendsDropdownOpen(false)}
              >
                <Link to="/googletrends">
                  <FaChartLine />
                  <span>Google 搜尋熱度</span>
                </Link>
                {googleTrendsDropdownOpen && (
                  <div className="desktop-dropdown-menu">
                    <Link to="/googletrends">
                      <span>單一標的熱度</span>
                    </Link>
                    <Link to="/googletrendsmarket">
                      <span>整體市場熱度</span>
                    </Link>
                  </div>
                )}
              </div>
              */}
              <Link to="/watchlist" onClick={handleWatchlistClick}>
                <FaList />
                <span>{t('nav.watchlist')}</span>
              </Link>
              <Link to="/articles" onClick={handleArticlesClick}>
                <FaChartBar />
                <span>{t('nav.articles')}</span>
              </Link>
              <Link to="/sponsor-us">
                <FaPiggyBank />
                <span>{t('nav.sponsor')}</span>
              </Link>
              <a href="https://www.facebook.com/profile.php?id=61565751412240" target="_blank" rel="noopener noreferrer">
                <FaFacebook />
                <span>{t('nav.facebookLong')}</span>
              </a>
            </div>

            {/* 使用者操作和選單按鈕 */}
            <div className="user-actions">
              <LanguageSwitcher />
              {user ? <UserProfile /> : <button className="btn-primary" onClick={() => openDialog('auth')}>{t('userActions.login')}</button>}
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
                <PageContainer title={t('pageTitle.home')} description={t('pageDescription.home')}>
                  <Home />
                </PageContainer>
              } />

              {/* 拆分後: PriceAnalysisPage 擔任標準差分析頁面 */}
              <Route path="/priceanalysis" element={
                <PageContainer title={t('pageTitle.priceAnalysis')} description={t('pageDescription.priceAnalysis')}>
                  <PriceAnalysis />
                </PageContainer>
              } />

              <Route
                path="/market-sentiment"
                element={<PageContainer title={t('pageTitle.marketSentiment')} description={t('pageDescription.marketSentiment')}>
                  <MarketSentimentIndex />
                </PageContainer>
              } />
              <Route
                path="/about"
                element={
                  <PageContainer title={t('pageTitle.about')} description={t('pageDescription.about')}>
                    <About />
                  </PageContainer>
                }
              />
              <Route
                path="/legal"
                element={
                  <PageContainer title={t('pageTitle.legal')} description={t('pageDescription.legal')}>
                    <Legal />
                  </PageContainer>
                }
              />
              <Route
                path="/watchlist"
                element={
                  isAuthenticated ? (
                    <PageContainer title={t('pageTitle.watchlist')} description={t('pageDescription.watchlist')}>
                      <WatchlistContainer />
                    </PageContainer>
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route path="/articles" element={
                <PageContainer title={t('pageTitle.articles')} description={t('pageDescription.articles')}>
                  <Articles />
                </PageContainer>
              } />
              <Route path="/articles/:slug" element={<ArticleDetail />} />
              <Route path="/sponsor-us" element={
                <PageContainer title={t('pageTitle.sponsor')} description={t('pageDescription.sponsor')}>
                  <SponsorUs />
                </PageContainer>
              } />
              <Route path="/sponsor-success" element={
                <PageContainer title={t('pageTitle.sponsorSuccess')} description={t('pageDescription.sponsorSuccess')}>
                  <SponsorSuccess />
                </PageContainer>
              } />
              <Route path="/googletrends" element={<GoogleTrendsSymbolPage />} />
              <Route path="/googletrendsmarket" element={<GoogleTrendsMarketPage />} />
            </Routes>
          </div>
        </main>

        {/* 添加浮動贊助按鈕元件 */}
        <FloatingSponsorButton />
        {/* 添加文字對話客服元件 */}
        <ChatWidget />

        {/* 添加遮罩層 (mobile 狀態下點擊收合側邊欄) */}
        <Overlay isVisible={sidebarOpen && isMobile} onClick={closeSidebar} />
        
        {/* 將 Footer 移到這裡 */}
        <Footer />
      </div>
      <AuthDialog />
      {/* 根據是否為首頁決定是否渲染 AdBanner */}
      {!isHomePage && <AdBanner />}
    </div>
  );
}

// App 元件：包裹 Context
function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <AdProvider>
          <AppContent />
        </AdProvider>
      </DialogProvider>
    </AuthProvider>
  );
}

export default App;

