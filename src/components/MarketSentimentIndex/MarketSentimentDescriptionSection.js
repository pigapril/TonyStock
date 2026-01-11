import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FAQ from './FAQ/FAQ';
import './MarketSentimentDescriptionSection.css';

const MarketSentimentDescriptionSection = ({ 
  activeIndicator = 'composite', 
  currentView = 'latest',
  indicatorsData = {},
  className = ''
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('tips');

  // 當 activeIndicator 改變時，自動切換到相關的標籤
  useEffect(() => {
    if (activeIndicator !== 'composite') {
      setActiveTab('faq'); // 個別指標預設顯示常見問題
    } else {
      setActiveTab('tips'); // composite 預設顯示使用技巧
    }
  }, [activeIndicator]);

  // 根據當前選擇的指標獲取相關內容
  const currentIndicatorKey = useMemo(() => {
    if (activeIndicator === 'composite') {
      return 'composite';
    }
    // 映射指標名稱到翻譯鍵
    const indicatorKeyMap = {
      'AAII Bull-Bear Spread': 'aaiiSpread',
      'CBOE Put/Call Ratio 5-Day Avg': 'cboeRatio',
      'Market Momentum': 'marketMomentum',
      'VIX MA50': 'vixMA50',
      'Safe Haven Demand': 'safeHaven',
      'Junk Bond Spread': 'junkBond',
      "S&P 500 COT Index": 'cotIndex',
      'NAAIM Exposure Index': 'naaimIndex',
    };
    return indicatorKeyMap[activeIndicator] || 'composite';
  }, [activeIndicator]);

  // 處理標籤切換
  const handleTabSwitch = (tabType) => {
    setActiveTab(tabType);
  };

  // 渲染常見問題內容
  const renderFaqContent = () => <FAQ />;

  // 渲染使用技巧內容
  const renderTipsContent = () => (
    <div className="tab-content-tips">      
      <div className="tips-section">
        <h4>{t('marketSentiment.enhancedDescription.content.tips.basicUsage')}</h4>
        <ul className="description-list">
          <li>{t('marketSentiment.enhancedDescription.content.tips.tip1')}</li>
          <li>{t('marketSentiment.enhancedDescription.content.tips.tip2')}</li>
          <li>{t('marketSentiment.enhancedDescription.content.tips.tip3')}</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className={`market-sentiment-description-section ${className}`} style={{ minHeight: '300px', border: '1px solid #ddd' }}>
      <div className="description-tabs-container">
        {/* 標籤導航 */}
        <div className="description-tabs">
          <button 
            className={`description-tab ${activeTab === 'tips' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('tips')}
          >
            {t('marketSentiment.enhancedDescription.tabs.tips')}
          </button>
          <button 
            className={`description-tab ${activeTab === 'faq' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('faq')}
          >
            {t('marketSentiment.enhancedDescription.tabs.faq')}
          </button>
        </div>
        
        {/* 標籤內容 */}
        <div className="description-tab-content">
          {activeTab === 'tips' && renderTipsContent()}
          {activeTab === 'faq' && renderFaqContent()}
        </div>
      </div>
    </div>
  );
};

export default MarketSentimentDescriptionSection;