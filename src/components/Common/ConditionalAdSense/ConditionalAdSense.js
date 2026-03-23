import { useEffect, useMemo, useRef } from 'react';
import { useSubscription } from '../../Subscription/SubscriptionContext';
import { useAuth } from '../../Auth/useAuth';
import { ensureAdSenseScript } from '../../../utils/deferredScripts';

/**
 * 條件式 AdSense 組件
 * 修正版：加入 Loading 檢查，防止在資料讀取期間誤載入廣告
 */
export const ConditionalAdSense = () => {
  // 1. 從 Context 取得 loading 狀態
  const { userPlan, loading } = useSubscription();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const currentAccountKey = useMemo(
    () => (isAuthenticated ? `${user?.id || 'unknown'}:${userPlan?.type || 'pending'}` : 'guest'),
    [isAuthenticated, user?.id, userPlan?.type]
  );
  const prevAdEligibilityRef = useRef(null);

  useEffect(() => {
    // === 關鍵修正：守門員 ===
    // 如果 userPlan 是 null 且正在 loading，或者根本還沒初始化
    // 這時候絕對不能做決定，直接 return
    if (authLoading || loading || userPlan === null || userPlan === undefined) {
      // 可以在這裡 log 觀察： console.log('⏳ 用戶狀態讀取中，暫緩廣告載入...');
      return;
    }

    const isProUser = userPlan?.type === 'pro' || userPlan?.type === 'premium';
    const canShowAds = !isProUser;
    prevAdEligibilityRef.current = canShowAds;
    
    // 3. 只有「確認」是 Free 用戶後，才載入廣告
    if (canShowAds) {
      loadAdSenseScript();
    } 
    // 注意：不需要 else removeAdSenseScript()
    // 因為如果一開始沒載入，就不需要移；如果載入過了，移了也沒用(必須靠上面的 reload)

  }, [authLoading, currentAccountKey, loading, userPlan]); // 這裡一定要監聽 loading

  const loadAdSenseScript = () => {
    console.log('📢 狀態確認完畢：Free 用戶，載入 AdSense...');

    ensureAdSenseScript().catch((error) => {
      console.warn('AdSense script failed to load:', error);
    });
  };

  return null;
};

export default ConditionalAdSense;
