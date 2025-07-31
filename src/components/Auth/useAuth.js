import { useContext, useMemo } from 'react';
import { AuthContext } from './AuthContext';
import { subscriptionService } from '../../api/subscriptionService';

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

    // 計算 watchlist 存取權限
    const watchlistAccess = useMemo(() => {
        if (!user) return false;
        
        // 獲取用戶計劃，預設為 'free'
        const userPlan = user.plan || 'free';
        
        // 檢查 watchlist 功能是否對該計劃啟用
        return subscriptionService.isFeatureEnabled(userPlan, 'watchlist');
    }, [user]);

    return {
        user,
        loading,
        error,
        isAuthenticated: Boolean(user),
        watchlistAccess,
        logout,
        checkAuthStatus,
        renderGoogleButton
    };
} 