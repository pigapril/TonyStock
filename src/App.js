import NotFound from './components/NotFound/NotFound';
// React 相關
import React, { Suspense, lazy, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Route, Routes, Navigate, useLocation, useParams, useNavigate, NavLink } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import { useTranslation } from 'react-i18next';
import { useSmartNavigation } from './hooks/useSmartNavigation';
import { useDeferredFeature } from './hooks/useDeferredFeature';
import { getInitialLanguage } from './locales/resourceGroups';
import { DEFAULT_LOCALE, getCanonicalLocale } from './locales/localeConfig';
import { loadCommonLocales } from './locales/loadCommonLocales';
import { isNonIndexableRoute } from './utils/seoRoutePolicy';


// 第三方庫
import { FaChartLine, FaChartBar, FaHeartbeat, FaBars, FaFacebook, FaList, FaHome, FaPiggyBank, FaThLarge } from 'react-icons/fa';

// 樣式引入
import './App.css';
import './components/Auth/styles/SignInDialog.css';
import './components/NewFeatureBadge/NewFeatureBadge.css';
import './components/Common/global-styles.css';
import './components/Common/ui-recipes.css';


// 自定義組件
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
import { setupRobotsProtection } from './utils/robotsHandler';
import { initializeFreeStockList } from './utils/freeStockListUtils';
import { canSeeCardTrial } from './utils/cardTrialRollout';
import { canSeeFreeTrial } from './utils/freeTrialRollout';
import BrandLogo from './components/Common/BrandLogo/BrandLogo';
import DeferredTagManager from './components/Common/DeferredTagManager/DeferredTagManager';
import RouteLocaleGate from './components/Common/RouteLocaleGate/RouteLocaleGate';
import MarketPulse from './components/MarketPulse/MarketPulse';
const Home = lazy(() => import('./components/Home/Home').then(module => ({ default: module.Home })));

const AuthDialog = lazy(() => import('./components/Auth/AuthDialog').then(module => ({ default: module.AuthDialog })));
const GlobalFeatureUpgradeDialog = lazy(() => import('./components/Common/Dialog/GlobalFeatureUpgradeDialog').then(module => ({ default: module.GlobalFeatureUpgradeDialog })));

const MarketSentimentIndex = lazy(() => import('./components/MarketSentimentIndex/MarketSentimentIndex'));
const MomentumDashboardPage = lazy(() => import('./components/MomentumDashboard/MomentumDashboardPage'));
const TwMarketSentimentIndex = lazy(() => import('./components/MarketSentimentIndex/TwMarketSentimentIndex'));
const SentimentBoard = lazy(() => import('./components/SentimentBoard/SentimentBoard'));
const SentimentIndicatorPage = lazy(() => import('./components/SentimentBoard/SentimentIndicatorPage'));
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
const CardTrialFlow = lazy(() => import('./components/Payment/CardTrial/CardTrialFlow'));
const FreeTrialFlow = lazy(() => import('./components/Payment/FreeTrial/FreeTrialFlow'));
const CardTrialResult = lazy(() => import('./components/Payment/CardTrial/CardTrialResult'));
const CardUpdateFlow = lazy(() => import('./components/Payment/CardUpdate/CardUpdateFlow'));
const CardUpdateResult = lazy(() => import('./components/Payment/CardUpdate/CardUpdateResult'));
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
  } else if (pathname.includes('/momentum')) {
    fallbackClassName += ' route-loading-placeholder--stable-page';
  } else if (pathname.includes('/watchlist') || pathname.includes('/sentiment-indicators/')) {
    fallbackClassName += ' route-loading-placeholder--stable-page';
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
  const { openDialog, dialog } = useDialog();
  const { showToast, toast, hideToast } = useToastManager();
  

  
  // 通知系統
  const {
    hasNewFeature: hasNewWatchlist,
    markFeatureAsSeen: markWatchlistSeen
  } = useNewFeatureNotification(FEATURES.WATCHLIST);
  
  const isMobile = useMediaQuery({ query: '(max-width: 1300px)' });
  const location = useLocation();
  const shouldNoindex = isNonIndexableRoute(location.pathname, lang);
  const isHomePage = location.pathname === `/${lang}` || location.pathname === `/${lang}/`;
  const showMarketPulse = [
    'priceanalysis', 'market-sentiment', 'tw-market-sentiment', 'momentum', 'watchlist'
  ].some((route) => location.pathname === `/${lang}/${route}` || location.pathname === `/${lang}/${route}/`);
  const [isTopNavScrolled, setIsTopNavScrolled] = React.useState(false);
  const shouldLoadAnnouncementBar = useDeferredFeature({ timeoutMs: 1500, minDelayMs: 1500, useIdleCallback: true, triggerOnInteraction: true });
  const shouldLoadChatWidget = useDeferredFeature({ timeoutMs: 3200, minDelayMs: 3200, useIdleCallback: true, triggerOnInteraction: true });
  const shouldLoadAdSense = useDeferredFeature({ timeoutMs: 4500, minDelayMs: 4500, useIdleCallback: true, triggerOnInteraction: true });


  // 智能導航系統
  const { 
    shouldUseSideNav, 
    navRef, 
    resetNavigation
  } = useSmartNavigation({
    enabled: !isMobile,
    debounceMs: 150,
    threshold: 8
  });

  // 決定是否使用側邊導航：手機版 OR 智能檢測到需要切換
  const useSideNavigation = isMobile || shouldUseSideNav;

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sentimentDropdownOpen, setSentimentDropdownOpen] = React.useState(false);

  // 廣告阻擋邏輯 - 根據用戶訂閱狀態
  useEffect(() => {
    const isProUser = userPlan?.type === 'pro' || userPlan?.type === 'premium';
    adBlockingService.initialize(isProUser);
    
    return () => {
      // 清理資源
      adBlockingService.cleanup();
    };
  }, [userPlan]);

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



  // 認證狀態由 AuthProvider 單一初始化流程負責。
  // 此處只保留與登入無關的環境保護設定，避免啟動時再次查詢 session。
  useEffect(() => {
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
    resetNavigation();
  }, [i18n.language, resetNavigation]);

  // 移除動態檢測邏輯，因為現在使用覆蓋模式，不需要調整佈局



  return (
    <div className={`App ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <Helmet>
        <link rel="manifest" href={`/manifest.${getCanonicalLocale(lang)}.json`} />
        {shouldNoindex && <meta name="robots" content="noindex, follow" />}
      </Helmet>
      <PageViewTracker />
      <DeferredTagManager />
      <div className="App-inner">
        {/* 側邊欄區塊 - 只在使用側邊導航模式時渲染 */}
        {useSideNavigation && (
          <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <ul>
            <li className="sidebar-item-1">
              <NavLink
                to={`/${lang}/`}
                end
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
            <li className="sidebar-item-3 sidebar-item dropdown">
              <div
                className="sidebar-dropdown-title"
                onClick={() => setSentimentDropdownOpen(!sentimentDropdownOpen)}
              >
                <FaHeartbeat />
                <span>{t('nav.marketSentiment')}</span>
              </div>
              {sentimentDropdownOpen && (
                <ul className="dropdown-menu">
                  <li>
                    <NavLink
                      to={`/${lang}/sentiment-indicators`}
                      onClick={() => { handleNavItemClick(); setSentimentDropdownOpen(false); }}
                      className={({ isActive }) => isActive ? "active-nav-link" : ""}
                    >
                      <span>🌐 {t('nav.indicatorOverview')}</span>
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to={`/${lang}/market-sentiment`}
                      onClick={() => { handleNavItemClick(); setSentimentDropdownOpen(false); }}
                      className={({ isActive }) => isActive ? "active-nav-link" : ""}
                    >
                      <span>🇺🇸 {t('nav.usMarket')}</span>
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to={`/${lang}/tw-market-sentiment`}
                      onClick={() => { handleNavItemClick(); setSentimentDropdownOpen(false); }}
                      className={({ isActive }) => isActive ? "active-nav-link" : ""}
                    >
                      <span>🇹🇼 {t('nav.twMarket')}</span>
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
            <li className="sidebar-item-momentum">
              <NavLink
                to={`/${lang}/momentum`}
                onClick={handleNavItemClick}
                className={({ isActive }) => isActive ? "active-nav-link" : ""}
              >
                <FaThLarge />
                <span>{t('nav.momentumDashboard')}</span>
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
              useSideNavigation ? 'top-nav--side-navigation' : '',
              isHomePage ? 'top-nav--immersive' : 'top-nav--default',
              isTopNavScrolled ? 'top-nav--scrolled' : ''
            ].filter(Boolean).join(' ')}
            ref={navRef}
            lang={lang}
          >
            <div className="top-nav__shell top-nav__inner">
              {/* Logo 區域 */}
              <div className="top-nav-logo">
                <NavLink to={`/${lang}/`}>
                  <BrandLogo alt={t('appName')} />
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
                  <div className={`desktop-nav-item dropdown${location.pathname.includes('/market-sentiment') ? ' active' : ''}`}>
                    <div className="desktop-nav-trigger">
                      <FaHeartbeat />
                      <span>{t('nav.marketSentiment')}</span>
                    </div>
                    <div className="desktop-dropdown-menu">
                      <NavLink
                        to={`/${lang}/sentiment-indicators`}
                        className={({ isActive }) => isActive ? "active-nav-link" : ""}
                      >
                        🌐 {t('nav.indicatorOverview')}
                      </NavLink>
                      <NavLink
                        to={`/${lang}/market-sentiment`}
                        className={({ isActive }) => isActive ? "active-nav-link" : ""}
                      >
                        🇺🇸 {t('nav.usMarket')}
                      </NavLink>
                      <NavLink
                        to={`/${lang}/tw-market-sentiment`}
                        className={({ isActive }) => isActive ? "active-nav-link" : ""}
                      >
                        🇹🇼 {t('nav.twMarket')}
                      </NavLink>
                    </div>
                  </div>
                  <NavLink
                    to={`/${lang}/momentum`}
                    className={({ isActive }) => isActive ? "active-nav-link" : ""}
                  >
                    <FaThLarge />
                    <span>{t('nav.momentumDashboard')}</span>
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
                </div>
              )}

              {/* 使用者操作和選單按鈕 */}
              <div className="user-actions">
                <LanguageSwitcher />
                <a
                  className="top-nav-social-link"
                  href="https://www.facebook.com/profile.php?id=61565751412240"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('nav.facebookLong')}
                  title={t('nav.facebookLong')}
                >
                  <FaFacebook aria-hidden="true" />
                </a>
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
            {showMarketPulse && <MarketPulse />}
            <Suspense fallback={<RouteFallback />}>
              <RouteLocaleGate lang={lang} pathname={location.pathname} fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />

                {/* 拆分後: PriceAnalysisPage 擔任標準差分析頁面 */}
                <Route
                  path="priceanalysis"
                  element={<PriceAnalysis />}
                />

                <Route
                  path="sentiment-indicators"
                  element={<SentimentBoard />}
                />
                <Route
                  path="sentiment-indicators/:slug"
                  element={<SentimentIndicatorPage />}
                />
                <Route
                  path="market-sentiment"
                  element={<MarketSentimentIndex />}
                />
                <Route path="momentum" element={<MomentumDashboardPage />} />
                <Route
                  path="tw-market-sentiment"
                  element={<TwMarketSentimentIndex />}
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
                <Route path="payment/card-trial" element={
                  <ProtectedRoute>
                    {process.env.REACT_APP_BIND_CARD_TRIAL_ENABLED === 'true' && canSeeCardTrial(user?.email)
                      ? <CardTrialFlow />
                      : <Navigate to={`/${lang}/subscription-plans`} replace />}
                  </ProtectedRoute>
                } />
                <Route path="payment/free-trial" element={
                  <ProtectedRoute>
                    {canSeeFreeTrial(user?.email)
                      ? <FreeTrialFlow />
                      : <Navigate to={`/${lang}/subscription-plans`} replace />}
                  </ProtectedRoute>
                } />
                <Route path="payment/card-trial/result" element={<CardTrialResult />} />
                <Route path="payment/card-update" element={
                  <ProtectedRoute>
                    <CardUpdateFlow />
                  </ProtectedRoute>
                } />
                <Route path="payment/card-update/result" element={<CardUpdateResult />} />
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
                <Route path="*" element={<NotFound />} />
              </Routes>
              </RouteLocaleGate>
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
      <Suspense fallback={null}>
        {dialog.isOpen && dialog.type === 'auth' ? <AuthDialog /> : null}
        {dialog.isOpen && dialog.type === 'featureUpgrade' ? <GlobalFeatureUpgradeDialog /> : null}
      </Suspense>
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
  const [localeLoadError, setLocaleLoadError] = React.useState(null);
  const [localeRetry, setLocaleRetry] = React.useState(0);
  const standardLang = i18n.options.supportedLngs.find(
    supportedLang => supportedLang.toLowerCase() === lang?.toLowerCase()
  );

  useEffect(() => {
    if (!lang) return undefined;
    if (!standardLang) {
      const currentPathWithoutLang = location.pathname.replace(/^\/[^/]+/, '');
      navigate(`/${DEFAULT_LOCALE}${currentPathWithoutLang || '/'}${location.search}${location.hash}`, { replace: true });
      return undefined;
    }

    // Canonicalize locale casing before starting a resource request.
    if (lang !== standardLang) {
      const newPath = location.pathname.replace(`/${lang}`, `/${standardLang}`);
      navigate(newPath + location.search + location.hash, { replace: true });
      return undefined;
    }

    if (i18n.language === standardLang) {
      setLocaleLoadError(null);
      return undefined;
    }

    let active = true;
    setLocaleLoadError(null);
    loadCommonLocales(i18n, standardLang)
      .then(() => {
        if (!active || i18n.language === standardLang) return undefined;
        return i18n.changeLanguage(standardLang);
      })
      .then(() => {
        if (active) setLocaleLoadError(null);
      })
      .catch(() => {
        if (active) setLocaleLoadError(standardLang);
      });

    return () => { active = false; };
  }, [lang, standardLang, i18n, navigate, location.pathname, location.search, location.hash, localeRetry]);

  const isValidLang = Boolean(lang && standardLang && lang === standardLang);

  if (!isValidLang) {
    return null;
  }

  // Do not render the shell in the previous language while the new common
  // bundle downloads. RouteLocaleGate will load any page-specific groups next.
  if (i18n.language !== standardLang) {
    if (localeLoadError === standardLang) {
      return <div className="loading-container" role="alert">
        <p>Unable to load language resources. Check your connection and try again.</p>
        <button type="button" onClick={() => setLocaleRetry(value => value + 1)}>Retry</button>
      </div>;
    }
    return <RouteFallback />;
  }

  return <AppContent />;
}

// --- 確保 InitialRedirect 的定義存在 ---
function InitialRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const targetLang = getInitialLanguage('/', navigator.language || navigator.userLanguage || '');
    navigate(`/${targetLang}`, { replace: true });
  }, [navigate]);

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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AdProvider>
        </DialogProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
