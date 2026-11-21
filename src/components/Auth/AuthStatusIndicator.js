/**
 * Auth Status Indicator
 * Keeps a stable navigation slot while the single AuthProvider bootstrap resolves.
 */

import React from 'react';
import { useAuth } from './useAuth';
import { UserProfile } from './UserProfile';
import { useDialog } from '../Common/Dialog/useDialog';
import { useTranslation } from 'react-i18next';

export function AuthStatusIndicator() {
    const { t } = useTranslation();
    const { user, loading } = useAuth();
    const { openDialog } = useDialog();

    const statusContent = loading
        ? <AuthSkeleton />
        : user
            ? <UserProfile />
            : (
                <button
                    className="btn-primary"
                    onClick={() => openDialog('auth')}
                >
                    {t('userActions.login')}
                </button>
            );

    return (
        <div className="auth-status-slot">
            {statusContent}
        </div>
    );
}

function AuthSkeleton() {
    return (
        <div className="auth-skeleton" aria-hidden="true">
            <div className="skeleton-avatar" />
            <div className="skeleton-text" />
        </div>
    );
}
