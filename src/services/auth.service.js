import { Analytics } from '../utils/analytics';
import { handleApiError } from '../utils/errorHandler';

class AuthService {
    constructor() {
        this.baseUrl = process.env.REACT_APP_API_BASE_URL;
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

            const response = await fetch(`${this.baseUrl}/api/auth/status`, {
                credentials: 'include'
            });
            
            const responseDetails = {
                ok: response.ok,
                status: response.status,
                headers: Object.fromEntries(response.headers.entries()),
                cookies: document.cookie,
                timestamp: new Date().toISOString()
            };
            console.log('Auth status response details:', JSON.stringify(responseDetails, null, 2));

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
}

const authService = new AuthService();
export default authService; 