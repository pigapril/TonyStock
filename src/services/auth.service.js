import { Analytics } from '../utils/analytics';
import { handleApiError } from '../utils/errorHandler';

class AuthService {
    constructor() {
        this.baseUrl = process.env.REACT_APP_API_BASE_URL;
    }

    // 檢查認證狀態
    async checkStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/status`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw { response: { data: errorData } };
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
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
                throw { response: { data: errorData } };
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
                throw { response: { data: errorData } };
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
                throw { response: { data: errorData } };
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

export default new AuthService(); 