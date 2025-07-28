import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from './Dialog';
import { useDialog } from './useDialog';
import { Analytics } from '../../../utils/analytics';
import { AppleButton } from '../../Subscription/shared/AppleButton';
import { UsageProgressBar } from '../../Subscription/shared/UsageProgressBar';
import { PlanBadge } from '../../Subscription/shared/PlanBadge';
import { useSubscription } from '../../Subscription/context/SubscriptionContext';

export function QuotaExceededDialog() {
    const { t } = useTranslation();
    const { dialog, closeDialog } = useDialog();
    const { userPlan } = useSubscription();

    const handleClose = () => {
        closeDialog();
        Analytics.ui.dialog.close({ type: 'quotaExceeded' });
    };

    const handleUpgrade = () => {
        // Navigate to subscription plans page instead of external URL
        const upgradeUrl = `/${document.documentElement.lang || 'zh-TW'}/subscription-plans`;
        window.location.href = upgradeUrl;
        
        Analytics.ui.dialog.action({ 
            type: 'quotaExceeded', 
            action: 'upgrade_clicked',
            upgradeUrl 
        });
    };

    if (dialog.type !== 'quotaExceeded') return null;

    const { quota, usage, resetTime, featureType = 'api' } = dialog.props || {};

    // Get feature display name
    const getFeatureDisplayName = (type) => {
        const featureNames = {
            api: t('subscription.features.api', 'API Calls'),
            priceAnalysis: t('subscription.features.priceAnalysis', 'Price Analysis'),
            news: t('subscription.features.news', 'News Access'),
            search: t('subscription.features.search', 'Search Queries')
        };
        return featureNames[type] || featureNames.api;
    };

    // Format reset time
    const formatResetTime = (time) => {
        if (!time) return '';
        const date = new Date(time);
        return date.toLocaleString(document.documentElement.lang || 'zh-TW', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Dialog
            open={dialog.isOpen}
            onClose={handleClose}
            className="apple-quota-dialog"
        >
            <div className="apple-quota-dialog__content">
                {/* Header Section */}
                <div className="apple-quota-dialog__header">
                    <div className="apple-quota-dialog__icon">
                        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                            <circle cx="32" cy="32" r="28" fill="#FF3B30" fillOpacity="0.1"/>
                            <circle cx="32" cy="32" r="20" fill="#FF3B30" fillOpacity="0.2"/>
                            <path d="M32 20v16M32 44h.01" stroke="#FF3B30" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <h2 className="apple-quota-dialog__title">
                        {t('quotaDialog.title', 'Usage Limit Reached')}
                    </h2>
                    <p className="apple-quota-dialog__subtitle">
                        {t('quotaDialog.subtitle', 'You\'ve reached your {{feature}} limit for today', { 
                            feature: getFeatureDisplayName(featureType) 
                        })}
                    </p>
                </div>

                {/* Usage Visualization */}
                <div className="apple-quota-dialog__usage">
                    <div className="apple-quota-dialog__current-plan">
                        <span className="apple-quota-dialog__plan-label">
                            {t('quotaDialog.currentPlan', 'Current Plan')}
                        </span>
                        <PlanBadge plan={userPlan?.type || 'free'} size="medium" />
                    </div>

                    {quota && usage !== undefined && (
                        <div className="apple-quota-dialog__progress">
                            <UsageProgressBar
                                used={usage}
                                limit={quota}
                                label={getFeatureDisplayName(featureType)}
                                size="large"
                                showPercentage={true}
                                showNumbers={true}
                            />
                        </div>
                    )}

                    {resetTime && (
                        <div className="apple-quota-dialog__reset-info">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M8 4v4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            <span>
                                {t('quotaDialog.resetsAt', 'Resets at {{time}}', { 
                                    time: formatResetTime(resetTime) 
                                })}
                            </span>
                        </div>
                    )}
                </div>

                {/* Plan Comparison Preview */}
                <div className="apple-quota-dialog__upgrade-preview">
                    <h3 className="apple-quota-dialog__upgrade-title">
                        {t('quotaDialog.upgradeTitle', 'Get More with Pro')}
                    </h3>
                    <div className="apple-quota-dialog__plan-comparison">
                        <div className="apple-quota-dialog__plan-item">
                            <PlanBadge plan="free" size="small" />
                            <span className="apple-quota-dialog__plan-limit">
                                {quota ? `${quota.toLocaleString()}` : '1,000'} / {t('quotaDialog.day', 'day')}
                            </span>
                        </div>
                        <div className="apple-quota-dialog__plan-arrow">→</div>
                        <div className="apple-quota-dialog__plan-item apple-quota-dialog__plan-item--highlighted">
                            <PlanBadge plan="pro" size="small" />
                            <span className="apple-quota-dialog__plan-limit">
                                10,000 / {t('quotaDialog.day', 'day')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="apple-quota-dialog__actions">
                    <AppleButton
                        variant="secondary"
                        size="large"
                        onClick={handleClose}
                        className="apple-quota-dialog__close-btn"
                    >
                        {t('dialog.close', 'Close')}
                    </AppleButton>
                    
                    <AppleButton
                        variant="primary"
                        size="large"
                        onClick={handleUpgrade}
                        className="apple-quota-dialog__upgrade-btn"
                    >
                        {t('quotaDialog.viewPlans', 'View Plans')}
                    </AppleButton>
                </div>
            </div>
        </Dialog>
    );
}