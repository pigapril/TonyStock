import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './MarketSentimentDescriptionSection.css';

const MarketSentimentDescriptionSection = ({ 
  activeIndicator = 'composite', 
  currentView = 'latest',
  indicatorsData = {},
  className = ''
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');

  // 當 activeIndicator 改變時，自動切換到相關的標籤
  useEffect(() => {
    if (activeIndicator !== 'composite') {
      setActiveTab('overview'); // 個別指標預設顯示簡介
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

  // 渲染總覽內容
  const renderOverviewContent = () => {
    try {
      return (
        <div className="tab-content-overview">
          <h3>{t('marketSentiment.enhancedDescription.tabs.overview', '總覽')}</h3>
          <p>{t(`marketSentiment.enhancedDescription.content.overview.${currentIndicatorKey}.intro`, '載入中...')}</p>
          
          <div className="overview-key-points">
            <h4>{t('marketSentiment.enhancedDescription.content.overview.keyPoints', '重點說明')}</h4>
            <ul className="description-list">
              <li>{t(`marketSentiment.enhancedDescription.content.overview.${currentIndicatorKey}.point1`, '要點1')}</li>
              <li>{t(`marketSentiment.enhancedDescription.content.overview.${currentIndicatorKey}.point2`, '要點2')}</li>
              <li>{t(`marketSentiment.enhancedDescription.content.overview.${currentIndicatorKey}.point3`, '要點3')}</li>
            </ul>
          </div>

          {currentIndicatorKey === 'composite' && (
            <div className="composite-overview">
              <h4>{t('marketSentiment.enhancedDescription.content.overview.composite.components', '指標組成')}</h4>
              <p>{t('marketSentiment.enhancedDescription.content.overview.composite.componentsDesc', '組成說明')}</p>
            </div>
          )}
        </div>
      );
    } catch (error) {
      console.error('Error rendering overview content:', error);
      return <div>載入總覽內容時發生錯誤</div>;
    }
  };

  // 渲染組成指標內容 - 使用原始的詳細說明
  const renderIndicatorsContent = () => {
    try {
      return (
        <div className="tab-content-indicators">
          <h3>{t('marketSentiment.enhancedDescription.tabs.indicators', '組成指標')}</h3>
          
          {currentIndicatorKey === 'composite' ? (
            <div className="composite-indicators">
              <p>SIO恐懼貪婪指標由以下八個關鍵指標組成，每個指標都有其獨特的市場洞察：</p>
              
              <div className="indicators-grid">
                {Object.keys(indicatorsData).filter(key => 
                  key !== 'Investment Grade Bond Yield' && key !== 'Junk Bond Yield'
                ).map((key) => {
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
                  const translationKey = indicatorKeyMap[key];
                  
                  if (!translationKey) return null;
                  
                  // 使用原始的詳細說明
                  const shortDescription = t(`marketSentiment.descriptions.${translationKey}.shortDescription`, '指標說明');
                  const sections = t(`marketSentiment.descriptions.${translationKey}.sections`, { returnObjects: true, defaultValue: [] });
                  
                  return (
                    <div key={key} className="indicator-summary">
                      <h4>{t(`indicators.${translationKey}`, key)}</h4>
                      <p>{shortDescription}</p>
                      {Array.isArray(sections) && sections.map((section, index) => (
                        <div key={index} style={{ marginTop: '10px' }}>
                          <h5 style={{ fontSize: '0.9rem', fontWeight: '600', margin: '8px 0 4px 0' }}>
                            {section.title}
                          </h5>
                          <p style={{ fontSize: '0.85rem', margin: '0', color: '#666' }}>
                            {section.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="single-indicator">
              <div className="indicator-details">
                {/* 顯示選中指標的詳細說明 */}
                <div>
                  <p>{t(`marketSentiment.descriptions.${currentIndicatorKey}.shortDescription`, '指標說明')}</p>
                  
                  {(() => {
                    const sections = t(`marketSentiment.descriptions.${currentIndicatorKey}.sections`, { returnObjects: true, defaultValue: [] });
                    if (Array.isArray(sections)) {
                      return sections.map((section, index) => (
                        <div key={index} style={{ marginTop: '20px' }}>
                          <h4>{section.title}</h4>
                          <p>{section.content}</p>
                        </div>
                      ));
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    } catch (error) {
      console.error('Error rendering indicators content:', error);
      return <div>載入組成指標內容時發生錯誤</div>;
    }
  };

  // 渲染使用技巧內容
  const renderTipsContent = () => (
    <div className="tab-content-tips">
      <h3>{t('marketSentiment.enhancedDescription.tabs.tips', '使用技巧')}</h3>
      
      <div className="tips-section">
        <h4>{t('marketSentiment.enhancedDescription.content.tips.basicUsage', '基本使用方法')}</h4>
        <ul className="description-list">
          <li>{t('marketSentiment.enhancedDescription.content.tips.tip1', '技巧1')}</li>
          <li>{t('marketSentiment.enhancedDescription.content.tips.tip2', '技巧2')}</li>
          <li>{t('marketSentiment.enhancedDescription.content.tips.tip3', '技巧3')}</li>
        </ul>
      </div>

      <div className="tips-section">
        <h4>{t('marketSentiment.enhancedDescription.content.tips.advancedUsage', '進階使用技巧')}</h4>
        <ul className="description-list">
          <li>{t('marketSentiment.enhancedDescription.content.tips.advanced1', '進階技巧1')}</li>
          <li>{t('marketSentiment.enhancedDescription.content.tips.advanced2', '進階技巧2')}</li>
          <li>{t('marketSentiment.enhancedDescription.content.tips.advanced3', '進階技巧3')}</li>
        </ul>
      </div>

      <div className="tips-section">
        <h4>{t('marketSentiment.enhancedDescription.content.tips.warnings', '注意事項')}</h4>
        <ul className="description-list">
          <li>{t('marketSentiment.enhancedDescription.content.tips.warning1', '注意事項1')}</li>
          <li>{t('marketSentiment.enhancedDescription.content.tips.warning2', '注意事項2')}</li>
        </ul>
      </div>
    </div>
  );

  // 渲染歷史分析內容
  const renderHistoryContent = () => (
    <div className="tab-content-history">
      <h3>{t('marketSentiment.enhancedDescription.tabs.history', '歷史分析')}</h3>
      
      <div className="history-section">
        <h4>{t('marketSentiment.enhancedDescription.content.history.patterns', '歷史模式分析')}</h4>
        <p>{t('marketSentiment.enhancedDescription.content.history.patternsDesc', '歷史模式說明')}</p>
        
        <ul className="description-list">
          <li>{t('marketSentiment.enhancedDescription.content.history.pattern1', '模式1')}</li>
          <li>{t('marketSentiment.enhancedDescription.content.history.pattern2', '模式2')}</li>
          <li>{t('marketSentiment.enhancedDescription.content.history.pattern3', '模式3')}</li>
        </ul>
      </div>

      <div className="history-section">
        <h4>{t('marketSentiment.enhancedDescription.content.history.sliderUsage', '歷史滑桿使用方法')}</h4>
        <p>{t('marketSentiment.enhancedDescription.content.history.sliderDesc', '滑桿說明')}</p>
        
        <ul className="description-list">
          <li>{t('marketSentiment.enhancedDescription.content.history.slider1', '滑桿功能1')}</li>
          <li>{t('marketSentiment.enhancedDescription.content.history.slider2', '滑桿功能2')}</li>
          <li>{t('marketSentiment.enhancedDescription.content.history.slider3', '滑桿功能3')}</li>
        </ul>
      </div>

      <div className="history-section">
        <h4>{t('marketSentiment.enhancedDescription.content.history.historicalReview', '重要歷史事件回顧')}</h4>
        <p>{t('marketSentiment.enhancedDescription.content.history.historicalReviewDesc', '歷史事件說明')}</p>
        
        <ul className="description-list">
          <li>{t('marketSentiment.enhancedDescription.content.history.event2009', '2009年事件')}</li>
          <li>{t('marketSentiment.enhancedDescription.content.history.event2020', '2020年事件')}</li>
          <li>{t('marketSentiment.enhancedDescription.content.history.event2022', '2022年事件')}</li>
        </ul>
        
        <p>{t('marketSentiment.enhancedDescription.content.history.historicalInsight', '歷史洞察')}</p>
      </div>
    </div>
  );

  return (
    <div className={`market-sentiment-description-section ${className}`} style={{ minHeight: '300px', border: '1px solid #ddd' }}>
      <div className="description-tabs-container">
        {/* 標籤導航 */}
        <div className="description-tabs">
          <button 
            className={`description-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('overview')}
          >
            {currentIndicatorKey === 'composite' 
              ? t('marketSentiment.enhancedDescription.tabs.overview', '總覽')
              : t('marketSentiment.enhancedDescription.tabs.introduction', '簡介')
            }
          </button>
          <button 
            className={`description-tab ${activeTab === 'indicators' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('indicators')}
          >
            {currentIndicatorKey === 'composite' 
              ? t('marketSentiment.enhancedDescription.tabs.indicators', '組成指標')
              : t('marketSentiment.enhancedDescription.tabs.details', '詳細說明')
            }
          </button>
          {currentIndicatorKey === 'composite' && (
            <>
              <button 
                className={`description-tab ${activeTab === 'tips' ? 'active' : ''}`}
                onClick={() => handleTabSwitch('tips')}
              >
                {t('marketSentiment.enhancedDescription.tabs.tips', '使用技巧')}
              </button>
              <button 
                className={`description-tab ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => handleTabSwitch('history')}
              >
                {t('marketSentiment.enhancedDescription.tabs.history', '歷史分析')}
              </button>
            </>
          )}
        </div>
        
        {/* 標籤內容 */}
        <div className="description-tab-content">
          {activeTab === 'overview' && renderOverviewContent()}
          {activeTab === 'indicators' && renderIndicatorsContent()}
          {currentIndicatorKey === 'composite' && activeTab === 'tips' && renderTipsContent()}
          {currentIndicatorKey === 'composite' && activeTab === 'history' && renderHistoryContent()}
        </div>
      </div>
    </div>
  );
};

export default MarketSentimentDescriptionSection;