import React from 'react';
import { useTranslation } from 'react-i18next';
import './RestrictedMarketSentimentGauge.css';

const RestrictedMarketSentimentGauge = ({ onUpgradeClick }) => {
    const { t } = useTranslation();

    // 添加圖片載入測試
    const handleImageLoad = () => {
        console.log('RestrictedMarketSentimentGauge: Image loaded successfully');
    };

    const handleImageError = () => {
        console.error('RestrictedMarketSentimentGauge: Image failed to load');
    };

    return (
        <div className="restricted-gauge-container">
            {/* 功能截圖背景 */}
            <div className="feature-screenshot-background">
                <img
                    src="/images/market-sentiment/sentiment-gauge-feature.png"
                    alt="Sentiment Gauge Feature"
                    className="screenshot-image"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                />
            </div>

            <div className="restriction-overlay">
                <div className="restriction-content">
                    <div className="lock-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" />
                        </svg>
                    </div>

                    <h3 className="restriction-title">
                        {t('marketSentiment.restricted.gaugeTitle')}
                    </h3>

                    <p className="restriction-description">
                        {t('marketSentiment.restricted.gaugeDescription')}
                    </p>

                    <button
                        className="upgrade-cta-button"
                        onClick={onUpgradeClick}
                    >
                        {t('marketSentiment.restricted.upgradeButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RestrictedMarketSentimentGauge;