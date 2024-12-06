import { useState, useEffect } from 'react';

// 控制是否啟用新功能標記的常數
const FEATURE_ENABLED = true; // 你可以在這裡控制開關

export function useNewFeatureNotification() {
  const [hasNewFeature, setHasNewFeature] = useState(false);
  
  useEffect(() => {
    // 如果功能未啟用，直接返回
    if (!FEATURE_ENABLED) {
      setHasNewFeature(false);
      return;
    }

    // 檢查本地儲存是否已經看過新功能
    const hasSeenNewFeature = localStorage.getItem('hasSeenWatchlistFeature');
    
    // 如果沒看過，顯示新功能標記
    if (!hasSeenNewFeature) {
      setHasNewFeature(true);
    }
  }, []);

  const markFeatureAsSeen = () => {
    localStorage.setItem('hasSeenWatchlistFeature', 'true');
    setHasNewFeature(false);
  };

  // 新增重置功能（用於測試）
  const resetFeatureSeen = () => {
    localStorage.removeItem('hasSeenWatchlistFeature');
    setHasNewFeature(FEATURE_ENABLED);
  };

  return { 
    hasNewFeature: FEATURE_ENABLED && hasNewFeature, 
    markFeatureAsSeen,
    resetFeatureSeen // 匯出重置功能
  };
} 