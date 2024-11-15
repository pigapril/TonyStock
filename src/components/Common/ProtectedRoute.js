import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Analytics } from '../../utils/analytics';
import { SignInDialog } from '../Auth/SignInDialog';

export const ProtectedRoute = ({ children, requireAuth = true }) => {
    const { user, loading, error } = useAuth();
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
        return (
            <>
                {children}
                <SignInDialog 
                    isOpen={true} 
                    onClose={() => {
                        Analytics.auth.login({ 
                            status: 'cancelled',
                            reason: 'error_dialog_close'
                        });
                    }}
                    error={error.message}
                />
            </>
        );
    }

    // 需要認證但未登入
    if (requireAuth && !user) {
        Analytics.auth.statusCheck({
            status: 'dialog_shown',
            from: location.pathname,
            reason: 'unauthenticated'
        });
        
        return (
            <>
                {children}
                <SignInDialog 
                    isOpen={true} 
                    onClose={() => {
                        Analytics.auth.login({ 
                            status: 'cancelled',
                            reason: 'dialog_close'
                        });
                    }}
                />
            </>
        );
    }

    return children;
}; 