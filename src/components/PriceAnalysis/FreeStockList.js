import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getStocksByRegion } from '../../utils/freeStockListUtils';
import './FreeStockList.css';

/**
 * 免費查詢標的組件
 * 按區域分類顯示所有可免費查詢的股票標的
 * 資料來源：API /api/public/free-stock-list/regions
 */
const FreeStockList = ({ onStockSelect, className = '' }) => {
  const { t } = useTranslation();
  const [stocksByRegion, setStocksByRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 從 API 載入股票資料
  useEffect(() => {
    const loadStockData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getStocksByRegion();
        setStocksByRegion(data);
      } catch (err) {
        console.error('Failed to load stock data:', err);
        setError('載入股票清單失敗');
      } finally {
        setLoading(false);
      }
    };

    loadStockData();
  }, []);

  // 處理股票點擊
  const handleStockClick = (ticker) => {
    if (onStockSelect) {
      onStockSelect(ticker);
    }
  };

  // 載入中狀態
  if (loading) {
    return (
      <div className={`free-stock-list ${className}`}>
        <div className="loading-message">載入股票清單中...</div>
      </div>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className={`free-stock-list ${className}`}>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  // 沒有資料
  if (!stocksByRegion) {
    return (
      <div className={`free-stock-list ${className}`}>
        <div className="no-data-message">暫無股票資料</div>
      </div>
    );
  }

  return (
    <div className={`free-stock-list ${className}`}>
      <div className="free-stock-regions">
        {Object.entries(stocksByRegion).map(([regionKey, region]) => (
          <div key={regionKey} className="free-stock-region">
            <div className="region-header">
              <span className="region-icon">{region.icon}</span>
              <h4 className="region-title">{region.title}</h4>
            </div>
            <div className="region-stocks">
              {region.stocks.map((stock) => (
                <button
                  key={stock.ticker}
                  className="free-stock-item"
                  onClick={() => handleStockClick(stock.ticker)}
                  title={`${stock.name} (${stock.ticker})`}
                >
                  <div className="free-stock-info">
                    <span className="free-stock-ticker">{stock.ticker}</span>
                    <span className="free-stock-name">{stock.name}</span>
                    <span className="stock-region-badge">{stock.category}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FreeStockList;