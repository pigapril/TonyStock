import { createContext, useState, useEffect } from 'react';
import { Analytics } from '../utils/analytics';
import authService from '../services/auth.service';
import { handleApiError } from '../utils/errorHandler';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 初始化時檢查登入狀態
    useEffect(() => {
        checkAuthStatus();
    }, []);

    // 檢查認證狀態
    const checkAuthStatus = async () => {
        try {
            const { user: userData } = await authService.checkStatus();
            setUser(userData);
            Analytics.auth.statusCheck({ status: 'success' });
        } catch (error) {
            setUser(null);
            handleError(error);
        } finally {
            setLoading(false);
        }
    };

    // 登出處理
    const logout = async () => {
        try {
            await authService.logout();
            setUser(null);
            Analytics.auth.logout({ status: 'success' });
        } catch (error) {
            handleError(error);
        }
    };

    const handleError = (error) => {
        const errorData = handleApiError(error);
        setError(errorData.data);
        setLoading(false);
    };

    const resetError = () => setError(null);

    const handleGoogleCallback = async (code, state) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/auth/google/callback`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Google callback failed');
            }

            await checkAuthStatus();  // 重新檢查認證狀態
        } catch (error) {
            handleError(error);
            throw error;
        }
    };

    const value = {
        user,
        loading,
        error,
        resetError,
        logout,
        checkAuthStatus,
        handleGoogleCallback
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
} 