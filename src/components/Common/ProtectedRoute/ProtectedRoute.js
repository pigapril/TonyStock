import React, { useRef, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Auth/useAuth';
import { useDialog } from '../Dialog/useDialog';
import { Analytics } from '../../../utils/analytics';
import './ProtectedRoute.css';

export function ProtectedRoute({ children, requireAuth = true }) {
    const { t } = useTranslation();
    const { user, loading } = useAuth();
    const { openDialog } = useDialog();
    const location = useLocation();
    const dialogShownRef = useRef(false);

    useEffect(() => {
        if (requireAuth && !user && !loading && !dialogShownRef.current) {
            openDialog('auth', {
                returnPath: location.pathname,
                message: t('protectedRoute.loginRequired')
            });
            dialogShownRef.current = true;
        }
        // 當 user 登入後，重置 dialogShownRef
        if (user && dialogShownRef.current) {
            dialogShownRef.current = false;
        }
    }, [requireAuth, user, loading, openDialog, location.pathname, t]);

    if (loading) {
        return (
            <div className="loading-container" role="status" aria-live="polite">
                <div className="spinner"></div>
                <span className="loading-text">{t('protectedRoute.loading')}</span>
            </div>
        );
    }

    if (requireAuth && !user) {
        Analytics.auth.routeProtection({
            status: 'dialog_shown',
            from: location.pathname
        });
        return <Navigate to="/" state={{ from: location.pathname }} replace />;
    }

    Analytics.auth.routeProtection({
        status: 'success',
        path: location.pathname
    });

    return children;
} 
