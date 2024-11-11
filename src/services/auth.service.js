import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

class AuthService {
    async initiateGoogleLogin(redirectUrl = window.location.pathname) {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/auth/google/login`,
                {
                    params: { redirect: redirectUrl },
                    withCredentials: true
                }
            );
            window.location.href = response.data.authUrl;
        } catch (error) {
            console.error('Google login failed:', error);
            throw error;
        }
    }

    async getCurrentUser() {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/auth/me`,
                { withCredentials: true }
            );
            return response.data.user;
        } catch (error) {
            if (error.response?.status === 401) {
                return null;
            }
            throw error;
        }
    }

    async logout() {
        try {
            await axios.post(
                `${API_BASE_URL}/auth/logout`,
                {},
                { withCredentials: true }
            );
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    }

    async checkAuthStatus() {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/auth/status`,
                { withCredentials: true }
            );
            return response.data;
        } catch (error) {
            console.error('Auth status check failed:', error);
            return { isAuthenticated: false, user: null };
        }
    }
}

// Create the service instance
const authService = new AuthService();

// Export the named instance
export default authService; 