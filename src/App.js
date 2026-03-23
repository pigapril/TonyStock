// React 相關
import React, { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, Navigate, useLocation, useParams, useNavigate, NavLink } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import { useTranslation } from 'react-i18next';
import { useSmartNavigation } from './hooks/useSmartNavigation';
import { useDeferredFeature } from './hooks/useDeferredFeature';


// 第三方庫
import { FaChartLine, FaChartBar, FaHeartbeat, FaBars, FaFacebook, FaList, FaHome, FaPiggyBank } from 'react-icons/fa';

// 樣式引入
import './App.css';
import './components/Auth/styles/SignInDialog.css';
import './components/NewFeatureBadge/NewFeatureBadge.css';
import "react-datepicker/dist/react-datepicker.css";
import './components/Common/global-styles.css';
import './components/Common/ui-recipes.css';
import './components/Common/Dialog/FeatureUpgradeDialog.css';


// 自定義組件
import { Home } from './components/Home/Home';
import { AuthDialog } from './components/Auth/AuthDialog';
import { GlobalFeatureUpgradeDialog } from './components/Common/Dialog/GlobalFeatureUpgradeDialog';
import { AuthStatusIndicator } from './components/Auth/AuthStatusIndicator';
import { PageViewTracker } from './components/Common/PageViewTracker';
import { Footer } from './components/Common/Footer/Footer';
import LanguageSwitcher from './components/LanguageSwitcher/LanguageSwitcher';
import { ProtectedRoute } from './components/Common/ProtectedRoute/ProtectedRoute'; // 新增：引入 ProtectedRoute

// Context 和 Hooks
import { AuthProvider } from './components/Auth/AuthContext';
import { SubscriptionProvider } from './components/Subscription/SubscriptionContext';
import { DialogProvider } from './components/Common/Dialog/DialogContext';
import { useAuth } from './components/Auth/useAuth';
import { useDialog } from './components/Common/Dialog/useDialog';
import { useNewFeatureNotification, FEATURES } from './components/NewFeatureBadge/useNewFeatureNotification';
import { AdProvider } from './components/Common/InterstitialAdModal/AdContext';
import { useSubscription } from './components/Subscription/SubscriptionContext';
import adBlockingService from './services/adBlockingService';
import { useToastManager } from './components/Watchlist/hooks/useToastManager';
import { Toast } from './components/Watchlist/components/Toast';
// import AdminNavigation from './components/Common/AdminNavigation'; // 移除以提高安全性

// 工具函數
import { initializeApiClient } from './api/setupApiClient';
import authGuard from './utils/authGuard';
import authPreloader from './utils/authPreloader';
import { setupRobotsProtection } from './utils/robotsHandler';
import { initializeFreeStockList } from './utils/freeStockListUtils';
import { ensureGoogleTagManager } from './utils/deferredScripts';

const MarketSentimentIndex = lazy(() => import('./components/MarketSentimentIndex/MarketSentimentIndex'));
const About = lazy(() => import('./components/About/About').then((module) => ({ default: module.About })));
const Legal = lazy(() => import('./components/Legal/Legal').then((module) => ({ default: module.Legal })));
const WatchlistContainer = lazy(() => import('./components/Watchlist/WatchlistContainer').then((module) => ({ default: module.WatchlistContainer })));
const PriceAnalysis = lazy(() => import('./components/PriceAnalysis/PriceAnalysis').then((module) => ({ default: module.PriceAnalysis })));
const Articles = lazy(() => import('./components/Articles/Articles').then((module) => ({ default: module.Articles })));
const ArticleDetail = lazy(() => import('./components/ArticleDetail/ArticleDetail').then((module) => ({ default: module.ArticleDetail })));
const SponsorUs = lazy(() => import('./components/SponsorUs/SponsorUs').then((module) => ({ default: module.SponsorUs })));
const UserAccountPage = lazy(() => import('./components/Subscription/UserAccount/UserAccountPage').then((module) => ({ default: module.UserAccountPage })));
const SubscriptionPlansPage = lazy(() => import('./components/Subscription/SubscriptionPlans/SubscriptionPlansPage').then((module) => ({ default: module.SubscriptionPlansPage })));
const SponsorSuccess = lazy(() => import('./components/SponsorSuccess/SponsorSuccess').then((module) => ({ default: module.SponsorSuccess })));
const GoogleTrendsSymbolPage = lazy(() => import('./components/GoogleTrendsSymbolPage/GoogleTrendsSymbolPage').then((module) => ({ default: module.GoogleTrendsSymbolPage })));
const GoogleTrendsMarketPage = lazy(() => import('./components/GoogleTrendsMarketPage/GoogleTrendsMarketPage').then((module) => ({ default: module.GoogleTrendsMarketPage })));
const CSRFExample = lazy(() => import('./components/Example/CSRFExample'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const PaymentFlowPage = lazy(() => import('./pages/PaymentFlowPage'));
const PaymentStatusPage = lazy(() => import('./pages/PaymentStatusPage'));
const PaymentResult = lazy(() => import('./components/Payment/PaymentResult/PaymentResult').then((module) => ({ default: module.PaymentResult })));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AdminDiagnostic = lazy(() => import('./pages/AdminDiagnostic'));
const AnnouncementBar = lazy(() => import('./components/Common/AnnouncementBar/AnnouncementBar'));
const ChatWidget = lazy(() => import('./components/ChatWidget/ChatWidget'));
const ConditionalAdSense = lazy(() => import('./components/Common/ConditionalAdSense/ConditionalAdSense'));

const RouteFallback = () => {
  const location = useLocation();
  const pathname = location.pathname || '';

  let fallbackClassName = 'route-loading-placeholder';

  if (pathname.includes('/priceanalysis')) {
    fallbackClassName += ' route-loading-placeholder--priceanalysis';
  } else if (pathname.includes('/market-sentiment')) {
    fallbackClassName += ' route-loading-placeholder--market-sentiment';
  }

  return <div className={fallbackClassName} aria-hidden="true" />;
};

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
  const { user, logout } = useAuth();
  const { userPlan } = useSubscription();
  const { openDialog } = useDialog();
  const { showToast, toast, hideToast } = useToastManager();
  

  
  // 通知系統
  const {
    hasNewFeature: hasNewWatchlist,
    markFeatureAsSeen: markWatchlistSeen
  } = useNewFeatureNotification(FEATURES.WATCHLIST);
  
  const isMobile = useMediaQuery({ query: '(max-width: 1300px)' });
  const location = useLocation();
  const isHomePage = location.pathname === `/${lang}` || location.pathname === `/${lang}/`;
  const [isTopNavScrolled, setIsTopNavScrolled] = React.useState(false);
  const shouldLoadAnnouncementBar = useDeferredFeature({ timeoutMs: 1500, useIdleCallback: true, triggerOnInteraction: true });
  const shouldLoadChatWidget = useDeferredFeature({ timeoutMs: 3200, useIdleCallback: true, triggerOnInteraction: true });
  const shouldLoadAdSense = useDeferredFeature({ timeoutMs: 4500, useIdleCallback: true, triggerOnInteraction: true });
  const shouldLoadTagManager = useDeferredFeature({
    timeoutMs: isHomePage ? 10000 : 2500,
    useIdleCallback: true,
    triggerOnInteraction: !isHomePage
  });
  


  // 智能導航系統
  const { 
    shouldUseSideNav, 
    navRef, 
    triggerCheck 
  } = useSmartNavigation({
    debounceMs: 150,
    threshold: 8
  });

  // 決定是否使用側邊導航：手機版 OR 智能檢測到需要切換
  const useSideNavigation = isMobile || shouldUseSideNav;

  const [sidebarOpen, setSidebarOpen] = React.useState(false);

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

  // 廣告阻擋邏輯 - 根據用戶訂閱狀態
  useEffect(() => {
    const isProUser = userPlan?.type === 'pro' || userPlan?.type === 'premium';
    adBlockingService.initialize(isProUser);
    
    return () => {
      // 清理資源
      adBlockingService.cleanup();
    };
  }, [userPlan]);

  useEffect(() => {
    if (!shouldLoadTagManager || process.env.NODE_ENV !== 'production') {
      return;
    }

    ensureGoogleTagManager('GTM-NR4P4S7W').catch((error) => {
      console.warn('Failed to defer-load Google Tag Manager:', error);
    });
  }, [shouldLoadTagManager]);

  // 初始化 API Client 攔截器
  useEffect(() => {
    initializeApiClient({
      authLogout: logout,
      showToast: showToast,
      openDialog: openDialog,
      navigate: navigate,
      t: t
    });
  }, [logout, showToast, openDialog, navigate, t]);



  // 初始化認證守衛和預載入器
  useEffect(() => {
    // 確保認證預載入器已啟動
    authPreloader.startPreload().then(() => {
      console.log('🚀 App: Auth preloader completed');
    }).catch(error => {
      console.warn('⚠️ App: Auth preloader failed:', error);
    });

    // 確保認證狀態在應用啟動時初始化
    authGuard.ensureAuthenticated().catch(error => {
      console.log('Authentication not available on app start:', error.message);
      // 不需要顯示錯誤，因為用戶可能未登入
    });

    // 設置 staging 環境的搜尋引擎保護
    setupRobotsProtection();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      initializeFreeStockList().then(() => {
        console.log('🚀 App: Free stock list initialized');
      }).catch(error => {
        console.warn('⚠️ App: Free stock list initialization failed:', error);
      });
    }, 2000);

    return () => window.clearTimeout(timer);
  }, []);



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
    if (useSideNavigation) {
      setSidebarOpen(false);
    }
  };

  // 處理文章點擊
  const handleArticlesClick = () => {
    if (useSideNavigation) {
      setSidebarOpen(false);
    }
  };

  // 處理導航項目點擊（通用）
  const handleNavItemClick = () => {
    if (useSideNavigation) {
      setSidebarOpen(false);
    }
  };

  // 每次路由改變時滾動到頂部
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  React.useEffect(() => {
    const syncTopNavState = () => {
      setIsTopNavScrolled(window.scrollY > 24);
    };

    syncTopNavState();
    window.addEventListener('scroll', syncTopNavState, { passive: true });

    return () => window.removeEventListener('scroll', syncTopNavState);
  }, [location.pathname]);

  // 監聽語言變化，觸發導航重新檢查
  React.useEffect(() => {
    if (triggerCheck) {
      const timer = setTimeout(() => {
        triggerCheck();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [i18n.language, triggerCheck]);

  // 移除動態檢測邏輯，因為現在使用覆蓋模式，不需要調整佈局



  return (
    <div className={`App ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <PageViewTracker />
      <div className="App-inner">
        {/* 側邊欄區塊 - 只在使用側邊導航模式時渲染 */}
        {useSideNavigation && (
          <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <ul>
            <li className="sidebar-item-1">
              <NavLink
                to={`/${lang}/`}
                onClick={handleNavItemClick}
                className={({ isActive }) => isActive ? "active-nav-link" : ""}
                aria-current={({ isActive }) => isActive ? "page" : undefined}
              >
                <FaHome />
                <span>{t('nav.home')}</span>
              </NavLink>
            </li>
            <li className="sidebar-item-2">
              <NavLink
                to={`/${lang}/priceanalysis`}
                onClick={handleNavItemClick}
                className={({ isActive }) => isActive ? "active-nav-link" : ""}
                aria-current={({ isActive }) => isActive ? "page" : undefined}
              >
                <FaChartLine />
                <span>{t('nav.priceAnalysis')}</span>
              </NavLink>
            </li>
            <li className="sidebar-item-3">
              <NavLink
                to={`/${lang}/market-sentiment`}
                onClick={handleNavItemClick}
                className={({ isActive }) => isActive ? "active-nav-link" : ""}
                aria-current={({ isActive }) => isActive ? "page" : undefined}
              >
                <FaHeartbeat />
                <span>{t('nav.marketSentiment')}</span>
              </NavLink>
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
              <NavLink
                to={`/${lang}/watchlist`}
                onClick={handleWatchlistClick}
                className={({ isActive }) => isActive ? "active-nav-link" : ""}
                aria-current={({ isActive }) => isActive ? "page" : undefined}
              >
                <div className="sidebar-item-content">
                  <FaList />
                  <span>{t('nav.watchlist')}</span>
                </div>
              </NavLink>
            </li>
            <li className="sidebar-item-6">
              <NavLink
                to={`/${lang}/articles`}
                onClick={handleArticlesClick}
                className={({ isActive }) => isActive ? "active-nav-link" : ""}
                aria-current={({ isActive }) => isActive ? "page" : undefined}
              >
                <div className="sidebar-item-content">
                  <FaChartBar />
                  <span>{t('nav.articles')}</span>
                </div>
              </NavLink>
            </li>
            <li className="sidebar-item-7">
              <NavLink
                to={`/${lang}/subscription-plans`}
                onClick={handleNavItemClick}
                className={({ isActive }) => isActive ? "active-nav-link" : ""}
                aria-current={({ isActive }) => isActive ? "page" : undefined}
              >
                <FaPiggyBank />
                <span>{t('nav.subscription')}</span>
              </NavLink>
            </li>
            {/* AdminNavigation 已移除以提高安全性 */}
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
        )}

        {/* 主內容區域 */}
        <main className={`main-content ${isHomePage ? 'main-content--home' : ''}`}>
          {/* 頂部導航欄 */}
          <header
            className={[
              'top-nav',
              isHomePage ? 'top-nav--immersive' : 'top-nav--default',
              isTopNavScrolled ? 'top-nav--scrolled' : ''
            ].filter(Boolean).join(' ')}
            ref={navRef}
          >
            <div className="top-nav__shell top-nav__inner">
              {/* Logo 區域 */}
              <div className="top-nav-logo">
                <NavLink to={`/${lang}/`}>
                  <img
                    src="/logo.png"
                    alt={t('appName')}
                    className="logo"
                    width="156"
                    height="27"
                    decoding="async"
                  />
                </NavLink>
              </div>

              {/* 桌面版導航項目 - 只在不使用側邊導航時顯示 */}
              {!useSideNavigation && (
                <div className="desktop-nav-items">
                  <NavLink
                    to={`/${lang}/priceanalysis`}
                    className={({ isActive }) => isActive ? "active-nav-link" : ""}
                    aria-current={({ isActive }) => isActive ? "page" : undefined}
                  >
                    <FaChartLine />
                    <span>{t('nav.priceAnalysis')}</span>
                  </NavLink>
                  <NavLink
                    to={`/${lang}/market-sentiment`}
                    className={({ isActive }) => isActive ? "active-nav-link" : ""}
                    aria-current={({ isActive }) => isActive ? "page" : undefined}
                  >
                    <FaHeartbeat />
                    <span>{t('nav.marketSentiment')}</span>
                  </NavLink>
                  <NavLink
                    to={`/${lang}/watchlist`}
                    onClick={handleWatchlistClick}
                    className={({ isActive }) => isActive ? "active-nav-link" : ""}
                    aria-current={({ isActive }) => isActive ? "page" : undefined}
                  >
                    <FaList />
                    <span>{t('nav.watchlist')}</span>
                  </NavLink>
                  <NavLink
                    to={`/${lang}/articles`}
                    onClick={handleArticlesClick}
                    className={({ isActive }) => isActive ? "active-nav-link" : ""}
                    aria-current={({ isActive }) => isActive ? "page" : undefined}
                  >
                    <FaChartBar />
                    <span>{t('nav.articles')}</span>
                  </NavLink>
                  <NavLink
                    to={`/${lang}/subscription-plans`}
                    className={({ isActive }) => isActive ? "active-nav-link" : ""}
                    aria-current={({ isActive }) => isActive ? "page" : undefined}
                  >
                    <FaPiggyBank />
                    <span>{t('nav.subscription')}</span>
                  </NavLink>
                  <a href="https://www.facebook.com/profile.php?id=61565751412240" target="_blank" rel="noopener noreferrer">
                    <FaFacebook />
                    <span>{t('nav.facebookLong')}</span>
                  </a>
                </div>
              )}

              {/* 使用者操作和選單按鈕 */}
              <div className="user-actions">
                <LanguageSwitcher />
                <AuthStatusIndicator />
                {/* 在使用側邊導航時顯示漢堡選單 */}
                {useSideNavigation && (
                  <div className="menu-toggle-wrapper">
                    <FaBars className="menu-toggle" onClick={toggleSidebar} />
                    {hasNewWatchlist && <span className="notification-dot" />}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* 公告欄 - 覆蓋模式，不影響頁面佈局 */}
          <Suspense fallback={null}>
            {shouldLoadAnnouncementBar ? <AnnouncementBar /> : null}
          </Suspense>

          {/* 內容路由 */}
          <div className={`content-area ${isHomePage ? 'content-area--home' : ''}`}>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />

                {/* 拆分後: PriceAnalysisPage 擔任標準差分析頁面 */}
                <Route
                  path="priceanalysis"
                  element={<PriceAnalysis />}
                />

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
                    <ProtectedRoute>
                      <WatchlistContainer />
                    </ProtectedRoute>
                  }
                />
                <Route path="articles" element={<Articles />} />
                <Route path="articles/:slug" element={<ArticleDetail />} />
                <Route path="user-account" element={
                  <ProtectedRoute>
                    <UserAccountPage />
                  </ProtectedRoute>
                } />
                <Route path="subscription-plans" element={<SubscriptionPlansPage />} />
                <Route path="sponsor-us" element={<SponsorUs />} />
                <Route path="sponsor-success" element={<SponsorSuccess />} />
                <Route path="payment" element={
                  <ProtectedRoute>
                    <PaymentPage />
                  </ProtectedRoute>
                } />
                <Route path="payment/flow" element={
                  <ProtectedRoute>
                    <PaymentFlowPage />
                  </ProtectedRoute>
                } />
                <Route path="payment/status" element={
                  <ProtectedRoute>
                    <PaymentStatusPage />
                  </ProtectedRoute>
                } />
                <Route path="payment/result" element={<PaymentResult />} />
                <Route
                  path="google-trends/symbol/:symbol"
                  element={
                    <ProtectedRoute>
                      <GoogleTrendsSymbolPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="google-trends/market"
                  element={
                    <ProtectedRoute>
                      <GoogleTrendsMarketPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="NK-Admin" element={
                  <ProtectedRoute>
                    <AdminPage />
                  </ProtectedRoute>
                } />
                {process.env.NODE_ENV === 'development' && (
                  <>
                    <Route path="/test-csrf" element={<CSRFExample />} />
                    <Route path="NK-Admin-diagnostic" element={
                      <ProtectedRoute>
                        <AdminDiagnostic />
                      </ProtectedRoute>
                    } />
                  </>
                )}

                {/* 可以添加一個捕獲無效相對路徑的路由 */}
                <Route path="*" element={<Navigate to={`/${lang}/`} replace />} />
              </Routes>
            </Suspense>
          </div>
        </main>

        {/* 添加文字對話客服元件 */}
        <Suspense fallback={null}>
          {shouldLoadChatWidget ? <ChatWidget /> : null}
        </Suspense>

        {/* 添加遮罩層 (使用側邊導航時點擊收合側邊欄) */}
        <Overlay isVisible={sidebarOpen && useSideNavigation} onClick={closeSidebar} />

        {/* 將 Footer 移到這裡 */}
        <Footer />
      </div>
      <AuthDialog />
      <GlobalFeatureUpgradeDialog />
      {/* 條件式 AdSense 載入 */}
      <Suspense fallback={null}>
        {shouldLoadAdSense ? (
          <ConditionalAdSense key={`adsense-${user?.id || 'guest'}-${userPlan?.type || 'pending'}`} />
        ) : null}
      </Suspense>
      {/* Global Toast for API Client error handling */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}


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
      <SubscriptionProvider>
        <DialogProvider>
          <AdProvider>
            <Routes>
              {/* --- 確保這裡使用正確定義的 InitialRedirect --- */}
              <Route path="/" element={<InitialRedirect />} />
              {/* --- 確保這裡使用正確定義的 LanguageWrapper --- */}
              <Route path="/:lang/*" element={<LanguageWrapper />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AdProvider>
        </DialogProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
