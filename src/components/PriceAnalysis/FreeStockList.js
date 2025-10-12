import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './FreeStockList.css';

/**
 * 免費查詢標的組件
 * 按區域分類顯示所有可免費查詢的股票標的
 */
const FreeStockList = ({ onStockSelect, className = '' }) => {
  const { t } = useTranslation();

  // 按區域分類的免費股票清單
  const stocksByRegion = useMemo(() => {
    return {
      americas: {
        title: '美洲市場',
        icon: '🌎',
        stocks: [
          // 美國主要指數
          { ticker: '^GSPC', name: 'S&P 500', category: 'US' },
          { ticker: 'SPY', name: 'SPDR S&P 500 ETF', category: 'US' },
          { ticker: 'IVV', name: 'iShares Core S&P 500 ETF', category: 'US' },
          { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', category: 'US' },
          { ticker: '^NDX', name: 'Nasdaq-100', category: 'US' },
          { ticker: 'QQQ', name: 'Invesco QQQ Trust', category: 'US' },
          { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', category: 'US' },
          { ticker: 'ITOT', name: 'iShares Core S&P Total U.S. Stock Market ETF', category: 'US' },
          { ticker: '^RUT', name: 'Russell 2000', category: 'US' },
          { ticker: 'IWM', name: 'iShares Russell 2000 ETF', category: 'US' },
          { ticker: 'VB', name: 'Vanguard Small-Cap ETF', category: 'US' },
          // 其他美洲國家
          { ticker: 'EWC', name: 'iShares MSCI Canada ETF', category: 'Other' },
          { ticker: '^BVSP', name: 'Bovespa Index', category: 'Other' },
          { ticker: 'EWZ', name: 'iShares MSCI Brazil ETF', category: 'Other' },
          { ticker: '^MXX', name: 'IPC Mexico', category: 'Other' },
          { ticker: 'EWW', name: 'iShares MSCI Mexico ETF', category: 'Other' }
        ]
      },
      europe: {
        title: '歐洲市場',
        icon: '🇪🇺',
        stocks: [
          { ticker: '^GDAXI', name: 'DAX', category: 'Major' },
          { ticker: 'EWG', name: 'iShares MSCI Germany ETF', category: 'Major' },
          { ticker: '^FTSE', name: 'FTSE 100', category: 'Major' },
          { ticker: 'EWU', name: 'iShares MSCI United Kingdom ETF', category: 'Major' },
          { ticker: '^FCHI', name: 'CAC 40', category: 'Major' },
          { ticker: 'EWQ', name: 'iShares MSCI France ETF', category: 'Major' },
          { ticker: 'VGK', name: 'Vanguard FTSE Europe ETF', category: 'Regional' },
          { ticker: 'EFA', name: 'iShares MSCI EAFE ETF', category: 'Regional' }
        ]
      },
      asiaPacific: {
        title: '亞太市場',
        icon: '🌏',
        stocks: [
          // 台灣
          { ticker: '^TWII', name: '臺灣加權指數', category: 'TW' },
          { ticker: 'EWT', name: 'iShares MSCI Taiwan ETF', category: 'TW' },
          { ticker: '0050', name: '元大台灣50', category: 'TW' },
          { ticker: '006208', name: '富邦台50', category: 'TW' },
          { ticker: '00662', name: '富邦NASDAQ', category: 'TW' },
          // 日本
          { ticker: '^N225', name: 'Nikkei 225', category: 'JP' },
          { ticker: 'EWJ', name: 'iShares MSCI Japan ETF', category: 'JP' },
          { ticker: '00645', name: '富邦日本', category: 'JP' },
          // 中國
          { ticker: '000300.SS', name: '滬深300指數', category: 'CN' },
          { ticker: 'ASHR', name: 'Xtrackers Harvest CSI 300 China A-Shares ETF', category: 'CN' },
          { ticker: '006206', name: '元大滬深300', category: 'CN' },
          // 其他亞太國家
          { ticker: '^KS11', name: 'KOSPI', category: 'Other' },
          { ticker: 'EWY', name: 'iShares MSCI South Korea ETF', category: 'Other' },
          { ticker: '^NSEI', name: 'NIFTY 50', category: 'Other' },
          { ticker: 'INDA', name: 'iShares MSCI India ETF', category: 'Other' },
          { ticker: '^AXJO', name: 'ASX 200', category: 'Other' },
          { ticker: 'EWA', name: 'iShares MSCI Australia ETF', category: 'Other' },
          { ticker: '^HSI', name: '恆生指數', category: 'Other' },
          { ticker: 'EWH', name: 'iShares MSCI Hong Kong ETF', category: 'Other' }
        ]
      },
      global: {
        title: '全球市場',
        icon: '🌍',
        stocks: [
          { ticker: 'VT', name: 'Vanguard Total World Stock ETF', category: 'World' },
          { ticker: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', category: 'Emerging' },
          { ticker: 'IEMG', name: 'iShares Core MSCI Emerging Markets ETF', category: 'Emerging' },
          { ticker: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', category: 'Developed' },
          { ticker: 'IEFA', name: 'iShares Core MSCI EAFE ETF', category: 'Developed' },
          { ticker: 'VPL', name: 'Vanguard FTSE Pacific ETF', category: 'Regional' }
        ]
      }
    };
  }, []);

  // 處理股票點擊
  const handleStockClick = (ticker) => {
    if (onStockSelect) {
      onStockSelect(ticker);
    }
  };

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