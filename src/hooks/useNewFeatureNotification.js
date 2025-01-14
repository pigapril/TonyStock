import { useState, useEffect } from 'react';

// 定義不同功能的 ID
const FEATURES = {
  WATCHLIST: 'watchlist',
  ARTICLES: 'articles'
};

// 控制是否啟用新功能標記的常數
const FEATURE_ENABLED = true; // 你可以在這裡控制開關

export function useNewFeatureNotification(featureId) {
  const [hasNewFeature, setHasNewFeature] = useState(false);
  
  useEffect(() => {
    // 如果功能未啟用，直接返回
    if (!FEATURE_ENABLED) {
      setHasNewFeature(false);
      return;
    }

    // 檢查特定功能是否已經看過
    const hasSeenFeature = localStorage.getItem(`hasSeenFeature_${featureId}`);
    
    if (!hasSeenFeature) {
      setHasNewFeature(true);
    }
  }, [featureId]);

  const markFeatureAsSeen = () => {
    localStorage.setItem(`hasSeenFeature_${featureId}`, 'true');
    setHasNewFeature(false);
  };

  // 重置特定功能的狀態（用於測試）
  const resetFeatureSeen = () => {
    localStorage.removeItem(`hasSeenFeature_${featureId}`);
    setHasNewFeature(FEATURE_ENABLED);
  };

  return { 
    hasNewFeature: FEATURE_ENABLED && hasNewFeature, 
    markFeatureAsSeen,
    resetFeatureSeen // 匯出重置功能
  };
}

// 導出功能 ID 常數
export { FEATURES }; 