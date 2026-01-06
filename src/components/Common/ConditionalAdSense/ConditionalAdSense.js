import { useEffect } from 'react';
import { useSubscription } from '../../Subscription/SubscriptionContext';

/**
 * 條件式 AdSense 組件
 * 只有在非 Pro 用戶時才載入 AdSense 腳本
 */
export const ConditionalAdSense = () => {
  const { userPlan, loading } = useSubscription();
  
  useEffect(() => {
    // ✅ 等待 userPlan 載入完成再做判斷，避免競態條件
    if (loading || userPlan === null) {
      console.log('⏳ ConditionalAdSense: 等待用戶方案載入中...', { loading, userPlan });
      return; // 不執行任何操作，避免誤判為 Free 用戶
    }
    
    const isProUser = userPlan?.type === 'pro' || userPlan?.type === 'premium';
    
    console.log('🔍 ConditionalAdSense: 用戶方案判斷', {
      userPlan: userPlan?.type,
      isProUser,
      loading
    });
    
    if (!isProUser) {
      // 只有確認為非 Pro 用戶才載入 AdSense
      loadAdSenseScript();
    } else {
      // Pro 用戶移除 AdSense 腳本
      removeAdSenseScript();
    }
  }, [userPlan, loading]); // 同時監聽 loading 狀態

  const loadAdSenseScript = () => {
    // 檢查是否已經載入
    if (document.querySelector('script[src*="adsbygoogle.js"]')) {
      console.log('ℹ️ AdSense 腳本已存在，跳過載入');
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9124378768777425';
    script.crossOrigin = 'anonymous';
    script.id = 'adsense-script';
    
    document.head.appendChild(script);
    
    console.log('✅ AdSense 腳本已為 Free 用戶載入');
  };

  const removeAdSenseScript = () => {
    const existingScript = document.getElementById('adsense-script');
    if (existingScript) {
      existingScript.remove();
      console.log('🚫 AdSense 腳本已為 Pro 用戶移除');
    }
    
    // ⚠️ 注意：移除腳本標籤無法完全清除已載入的 AdSense 功能
    // 實際的廣告阻擋由 adBlockingService 處理
  };

  // 這個組件不渲染任何內容
  return null;
};

export default ConditionalAdSense;