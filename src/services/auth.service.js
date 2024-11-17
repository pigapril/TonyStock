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
                baseUrl: this.baseUrl,
                currentUrl: window.location.href
            });

            const response = await fetch(`${this.baseUrl}/api/auth/google/login`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            // 添加詳細的響應日誌
            const responseData = await response.json();
            console.log('Google OAuth Response:', {
                status: response.status,
                headers: Object.fromEntries(response.headers.entries()),
                data: responseData,
                oauthUrl: responseData?.data?.url // 這是我們需要的 URL
            });

            if (!responseData?.data?.url) {
                throw new Error('Missing OAuth URL in response');
            }

            // 在重定向前暫停（用於測試）
            console.log('準備重定向到 Google OAuth URL:', responseData.data.url);
            
            // 儲存當前路徑
            localStorage.setItem('auth_redirect', window.location.pathname);
            
            // 延遲重定向（方便我們看到 URL）
            setTimeout(() => {
                window.location.href = responseData.data.url;
            }, 1000); // 延遲 1 秒

        } catch (error) {
            console.error('Google login failed:', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

const authService = new AuthService();
export default authService; 