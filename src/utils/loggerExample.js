/**
 * Logger 使用範例
 * 展示如何在專案中使用統一的日誌管理
 */

import logger from './logger';

// 範例：API 請求日誌
export const logApiRequest = (url, method, data) => {
  logger.debug('API Request:', { url, method, data });
};

export const logApiResponse = (url, response) => {
  logger.info('API Response:', { url, status: response.status });
};

export const logApiError = (url, error) => {
  logger.error('API Error:', { url, error: error.message });
};

// 範例：使用者行為日誌
export const logUserAction = (action, details) => {
  logger.info('User Action:', { action, details });
};

// 範例：效能監控
export const logPerformance = (operation, duration) => {
  if (duration > 1000) {
    logger.warn('Slow Operation:', { operation, duration: `${duration}ms` });
  } else {
    logger.debug('Performance:', { operation, duration: `${duration}ms` });
  }
};

// 範例：錯誤處理
export const logError = (error, context) => {
  logger.error('Application Error:', {
    message: error.message,
    stack: error.stack,
    context
  });
};

// 範例：開發除錯
export const logDebug = (message, data) => {
  logger.debug(message, data);
};