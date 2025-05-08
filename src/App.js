// React 相關
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
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
//import { Home } from './components/Home/Home'; 
//import MarketSentimentIndex from './components/MarketSentimentIndex/MarketSentimentIndex';
import PageContainer from './components/PageContainer/PageContainer';
import { AuthDialog } from './components/Auth/AuthDialog';
import { UserProfile } from './components/Auth/UserProfile';
import { PageViewTracker } from './components/Common/PageViewTracker';
import { AdBanner } from './components/Common/AdBanner/AdBanner';
import { Footer } from './components/Common/Footer/Footer';
import FloatingSponsorButton from './components/FloatingSponsorButton/FloatingSponsorButton';
import ChatWidget from './components/ChatWidget/ChatWidget';
import LanguageSwitcher from './components/LanguageSwitcher/LanguageSwitcher';

// 導入拆分後的價格標準差分析頁面
// import { PriceAnalysis } from './components/PriceAnalysis/PriceAnalysis';
//import { Articles } from './components/Articles/Articles';
//import { ArticleDetail } from './components/ArticleDetail/ArticleDetail';
//import { SponsorUs } from './components/SponsorUs/SponsorUs';
//import { SponsorSuccess } from './components/SponsorSuccess/SponsorSuccess';
//import { GoogleTrendsSymbolPage } from './components/GoogleTrendsSymbolPage/GoogleTrendsSymbolPage';
//import { GoogleTrendsMarketPage } from './components/GoogleTrendsMarketPage/GoogleTrendsMarketPage';

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

// --- Lazy Loaded Components ---
const About = React.lazy(() => import('./components/About/About').then(module => ({ default: module.About })));
const Legal = React.lazy(() => import('./components/Legal/Legal').then(module => ({ default: module.Legal })));
const WatchlistContainer = React.lazy(() => import('./components/Watchlist/WatchlistContainer').then(module => ({ default: module.WatchlistContainer })));
const PriceAnalysis = React.lazy(() => import('./components/PriceAnalysis/PriceAnalysis').then(module => ({ default: module.PriceAnalysis })));
const Articles = React.lazy(() => import('./components/Articles/Articles').then(module => ({ default: module.Articles })));
const ArticleDetail = React.lazy(() => import('./components/ArticleDetail/ArticleDetail').then(module => ({ default: module.ArticleDetail })));
const SponsorUs = React.lazy(() => import('./components/SponsorUs/SponsorUs').then(module => ({ default: module.SponsorUs })));
const SponsorSuccess = React.lazy(() => import('./components/SponsorSuccess/SponsorSuccess').then(module => ({ default: module.SponsorSuccess })));
const GoogleTrendsSymbolPage = React.lazy(() => import('./components/GoogleTrendsSymbolPage/GoogleTrendsSymbolPage').then(module => ({ default: module.GoogleTrendsSymbolPage })));
const GoogleTrendsMarketPage = React.lazy(() => import('./components/GoogleTrendsMarketPage/GoogleTrendsMarketPage').then(module => ({ default: module.GoogleTrendsMarketPage })));
const Home = React.lazy(() => import('./components/Home/Home').then(module => ({ default: module.Home })));
const MarketSentimentIndex = React.lazy(() => import('./components/MarketSentimentIndex/MarketSentimentIndex'));


// 建立 AppContent
function AppContent() {
  const { t } = useTranslation(); // 只獲取 t 函數，語言設定由 LanguageWrapper 處理
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
            {/* 只有在 zh-TW 語系下顯示贊助連結 */}
            {lang === 'zh-TW' && (
              <li className="sidebar-item-7">
                <Link to={`/${lang}/sponsor-us`} onClick={() => isMobile && setSidebarOpen(false)}>
                  <FaPiggyBank />
                  <span>{t('nav.sponsor')}</span>
                </Link>
              </li>
            )}
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
              {/* 只有在 zh-TW 語系下顯示贊助連結 */}
              {lang === 'zh-TW' && (
                <Link to={`/${lang}/sponsor-us`}>
                  <FaPiggyBank />
                  <span>{t('nav.sponsor')}</span>
                </Link>
              )}
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
            <Suspense fallback={<div className="page-loading-spinner">Loading...</div>}> {/* Fallback UI for lazy loaded components */}
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
            </Suspense>
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
  const [isLanguageReady, setIsLanguageReady] = React.useState(false); // 新增狀態追蹤語言是否就緒

  React.useEffect(() => {
    let active = true; // 用於處理組件卸載時的異步操作

    const setupLanguage = async () => {
      // 找到標準的大小寫格式 (假設 supportedLngs 存儲的是標準格式)
      const standardLang = i18n.options.supportedLngs.find(
        supportedLang => supportedLang.toLowerCase() === lang?.toLowerCase()
      );

      if (lang && standardLang) {
        // 如果 URL 中的 lang 與標準格式的大小寫不同，則重定向
        if (lang !== standardLang) {
          const newPath = location.pathname.replace(`/${lang}`, `/${standardLang}`);
          navigate(newPath + location.search + location.hash, { replace: true });
          return; // 等待重定向生效
        }

        // 如果大小寫正確，則設置 i18n 語言
        if (i18n.language !== standardLang) {
          try {
            await i18n.changeLanguage(standardLang); // 等待語言切換完成
            if (active) setIsLanguageReady(true);
          } catch (error) {
            console.error("Failed to change language in LanguageWrapper:", error);
            // 發生錯誤，嘗試導向到備援語言
            if (active) {
              const currentPathWithoutLang = location.pathname.replace(/^\/[^/]+/, '');
              navigate(`/${i18n.options.fallbackLng}${currentPathWithoutLang || '/'}`, { replace: true });
            }
          }
        } else {
          if (active) setIsLanguageReady(true); // 語言已正確，直接設為 ready
        }
      } else if (lang) { // lang 參數存在但無效 (不在 supportedLngs 中)
        const currentPathWithoutLang = location.pathname.replace(/^\/[^/]+/, '');
        navigate(`/${i18n.options.fallbackLng}${currentPathWithoutLang || '/'}`, { replace: true });
      } else {
        // lang 參數不存在於 URL 中 (例如直接訪問 /priceanalysis 而非 /en/priceanalysis)
        // InitialRedirect 應該會處理根路徑 "/" 的情況
        // 對於其他沒有 lang 的路徑，也導向到備援語言
        // 這段邏輯可能需要根據你的 InitialRedirect 行為調整
        const fallbackLang = i18n.options.fallbackLng || 'en'; // 確保有備援
        navigate(`/${fallbackLang}${location.pathname || '/'}`, { replace: true });
      }
    };

    setupLanguage();

    return () => {
      active = false; // 清理函數，防止在已卸載組件上更新狀態
    };
  }, [lang, i18n, navigate, location]);

  // 確保在語言驗證/重定向前不渲染 AppContent
  // 檢查標準格式是否存在且與當前 URL 的 lang 匹配
  if (!isLanguageReady) {
     // 如果語言無效或正在重定向，或語言尚未設定完成，返回 loading 或 null
     return (
       <div className="loading-spinner"> {/* 使用 Loading.css 中的 class */}
         <div className="spinner"></div> {/* 旋轉動畫元素 */}
         {/* 你可以選擇性地翻譯這段文字，如果需要的話 */}
         Loading...
       </div>
     );
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

