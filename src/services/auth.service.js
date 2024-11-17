import { Analytics } from '../utils/analytics';
import { handleApiError } from '../utils/errorHandler';

class AuthService {
    constructor() {
        this.baseUrl = process.env.REACT_APP_API_BASE_URL;
        this.defaultOptions = {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };
        console.log('AuthService initialized with baseUrl:', this.baseUrl);
    }

    // 檢查認證狀態
    async checkStatus() {
        try {
            const deviceInfo = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
            };
            console.log('Checking auth status... Device info:', JSON.stringify(deviceInfo, null, 2));

            console.log('Auth check details:', {
                cookies: document.cookie,
                localStorage: {
                    auth_redirect: localStorage.getItem('auth_redirect'),
                    // 其他相關的 localStorage 項目...
                },
                url: `${this.baseUrl}/api/auth/status`,
                requestOptions: {
                    ...this.defaultOptions,
                    credentials: 'include'
                },
                timestamp: new Date().toISOString()
            });

            const response = await fetch(`${this.baseUrl}/api/auth/status`, {
                ...this.defaultOptions,
                credentials: 'include'
            });

            console.log('Response details:', {
                headers: Object.fromEntries(response.headers.entries()),
                status: response.status,
                statusText: response.statusText,
                type: response.type,
                url: response.url,
                redirected: response.redirected,
                timestamp: new Date().toISOString()
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Auth status error:', JSON.stringify(errorData, null, 2));
                throw new Error(JSON.stringify(errorData));
            }

            const data = await response.json();
            console.log('Auth status success details:', JSON.stringify({
                data,
                timestamp: new Date().toISOString()
            }, null, 2));
            return data.data;
        } catch (error) {
            console.error('Auth status check failed:', JSON.stringify({
                error: error.message,
                stack: error.stack,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            }, null, 2));
            const handledError = handleApiError(error);
            throw handledError;
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
            console.log('Refreshing token...');
            const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
                credentials: 'include'
            });
            
            console.log('Refresh token response:', {
                ok: response.ok,
                status: response.status,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Refresh token error:', errorData);
                throw new Error(JSON.stringify(errorData));
            }

            const data = await response.json();
            console.log('Refresh token success:', data);
            return data.data;
        } catch (error) {
            console.error('Refresh token failed:', error);
            const handledError = handleApiError(error);
            throw handledError;
        }
    }

    // Google 登入
    async googleLogin() {
        try {
            console.log('Starting Google login...', {
                currentUrl: window.location.href,
                timestamp: new Date().toISOString()
            });

            const response = await fetch(`${this.baseUrl}/api/auth/google/login`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            console.log('Google login response:', {
                ok: response.ok,
                status: response.status,
                headers: Object.fromEntries(response.headers.entries()),
                cookies: document.cookie,
                timestamp: new Date().toISOString()
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Google login error:', errorData);
                throw new Error(JSON.stringify(errorData));
            }

            const data = await response.json();
            console.log('Google login success:', {
                data,
                timestamp: new Date().toISOString()
            });

            if (data?.data?.url) {
                localStorage.setItem('auth_redirect', window.location.pathname);
                console.log('Redirecting to Google OAuth:', {
                    url: data.data.url,
                    redirect: localStorage.getItem('auth_redirect'),
                    timestamp: new Date().toISOString()
                });
                window.location.href = data.data.url;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Google login failed:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            const handledError = handleApiError(error);
            throw handledError;
        }
    }
}

const authService = new AuthService();
export default authService; 