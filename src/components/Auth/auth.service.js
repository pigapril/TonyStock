import { Analytics } from '../../utils/analytics';
import { handleApiError } from '../../utils/errorHandler';
import apiClient from '../../api/apiClient'; // 導入共用的 apiClient

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

            // 使用 apiClient.get 發送請求
            const response = await apiClient.get('/api/auth/status');
            
            // 響應後記錄 (axios 的 response 物件結構不同)
            console.log('Auth status response details:', {
                status: response.status,
                headers: response.headers,
                data: response.data, // 資料在 data 屬性中
            });
            
            // axios 會對非 2xx 的狀態碼拋出錯誤，所以不需要手動檢查 response.ok
            
            console.log('Auth status data:', response.data);
            return response.data.data; // API 回應的資料結構是 { data: ... }
        } catch (error) {
            console.error('Auth check error details:', {
                // axios 的 error 物件包含更多資訊
                error: error.response ? error.response.data : error.message,
                stack: error.stack,
                userAgent: navigator.userAgent
            });
            throw error;
        }
    }

    // 登出
    async logout() {
        try {
            // 使用 apiClient.post 發送請求
            const response = await apiClient.post('/api/auth/logout');

            Analytics.auth.logout({ status: 'success' });
            return response.data.data;
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
            // POST 資料作為第二個參數傳遞
            const response = await apiClient.post('/api/auth/google/verify', { credential });

            console.log('Google verify response:', {
                status: response.status,
                headers: response.headers,
                timestamp: new Date().toISOString()
            });
            
            const data = response.data;

            console.log('Token verification complete:', {
                status: response.status,
                hasUser: !!data?.data?.user,
                userData: data?.data?.user,
                timestamp: new Date().toISOString()
            });

            Analytics.auth.login({ 
                method: 'google', 
                status: 'success' 
            });

            return data.data;
        } catch (error) {
            console.error('Verify token error:', {
                message: error.response ? error.response.data : error.message,
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