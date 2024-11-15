import { useContext, useCallback } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Analytics } from '../utils/analytics';
import authService from '../services/auth.service';

export function useAuth() {
    const context = useContext(AuthContext);
    
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    const { user, loading, error, logout, checkAuthStatus } = context;

    const googleLogin = useCallback(async () => {
        try {
            Analytics.auth.login({ method: 'google', status: 'start' });
            await authService.googleLogin();
        } catch (error) {
            Analytics.auth.login({ 
                method: 'google', 
                status: 'error',
                error: error.message 
            });
            throw error;
        }
    }, []);

    const handleGoogleCallback = useCallback(async () => {
        try {
            await checkAuthStatus();
            
            Analytics.auth.login({ 
                method: 'google', 
                status: 'success' 
            });
        } catch (error) {
            Analytics.auth.login({ 
                method: 'google', 
                status: 'error',
                error: error.message 
            });
            throw error;
        }
    }, [checkAuthStatus]);

    return {
        user,
        loading,
        error,
        isAuthenticated: Boolean(user),
        googleLogin,
        logout,
        checkAuthStatus,
        handleGoogleCallback
    };
} 