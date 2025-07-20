import { Analytics } from '../../utils/analytics';
import { handleApiError } from '../../utils/errorHandler';
import apiClient from '../../api/apiClient'; // 導入共用的 apiClient
import csrfClient from '../../utils/csrfClient'; // 導入 CSRF 客戶端

class AuthService {
    // constructor 已不再需要，因為 baseURL 由 apiClient 管理
    // constructor() {
    //     this.baseUrl = process.env.REACT_APP_API_BASE_URL || '';
    // }

    // 檢查認證狀態
    async checkStatus() {
        try {
            // 請求前記錄
            console.log('Auth check request details:', {
                url: `/api/auth/status`, // URL 已相對 apiClient 的 baseURL
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                currentURL: window.location.href,
            });

            // 使用 apiClient 發送請求，因為這是一個 GET 請求
            const response = await apiClient.get('/api/auth/status');
            
            // 響應後記錄
            console.log('Auth status response details:', {
                status: response.status,
                headers: response.headers,
                ok: response.ok,
            });
            
            const data = response.data;
            console.log('Auth status data:', data);
            return data.data; // API 回應的資料結構是 { data: ... }
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
            // 使用 csrfClient.post 發送受保護的請求
            const response = await csrfClient.post('/api/auth/logout');

            Analytics.auth.logout({ status: 'success' });
            
            // csrfClient 返回的是 fetch Response，需要解析 JSON
            if (response.ok) {
                const data = await response.json();
                return data.data;
            } else {
                throw new Error(`Logout failed: ${response.status}`);
            }
        } catch (error) {
            // 統一錯誤處理
            const handledError = handleApiError(error);
            throw handledError;
        }
    }

    // 更新為處理 Google ID token
    async verifyGoogleToken(credential) {
        console.log('Starting verifyGoogleToken:', {
            hasCredential: !!credential,
            credentialLength: credential?.length,
            timestamp: new Date().toISOString()
        });

        try {
            // 登入請求不需要 CSRF token，使用 apiClient
            const response = await apiClient.post('/api/auth/google/verify', { credential });

            console.log('Google verify response:', {
                status: response.status,
                headers: response.headers,
                ok: response.ok,
                timestamp: new Date().toISOString()
            });
            
            const data = response.data;

            console.log('Token verification complete:', {
                status: response.status,
                hasUser: !!data?.data?.user,
                userData: data?.data?.user,
                hasCSRFToken: !!data?.data?.csrfToken,
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