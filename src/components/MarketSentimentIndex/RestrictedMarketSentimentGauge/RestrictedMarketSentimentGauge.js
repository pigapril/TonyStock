import React from 'react';
import { useTranslation } from 'react-i18next';
import './RestrictedMarketSentimentGauge.css';

const RestrictedMarketSentimentGauge = ({ onUpgradeClick }) => {
    const { t } = useTranslation();

    return (
        <div className="restricted-gauge-container">
            <div className="gauge-blur-overlay">
                {/* 功能截圖背景 */}
                <div className="feature-screenshot-background">
                    <img 
                        src="/images/market-sentiment/sentiment-gauge-feature.svg" 
                        alt="Sentiment Gauge Feature"
                        className="screenshot-image"
                    />
                </div>
                
                {/* 模糊的儀表盤背景 */}
                <div className="blurred-gauge">
                    <svg width="200" height="120" viewBox="0 0 200 120">
                        <defs>
                            <linearGradient id="restrictedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#ff4444" />
                                <stop offset="25%" stopColor="#ff8800" />
                                <stop offset="50%" stopColor="#ffdd00" />
                                <stop offset="75%" stopColor="#88dd00" />
                                <stop offset="100%" stopColor="#00dd44" />
                            </linearGradient>
                        </defs>
                        
                        {/* 儀表盤弧線 */}
                        <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            stroke="url(#restrictedGradient)"
                            strokeWidth="12"
                            fill="none"
                            opacity="0.3"
                        />
                        
                        {/* 模糊的指針 */}
                        <line
                            x1="100"
                            y1="100"
                            x2="140"
                            y2="60"
                            stroke="#666"
                            strokeWidth="3"
                            opacity="0.4"
                        />
                        
                        {/* 中心點 */}
                        <circle
                            cx="100"
                            cy="100"
                            r="6"
                            fill="#666"
                            opacity="0.4"
                        />
                    </svg>
                </div>
                
                {/* 模糊效果 */}
                <div className="blur-filter"></div>
            </div>
            
            <div className="restriction-overlay">
                <div className="restriction-content">
                    <div className="lock-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2"/>
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