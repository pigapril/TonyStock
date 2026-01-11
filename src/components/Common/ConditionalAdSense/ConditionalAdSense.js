import { useEffect, useRef } from 'react';
import { useSubscription } from '../../Subscription/SubscriptionContext';

/**
 * 條件式 AdSense 組件
 * 修正版：加入 Loading 檢查，防止在資料讀取期間誤載入廣告
 */
export const ConditionalAdSense = () => {
  // 1. 從 Context 取得 loading 狀態
  const { userPlan, loading } = useSubscription();
  
  // 用來記錄上一次的狀態，判斷是否發生「現場升級」
  const prevUserPlanRef = useRef(userPlan?.type);

  useEffect(() => {
    // === 關鍵修正：守門員 ===
    // 如果 userPlan 是 null 且正在 loading，或者根本還沒初始化
    // 這時候絕對不能做決定，直接 return
    if (loading || userPlan === null || userPlan === undefined) {
      // 可以在這裡 log 觀察： console.log('⏳ 用戶狀態讀取中，暫緩廣告載入...');
      return;
    }

    const isProUser = userPlan?.type === 'pro' || userPlan?.type === 'premium';
    const wasProUser = prevUserPlanRef.current === 'pro' || prevUserPlanRef.current === 'premium';

    // 2. 處理「剛升級」的狀況 (Clean up)
    // 如果之前是 Free，現在變 Pro -> 強制刷新以清除記憶體中的廣告殘留
    if (isProUser && !wasProUser && prevUserPlanRef.current) {
        console.log('✨ 用戶剛升級，刷新頁面以清除廣告...');
        window.location.reload();
        return;
    }
    
    // 更新 ref 狀態
    prevUserPlanRef.current = userPlan?.type;
    
    // 3. 只有「確認」是 Free 用戶後，才載入廣告
    if (!isProUser) {
      loadAdSenseScript();
    } 
    // 注意：不需要 else removeAdSenseScript()
    // 因為如果一開始沒載入，就不需要移；如果載入過了，移了也沒用(必須靠上面的 reload)

  }, [userPlan, loading]); // 這裡一定要監聽 loading

  const loadAdSenseScript = () => {
    // 避免重複載入
    if (document.getElementById('adsense-script')) {
      return;
    }

    console.log('📢 狀態確認完畢：Free 用戶，載入 AdSense...');

    // 這裡建議同時載入 Funding Choices (如果需要的話)，或只載入主廣告
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9124378768777425';
    script.crossOrigin = 'anonymous';
    script.id = 'adsense-script';
    
    document.head.appendChild(script);
  };

  return null;
};

export default ConditionalAdSense;