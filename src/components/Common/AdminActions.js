/**
 * AdminActions - Reusable admin action buttons component
 * 
 * Features:
 * - Conditionally renders admin action buttons
 * - Uses AdminOnly component for permission checking
 * - Customizable button configurations
 * - Error handling for permission-denied scenarios
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import AdminOnly from '../AdminOnly';

const AdminActions = ({ 
    actions = [], 
    className = '',
    size = 'medium',
    variant = 'secondary'
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { lang } = useParams();

    const defaultActions = [
        {
            id: 'manage-codes',
            label: t('admin.actions.manageCodes'),
            icon: '🎫',
            onClick: () => navigate(`/${lang}/NK-Admin`),
            variant: 'primary'
        },
        {
            id: 'view-analytics',
            label: t('admin.actions.viewAnalytics'),
            icon: '📊',
            onClick: () => navigate(`/${lang}/NK-Admin`),
            variant: 'secondary'
        }
    ];

    const allActions = actions.length > 0 ? actions : defaultActions;

    const getSizeClass = () => {
        switch (size) {
            case 'small': return 'admin-actions--small';
            case 'large': return 'admin-actions--large';
            default: return 'admin-actions--medium';
        }
    };

    const getButtonClass = (action) => {
        const baseClass = 'admin-action-btn';
        const variantClass = `admin-action-btn--${action.variant || variant}`;
        const sizeClass = getSizeClass().replace('admin-actions--', 'admin-action-btn--');
        return `${baseClass} ${variantClass} ${sizeClass}`;
    };

    return (
        <AdminOnly fallback={null}>
            <div className={`admin-actions ${getSizeClass()} ${className}`}>
                {allActions.map(action => (
                    <button
                        key={action.id}
                        onClick={action.onClick}
                        className={getButtonClass(action)}
                        disabled={action.disabled}
                        title={action.tooltip || action.label}
                    >
                        {action.icon && (
                            <span className="admin-action-icon">{action.icon}</span>
                        )}
                        <span className="admin-action-label">{action.label}</span>
                    </button>
                ))}
            </div>
        </AdminOnly>
    );
};

export default AdminActions;