// 測試 watchlist 權限檢查的簡單腳本
// 這個文件可以用來驗證權限檢查邏輯是否正確

import { subscriptionService } from '../../../api/subscriptionService';

// 測試不同計劃的 watchlist 權限
function testWatchlistAccess() {
  console.log('=== Watchlist Access Test ===');
  
  // 測試 free 計劃
  const freeAccess = subscriptionService.isFeatureEnabled('free', 'watchlist');
  console.log('Free plan watchlist access:', freeAccess); // 應該是 false
  
  // 測試 pro 計劃
  const proAccess = subscriptionService.isFeatureEnabled('pro', 'watchlist');
  console.log('Pro plan watchlist access:', proAccess); // 應該是 true
  
  // 測試不存在的計劃
  const unknownAccess = subscriptionService.isFeatureEnabled('unknown', 'watchlist');
  console.log('Unknown plan watchlist access:', unknownAccess); // 應該是 false
  
  console.log('=== Test Results ===');
  console.log('✓ Free users should be blocked from watchlist:', !freeAccess);
  console.log('✓ Pro users should have watchlist access:', proAccess);
  console.log('✓ Unknown plans should be blocked:', !unknownAccess);
}

// 如果在瀏覽器環境中運行
if (typeof window !== 'undefined') {
  window.testWatchlistAccess = testWatchlistAccess;
}

export { testWatchlistAccess };