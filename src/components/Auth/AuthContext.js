import { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Analytics } from '../../utils/analytics';
import authService from '../../components/Auth/auth.service';
import { handleApiError } from '../../utils/errorHandler';
import csrfClient from '../../utils/csrfClient';
import { authDiagnostics } from '../../utils/authDiagnostics';
import authStateManager from '../../utils/authStateManager';
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

    // AuthStateManager is the single source for the initial session check and
    // all subsequent forced refreshes. AuthContext only projects that result
    // into React state; it must not issue a parallel auth/status request.
    const checkAuthStatus = useCallback(async (forceRefresh = true) => {
        systemLogger.debug('AuthContext: Resolving authentication state', {
            forceRefresh,
            timestamp: new Date().toISOString()
        });

        try {
            const authState = await authStateManager.getAuthState(forceRefresh);

            // A transport / server error is not proof that the session expired.
            // Keep the last known user and CSRF token until a successful status
            // response confirms the user is anonymous.
            if (authState?.error) {
                systemLogger.warn('AuthContext: Auth status could not be verified; preserving last known state:', authState.error);
                Analytics.auth.statusCheck({ status: 'error' });
                return authState;
            }

            const userData = authState?.isAuthenticated ? (authState.user || null) : null;
            setUser(userData);
            setError(null);

            authStateCache.saveAuthState({
                isAuthenticated: Boolean(userData),
                user: userData,
                timestamp: Date.now()
            });

            if (!userData) {
                csrfClient.clearCSRFToken();
            }
            // Existing sessions do not need a CSRF round trip just to render a
            // read-only page. apiClient and fetchWithCSRF acquire the token on
            // the first state-changing request; Google login applies its token
            // immediately when the verification response supplies one.

            Analytics.auth.statusCheck({ status: 'success' });
            return authState;
        } catch (error) {
            systemLogger.warn('AuthContext: Failed to resolve authentication state:', {
                error: error.message,
                status: error.response?.status,
                timestamp: new Date().toISOString()
            });

            if (error.response?.status === 403) {
                const lastDiagnostic = sessionStorage.getItem('lastAuthDiagnostic');
                const now = Date.now();
                if (process.env.NODE_ENV === 'development' &&
                    (!lastDiagnostic || now - parseInt(lastDiagnostic, 10) > 60000)) {
                    sessionStorage.setItem('lastAuthDiagnostic', now.toString());
                    authDiagnostics.diagnoseAuthIssue().catch(diagError => {
                        systemLogger.error('AuthContext: Authentication diagnostic failed:', diagError);
                    });
                }
                setUser(null);
                authStateCache.clearAuthState();
                csrfClient.clearCSRFToken();
                return null;
            }

            if (error.message !== 'Network Error' && error.code !== 'ERR_NETWORK') {
                handleError(error);
            }
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Apply a local cache immediately for navigation continuity, then perform
    // exactly one server-backed bootstrap. The manager coalesces this with any
    // API guard request that races during the same initial React commit.
    useEffect(() => {
        const cachedState = authStateCache.loadAuthState();
        if (cachedState) {
            setUser(cachedState.user || null);
            setLoading(false);
        }

        checkAuthStatus(false);
    }, [checkAuthStatus]);

    // 當用戶狀態改變時檢查管理員狀態 - 修復無限循環
    const authenticatedUserId = user?.id || user?.userId || null;
    useEffect(() => {
        if (authenticatedUserId) {
            const lastCheckedUserId = sessionStorage.getItem('lastCheckedAdminUserId');
            if (lastCheckedUserId !== String(authenticatedUserId)) {
                systemLogger.info('AuthContext: User changed, checking admin status for:', authenticatedUserId);
                sessionStorage.setItem('lastCheckedAdminUserId', String(authenticatedUserId));
                checkAdminStatus();
            }
        } else {
            setIsAdmin(false);
            setAdminLoading(false);
            sessionStorage.removeItem('lastCheckedAdminUserId');
        }
    }, [authenticatedUserId, checkAdminStatus]);

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
