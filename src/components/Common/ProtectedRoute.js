import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Auth/useAuth'; // 更新路徑
import { useDialog } from '../../hooks/useDialog';
import { Analytics } from '../../utils/analytics';
import './styles/ProtectedRoute.css';

export function ProtectedRoute({ children, requireAuth = true }) {
    const { user, loading, watchlistAccess } = useAuth();
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

    // 需要認證但未登入
    if (requireAuth && !user) {
        Analytics.auth.routeProtection({
            status: 'dialog_shown',
            from: location.pathname
        });

        // 開啟登入對話框，保持一致的使用者體驗
        openDialog('auth', {
            returnPath: location.pathname,
            message: '請先登入以繼續'
        });

        return <Navigate 
            to="/" 
            state={{ from: location.pathname }}
            replace 
        />;
    }

    Analytics.auth.routeProtection({
        status: 'success',
        path: location.pathname
    });

    // watchlist 頁面需要額外的權限檢查
    if (location.pathname.startsWith('/watchlist') && !watchlistAccess) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
} 