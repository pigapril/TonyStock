import { useState, useEffect } from 'react';

// 定義不同功能的 ID
const FEATURES = {
  WATCHLIST: 'watchlist',
  ARTICLES: 'articles'
};

// 控制是否啟用新功能標記的常數
const FEATURE_ENABLED = true; // 你可以在這裡控制開關

/**
 * 通用的新功能通知 Hook
 * @param {string} featureId - 功能 ID (WATCHLIST 或 ARTICLES)
 * @param {Object} options - 額外選項
 * @param {Array} options.articles - 文章列表（僅用於 ARTICLES 功能）
 */
export function useNewFeatureNotification(featureId, options = {}) {
  const [hasNewFeature, setHasNewFeature] = useState(false);
  
  useEffect(() => {
    // 如果功能未啟用，直接返回
    if (!FEATURE_ENABLED) {
      setHasNewFeature(false);
      return;
    }

    // 針對 ARTICLES 功能，使用基於文章 ID 的追蹤機制
    if (featureId === FEATURES.ARTICLES && options.articles) {
      checkForNewArticles(options.articles);
      return;
    }

    // 其他功能使用原有的簡單機制
    const hasSeenFeature = localStorage.getItem(`hasSeenFeature_${featureId}`);
    
    if (!hasSeenFeature) {
      setHasNewFeature(true);
    }
  }, [featureId, options.articles]);

  /**
   * 檢查是否有新文章
   * 邏輯：比對最新文章的 originalSlug 與 localStorage 中記錄的最後查看文章
   */
  const checkForNewArticles = (articles) => {
    if (!articles || articles.length === 0) {
      setHasNewFeature(false);
      return;
    }

    // 取得最新文章（假設文章列表已按發布順序排列，最新的在最後）
    const latestArticle = articles[articles.length - 1];
    const latestArticleSlug = latestArticle.originalSlug || latestArticle.slug;

    // 從 localStorage 讀取使用者最後查看的文章 slug
    const lastViewedArticleSlug = localStorage.getItem('lastViewedArticleSlug');

    // 如果沒有記錄，或最新文章與記錄不同，顯示紅點
    if (!lastViewedArticleSlug || lastViewedArticleSlug !== latestArticleSlug) {
      setHasNewFeature(true);
    } else {
      setHasNewFeature(false);
    }
  };

  /**
   * 標記功能為已查看
   * 對於 ARTICLES，會記錄當前最新文章的 slug
   */
  const markFeatureAsSeen = (latestArticleSlug = null) => {
    if (featureId === FEATURES.ARTICLES && latestArticleSlug) {
      // 記錄最新文章的 slug
      localStorage.setItem('lastViewedArticleSlug', latestArticleSlug);
    } else {
      // 其他功能使用原有機制
      localStorage.setItem(`hasSeenFeature_${featureId}`, 'true');
    }
    setHasNewFeature(false);
  };

  // 重置特定功能的狀態（用於測試）
  const resetFeatureSeen = () => {
    if (featureId === FEATURES.ARTICLES) {
      localStorage.removeItem('lastViewedArticleSlug');
    } else {
      localStorage.removeItem(`hasSeenFeature_${featureId}`);
    }
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