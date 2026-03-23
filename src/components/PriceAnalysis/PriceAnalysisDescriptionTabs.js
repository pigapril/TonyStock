import React from 'react';

function PriceAnalysisDescriptionTabs({ activeDescriptionTab, onSwitchTab, t }) {
  return (
    <div className="bottom-description-section">
      <div className="description-tabs-container">
        <div className="description-tabs">
          <button
            className={`description-tab ${activeDescriptionTab === 'overview' ? 'active' : ''}`}
            onClick={() => onSwitchTab('overview')}
          >
            {t('priceAnalysis.description.tabs.overview')}
          </button>
          <button
            className={`description-tab ${activeDescriptionTab === 'sd' ? 'active' : ''}`}
            onClick={() => onSwitchTab('sd')}
          >
            {t('priceAnalysis.description.tabs.sd')}
          </button>
          <button
            className={`description-tab ${activeDescriptionTab === 'ulband' ? 'active' : ''}`}
            onClick={() => onSwitchTab('ulband')}
          >
            {t('priceAnalysis.description.tabs.ulband')}
          </button>
          <button
            className={`description-tab ${activeDescriptionTab === 'tips' ? 'active' : ''}`}
            onClick={() => onSwitchTab('tips')}
          >
            {t('priceAnalysis.description.tabs.tips')}
          </button>
        </div>

        <div className="description-tab-content">
          {activeDescriptionTab === 'overview' && (
            <div className="tab-content-overview">
              <h3>{t('priceAnalysis.description.overview.title')}</h3>
              <p>{t('priceAnalysis.description.overview.content')}</p>
              <div className="overview-links">
                <a href="https://sentimentinsideout.com/articles/1.%E7%94%A8%E6%A8%82%E6%B4%BB%E4%BA%94%E7%B7%9A%E8%AD%9C%E5%88%86%E6%9E%90%E5%83%B9%E6%A0%BC%E8%B6%A8%E5%8B%A2%E8%88%87%E6%83%85%E7%B7%92" target="_blank" rel="noopener noreferrer">
                  {t('priceAnalysis.description.overview.readMore')}
                </a>
              </div>
            </div>
          )}

          {activeDescriptionTab === 'sd' && (
            <div className="tab-content-sd">
              <h3>{t('priceAnalysis.description.sd.title')}</h3>
              <ul className="description-list">
                <li>{t('priceAnalysis.description.sd.point1')}</li>
                <li>{t('priceAnalysis.description.sd.point2')}</li>
                <li>{t('priceAnalysis.description.sd.point3')}</li>
                <li>{t('priceAnalysis.description.sd.point4')}</li>
              </ul>
            </div>
          )}

          {activeDescriptionTab === 'ulband' && (
            <div className="tab-content-ulband">
              <h3>{t('priceAnalysis.description.ulband.title')}</h3>
              <ul className="description-list">
                <li>{t('priceAnalysis.description.ulband.point1')}</li>
                <li>{t('priceAnalysis.description.ulband.point2')}</li>
                <li>{t('priceAnalysis.description.ulband.point3')}</li>
              </ul>
            </div>
          )}

          {activeDescriptionTab === 'tips' && (
            <div className="tab-content-tips">
              <h3>{t('priceAnalysis.description.tips.title')}</h3>
              <ul className="description-list">
                <li>{t('priceAnalysis.description.tips.point1')}</li>
                <li>{t('priceAnalysis.description.tips.point2')}</li>
                <li>{t('priceAnalysis.description.tips.point3')}</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(PriceAnalysisDescriptionTabs);
