import React from 'react';
import { useTranslation } from 'react-i18next';
import './RestrictedCompositionView.css';

const RestrictedCompositionView = ({ onUpgradeClick }) => {
    const { t } = useTranslation();

    // 添加圖片載入測試
    const handleImageLoad = () => {
        console.log('RestrictedCompositionView: Image loaded successfully');
    };

    const handleImageError = () => {
        console.error('RestrictedCompositionView: Image failed to load');
    };

    return (
        <div className="restricted-composition-container">
            {/* 功能截圖背景 */}
            <div className="composition-feature-screenshot-background">
                <img 
                    src="/images/market-sentiment/composition-feature.png" 
                    alt="Composition Feature"
                    className="composition-screenshot-image"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                />
            </div>
            
            <div className="composition-restriction-overlay">
                <div className="composition-restriction-content">
                    <div className="composition-lock-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                            <path 
                                d="M12 2C13.1 2 14 2.9 14 4V6H16C17.1 6 18 6.9 18 8V20C18 21.1 17.1 22 16 22H8C6.9 22 6 21.1 6 20V8C6 6.9 6.9 6 8 6H10V4C10 2.9 10.9 2 12 2ZM12 4C11.4 4 11 4.4 11 5V6H13V5C13 4.4 12.6 4 12 4ZM12 13C13.1 13 14 13.9 14 15S13.1 17 12 17 10 16.1 10 15 10.9 13 12 13Z" 
                                fill="currentColor"
                            />
                        </svg>
                    </div>
                    
                    <h3 className="composition-restriction-title">
                        {t('marketSentiment.restricted.compositionTitle')}
                    </h3>
                    
                    <p className="composition-restriction-description">
                        {t('marketSentiment.restricted.compositionDescription')}
                    </p>
                    

                    
                    <button 
                        className="composition-upgrade-button"
                        onClick={onUpgradeClick}
                    >
                        <span className="button-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path 
                                    d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" 
                                    fill="currentColor"
                                />
                            </svg>
                        </span>
                        {t('marketSentiment.restricted.unlockButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RestrictedCompositionView;