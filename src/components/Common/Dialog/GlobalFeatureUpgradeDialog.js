import React from 'react';
import { useDialog } from './useDialog';
import { FeatureUpgradeDialog } from './FeatureUpgradeDialog';
import { useTranslation } from 'react-i18next';

// 全局對話框組件，監聽 DialogContext 並轉換為 props 模式
export function GlobalFeatureUpgradeDialog() {
    const { dialog, closeDialog } = useDialog();
    const { i18n } = useTranslation();

    console.log('GlobalFeatureUpgradeDialog dialog state:', dialog);

    // 只處理 featureUpgrade 類型的對話框
    if (dialog.type !== 'featureUpgrade' || !dialog.isOpen) {
        return null;
    }

    const handleClose = () => {
        closeDialog();
    };

    const handleUpgrade = () => {
        closeDialog();
        // 導航到升級頁面
        window.location.href = `/${i18n.language}/subscription-plans`;
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