import { useContext, useCallback } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Analytics } from '../utils/analytics';
import authService from '../services/auth.service';

export function useAuth() {
    const context = useContext(AuthContext);
    
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    const { 
        user, 
        loading, 
        error, 
        logout, 
        checkAuthStatus,
        renderGoogleButton 
    } = context;

    return {
        user,
        loading,
        error,
        isAuthenticated: Boolean(user),
        logout,
        checkAuthStatus,
        renderGoogleButton
    };
} 