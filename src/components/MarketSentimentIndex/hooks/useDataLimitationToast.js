import { useCallback } from 'react';
import { useAuth } from '../../Auth/useAuth';
import { useTranslation } from 'react-i18next';

/**
 * 數據限制 Toast 提醒 Hook
 * 為免費用戶在適當時機顯示數據限制提醒
 */
export const useDataLimitationToast = (showToast) => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  
  // 檢查用戶計劃
  const isTemporaryFreeMode = process.env.REACT_APP_TEMPORARY_FREE_MODE === 'true';
  const userPlan = user?.plan || 'free';
  const effectiveUserPlan = isTemporaryFreeMode ? 'pro' : userPlan;
  const isProUser = effectiveUserPlan === 'pro';
  const isFreeUser = !isProUser;

  // 顯示歷史數據限制提醒（每次切換到歷史數據時顯示）
  const showHistoricalDataToast = useCallback(() => {
    if (!isFreeUser) return;
    
    const message = t('marketSentiment.dataLimitation.toastMessage');
    showToast(message, 'info', 6000); // 顯示 6 秒，讓用戶有足夠時間閱讀
  }, [isFreeUser, showToast, t]);

  // 顯示升級提醒（當用戶嘗試訪問受限功能時）
  const showUpgradeToast = useCallback((feature = 'data') => {
    if (!isFreeUser) return;
    
    const messageKey = `marketSentiment.dataLimitation.upgrade${feature.charAt(0).toUpperCase() + feature.slice(1)}Toast`;
    const message = t(messageKey, { 
      defaultValue: t('marketSentiment.dataLimitation.upgradeToast') 
    });
    
    showToast(message, 'warning', 5000); // 顯示 5 秒
  }, [isFreeUser, showToast, t]);

  return {
    isFreeUser,
    isProUser,
    showHistoricalDataToast,
    showUpgradeToast
  };
};