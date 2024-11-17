import { Analytics } from '../utils/analytics';
import { handleApiError } from '../utils/errorHandler';

class AuthService {
    constructor() {
        this.baseUrl = process.env.REACT_APP_API_BASE_URL;
    }

    // 檢查認證狀態
    async checkStatus() {
        try {
            // 請求前記錄
            console.log('Auth check request details:', {
                url: `${this.baseUrl}/api/auth/status`,
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                cookiesEnabled: navigator.cookieEnabled,
                localStorage: !!window.localStorage,
                currentURL: window.location.href,
                requestHeaders: {
                    credentials: 'include',
                    origin: window.location.origin
                }
            });

            const response = await fetch(`${this.baseUrl}/api/auth/status`, {
                credentials: 'include'
            });
            
            // 響應後記錄
            console.log('Auth status response details:', {
                status: response.status,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries()),
                cookies: document.cookie,
                corsHeaders: {
                    'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
                    'access-control-allow-origin': response.headers.get('access-control-allow-origin')
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            const data = await response.json();
            console.log('Auth status data:', data);
            return data.data;
        } catch (error) {
            console.error('Auth check error details:', {
                error: error.message,
                stack: error.stack,
                userAgent: navigator.userAgent
            });
            throw error;
        }
    }

    // 登出
    async logout() {
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            Analytics.auth.logout({ status: 'success' });
            const data = await response.json();
            return data.data;
        } catch (error) {
            const handledError = handleApiError(error);
            throw handledError;
        }
    }

    // 更新 access token
    async refreshToken() {
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            const handledError = handleApiError(error);
            throw handledError;
        }
    }

    // Google 登入
    async googleLogin() {
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/google/login`, {
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            const data = await response.json();
            if (data?.data?.url) {
                localStorage.setItem('auth_redirect', window.location.pathname);
                window.location.href = data.data.url;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            const handledError = handleApiError(error);
            throw handledError;
        }
    }

    // Google 登入回調頁面也加上日誌
    async handleGoogleCallback() {
        console.log('Google callback received:', {
            url: window.location.href,
            cookies: document.cookie,
            localStorage: {
                redirect: localStorage.getItem('auth_redirect')
            }
        });
    }
}

const authService = new AuthService();
export default authService; 