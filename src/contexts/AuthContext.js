import { createContext, useState, useEffect, useCallback } from 'react';
import { Analytics } from '../utils/analytics';
import authService from '../services/auth.service';
import { handleApiError } from '../utils/errorHandler';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 檢查認證狀態
    const checkAuthStatus = useCallback(async () => {
        console.log('CheckAuthStatus initiated:', {
            currentCookies: document.cookie,
            timestamp: new Date().toISOString()
        });

        try {
            const { user: userData } = await authService.checkStatus();
            console.log('CheckAuthStatus response:', {
                hasUser: !!userData,
                cookies: document.cookie,
                timestamp: new Date().toISOString()
            });

            setUser(userData);
            Analytics.auth.statusCheck({ status: 'success' });
        } catch (error) {
            console.log('CheckAuthStatus error:', {
                error: error.message,
                cookies: document.cookie,
                timestamp: new Date().toISOString()
            });

            setUser(null);
            handleError(error);
        } finally {
            setLoading(false);
        }
    }, []);

    // 初始化時檢查登入狀態
    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

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

    const handleGoogleCallback = useCallback(async (searchParams) => {
        try {
            const response = await fetch(`/api/auth/google/callback${searchParams}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            const data = await response.json();
            
            if (data.status === 'success' && data.data.user) {
                await checkAuthStatus();
                return data.data.user;
            } else {
                throw new Error('認證失敗');
            }
        } catch (error) {
            handleError(error);
            throw error;
        }
    }, [checkAuthStatus]);

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