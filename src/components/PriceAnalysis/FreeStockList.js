import { useState, useEffect } from 'react';
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
  const [collapsedRegions, setCollapsedRegions] = useState({}); // 新增：記錄哪些區域被收合

  // 新增：切換區域收合狀態（帶智能滾動）
  const toggleRegionCollapse = (regionKey, event) => {
    const isCurrentlyCollapsed = collapsedRegions[regionKey];
    
    setCollapsedRegions(prev => ({
      ...prev,
      [regionKey]: !prev[regionKey]
    }));

    // 如果是展開操作，滾動到該區域標題
    if (isCurrentlyCollapsed && event?.currentTarget) {
      setTimeout(() => {
        try {
          const element = event.currentTarget;
          if (!element) return;
          
          const container = element.closest('.free-stock-list');
          if (!container) return;
          
          const scrollContainer = container.closest('.quick-select-content');
          if (scrollContainer && element.offsetTop !== undefined) {
            const elementTop = element.offsetTop;
            scrollContainer.scrollTo({
              top: elementTop - 8, // 8px 的頂部間距
              behavior: 'smooth'
            });
          }
        } catch (error) {
          console.warn('Smart scroll failed:', error);
        }
      }, 50); // 等待 DOM 更新
    }
  };

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
        setError(t('common.dataLoadError'));
      } finally {
        setLoading(false);
      }
    };

    loadStockData();
  }, [t]);

  // 新增：當股票資料載入完成時，預設全部收合
  useEffect(() => {
    if (stocksByRegion) {
      const initialCollapsedState = {};
      Object.keys(stocksByRegion).forEach(regionKey => {
        initialCollapsedState[regionKey] = true; // 預設全部收合
      });
      setCollapsedRegions(initialCollapsedState);
    }
  }, [stocksByRegion]);

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
        <div className="loading-message">{t('common.loading')}</div>
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
        <div className="no-data-message">{t('common.noData')}</div>
      </div>
    );
  }

  return (
    <div className={`free-stock-list ${className}`}>
      <div className="free-stock-regions">
        {Object.entries(stocksByRegion).map(([regionKey, region]) => (
          <div key={regionKey} className="free-stock-region">
            <div 
              className={`region-header collapsible ${collapsedRegions[regionKey] ? 'collapsed' : ''}`}
              onClick={(e) => toggleRegionCollapse(regionKey, e)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && toggleRegionCollapse(regionKey, e)}
            >
              <div className="region-header-content">
                <span className="region-icon">{region.icon}</span>
                <h4 className="region-title">{t(`priceAnalysis.freeStockList.regions.${regionKey}`)}</h4>
                <span className="region-count-badge">{region.stocks.length}</span>
              </div>
              <svg 
                className={`collapse-icon ${collapsedRegions[regionKey] ? 'collapsed' : ''}`}
                width="16" 
                height="16" 
                viewBox="0 0 16 16" 
                fill="none"
              >
                <path 
                  d="M4 6L8 10L12 6" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            {!collapsedRegions[regionKey] && (
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FreeStockList;