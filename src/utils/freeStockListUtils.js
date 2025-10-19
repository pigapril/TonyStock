/**
 * 免費股票清單工具函數
 * 通過 API 從後端獲取資料
 */

import enhancedApiClient from './enhancedApiClient';

// 快取變數
let cachedStocksByRegion = null;
let cachedTickers = null;
let cacheTimestamp = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 小時快取（資料更新頻率低）
const CACHE_KEY_REGIONS = 'freeStockList_regions';
const CACHE_KEY_TICKERS = 'freeStockList_tickers';
const CACHE_KEY_TIMESTAMP = 'freeStockList_timestamp';
const CACHE_KEY_VERSION = 'freeStockList_version';
const CURRENT_CACHE_VERSION = '1.0'; // 當資料結構改變時更新此版本號

/**
 * 從 localStorage 載入快取
 */
const loadCacheFromStorage = () => {
  try {
    const storedVersion = localStorage.getItem(CACHE_KEY_VERSION);
    const storedTimestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);
    const storedRegions = localStorage.getItem(CACHE_KEY_REGIONS);
    const storedTickers = localStorage.getItem(CACHE_KEY_TICKERS);
    
    // 檢查版本是否匹配
    if (storedVersion !== CURRENT_CACHE_VERSION) {
      console.info('Cache version mismatch, clearing old cache');
      clearStorageCache();
      return;
    }
    
    if (storedTimestamp && storedRegions && storedTickers) {
      cacheTimestamp = parseInt(storedTimestamp);
      cachedStocksByRegion = JSON.parse(storedRegions);
      cachedTickers = JSON.parse(storedTickers);
    }
  } catch (error) {
    console.warn('Failed to load cache from localStorage:', error);
    // 清除可能損壞的快取
    clearStorageCache();
  }
};

/**
 * 儲存快取到 localStorage
 */
const saveCacheToStorage = () => {
  try {
    if (cacheTimestamp && cachedStocksByRegion && cachedTickers) {
      localStorage.setItem(CACHE_KEY_VERSION, CURRENT_CACHE_VERSION);
      localStorage.setItem(CACHE_KEY_TIMESTAMP, cacheTimestamp.toString());
      localStorage.setItem(CACHE_KEY_REGIONS, JSON.stringify(cachedStocksByRegion));
      localStorage.setItem(CACHE_KEY_TICKERS, JSON.stringify(cachedTickers));
    }
  } catch (error) {
    console.warn('Failed to save cache to localStorage:', error);
  }
};

/**
 * 清除 localStorage 快取
 */
const clearStorageCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY_VERSION);
    localStorage.removeItem(CACHE_KEY_REGIONS);
    localStorage.removeItem(CACHE_KEY_TICKERS);
    localStorage.removeItem(CACHE_KEY_TIMESTAMP);
  } catch (error) {
    console.warn('Failed to clear localStorage cache:', error);
  }
};

/**
 * 檢查快取是否有效
 * @returns {boolean} 快取是否有效
 */
const isCacheValid = () => {
  // 如果記憶體中沒有快取，嘗試從 localStorage 載入
  if (!cacheTimestamp && typeof localStorage !== 'undefined') {
    loadCacheFromStorage();
  }
  
  return cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION;
};

/**
 * 從 API 獲取按區域分類的股票資料
 * @returns {Promise<Object>} 按區域分類的股票資料
 */
export const getStocksByRegion = async () => {
  // 如果有有效快取，直接返回
  if (isCacheValid() && cachedStocksByRegion) {
    return cachedStocksByRegion;
  }

  try {
    const response = await enhancedApiClient.get('/api/public/free-stock-list/regions');
    const result = response.data;
    
    if (result.success) {
      // 更新快取
      cachedStocksByRegion = result.data;
      cacheTimestamp = Date.now();
      
      // 儲存到 localStorage
      saveCacheToStorage();
      
      return result.data;
    } else {
      throw new Error(result.error || 'Failed to fetch stock data');
    }
  } catch (error) {
    console.error('Failed to fetch stocks by region:', error);
    
    // 如果有舊快取，返回舊快取
    if (cachedStocksByRegion) {
      console.warn('Using cached data due to API error');
      return cachedStocksByRegion;
    }
    
    // 返回預設的空結構
    return {
      americas: { title: '美洲市場', icon: '🌎', stocks: [] },
      europe: { title: '歐洲市場', icon: '🇪🇺', stocks: [] },
      asiaPacific: { title: '亞太市場', icon: '🌏', stocks: [] },
      global: { title: '全球市場', icon: '🌍', stocks: [] }
    };
  }
};

/**
 * 獲取所有免費股票的 ticker 清單（用於權限檢查）
 * @returns {Promise<string[]>} 股票代碼陣列
 */
export const getFreeStockTickers = async () => {
  // 如果有有效快取，直接返回
  if (isCacheValid() && cachedTickers) {
    return cachedTickers;
  }

  try {
    const response = await enhancedApiClient.get('/api/public/free-stock-list/tickers');
    const result = response.data;
    
    if (result.success) {
      // 更新快取
      cachedTickers = result.data.tickers;
      cacheTimestamp = Date.now();
      
      // 儲存到 localStorage
      saveCacheToStorage();
      
      return result.data.tickers;
    } else {
      throw new Error(result.error || 'Failed to fetch tickers');
    }
  } catch (error) {
    console.error('Failed to fetch free stock tickers:', error);
    
    // 如果有舊快取，返回舊快取
    if (cachedTickers) {
      console.warn('Using cached tickers due to API error');
      return cachedTickers;
    }
    
    // 返回預設的基本清單
    return ['0050', 'SPY', 'VOO', 'QQQ', 'VTI'];
  }
};

/**
 * 檢查股票是否在免費清單中（同步版本）
 * @param {string} stockCode - 股票代碼
 * @param {string} userPlan - 用戶計劃 ('free' 或 'pro')
 * @returns {boolean} 是否允許訪問
 */
export const isStockAllowed = (stockCode, userPlan = 'free') => {
  if (userPlan === 'pro') return true; // Pro 用戶無限制
  
  // 使用快取的資料進行同步檢查
  if (isCacheValid() && cachedTickers) {
    return cachedTickers.includes(stockCode.toUpperCase());
  }
  
  // 如果沒有快取，嘗試從 localStorage 載入
  if (!cachedTickers && typeof localStorage !== 'undefined') {
    loadCacheFromStorage();
    if (cachedTickers) {
      return cachedTickers.includes(stockCode.toUpperCase());
    }
  }
  
  // 如果沒有任何快取資料，返回基本的免費股票清單檢查
  const basicFreeStocks = ['0050', 'SPY', 'VOO', 'QQQ', 'VTI'];
  return basicFreeStocks.includes(stockCode.toUpperCase());
};

/**
 * 檢查股票是否在免費清單中（異步版本）
 * @param {string} stockCode - 股票代碼
 * @param {string} userPlan - 用戶計劃 ('free' 或 'pro')
 * @returns {Promise<boolean>} 是否允許訪問
 */
export const isStockAllowedAsync = async (stockCode, userPlan = 'free') => {
  if (userPlan === 'pro') return true; // Pro 用戶無限制
  
  try {
    const freeStocks = await getFreeStockTickers();
    return freeStocks.includes(stockCode.toUpperCase());
  } catch (error) {
    console.error('Failed to check stock permission:', error);
    // 如果 API 失敗，返回 false（安全起見）
    return false;
  }
};

/**
 * 獲取免費股票清單（同步版本，向後兼容）
 * @returns {string[]} 股票代碼陣列
 */
export const getFreeStockList = () => {
  // 使用快取的資料進行同步返回
  if (isCacheValid() && cachedTickers) {
    return cachedTickers;
  }
  
  // 如果沒有快取，嘗試從 localStorage 載入
  if (!cachedTickers && typeof localStorage !== 'undefined') {
    loadCacheFromStorage();
    if (cachedTickers) {
      return cachedTickers;
    }
  }
  
  // 如果沒有任何快取資料，返回基本的免費股票清單
  return ['0050', 'SPY', 'VOO', 'QQQ', 'VTI'];
};

/**
 * 獲取免費股票清單（異步版本）
 * @returns {Promise<string[]>} 股票代碼陣列
 */
export const getFreeStockListAsync = async () => {
  return await getFreeStockTickers();
};

/**
 * 初始化免費股票清單（預載資料）
 * 應在應用啟動時調用
 */
export const initializeFreeStockList = async () => {
  try {
    // 預載免費股票清單到快取
    await getFreeStockTickers();
    console.log('Free stock list initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize free stock list:', error);
    // 確保至少載入 localStorage 中的快取
    loadCacheFromStorage();
  }
};

/**
 * 清除快取（用於測試或強制刷新）
 */
export const clearCache = () => {
  cachedStocksByRegion = null;
  cachedTickers = null;
  cacheTimestamp = null;
  clearStorageCache();
};