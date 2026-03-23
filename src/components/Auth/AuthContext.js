import { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Analytics } from '../../utils/analytics';
import authService from '../../components/Auth/auth.service';
import { handleApiError } from '../../utils/errorHandler';
import csrfClient from '../../utils/csrfClient';
import { authDiagnostics } from '../../utils/authDiagnostics';
import authInitFix from '../../utils/authInitFix';
import authStateManager from '../../utils/authStateManager';
import authPreloader from '../../utils/authPreloader';
import authStateCache from '../../utils/authStateCache';
import { systemLogger } from '../../utils/logger';
import { ensureGoogleIdentityScript } from '../../utils/deferredScripts';

export const AuthContext = createContext({
    user: null,
    isAuthenticated: false,
    watchlistAccess: false,
    loading: true,
    error: null,
    isGoogleInitialized: false,
    ensureGoogleIdentityLoaded: async () => false,
    isAdmin: false,
    adminLoading: false
});

export function AuthProvider({ children }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isGoogleInitialized, setIsGoogleInitialized] = useState(false);
    const [isGoogleScriptReady, setIsGoogleScriptReady] = useState(() => Boolean(window.google?.accounts?.id));
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminLoading, setAdminLoading] = useState(false);
    const [preloadApplied, setPreloadApplied] = useState(false);

    const handleError = (error) => {
        const errorData = handleApiError(error);
        setError(errorData.data);
        setLoading(false);
    };

    // Admin status checking function - 修復重複調用問題
    const checkAdminStatus = useCallback(async () => {
        if (!user) {
            setIsAdmin(false);
            return;
        }

        // 防止重複調用 - 檢查是否已經在檢查中
        const userId = user.id || user.userId;
        const checkingKey = `checking_admin_${userId}`;

        if (sessionStorage.getItem(checkingKey)) {
            systemLogger.debug('AuthContext: Admin status check already in progress for user:', userId);
            return;
        }

        try {
            setAdminLoading(true);
            sessionStorage.setItem(checkingKey, 'true');

            systemLogger.info('AuthContext: Checking admin status for user:', user.email);

            const response = await authService.checkAdminStatus();
            const adminStatus = response?.isAdmin || false;

            systemLogger.info('AuthContext: Admin status result:', {
                isAdmin: adminStatus,
                userId,
                timestamp: new Date().toISOString()
            });

            setIsAdmin(adminStatus);

        } catch (error) {
            systemLogger.error('AuthContext: Failed to check admin status:', error);
            setIsAdmin(false); // Default to false for security
        } finally {
            setAdminLoading(false);
            sessionStorage.removeItem(checkingKey);
        }
    }, [user]);

    // 將 handleGoogleCredential 移到這裡，在 useEffect 之前
    const handleGoogleCredential = useCallback(async (response) => {
        systemLogger.debug('Google credential response:', {
            hasResponse: !!response,
            hasCredential: !!response?.credential,
            credentialLength: response?.credential?.length,
            timestamp: new Date().toISOString()
        });

        try {
            setLoading(true);
            systemLogger.debug('Before verifyGoogleToken:', {
                timestamp: new Date().toISOString()
            });

            const { user: userData, csrfToken } = await authService.verifyGoogleToken(response.credential);

            systemLogger.info('Setting user data:', userData);
            setUser(userData);

            // 新增：若有 csrfToken，直接設置
            if (csrfToken) {
                csrfClient.setCSRFToken(csrfToken);
            }

            // 保存認證狀態到快取
            const authState = {
                isAuthenticated: true,
                user: userData,
                timestamp: Date.now()
            };
            authStateCache.saveAuthState(authState);

            // 立即更新認證狀態管理器的快取
            authStateManager.setAuthState(authState);

            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('loginSuccess'));
            }, 0);

            Analytics.auth.login({
                method: 'google',
                status: 'success',
                variant: 'identity_service'
            });
        } catch (error) {
            systemLogger.error('Google credential error:', {
                message: error.message,
                type: error.constructor.name,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });

            handleError(error);
            Analytics.auth.login({
                method: 'google',
                status: 'error',
                variant: 'identity_service',
                error: error.message
            });
        } finally {
            setLoading(false);
        }
    }, []);  // 使用 useCallback 並添加必要的依賴

    // 檢查瀏覽器相容性
    const checkBrowserCompatibility = useCallback(() => {
        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        const chromeVersion = parseInt((/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [])[1], 10);

        // 檢查 FedCM 支援
        const hasFedCMSupport = !!(
            window.google?.accounts?.id?.initialize &&
            'FederatedCredential' in window
        );

        const compatibility = {
            isCompatible: isChrome && chromeVersion >= 117 && hasFedCMSupport,
            useLegacy: !isChrome || chromeVersion < 117 || !hasFedCMSupport
        };

        systemLogger.debug('Browser compatibility check:', {
            isChrome,
            chromeVersion,
            hasFedCMSupport,
            useLegacy: compatibility.useLegacy
        });

        return compatibility;
    }, []);

    const ensureGoogleIdentityLoaded = useCallback(async () => {
        try {
            await ensureGoogleIdentityScript();
            setIsGoogleScriptReady(true);
            return true;
        } catch (scriptError) {
            systemLogger.error('Failed to load Google Identity script:', scriptError);
            return false;
        }
    }, []);

    // 初始化 Google Identity Service
    useEffect(() => {
        if (!isGoogleScriptReady) {
            return undefined;
        }

        const initializeGoogleIdentity = () => {
            const { isCompatible, useLegacy } = checkBrowserCompatibility();

            if (!window.google?.accounts?.id) {
                systemLogger.warn('Google Identity Service not loaded, waiting...');
                return;
            }

            try {
                const initConfig = {
                    client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
                    callback: handleGoogleCredential,
                    auto_select: false,
                    cancel_on_tap_outside: true,
                    state_cookie_domain: window.location.hostname,
                    error_callback: (error) => {
                        systemLogger.error('Google Identity error:', error);
                        Analytics.auth.identityService.error({
                            errorType: error.type,
                            errorMessage: error.message
                        });
                    }
                };

                // 只在完全支援 FedCM 的環境下啟用，避免 accountHint 錯誤
                const chromeVersion = parseInt((/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [])[1], 10);
                if (isCompatible && chromeVersion >= 119) {
                    initConfig.use_fedcm_for_prompt = true;
                }

                window.google.accounts.id.initialize(initConfig);

                setIsGoogleInitialized(true);
                Analytics.auth.identityService.initialize({
                    status: 'success',
                    useLegacy
                });
            } catch (error) {
                systemLogger.error('Initialize failed:', error);
                setIsGoogleInitialized(false);
            }
        };

        // 監聽 Google SDK 載入
        if (window.google?.accounts?.id) {
            initializeGoogleIdentity();
        } else {
            window.googleSDKLoaded = () => {
                systemLogger.info('Google SDK loaded, initializing...');
                initializeGoogleIdentity();
            };
        }
    }, [checkBrowserCompatibility, handleGoogleCredential, isGoogleScriptReady]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            ensureGoogleIdentityLoaded();
        }, 2500);

        return () => window.clearTimeout(timer);
    }, [ensureGoogleIdentityLoaded]);

    // 檢查認證狀態（已移除不必要的延遲，因為 /api/auth/status 已被後端豁免）
    const checkAuthStatus = useCallback(async () => {
        systemLogger.debug('CheckAuthStatus initiated:', {
            currentCookies: document.cookie,
            timestamp: new Date().toISOString(),
            preloadApplied
        });

        try {
            // 移除人為延遲，因為認證端點已被後端 rate limiting 豁免
            systemLogger.info('🚀 AuthContext: Performing auth check without artificial delay');

            // 保留 authInitFix 初始化，但縮短超時時間
            try {
                await Promise.race([
                    authInitFix.initialize(),
                    new Promise(resolve => setTimeout(resolve, 1000)) // 縮短到 1 秒
                ]);
            } catch (initError) {
                systemLogger.warn('AuthInitFix initialization timeout, proceeding anyway:', initError);
            }

            // 直接進行認證檢查，無延遲

            const { user: userData } = await authService.checkStatus();
            systemLogger.debug('CheckAuthStatus response:', {
                hasUser: !!userData,
                cookies: document.cookie,
                timestamp: new Date().toISOString()
            });

            setUser(userData);

            // 保存認證狀態到快取
            const authState = {
                isAuthenticated: !!userData,
                user: userData,
                timestamp: Date.now()
            };
            authStateCache.saveAuthState(authState);

            // 如果用戶已登入，嘗試初始化 CSRF token（如果還沒有的話）
            if (userData) {
                if (!csrfClient.isTokenInitialized()) {
                    try {
                        systemLogger.info('Initializing CSRF token for existing user...');
                        await csrfClient.initializeCSRFToken();
                        systemLogger.info('CSRF token initialized successfully for existing user');
                    } catch (csrfError) {
                        systemLogger.warn('Failed to initialize CSRF token for existing user:', csrfError);
                        // 不拋出錯誤，讓用戶繼續使用（某些功能可能受限）
                        // 這可能是因為用戶的 session 已過期，需要重新登入
                    }
                }
            } else {
                // 如果用戶未登入，清除 CSRF token
                csrfClient.clearCSRFToken();
            }

            Analytics.auth.statusCheck({ status: 'success' });
        } catch (error) {
            systemLogger.warn('CheckAuthStatus error:', {
                error: error.message,
                status: error.response?.status,
                cookies: document.cookie,
                timestamp: new Date().toISOString()
            });

            // 如果是 403 錯誤且包含 IP 封鎖信息，特殊處理
            if (error.response?.status === 403 && error.response?.data?.message?.includes('IP 已被封鎖')) {
                systemLogger.error('🚫 IP has been blocked due to too many requests. Please wait and try again later.');
                setError('系統檢測到異常請求，請稍後再試。如果問題持續，請聯繫技術支援。');
                setUser(null);
                return;
            }

            // 如果是 403 錯誤，可能是 CSRF 配置問題
            if (error.response?.status === 403) {
                systemLogger.warn('🔄 Auth status check got 403, this may indicate CSRF middleware misconfiguration');

                // 只在開發環境且沒有最近運行過診斷時才運行
                const lastDiagnostic = sessionStorage.getItem('lastAuthDiagnostic');
                const now = Date.now();
                if (process.env.NODE_ENV === 'development' &&
                    (!lastDiagnostic || now - parseInt(lastDiagnostic) > 60000)) { // 增加到 60 秒內不重複診斷
                    sessionStorage.setItem('lastAuthDiagnostic', now.toString());
                    authDiagnostics.diagnoseAuthIssue().catch(diagError => {
                        systemLogger.error('Diagnostics failed:', diagError);
                    });
                }

                // 清除用戶狀態，因為 403 表示認證問題
                setUser(null);
                return;
            }

            // 如果是網路錯誤（通常是 CORS 問題），保持當前狀態
            if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
                systemLogger.warn('🔄 Auth status check got network error (possibly CORS or server down)');

                // 只在開發環境且沒有最近運行過診斷時才運行
                const lastNetworkDiagnostic = sessionStorage.getItem('lastNetworkDiagnostic');
                const now = Date.now();
                if (process.env.NODE_ENV === 'development' &&
                    (!lastNetworkDiagnostic || now - parseInt(lastNetworkDiagnostic) > 120000)) { // 增加到 120 秒內不重複診斷
                    sessionStorage.setItem('lastNetworkDiagnostic', now.toString());
                    authDiagnostics.diagnoseAuthIssue().catch(diagError => {
                        systemLogger.error('Diagnostics failed:', diagError);
                    });
                }

                // 不設置 user 為 null，保持當前狀態
                return;
            }

            setUser(null);
            handleError(error);
        } finally {
            setLoading(false);
        }
    }, []);

    // 應用快取和預載入的認證狀態（如果可用）
    useEffect(() => {
        const applyInitialState = async () => {
            if (preloadApplied) return;

            // 首先嘗試從快取載入狀態
            const cachedState = authStateCache.loadAuthState();
            if (cachedState) {
                systemLogger.info('💾 AuthContext: Applying cached auth state:', {
                    isAuthenticated: cachedState.isAuthenticated,
                    hasUser: !!cachedState.user,
                    source: cachedState.source,
                    confidence: cachedState.confidence,
                    cacheAge: cachedState.cacheAge
                });

                setUser(cachedState.user);
                setLoading(false);
                setPreloadApplied(true);

                // 如果快取狀態需要刷新或信心度較低，在背景中進行檢查
                if (cachedState.needsRefresh || cachedState.confidence === 'low' || cachedState.cacheAge > 60000) {
                    systemLogger.info('🔄 AuthContext: Cache needs refresh, performing background check');
                    setTimeout(() => {
                        checkAuthStatus();
                    }, 100);
                }

                return;
            }

            try {
                // 如果沒有快取，嘗試獲取預載入狀態
                const preloadedState = await authPreloader.waitForPreload(1000);

                if (preloadedState && preloadedState.confidence !== 'none') {
                    systemLogger.info('🚀 AuthContext: Applying preloaded auth state:', {
                        isAuthenticated: preloadedState.isAuthenticated,
                        hasUser: !!preloadedState.user,
                        source: preloadedState.source,
                        confidence: preloadedState.confidence,
                        preloadTime: preloadedState.preloadTime
                    });

                    setUser(preloadedState.user);
                    setLoading(false);
                    setPreloadApplied(true);

                    // 保存到快取
                    authStateCache.saveAuthState(preloadedState);

                    // 如果預載入狀態信心度較低，在背景中進行完整檢查
                    if (preloadedState.confidence === 'low' || preloadedState.source === 'preload_failed') {
                        systemLogger.info('🔄 AuthContext: Preload confidence low, performing background check');
                        setTimeout(() => {
                            checkAuthStatus();
                        }, 100);
                    }

                    return;
                }
            } catch (error) {
                systemLogger.warn('⚠️ AuthContext: Failed to apply preloaded state:', error);
            }

            // 如果沒有快取或預載入狀態，進行正常檢查
            systemLogger.info('🔄 AuthContext: No cached or preloaded state available, performing normal check');
            checkAuthStatus();
        };

        applyInitialState();
    }, [checkAuthStatus, preloadApplied]);

    // 初始化時檢查登入狀態（僅在沒有應用預載入狀態時）
    useEffect(() => {
        if (!preloadApplied) {
            checkAuthStatus();
        }
    }, [checkAuthStatus, preloadApplied]);

    // 當用戶狀態改變時檢查管理員狀態 - 修復無限循環
    useEffect(() => {
        if (user) {
            // 只在用戶 ID 實際改變時才檢查管理員狀態
            const userId = user.id || user.userId;
            const lastCheckedUserId = sessionStorage.getItem('lastCheckedAdminUserId');

            if (lastCheckedUserId !== String(userId)) {
                systemLogger.info('AuthContext: User changed, checking admin status for:', userId);
                sessionStorage.setItem('lastCheckedAdminUserId', String(userId));
                checkAdminStatus();
            }
        } else {
            setIsAdmin(false);
            setAdminLoading(false);
            sessionStorage.removeItem('lastCheckedAdminUserId');
        }
    }, [user?.id, user?.userId, checkAdminStatus]); // 只監聽用戶 ID 變化

    // 登出處理
    const logout = async () => {
        try {
            await authService.logout();

            // 立即清除用戶狀態
            setUser(null);
            setError(null);
            setLoading(false);
            setIsAdmin(false);
            setAdminLoading(false);

            // 清除快取的認證狀態
            authStateCache.clearAuthState();

            // 清除認證狀態管理器的快取
            authStateManager.invalidateCache();

            let identityServiceRevoked = false;
            if (window.google?.accounts?.id) {
                try {
                    // 使用 disableAutoSelect 而不是 revoke 來避免 FedCM 錯誤
                    window.google.accounts.id.disableAutoSelect();
                    identityServiceRevoked = true;
                } catch (error) {
                    systemLogger.error('Google Identity Service disable auto-select failed:', error);
                }
            }

            // 新增：登出時清除CSRF token
            csrfClient.clearCSRFToken();

            // 新增：觸發登出成功事件，讓其他組件可以重置狀態
            window.dispatchEvent(new CustomEvent('logoutSuccess'));

            // 新增：登出後自動導向首頁
            navigate('/');

            Analytics.auth.logout({
                status: 'success',
                source: 'user_action',
                identityServiceRevoked
            });
        } catch (error) {
            handleError(error);
        }
    };

    const resetError = () => setError(null);

    // 提供 Google 登入按鈕渲染方法
    const renderGoogleButton = useCallback((buttonElement) => {
        const { useLegacy } = checkBrowserCompatibility();

        if (!window.google?.accounts?.id) {
            systemLogger.warn('Google Identity Service not available');
            Analytics.auth.identityService.buttonRender({
                status: 'error',
                type: 'standard',
                variant: 'service_unavailable'
            });
            return;
        }

        if (!isGoogleInitialized) {
            systemLogger.warn('Google Identity Service not initialized yet');
            Analytics.auth.identityService.buttonRender({
                status: 'error',
                type: 'standard',
                variant: 'not_initialized'
            });
            return;
        }

        try {
            window.google.accounts.id.renderButton(buttonElement, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'continue_with',
                width: undefined,
                logo_alignment: 'center',
                // 在不支援 FedCM 的瀏覽器使用傳統模式
                ux_mode: useLegacy ? 'popup' : undefined
            });

            Analytics.auth.identityService.buttonRender({
                status: 'success',
                type: 'standard',
                variant: useLegacy ? 'legacy' : 'fedcm'
            });
        } catch (error) {
            systemLogger.error('Button render error:', error);
            Analytics.auth.identityService.buttonRender({
                status: 'error',
                type: 'standard',
                variant: useLegacy ? 'legacy' : 'fedcm',
                error: error.message
            });
        }
    }, [checkBrowserCompatibility, isGoogleInitialized]);

    const value = {
        user,
        loading,
        error,
        resetError,
        logout,
        checkAuthStatus,
        renderGoogleButton,
        isGoogleInitialized,
        ensureGoogleIdentityLoaded,
        isAdmin,
        adminLoading,
        checkAdminStatus
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
} 
