import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './FreeStockList.css';

/**
 * 免費查詢標的組件
 * 直接平鋪顯示所有可免費查詢的股票標的
 */
const FreeStockList = ({ onStockSelect, className = '' }) => {
  const { t } = useTranslation();

  // 直接列出所有免費股票，不分層級
  const allStocks = useMemo(() => {
    return [
      // 美國 S&P 500
      { ticker: '^GSPC', name: 'S&P 500' },
      { ticker: 'SPY', name: 'SPDR S&P 500 ETF' },
      { ticker: 'IVV', name: 'iShares Core S&P 500 ETF' },
      { ticker: 'VOO', name: 'Vanguard S&P 500 ETF' },
      // 美國 Nasdaq
      { ticker: '^NDX', name: 'Nasdaq-100' },
      { ticker: 'QQQ', name: 'Invesco QQQ Trust' },
      { ticker: '00662', name: '富邦NASDAQ' },
      // 美國整體市場
      { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF' },
      { ticker: 'ITOT', name: 'iShares Core S&P Total U.S. Stock Market ETF' },
      // 加拿大
      { ticker: 'EWC', name: 'iShares MSCI Canada ETF' },
      // 巴西
      { ticker: '^BVSP', name: 'Bovespa Index' },
      { ticker: 'EWZ', name: 'iShares MSCI Brazil ETF' },
      // 德國
      { ticker: '^GDAXI', name: 'DAX' },
      { ticker: 'EWG', name: 'iShares MSCI Germany ETF' },
      // 台灣
      { ticker: '^TWII', name: '臺灣加權指數' },
      { ticker: 'EWT', name: 'iShares MSCI Taiwan ETF' },
      { ticker: '0050', name: '元大台灣50' },
      { ticker: '006208', name: '富邦台50' },
      // 日本
      { ticker: '^N225', name: 'Nikkei 225' },
      { ticker: 'EWJ', name: 'iShares MSCI Japan ETF' },
      { ticker: '00645', name: '富邦日本' },
      // 中國
      { ticker: '000300.SS', name: '滬深300指數' },
      { ticker: 'ASHR', name: 'Xtrackers Harvest CSI 300 China A-Shares ETF' },
      { ticker: '006206', name: '元大滬深300' },
      // 全球市場
      { ticker: 'VT', name: 'Vanguard Total World Stock ETF' },
      // 新興市場
      { ticker: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF' },
      { ticker: 'IEMG', name: 'iShares Core MSCI Emerging Markets ETF' }
    ];
  }, []);

  // 處理股票點擊
  const handleStockClick = (ticker) => {
    if (onStockSelect) {
      onStockSelect(ticker);
    }
  };

  return (
    <div className={`free-stock-list ${className}`}>
      <div className="free-stock-grid">
        {allStocks.map((stock) => (
          <button
            key={stock.ticker}
            className="free-stock-item"
            onClick={() => handleStockClick(stock.ticker)}
            title={`${stock.name} (${stock.ticker})`}
          >
            <div className="free-stock-info">
              <span className="free-stock-ticker">{stock.ticker}</span>
              <span className="free-stock-name">{stock.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FreeStockList;