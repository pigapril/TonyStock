import React, { useEffect, useRef, useState } from 'react';
import { useDialog } from './useDialog';
import { FeatureUpgradeDialog } from './FeatureUpgradeDialog';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Auth/useAuth';
import { fetchFreeTrialEligibility } from '../../../services/freeTrialService';
import { canSeeFreeTrial } from '../../../utils/freeTrialRollout';
import { getAnalysisReturnPath, withAnalysisReturnPath } from '../../../utils/trialNavigation';

// 全局對話框組件，監聽 DialogContext 並轉換為 props 模式
export function GlobalFeatureUpgradeDialog() {
    const { dialog, closeDialog } = useDialog();
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [eligibleTrialAccount, setEligibleTrialAccount] = useState(null);
    const accountKey = user?.id || user?.userId || user?.email || null;
    // 快取已查詢的結果，避免同一個 accountKey 重複打 API
    const cachedResult = useRef({ accountKey: null, eligible: null });

    useEffect(() => {
        if (dialog.type !== 'featureUpgrade' || !dialog.isOpen || !user || !accountKey || !canSeeFreeTrial(user.email)) {
            setEligibleTrialAccount(null);
            return undefined;
        }

        // 同一個 accountKey 已有快取結果，直接用
        if (cachedResult.current.accountKey === accountKey && cachedResult.current.eligible !== null) {
            setEligibleTrialAccount(cachedResult.current.eligible ? accountKey : null);
            return undefined;
        }

        let abandoned = false;
        setEligibleTrialAccount(null);
        fetchFreeTrialEligibility()
            .then((result) => {
                if (!abandoned) {
                    const eligible = result?.eligible === true;
                    cachedResult.current = { accountKey, eligible };
                    setEligibleTrialAccount(eligible ? accountKey : null);
                }
            })
            .catch(() => {
                if (!abandoned) {
                    cachedResult.current = { accountKey, eligible: false };
                    setEligibleTrialAccount(null);
                }
            });

        return () => { abandoned = true; };
    }, [accountKey, dialog.isOpen, dialog.type, user?.email]);

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
        const trialEligible = Boolean(user && accountKey && eligibleTrialAccount === accountKey);
        const trialDestination = withAnalysisReturnPath(`/${language}/payment/free-trial`, returnPath);
        navigate(trialEligible ? trialDestination : withAnalysisReturnPath(destination, returnPath));
    };

    return (
        <FeatureUpgradeDialog
            isOpen={dialog.isOpen}
            type={dialog.type}
            context={dialog.props}
            onClose={handleClose}
            onUpgrade={handleUpgrade}
            primaryCtaLabel={user && eligibleTrialAccount === accountKey ? t('freeTrial.ctaShort') : null}
            isTrialCta={Boolean(user && eligibleTrialAccount === accountKey)}
        />
    );
}
