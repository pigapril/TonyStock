import React from 'react';
import { useTranslation } from 'react-i18next';
import './DataRestrictionNotice.css';

const DataRestrictionNotice = ({ onUpgradeClick, className = '' }) => {
  const { t } = useTranslation();

  return (
    <div className={`data-restriction-notice ${className}`}>
      <div className="restriction-content">
        <div className="restriction-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" 
              fill="currentColor"
            />
          </svg>
        </div>
        <div className="restriction-text">
          <div className="restriction-message">
            {t('marketSentiment.dataRestriction.historicalOnly')}
          </div>
          <button 
            className="upgrade-link"
            onClick={onUpgradeClick}
          >
            {t('marketSentiment.dataRestriction.upgradeForLatest')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataRestrictionNotice;