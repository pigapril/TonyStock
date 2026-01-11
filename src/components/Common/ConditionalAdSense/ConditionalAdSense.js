import { useEffect, useRef } from 'react';
import { useSubscription } from '../../Subscription/SubscriptionContext';

export const ConditionalAdSense = () => {
  // 1. 取得 loading 狀態 (假設 useSubscription 有回傳 loading，如果沒有，請看下方的補充調整)
  const { userPlan, loading } = useSubscription();
  const prevUserPlanRef = useRef(userPlan?.type);
  const scriptsLoadedRef = useRef(false); // 避免重複執行的 Ref

  useEffect(() => {
    // === 關鍵修正：載入守門員 ===
    // 如果還在讀取資料 (loading) 或 userPlan 根本還沒初始化 (undefined)，直接結束，不做任何判斷
    if (loading || userPlan === undefined) {
        return; 
    }

    const isProUser = userPlan?.type === 'pro' || userPlan?.type === 'premium';
    
    // 2. 處理「使用中升級」的情況 (原本的邏輯保留)
    const wasProUser = prevUserPlanRef.current === 'pro' || prevUserPlanRef.current === 'premium';
    if (isProUser && !wasProUser && prevUserPlanRef.current) {
        console.log('✨ 用戶剛升級為 Pro，刷新頁面清除廣告...');
        window.location.reload();
        return;
    }
    prevUserPlanRef.current = userPlan?.type;

    // 3. 只有在「確定不是 Pro」且「還沒載入過」時，才載入廣告
    if (!isProUser && !scriptsLoadedRef.current) {
      loadAllAdScripts();
      scriptsLoadedRef.current = true;
    }
  }, [userPlan, loading]); // 監聽 loading 變化

  const loadAllAdScripts = () => {
    if (document.getElementById('adsense-script')) return;

    console.log('📢 確定為免費用戶，開始載入廣告...');

    // A. Funding Choices (外部)
    const fcScript = document.createElement('script');
    fcScript.src = "https://fundingchoicesmessages.google.com/i/pub-9124378768777425?ers=1";
    fcScript.async = true;
    document.head.appendChild(fcScript);

    // B. 設定檔 (本地)
    const configScript = document.createElement('script');
    configScript.src = `${process.env.PUBLIC_URL}/google-ads-config.js`;
    configScript.async = true;
    document.head.appendChild(configScript);

    // C. AdSense 主程式
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