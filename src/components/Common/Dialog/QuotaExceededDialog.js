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

    const handleLater = () => {
        closeDialog();
        Analytics.ui.dialog.action({ 
            type: 'quotaExceeded', 
            action: 'maybe_later_clicked'
        });
    };

    if (dialog.type !== 'quotaExceeded') return null;



    return (
        <Dialog
            open={dialog.isOpen}
            onClose={handleClose}
            title={t('quotaDialog.title', '解鎖無限制存取')}
            titleClassName="quota-dialog-title"
            description={t('quotaDialog.subtitle', '升級至 Pro 版本，享受完整的股票分析功能')}
        >
            <div className="quota-dialog-content">
                {/* Premium Icon */}
                <div className="quota-dialog-premium-icon">
                    <div className="premium-crown">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <path d="M8 32L12 16L20 24L24 12L28 24L36 16L40 32H8Z" 
                                  fill="url(#crownGradient)" stroke="none"/>
                            <circle cx="12" cy="16" r="3" fill="#FFD700"/>
                            <circle cx="24" cy="12" r="3" fill="#FFD700"/>
                            <circle cx="36" cy="16" r="3" fill="#FFD700"/>
                            <defs>
                                <linearGradient id="crownGradient" x1="8" y1="12" x2="40" y2="32">
                                    <stop offset="0%" stopColor="#FFD700"/>
                                    <stop offset="100%" stopColor="#FFA500"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>



                {/* Premium Features */}
                <div className="premium-features">
                    <h3 className="features-title">{t('quotaDialog.proFeatures', 'Pro 版本專屬功能')}</h3>
                    <ul className="dialog-features">
                        <li>
                            <span className="feature-icon">🚀</span>
                            <span className="feature-text">{t('quotaDialog.feature1', '無限制股票查詢')}</span>
                        </li>
                        <li>
                            <span className="feature-icon">📋</span>
                            <span className="feature-text">{t('quotaDialog.feature2', '個人追蹤清單')}</span>
                        </li>
                        <li>
                            <span className="feature-icon">📈</span>
                            <span className="feature-text">{t('quotaDialog.feature3', '每日市場情緒指數')}</span>
                        </li>
                    </ul>
                </div>

                {/* Action Buttons */}
                <div className="quota-dialog-actions">
                    <button 
                        className="dialog-premium-button" 
                        onClick={handleUpgrade}
                        aria-label={t('quotaDialog.upgradeAriaLabel', '升級至 Pro 版本')}
                    >
                        <span className="button-text">{t('quotaDialog.upgrade', '立即升級 Pro')}</span>
                        <span className="button-icon">✨</span>
                    </button>
                    
                    <button 
                        className="dialog-secondary-button" 
                        onClick={handleLater}
                        aria-label={t('quotaDialog.laterAriaLabel', '稍後再說')}
                    >
                        {t('quotaDialog.later', '稍後再說')}
                    </button>
                </div>

                {/* Trust Indicators */}
                <div className="trust-indicators">
                    <div className="trust-item">
                        <span className="trust-icon">🔒</span>
                        <span className="trust-text">{t('quotaDialog.secure', '安全付款')}</span>
                    </div>
                    <div className="trust-item">
                        <span className="trust-icon">⚡</span>
                        <span className="trust-text">{t('quotaDialog.instant', '即時啟用')}</span>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}