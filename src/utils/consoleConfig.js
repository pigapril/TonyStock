/**
 * Console 配置
 * 根據環境變數控制 console 輸出級別
 * 在生產環境中禁用 debug 和 info 級別的輸出
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// 從環境變數讀取日誌級別
const getLogLevel = () => {
  const envLogLevel = process.env.REACT_APP_LOG_LEVEL;
  
  // 如果是生產環境且沒有明確設定，預設為 warn
  if (process.env.NODE_ENV === 'production' && !envLogLevel) {
    return LOG_LEVELS.warn;
  }
  
  // 開發環境預設為 info
  if (!envLogLevel) {
    return LOG_LEVELS.info;
  }
  
  return LOG_LEVELS[envLogLevel.toLowerCase()] || LOG_LEVELS.info;
};

const currentLogLevel = getLogLevel();

// 保存原始的 console 方法
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

// 覆蓋 console 方法
if (currentLogLevel > LOG_LEVELS.debug) {
  console.debug = () => {};
}

if (currentLogLevel > LOG_LEVELS.info) {
  console.log = () => {};
  console.info = () => {};
}

if (currentLogLevel > LOG_LEVELS.warn) {
  console.warn = () => {};
}

if (currentLogLevel > LOG_LEVELS.error) {
  console.error = () => {};
}

// 在開發環境中顯示配置資訊
if (process.env.NODE_ENV === 'development') {
  const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === currentLogLevel);
  originalConsole.info(`[Console Config] Log level set to: ${levelName}`);
  originalConsole.info(`[Console Config] Available methods: ${
    Object.keys(LOG_LEVELS)
      .filter(level => LOG_LEVELS[level] >= currentLogLevel)
      .join(', ')
  }`);
}

// 匯出原始 console 方法，以備特殊情況使用
export { originalConsole };