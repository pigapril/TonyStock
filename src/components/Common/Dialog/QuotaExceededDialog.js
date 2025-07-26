import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from './Dialog';
import { useDialog } from './useDialog';
import { Analytics } from '../../../utils/analytics';

export function QuotaExceededDialog() {
    const { t } = useTranslation();
    const { dialog, closeDialog } = useDialog();

    const handleClose = () => {
        closeDialog();
        Analytics.ui.dialog.close({ type: 'quotaExceeded' });
    };

    const handleUpgrade = () => {
        const upgradeUrl = dialog.props?.upgradeUrl || '/pricing';
        window.open(upgradeUrl, '_blank');
        Analytics.ui.dialog.action({ 
            type: 'quotaExceeded', 
            action: 'upgrade_clicked',
            upgradeUrl 
        });
    };

    if (dialog.type !== 'quotaExceeded') return null;

    const { quota, usage, resetTime } = dialog.props || {};

    return (
        <Dialog
            open={dialog.isOpen}
            onClose={handleClose}
            title={t('quotaDialog.title', 'Usage Limit Reached')}
            titleClassName="quota-dialog-title"
        >
            <div className="quota-dialog-content">
                <div className="quota-dialog-icon" role="img" aria-label={t('quotaDialog.warningIcon', 'Warning')}>
                    ⚠️
                </div>
                
                <div className="quota-dialog-message">
                    <p>
                        {dialog.props?.message || t('quotaDialog.message', 'You have exceeded your daily usage limit')}
                    </p>
                    
                    {quota && usage && (
                        <div className="quota-details">
                            <p>{t('quotaDialog.usage', 'Usage: {{usage}}/{{quota}}', { usage, quota })}</p>
                        </div>
                    )}
                    
                    {resetTime && (
                        <div className="quota-reset">
                            <p>{t('quotaDialog.resetTime', 'Resets at: {{resetTime}}', { resetTime })}</p>
                        </div>
                    )}
                </div>

                <div className="quota-dialog-actions">
                    <button 
                        className="btn-secondary" 
                        onClick={handleClose}
                        aria-label={t('dialog.close', 'Close dialog')}
                    >
                        {t('dialog.close', 'Close')}
                    </button>
                    
                    <button 
                        className="btn-primary" 
                        onClick={handleUpgrade}
                        aria-label={t('quotaDialog.upgradeAriaLabel', 'Upgrade your plan to get more usage')}
                    >
                        {t('quotaDialog.upgrade', 'Upgrade Plan')}
                    </button>
                </div>
            </div>
        </Dialog>
    );
}