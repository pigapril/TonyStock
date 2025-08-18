import { Analytics } from '../../utils/analytics';
import { handleApiError } from '../../utils/errorHandler';
import enhancedApiClient from '../../utils/enhancedApiClient';
import apiClient from '../../api/apiClient'; // 導入共用的 apiClient
import csrfClient from '../../utils/csrfClient'; // 導入 CSRF 客戶端

class AuthService {
    // constructor 已不再需要，因為 baseURL 由 apiClient 管理
    // constructor() {
    //     this.baseUrl = process.env.REACT_APP_API_BASE_URL || '';
    // }

    // 檢查認證狀態
    async checkStatus(retryCount = 0) {
        try {
            // 請求前記錄
            console.log('Auth check request details:', {
                url: `/api/auth/status`, // URL 已相對 apiClient 的 baseURL
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                currentURL: window.location.href,
                retryCount
            });

            // 使用 apiClient 發送請求，因為這是一個 GET 請求
            // 添加時間戳參數以避免瀏覽器快取問題
            const response = await apiClient.get('/api/auth/status', {
                params: {
                    _t: Date.now() // 添加時間戳參數避免快取
                },
                timeout: 8000, // 8秒超時
                // 添加特殊標記避免攔截器干擾
                metadata: { skipCSRFCheck: true, isAuthCheck: true }
            });

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
                status: error.response?.status,
                stack: error.stack,
                userAgent: navigator.userAgent,
                retryCount
            });

            // 如果是 403 錯誤且重試次數少於 1 次，嘗試用 fetch 重試
            if (error.response?.status === 403 && retryCount < 1) {
                console.warn(`🔄 Auth status got 403, trying fallback method`);

                try {
                    const baseURL = process.env.REACT_APP_API_BASE_URL || '';
                    const fallbackResponse = await fetch(`${baseURL}/api/auth/status?_t=${Date.now()}`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });

                    if (fallbackResponse.ok) {
                        const fallbackData = await fallbackResponse.json();
                        console.log('✅ Fallback auth check succeeded');
                        return fallbackData.data;
                    }
                } catch (fallbackError) {
                    console.error('❌ Fallback auth check also failed:', fallbackError);
                }
            }

            throw error;
        }
    }

    // 登出
    async logout() {
        try {
            // 登出不需要 CSRF token，直接使用 apiClient
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

    // 檢查管理員狀態
    async checkAdminStatus() {
        try {
            console.log('Auth service: Checking admin status');

            const response = await apiClient.get('/api/auth/admin-status');

            console.log('Admin status response:', {
                status: response.status,
                data: response.data
            });

            return response.data.data; // API 回應的資料結構是 { status: 'success', data: { isAuthenticated, isAdmin } }
        } catch (error) {
            console.error('Admin status check error:', {
                error: error.message,
                status: error.response?.status
            });

            // 統一錯誤處理
            const handledError = handleApiError(error);
            throw handledError;
        }
    }
}

const authService = new AuthService();
export default authService;