import React from 'react';
import { useDialog } from './useDialog';
import { FeatureUpgradeDialog } from './FeatureUpgradeDialog';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getAnalysisReturnPath, withAnalysisReturnPath } from '../../../utils/trialNavigation';

// 全局對話框組件，監聽 DialogContext 並轉換為 props 模式
export function GlobalFeatureUpgradeDialog() {
    const { dialog, closeDialog } = useDialog();
    const { i18n } = useTranslation();
    const navigate = useNavigate();

    // 只處理 featureUpgrade 類型的對話框
    if (dialog.type !== 'featureUpgrade' || !dialog.isOpen) {
        return null;
    }

    const handleClose = () => {
        closeDialog();
    };

    const handleUpgrade = () => {
        const language = i18n.language?.startsWith('en') ? 'en' : 'zh-TW';
        const destination = `/${language}/subscription-plans`;
        let returnPath = null;
        try {
            const upgradeUrl = new URL(dialog.props?.upgradeUrl || destination, window.location.origin);
            if (upgradeUrl.origin === window.location.origin
                && /^\/(en|zh-TW)\/subscription-plans$/.test(upgradeUrl.pathname)) {
                returnPath = getAnalysisReturnPath(upgradeUrl.search, language);
            }
        } catch { /* Invalid context falls back to the local plans page. */ }
        closeDialog();
        navigate(withAnalysisReturnPath(destination, returnPath));
    };

    return (
        <FeatureUpgradeDialog
            isOpen={dialog.isOpen}
            type={dialog.type}
            context={dialog.props}
            onClose={handleClose}
            onUpgrade={handleUpgrade}
        />
    );
}
