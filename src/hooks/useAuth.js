import { useContext, useCallback } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import Analytics from '../utils/analytics';

export function useAuth() {
    const context = useContext(AuthContext);
    
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    const { user, loading, error, logout, checkAuthStatus } = context;

    // Google 登入
    const googleLogin = useCallback(() => {
        Analytics.auth.login({ method: 'google', status: 'start' });
        window.location.href = `${process.env.REACT_APP_API_BASE_URL}/api/auth/google/login`;
    }, []);

    // 檢查是否已登入
    const isAuthenticated = Boolean(user);

    return {
        user,
        loading,
        error,
        isAuthenticated,
        googleLogin,
        logout,
        checkAuthStatus
    };
} 