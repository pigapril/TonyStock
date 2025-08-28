import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './DataRestrictionTutorial.css';

const DataRestrictionTutorial = ({ onClose, onUpgradeClick }) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 延遲顯示動畫
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleUpgrade = () => {
    setIsVisible(false);
    setTimeout(() => {
      onUpgradeClick();
    }, 300);
  };

  return (
    <div className={`data-restriction-tutorial-overlay ${isVisible ? 'visible' : ''}`}>
      <div className="tutorial-backdrop" onClick={handleClose} />
      
      <div className={`tutorial-content ${isVisible ? 'visible' : ''}`}>
        {/* 指向箭頭 */}
        <div className="tutorial-arrow" />
        
        {/* 主要內容 */}
        <div className="tutorial-card">
          <div className="tutorial-header">
            <div className="tutorial-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" 
                  fill="currentColor"
                />
              </svg>
            </div>
            <h3 className="tutorial-title">
              {t('marketSentiment.tutorial.title')}
            </h3>
            <button className="tutorial-close" onClick={handleClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          
          <div className="tutorial-body">
            <p className="tutorial-message">
              {t('marketSentiment.tutorial.historicalMessage')}
            </p>
            <p className="tutorial-submessage">
              {t('marketSentiment.tutorial.upgradeMessage')}
            </p>
          </div>
          
          <div className="tutorial-actions">
            <button className="tutorial-btn tutorial-btn-secondary" onClick={handleClose}>
              {t('marketSentiment.tutorial.gotIt')}
            </button>
            <button className="tutorial-btn tutorial-btn-primary" onClick={handleUpgrade}>
              {t('marketSentiment.tutorial.upgradeCTA')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataRestrictionTutorial;