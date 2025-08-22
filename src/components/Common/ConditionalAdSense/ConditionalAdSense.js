import { useEffect } from 'react';
import { useSubscription } from '../../Subscription/SubscriptionContext';

/**
 * 條件式 AdSense 組件
 * 只有在非 Pro 用戶時才載入 AdSense 腳本
 */
export const ConditionalAdSense = () => {
  const { userPlan } = useSubscription();
  
  useEffect(() => {
    const isProUser = userPlan?.type === 'pro' || userPlan?.type === 'premium';
    
    if (!isProUser) {
      // 只有非 Pro 用戶才載入 AdSense
      loadAdSenseScript();
    } else {
      // Pro 用戶移除 AdSense 腳本
      removeAdSenseScript();
    }
  }, [userPlan]);

  const loadAdSenseScript = () => {
    // 檢查是否已經載入
    if (document.querySelector('script[src*="adsbygoogle.js"]')) {
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
  };

  // 這個組件不渲染任何內容
  return null;
};

export default ConditionalAdSense;