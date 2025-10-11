/**
 * 免費用戶可查詢的股票清單
 * 與後端 analysis_free_list.json 保持同步
 */
export const FREE_STOCK_LIST = [
  // 美國 S&P 500
  '^GSPC', 'SPY', 'IVV', 'VOO',
  // 美國 Nasdaq
  '^NDX', 'QQQ', '00662',
  // 美國整體市場
  'VTI', 'ITOT',
  // 加拿大
  'EWC',
  // 巴西
  '^BVSP', 'EWZ',
  // 德國
  '^GDAXI', 'EWG',
  // 台灣
  '^TWII', 'EWT', '0050', '006208',
  // 日本
  '^N225', 'EWJ', '00645',
  // 中國
  '000300.SS', 'ASHR', '006206',
  // 全球市場
  'VT',
  // 新興市場
  'VWO', 'IEMG'
];

/**
 * 檢查股票是否在免費清單中
 * @param {string} stockCode - 股票代碼
 * @param {string} userPlan - 用戶計劃 ('free' 或 'pro')
 * @returns {boolean} 是否允許訪問
 */
export const isStockAllowed = (stockCode, userPlan = 'free') => {
  if (userPlan === 'pro') return true; // Pro 用戶無限制
  return FREE_STOCK_LIST.includes(stockCode.toUpperCase());
};

/**
 * 獲取免費股票清單
 * @returns {string[]} 股票代碼陣列
 */
export const getFreeStockList = () => {
  return [...FREE_STOCK_LIST];
};