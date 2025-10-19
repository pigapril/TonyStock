/**
 * 日誌系統測試檔案
 * 用於驗證日誌級別控制是否正常工作
 */

import logger, { systemLogger } from './logger';

// 測試所有日誌級別
export const testLoggerLevels = () => {
  console.log('=== 開始測試日誌系統 ===');
  console.log(`當前環境: ${process.env.NODE_ENV}`);
  console.log(`設定的日誌級別: ${process.env.REACT_APP_LOG_LEVEL}`);
  console.log(`Logger 當前級別: ${logger.getCurrentLevel()}`);
  
  console.log('\n--- 測試 logger 實例 ---');
  logger.debug('這是 DEBUG 級別訊息 (只在 debug 級別顯示)');
  logger.info('這是 INFO 級別訊息 (在 info 及以上級別顯示)');
  logger.warn('這是 WARN 級別訊息 (在 warn 及以上級別顯示)');
  logger.error('這是 ERROR 級別訊息 (在所有級別都顯示)');
  
  console.log('\n--- 測試 systemLogger 實例 ---');
  systemLogger.debug('SystemLogger DEBUG 訊息');
  systemLogger.info('SystemLogger INFO 訊息');
  systemLogger.warn('SystemLogger WARN 訊息');
  systemLogger.error('SystemLogger ERROR 訊息');
  
  console.log('\n--- 測試原生 console (會被 consoleConfig 過濾) ---');
  console.debug('原生 console.debug');
  console.log('原生 console.log');
  console.info('原生 console.info');
  console.warn('原生 console.warn');
  console.error('原生 console.error');
  
  console.log('\n=== 日誌系統測試完成 ===');
};

// 在開發環境中自動執行測試
if (process.env.NODE_ENV === 'development') {
  // 延遲執行，確保 consoleConfig 已載入
  setTimeout(testLoggerLevels, 100);
}