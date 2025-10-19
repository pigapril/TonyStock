/**
 * 日誌管理工具
 * 根據環境變數 REACT_APP_LOG_LEVEL 控制 console 輸出級別
 * 級別順序：debug < info < warn < error
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  constructor() {
    // 從環境變數讀取日誌級別，預設為 info
    const envLogLevel = process.env.REACT_APP_LOG_LEVEL || 'info';
    this.currentLevel = LOG_LEVELS[envLogLevel.toLowerCase()] || LOG_LEVELS.info;
    
    // 在生產環境中，如果沒有設定日誌級別，預設為 warn
    if (process.env.NODE_ENV === 'production' && !process.env.REACT_APP_LOG_LEVEL) {
      this.currentLevel = LOG_LEVELS.warn;
    }
  }

  /**
   * 檢查是否應該輸出指定級別的日誌
   * @param {string} level - 日誌級別
   * @returns {boolean}
   */
  shouldLog(level) {
    return LOG_LEVELS[level] >= this.currentLevel;
  }

  /**
   * Debug 級別日誌
   * @param {...any} args - 要輸出的內容
   */
  debug(...args) {
    if (this.shouldLog('debug')) {
      console.log('[DEBUG]', ...args);
    }
  }

  /**
   * Info 級別日誌
   * @param {...any} args - 要輸出的內容
   */
  info(...args) {
    if (this.shouldLog('info')) {
      console.info('[INFO]', ...args);
    }
  }

  /**
   * Warning 級別日誌
   * @param {...any} args - 要輸出的內容
   */
  warn(...args) {
    if (this.shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  }

  /**
   * Error 級別日誌
   * @param {...any} args - 要輸出的內容
   */
  error(...args) {
    if (this.shouldLog('error')) {
      console.error('[ERROR]', ...args);
    }
  }

  /**
   * 獲取當前日誌級別
   * @returns {string}
   */
  getCurrentLevel() {
    return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === this.currentLevel);
  }
}

// 建立單例實例
const logger = new Logger();

// 在開發環境中顯示當前日誌級別
if (process.env.NODE_ENV === 'development') {
  console.info(`[Logger] Current log level: ${logger.getCurrentLevel()}`);
}

// 匯出預設實例和命名實例以保持向後相容性
export default logger;
export const systemLogger = logger;