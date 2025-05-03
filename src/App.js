// React 相關
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Link, Route, Routes, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom';
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
  const { lang } = useParams();
  const navigate = useNavigate();
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
  const isHomePage = location.pathname === `/${lang}` || location.pathname === `/${lang}/`;

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [googleTrendsDropdownOpen, setGoogleTrendsDropdownOpen] = React.useState(false);

  useEffect(() => {
    if (lang && i18n.options.supportedLngs.includes(lang)) {
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang);
      }
    } else {
      const currentPathWithoutLang = location.pathname.replace(/^\/[^/]+/, '');
      navigate(`/${i18n.options.fallbackLng}${currentPathWithoutLang || '/'}`, { replace: true });
    }
  }, [lang, i18n, navigate, location.pathname]);

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
      openDialog('auth', { returnPath: `/${lang}/watchlist` });
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
  }, [location.pathname]);

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
              <Link to={`/${lang}/`} onClick={() => isMobile && setSidebarOpen(false)}>
                <FaHome />
                <span>{t('nav.home')}</span>
              </Link>
            </li>
            <li className="sidebar-item-2">
              <Link to={`/${lang}/priceanalysis`} onClick={() => isMobile && setSidebarOpen(false)}>
                <FaChartLine />
                <span>{t('nav.priceAnalysis')}</span>
              </Link>
            </li>
            <li className="sidebar-item-3">
              <Link to={`/${lang}/market-sentiment`} onClick={() => isMobile && setSidebarOpen(false)}>
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
              <Link to={`/${lang}/watchlist`} onClick={handleWatchlistClick}>
                <div className="sidebar-item-content">
                  <FaList />
                  <span>{t('nav.watchlist')}</span>
                </div>
              </Link>
            </li>
            <li className="sidebar-item-6">
              <Link to={`/${lang}/articles`} onClick={handleArticlesClick}>
                <div className="sidebar-item-content">
                  <FaChartBar />
                  <span>{t('nav.articles')}</span>
                </div>
              </Link>
            </li>
            <li className="sidebar-item-7">
              <Link to={`/${lang}/sponsor-us`} onClick={() => isMobile && setSidebarOpen(false)}>
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
              <Link to={`/${lang}/`}>
                <img src="/logo.png" alt={t('appName')} className="logo" />
              </Link>
            </div>
            
            {/* 桌面版導航項目 */}
            <div className="desktop-nav-items">
              <Link to={`/${lang}/priceanalysis`}>
                <FaChartLine />
                <span>{t('nav.priceAnalysis')}</span>
              </Link>
              <Link to={`/${lang}/market-sentiment`}>
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
              <Link to={`/${lang}/watchlist`} onClick={handleWatchlistClick}>
                <FaList />
                <span>{t('nav.watchlist')}</span>
              </Link>
              <Link to={`/${lang}/articles`} onClick={handleArticlesClick}>
                <FaChartBar />
                <span>{t('nav.articles')}</span>
              </Link>
              <Link to={`/${lang}/sponsor-us`}>
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
              <Route path="/" element={<Home />} />

              {/* 拆分後: PriceAnalysisPage 擔任標準差分析頁面 */}
              <Route path="priceanalysis" element={<PriceAnalysis />} />

              <Route
                path="market-sentiment"
                element={<MarketSentimentIndex />}
              />
              <Route
                path="about"
                element={<About />}
              />
              <Route
                path="legal"
                element={<Legal />}
              />
              <Route
                path="watchlist"
                element={
                  isAuthenticated ? (
                    <WatchlistContainer />
                  ) : (
                    <Navigate to={`/${lang}/`} replace />
                  )
                }
              />
              <Route path="articles" element={<Articles />} />
              <Route path="articles/:slug" element={<ArticleDetail />} />
              <Route path="sponsor-us" element={<SponsorUs />} />
              <Route path="sponsor-success" element={<SponsorSuccess />} />
              <Route path="google-trends/symbol/:symbol" element={<GoogleTrendsSymbolPage />} />
              <Route path="google-trends/market" element={<GoogleTrendsMarketPage />} />

              {/* 可以添加一個捕獲無效相對路徑的路由 */}
              <Route path="*" element={<Navigate to={`/${lang}/`} replace />} />
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

// --- 確保 LanguageWrapper 的定義存在 ---
function LanguageWrapper() {
  const { lang } = useParams();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 找到標準的大小寫格式 (假設 supportedLngs 存儲的是標準格式)
    const standardLang = i18n.options.supportedLngs.find(
      supportedLang => supportedLang.toLowerCase() === lang?.toLowerCase()
    );

    if (lang && standardLang) {
      // 如果 URL 中的 lang 與標準格式的大小寫不同，則重定向
      if (lang !== standardLang) {
        const newPath = location.pathname.replace(`/${lang}`, `/${standardLang}`);
        navigate(newPath + location.search + location.hash, { replace: true });
        return; // 停止後續處理，等待重定向生效
      }

      // 如果大小寫正確，則設置 i18n 語言
      if (i18n.language !== standardLang) {
        i18n.changeLanguage(standardLang);
      }
    }
    // AppContent 中的 useEffect 會處理無效 lang (完全不匹配 supportedLngs) 的情況
    // 但這裡也可以加上處理，如果 standardLang 未找到
    // else if (lang) {
    //   // 如果 lang 存在但不在 supportedLngs 中 (即使忽略大小寫)
    //   // 導向預設語言
    //   const currentPathWithoutLang = location.pathname.replace(/^\/[^/]+/, '');
    //   navigate(`/${i18n.options.fallbackLng}${currentPathWithoutLang || '/'}`, { replace: true });
    // }

  }, [lang, i18n, navigate, location]); // 添加 location 到依賴

  // 確保在語言驗證/重定向前不渲染 AppContent
  // 檢查標準格式是否存在且與當前 URL 的 lang 匹配
  const isValidLang = lang && i18n.options.supportedLngs.includes(lang);

  if (!isValidLang) {
     // 如果語言無效或正在重定向，返回 null 或 Loading
     // AppContent 的 useEffect 也會處理重定向，但這裡提前處理更好
     return null;
  }

  return <AppContent />;
}

// --- 確保 InitialRedirect 的定義存在 ---
function InitialRedirect() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  useEffect(() => {
    const userLang = navigator.language || navigator.userLanguage;
    let targetLang = i18n.options.fallbackLng;

    if (userLang.startsWith('en') && i18n.options.supportedLngs.includes('en')) {
      targetLang = 'en';
    }
    else if (userLang.toLowerCase().startsWith('zh') && i18n.options.supportedLngs.includes('zh-TW')) {
       targetLang = 'zh-TW';
    }

    navigate(`/${targetLang}`, { replace: true });
  }, [navigate, i18n]);

  return null;
}

// App 元件：包裹 Context 和新的路由結構
function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <AdProvider>
          <Routes>
            {/* --- 確保這裡使用的是正確定義的 InitialRedirect --- */}
            <Route path="/" element={<InitialRedirect />} />
            {/* --- 確保這裡使用的是正確定義的 LanguageWrapper --- */}
            <Route path="/:lang/*" element={<LanguageWrapper />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AdProvider>
      </DialogProvider>
    </AuthProvider>
  );
}

export default App;

