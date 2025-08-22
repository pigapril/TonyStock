import React, { createContext, useState, useContext, useRef, useCallback, useEffect } from 'react';
import { InterstitialAdModal } from './InterstitialAdModal'; // 引入 Modal
import { useSubscription } from '../../Subscription/SubscriptionContext';

// 1. 建立 Context
const AdContext = createContext();

// 2. 建立 Provider 元件
export const AdProvider = ({ children }) => {
  const { userPlan } = useSubscription();
  const [showInterstitialAd, setShowInterstitialAd] = useState(false);
  const [isAdCooldownActive, setIsAdCooldownActive] = useState(false);
  const [clickCounts, setClickCounts] = useState({}); // 儲存不同來源的點擊次數 { source1: count, source2: count }
  const cooldownTimeoutRef = useRef(null);
  const COOLDOWN_DURATION = 120000; // 2 分鐘冷卻時間 (毫秒)

  // 檢查是否為 Pro 用戶
  const isProUser = userPlan?.type === 'pro' || userPlan?.type === 'premium';

  // 請求顯示廣告的函數
  const requestAdDisplay = useCallback((triggerSource, threshold, ignoreCooldown = false) => {
    // Pro 用戶不顯示插頁廣告
    if (isProUser) {
      console.log(`🚫 Interstitial ad blocked for Pro user. Source: ${triggerSource}`);
      return;
    }

    // 更新特定來源的點擊次數
    const newCount = (clickCounts[triggerSource] || 0) + 1;
    setClickCounts(prevCounts => ({
      ...prevCounts,
      [triggerSource]: newCount
    }));

    console.log(`Ad trigger requested from: ${triggerSource}, Count: ${newCount}, Threshold: ${threshold}, Cooldown: ${isAdCooldownActive}, IgnoreCooldown: ${ignoreCooldown}`);

    // 判斷是否達到閾值
    const thresholdMet = newCount >= threshold;

    // 判斷是否應該顯示廣告 (忽略冷卻或不在冷卻期)
    const shouldShowAd = thresholdMet && (ignoreCooldown || !isAdCooldownActive);

    if (shouldShowAd) {
      console.log(`Threshold met for ${triggerSource}. Showing ad.${ignoreCooldown ? ' (Cooldown ignored)' : ''} Starting cooldown.`);
      setShowInterstitialAd(true); // 顯示廣告
      // 重置 *該來源* 的計數器
      setClickCounts(prevCounts => ({
        ...prevCounts,
        [triggerSource]: 0
      }));
      // ***重要：即使忽略了檢查，顯示廣告後仍然要啟動冷卻***
      // 這樣可以防止緊接著的其他廣告觸發
      setIsAdCooldownActive(true); // 啟動冷卻

      // 清除可能存在的舊計時器
      if (cooldownTimeoutRef.current) {
        clearTimeout(cooldownTimeoutRef.current);
      }

      // 設置冷卻計時器
      cooldownTimeoutRef.current = setTimeout(() => {
        console.log('Ad cooldown finished.');
        setIsAdCooldownActive(false);
        cooldownTimeoutRef.current = null;
      }, COOLDOWN_DURATION);

    } else if (isAdCooldownActive && !ignoreCooldown) { // 只有在冷卻期且 *沒有* 忽略冷卻時才記錄忽略
      console.log(`Ad request from ${triggerSource} ignored due to active cooldown.`);
    } else if (!thresholdMet) {
      console.log(`Threshold not met for ${triggerSource}. Current count: ${newCount}`);
    }
  }, [clickCounts, isAdCooldownActive, COOLDOWN_DURATION, isProUser]); // 依賴項

  // 關閉廣告的函數
  const closeAd = useCallback(() => {
    setShowInterstitialAd(false);
    console.log('Interstitial ad closed by user.');
  }, []);

  // 組件卸載時清除計時器
  useEffect(() => {
    return () => {
      if (cooldownTimeoutRef.current) {
        clearTimeout(cooldownTimeoutRef.current);
        console.log('Cleared ad cooldown timer on AdProvider unmount.');
      }
    };
  }, []);

  // 3. 提供 Context 值
  const value = {
    requestAdDisplay,
    closeAd,
    isProUser, // 暴露 Pro 用戶狀態供其他組件使用
    // 注意：我們不在這裡直接暴露 showInterstitialAd，
    // 因為 Modal 的渲染會在 Provider 內部處理，或者在 App 層處理
  };

  return (
    <AdContext.Provider value={value}>
      {children}
      {/* 只有非 Pro 用戶才渲染 Modal */}
      {!isProUser && showInterstitialAd && <InterstitialAdModal onClose={closeAd} />}
    </AdContext.Provider>
  );
};

// 4. 建立自定義 Hook 以方便使用
export const useAdContext = () => {
  const context = useContext(AdContext);
  if (context === undefined) {
    throw new Error('useAdContext must be used within an AdProvider');
  }
  return context;
}; 