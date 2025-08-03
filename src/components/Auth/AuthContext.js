import { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Analytics } from '../../utils/analytics';
import authService from '../../components/Auth/auth.service';
import { handleApiError } from '../../utils/errorHandler';
import csrfClient from '../../utils/csrfClient';
import { authDiagnostics } from '../../utils/authDiagnostics';

export const AuthContext = createContext({
    user: null,
    isAuthenticated: false,
    watchlistAccess: false,
    loading: true,
    error: null,
    isGoogleInitialized: false
});

export function AuthProvider({ children }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isGoogleInitialized, setIsGoogleInitialized] = useState(false);

    const handleError = (error) => {
        const errorData = handleApiError(error);
        setError(errorData.data);
        setLoading(false);
    };

    // 將 handleGoogleCredential 移到這裡，在 useEffect 之前
    const handleGoogleCredential = useCallback(async (response) => {
        console.log('Google credential response:', {
            hasResponse: !!response,
            hasCredential: !!response?.credential,
            credentialLength: response?.credential?.length,
            timestamp: new Date().toISOString()
        });

        try {
            setLoading(true);
            console.log('Before verifyGoogleToken:', {
                timestamp: new Date().toISOString()
            });

            const { user: userData, csrfToken } = await authService.verifyGoogleToken(response.credential);
            
            console.log('Setting user data:', userData);
            setUser(userData);
            
            // 新增：若有 csrfToken，直接設置
            if (csrfToken) {
                csrfClient.setCSRFToken(csrfToken);
            }

            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('loginSuccess'));
            }, 0);
            
            Analytics.auth.login({ 
                method: 'google', 
                status: 'success',
                variant: 'identity_service'
            });
        } catch (error) {
            console.error('Google credential error:', {
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

        console.log('Browser compatibility check:', {
            isChrome,
            chromeVersion,
            hasFedCMSupport,
            useLegacy: compatibility.useLegacy
        });

        return compatibility;
    }, []);

    // 初始化 Google Identity Service
    useEffect(() => {
        const initializeGoogleIdentity = () => {
            const { isCompatible, useLegacy } = checkBrowserCompatibility();
            
            if (!window.google?.accounts?.id) {
                console.warn('Google Identity Service not loaded, waiting...');
                return;
            }

            try {
                window.google.accounts.id.initialize({
                    client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
                    callback: handleGoogleCredential,
                    auto_select: false,
                    cancel_on_tap_outside: true,
                    use_fedcm_for_prompt: isCompatible, // 只在支援的瀏覽器啟用 FedCM
                    state_cookie_domain: window.location.hostname,
                    error_callback: (error) => {
                        console.error('Google Identity error:', error);
                        Analytics.auth.identityService.error({
                            errorType: error.type,
                            errorMessage: error.message
                        });
                    }
                });

                setIsGoogleInitialized(true);
                Analytics.auth.identityService.initialize({ 
                    status: 'success',
                    useLegacy 
                });
            } catch (error) {
                console.error('Initialize failed:', error);
                setIsGoogleInitialized(false);
            }
        };

        // 監聽 Google SDK 載入
        if (window.google?.accounts?.id) {
            initializeGoogleIdentity();
        } else {
            window.googleSDKLoaded = () => {
                console.log('Google SDK loaded, initializing...');
                initializeGoogleIdentity();
            };
        }
    }, [checkBrowserCompatibility, handleGoogleCredential]);

    // 檢查認證狀態
    const checkAuthStatus = useCallback(async () => {
        console.log('CheckAuthStatus initiated:', {
            currentCookies: document.cookie,
            timestamp: new Date().toISOString()
        });

        try {
            const { user: userData } = await authService.checkStatus();
            console.log('CheckAuthStatus response:', {
                hasUser: !!userData,
                cookies: document.cookie,
                timestamp: new Date().toISOString()
            });

            setUser(userData);
            
            // 如果用戶已登入，嘗試初始化 CSRF token（如果還沒有的話）
            if (userData) {
                if (!csrfClient.isTokenInitialized()) {
                    try {
                        console.log('Initializing CSRF token for existing user...');
                        await csrfClient.initializeCSRFToken();
                        console.log('CSRF token initialized successfully for existing user');
                    } catch (csrfError) {
                        console.warn('Failed to initialize CSRF token for existing user:', csrfError);
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
            console.log('CheckAuthStatus error:', {
                error: error.message,
                status: error.response?.status,
                cookies: document.cookie,
                timestamp: new Date().toISOString()
            });

            // 如果是 403 錯誤，可能是 CSRF 配置問題
            if (error.response?.status === 403) {
                console.warn('🔄 Auth status check got 403, this may indicate CSRF middleware misconfiguration');
                
                // 只在開發環境且沒有最近運行過診斷時才運行
                const lastDiagnostic = sessionStorage.getItem('lastAuthDiagnostic');
                const now = Date.now();
                if (process.env.NODE_ENV === 'development' && 
                    (!lastDiagnostic || now - parseInt(lastDiagnostic) > 30000)) { // 30秒內不重複診斷
                    sessionStorage.setItem('lastAuthDiagnostic', now.toString());
                    authDiagnostics.diagnoseAuthIssue().catch(diagError => {
                        console.error('Diagnostics failed:', diagError);
                    });
                }
                
                // 清除用戶狀態，因為 403 表示認證問題
                setUser(null);
                return;
            }
            
            // 如果是網路錯誤（通常是 CORS 問題），保持當前狀態
            if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
                console.warn('🔄 Auth status check got network error (possibly CORS or server down)');
                
                // 只在開發環境且沒有最近運行過診斷時才運行
                const lastNetworkDiagnostic = sessionStorage.getItem('lastNetworkDiagnostic');
                const now = Date.now();
                if (process.env.NODE_ENV === 'development' && 
                    (!lastNetworkDiagnostic || now - parseInt(lastNetworkDiagnostic) > 60000)) { // 60秒內不重複診斷
                    sessionStorage.setItem('lastNetworkDiagnostic', now.toString());
                    authDiagnostics.diagnoseAuthIssue().catch(diagError => {
                        console.error('Diagnostics failed:', diagError);
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

    // 初始化時檢查登入狀態
    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

        // 登出處理
    const logout = async () => {
        try {
            await authService.logout();
            
            // 立即清除用戶狀態
            setUser(null);
            setError(null);
            setLoading(false);
            
            let identityServiceRevoked = false;
            if (window.google?.accounts?.id) {
                try {
                    window.google.accounts.id.revoke();
                    identityServiceRevoked = true;
                } catch (error) {
                    console.error('Google Identity Service revoke failed:', error);
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
            console.warn('Google Identity Service not available');
            Analytics.auth.identityService.buttonRender({
                status: 'error',
                type: 'standard',
                variant: 'service_unavailable'
            });
            return;
        }

        if (!isGoogleInitialized) {
            console.warn('Google Identity Service not initialized yet');
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
            console.error('Button render error:', error);
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
        isGoogleInitialized
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
} 