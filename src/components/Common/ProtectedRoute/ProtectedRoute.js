import React, { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Auth/useAuth';
import { useDialog } from '../Dialog/useDialog';
import { Analytics } from '../../../utils/analytics';
import './ProtectedRoute.css';

export function ProtectedRoute({ children, requireAuth = true, dismissTo }) {
    const { t } = useTranslation();
    const { user, loading } = useAuth();
    const { openDialog } = useDialog();
    const location = useLocation();
    const dialogShownRef = useRef(false);
    const returnPath = `${location.pathname}${location.search || ''}${location.hash || ''}`;
    const locale = location.pathname.split('/')[1] || 'zh-TW';
    const loginDismissPath = dismissTo || `/${locale}`;

    useEffect(() => {
        if (user || !requireAuth) {
            dialogShownRef.current = false;
            return;
        }

        if (loading || dialogShownRef.current === returnPath) {
            return;
        }

        openDialog('auth', {
            returnPath,
            dismissTo: loginDismissPath,
            message: t('protectedRoute.loginRequired')
        });
        dialogShownRef.current = returnPath;
        Analytics.auth.routeProtection({
            status: 'dialog_shown',
            from: returnPath
        });
    }, [requireAuth, user, loading, openDialog, returnPath, loginDismissPath, t]);

    if (loading) {
        return (
            <div className="loading-container" role="status" aria-live="polite">
                <div className="spinner"></div>
                <span className="loading-text">{t('protectedRoute.loading')}</span>
            </div>
        );
    }

    if (requireAuth && !user) {
        // Keep the requested URL mounted while the global auth dialog is open.
        // Redirecting to / here discards the destination and can race the dialog.
        return null;
    }

    Analytics.auth.routeProtection({
        status: 'success',
        path: location.pathname
    });

    return children;
} 
