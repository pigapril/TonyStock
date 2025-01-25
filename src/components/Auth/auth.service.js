import { Analytics } from '../../utils/analytics';
import { handleApiError } from '../../utils/errorHandler';

class AuthService {
    constructor() {
        this.baseUrl = process.env.REACT_APP_API_BASE_URL || '';
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
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
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

    // 更新為處理 Google ID token
    async verifyGoogleToken(credential) {
        console.log('Starting verifyGoogleToken:', {
            hasCredential: !!credential,
            credentialLength: credential?.length,
            baseUrl: this.baseUrl,
            timestamp: new Date().toISOString()
        });

        try {
            const response = await fetch(`${this.baseUrl}/api/auth/google/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ credential })
            });

            console.log('Google verify response:', {
                status: response.status,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries()),
                cookies: document.cookie,
                corsHeaders: {
                    'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
                    'access-control-allow-origin': response.headers.get('access-control-allow-origin')
                },
                timestamp: new Date().toISOString()
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Verify response error:', {
                    status: response.status,
                    errorData,
                    timestamp: new Date().toISOString()
                });
                throw new Error(JSON.stringify(errorData));
            }

            const data = await response.json();
            
            console.log('Token verification complete:', {
                status: response.status,
                hasUser: !!data?.data?.user,
                userData: data?.data?.user,
                cookies: document.cookie,
                timestamp: new Date().toISOString()
            });

            Analytics.auth.login({ 
                method: 'google', 
                status: 'success' 
            });

            return data.data;
        } catch (error) {
            console.error('Verify token error:', {
                message: error.message,
                type: error.constructor.name,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });

            Analytics.auth.login({ 
                method: 'google', 
                status: 'error',
                error: error.message 
            });
            const handledError = handleApiError(error);
            throw handledError;
        }
    }
}

const authService = new AuthService();
export default authService; 