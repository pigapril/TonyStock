import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useDialog } from '../../hooks/useDialog';
import { Analytics } from '../../utils/analytics';

export function ProtectedRoute({ children, requireAuth = true }) {
    const { isAuthenticated, loading, error } = useAuth();
    const { openDialog } = useDialog();
    const location = useLocation();

    // 處理載入狀態
    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>載入中...</p>
            </div>
        );
    }

    // 處理錯誤狀態
    if (error) {
        Analytics.error({
            status: 'error',
            errorCode: 'AUTH_ERROR',
            message: error.message,
            path: location.pathname
        });
        
        openDialog('auth', {
            returnPath: location.pathname,
            message: error.message,
            isError: true
        });
        
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // 需要認證但未登入
    if (requireAuth && !isAuthenticated) {
        Analytics.auth.statusCheck({
            status: 'dialog_shown',
            from: location.pathname,
            reason: 'unauthenticated'
        });

        openDialog('auth', {
            returnPath: location.pathname,
            message: '請先登入以繼續'
        });

        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return children;
} 