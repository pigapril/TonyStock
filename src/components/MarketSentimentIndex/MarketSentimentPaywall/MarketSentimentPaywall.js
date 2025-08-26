import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Analytics } from '../../../utils/analytics';
import './MarketSentimentPaywall.css';

const MarketSentimentPaywall = ({ 
    isVisible, 
    onClose, 
    onUpgrade, 
    historicalData = [],
    showHistoricalChart = false 
}) => {
    const { t } = useTranslation();
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setIsAnimating(true);
            // 記錄 paywall 顯示事件
            Analytics.marketSentiment.paywallShown({
                trigger: 'marketSentimentAccess',
                feature: 'currentData'
            });
        }
    }, [isVisible]);

    const handleUpgradeClick = () => {
        Analytics.marketSentiment.paywallUpgradeClicked({
            source: 'marketSentimentPaywall'
        });
        onUpgrade();
    };

    const handleCloseClick = () => {
        Analytics.marketSentiment.paywallClosed({
            source: 'marketSentimentPaywall'
        });
        onClose();
    };

    if (!isVisible) return null;

    return (
        <div className={`market-sentiment-paywall-overlay ${isAnimating ? 'animate-in' : ''}`}>
            <div className="paywall-backdrop" onClick={handleCloseClick} />
            
            <div className="paywall-container">
                <div className="paywall-header">
                    <button 
                        className="paywall-close-button"
                        onClick={handleCloseClick}
                        aria-label={t('common.close')}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path 
                                d="M18 6L6 18M6 6L18 18" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </div>

                <div className="paywall-content">
                    <div className="paywall-hero">
                        <div className="paywall-icon">
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                <circle cx="32" cy="32" r="30" fill="url(#gradient1)" />
                                <path 
                                    d="M32 16v32M16 32h32" 
                                    stroke="white" 
                                    strokeWidth="3" 
                                    strokeLinecap="round"
                                />
                                <defs>
                                    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#9D00FF" />
                                        <stop offset="100%" stopColor="#C78F57" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        
                        <h2 className="paywall-title">
                            {t('marketSentiment.paywall.title')}
                        </h2>
                        
                        <p className="paywall-subtitle">
                            {t('marketSentiment.paywall.subtitle')}
                        </p>
                    </div>

                    {showHistoricalChart && historicalData.length > 0 && (
                        <div className="paywall-preview">
                            <div className="preview-chart-container">
                                <div className="preview-chart-header">
                                    <h3>{t('marketSentiment.paywall.historicalPerformance')}</h3>
                                    <span className="preview-chart-period">
                                        {t('marketSentiment.paywall.historicalPeriod')}
                                    </span>
                                </div>
                                
                                <div className="preview-chart">
                                    {/* 簡化的歷史圖表預覽 */}
                                    <svg width="100%" height="120" viewBox="0 0 300 120">
                                        <defs>
                                            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stopColor="rgba(157, 0, 255, 0.3)" />
                                                <stop offset="100%" stopColor="rgba(157, 0, 255, 0.05)" />
                                            </linearGradient>
                                        </defs>
                                        
                                        {/* 模擬歷史數據線 */}
                                        <path
                                            d="M10,80 Q50,60 90,70 T170,50 Q210,45 250,55 T290,40"
                                            stroke="#9D00FF"
                                            strokeWidth="2"
                                            fill="none"
                                        />
                                        
                                        {/* 填充區域 */}
                                        <path
                                            d="M10,80 Q50,60 90,70 T170,50 Q210,45 250,55 T290,40 L290,110 L10,110 Z"
                                            fill="url(#chartGradient)"
                                        />
                                        
                                        {/* 成功預測點標記 */}
                                        <circle cx="90" cy="70" r="4" fill="#00C851" />
                                        <circle cx="170" cy="50" r="4" fill="#00C851" />
                                        <circle cx="250" cy="55" r="4" fill="#00C851" />
                                    </svg>
                                </div>
                                
                                <div className="preview-annotations">
                                    <div className="annotation success">
                                        <span className="annotation-dot"></span>
                                        <span className="annotation-text">
                                            {t('marketSentiment.paywall.successfulPrediction')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="preview-gradient-overlay">
                                <div className="gradient-mask"></div>
                                <div className="restricted-content-message">
                                    <span>{t('marketSentiment.paywall.currentDataRestricted')}</span>
                                </div>
                            </div>
                        </div>
                    )}



                    <div className="paywall-cta">
                        <button 
                            className="upgrade-button primary"
                            onClick={handleUpgradeClick}
                        >
                            <span className="button-text">
                                {t('marketSentiment.paywall.upgradeButton')}
                            </span>
                            <span className="button-price">
                                {t('marketSentiment.paywall.priceLabel')}
                            </span>
                        </button>
                        
                        <p className="paywall-disclaimer">
                            {t('marketSentiment.paywall.disclaimer')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketSentimentPaywall;