import { useEffect, useRef } from 'react';
import { useSubscription } from '../../Subscription/SubscriptionContext';

export const ConditionalAdSense = () => {
  const { userPlan } = useSubscription();
  const prevUserPlanRef = useRef(userPlan?.type);

  useEffect(() => {
    // 判斷是否為付費會員
    const isProUser = userPlan?.type === 'pro' || userPlan?.type === 'premium';
    
    // 1. 處理升級瞬間：如果剛剛不是 Pro，現在變成 Pro 了 -> 強制刷新
    const wasProUser = prevUserPlanRef.current === 'pro' || prevUserPlanRef.current === 'premium';
    if (isProUser && !wasProUser && prevUserPlanRef.current) {
        console.log('✨ 用戶升級為 Pro，正在刷新頁面以清除所有廣告腳本...');
        window.location.reload();
        return;
    }
    prevUserPlanRef.current = userPlan?.type;

    // 2. 只有「Free」用戶才執行載入動作
    if (!isProUser) {
      loadAllAdScripts();
    }
  }, [userPlan]);

  const loadAllAdScripts = () => {
    // 避免重複載入
    if (document.getElementById('adsense-script')) return;

    console.log('📢 檢測為免費用戶，開始載入廣告與反阻擋機制...');

    // A. 載入 Google Funding Choices 主程式 (外部連結)
    const fcScript = document.createElement('script');
    fcScript.src = "https://fundingchoicesmessages.google.com/i/pub-9124378768777425?ers=1";
    fcScript.async = true;
    document.head.appendChild(fcScript);

    // B. 載入我們剛剛建立的 Config 檔案 (本地檔案)
    // 這解決了 SyntaxError，因為 React 只是創造一個指向檔案的連結，不解析內容
    const configScript = document.createElement('script');
    configScript.src = `${process.env.PUBLIC_URL}/google-ads-config.js`;
    configScript.async = true;
    document.head.appendChild(configScript);

    // C. 載入 AdSense 主廣告
    const adScript = document.createElement('script');
    adScript.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9124378768777425";
    adScript.async = true;
    adScript.crossOrigin = "anonymous";
    adScript.id = 'adsense-script';
    document.head.appendChild(adScript);
  };

  return null;
};

export default ConditionalAdSense;