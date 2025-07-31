import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UsageProgressBar } from '../../shared/UsageProgressBar';
import './UsageStats.css';

export const UsageStats = ({ stats, loading }) => {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  if (loading) {
    return (
      <div className="usage-stats usage-stats--loading">
        <div className="usage-stats__skeleton">
          {[1, 2, 3].map(i => (
            <div key={i} className="usage-stats__skeleton-item">
              <div className="usage-stats__skeleton-label" />
              <div className="usage-stats__skeleton-bar" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="usage-stats usage-stats--error">
        <p>{t('subscription.userAccount.statsLoadError')}</p>
      </div>
    );
  }

  const currentStats = stats[selectedPeriod] || {};
  
  const formatResetTime = (resetTime) => {
    if (!resetTime) return '';
    
    const now = new Date();
    const reset = new Date(resetTime);
    const diffMs = reset.getTime() - now.getTime();
    
    if (diffMs <= 0) return t('subscription.usage.resetNow');
    
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 24) {
      return t('subscription.usage.resetInHours', { hours: diffHours });
    } else {
      return t('subscription.usage.resetInDays', { days: diffDays });
    }
  };

  const featureConfigs = [
    {
      key: 'lohasSpectrum',
      label: t('subscription.features.lohasSpectrum'),
      icon: '📈',
      description: t('subscription.features.lohasSpectrumDesc')
    },
    {
      key: 'marketSentiment',
      label: t('subscription.features.marketSentiment'),
      icon: '💭',
      description: t('subscription.features.marketSentimentDesc')
    },
    {
      key: 'watchlist',
      label: t('subscription.features.watchlist'),
      icon: '📋',
      description: t('subscription.features.watchlistDesc')
    }
  ];

  return (
    <div className="usage-stats">
      {/* Period Selector */}
      <div className="usage-stats__header">
        <div className="usage-stats__period-selector">
          <button
            className={`usage-stats__period-button ${
              selectedPeriod === 'daily' ? 'usage-stats__period-button--active' : ''
            }`}
            onClick={() => setSelectedPeriod('daily')}
          >
            {t('subscription.usage.daily')}
          </button>
          <button
            className={`usage-stats__period-button ${
              selectedPeriod === 'monthly' ? 'usage-stats__period-button--active' : ''
            }`}
            onClick={() => setSelectedPeriod('monthly')}
          >
            {t('subscription.usage.monthly')}
          </button>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="usage-stats__content">
        {featureConfigs.map(({ key, label, icon, description }) => {
          const featureStats = currentStats[key];
          
          if (!featureStats) {
            return (
              <div key={key} className="usage-stats__item usage-stats__item--unavailable">
                <div className="usage-stats__item-header">
                  <div className="usage-stats__item-icon">{icon}</div>
                  <div className="usage-stats__item-info">
                    <h4 className="usage-stats__item-title">{label}</h4>
                    <p className="usage-stats__item-description">
                      {t('subscription.features.unavailable')}
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={key} className="usage-stats__item">
              <div className="usage-stats__item-header">
                <div className="usage-stats__item-icon">{icon}</div>
                <div className="usage-stats__item-info">
                  <h4 className="usage-stats__item-title">{label}</h4>
                  <p className="usage-stats__item-description">{description}</p>
                </div>
              </div>
              
              <div className="usage-stats__item-progress">
                <UsageProgressBar
                  used={featureStats.used}
                  limit={featureStats.limit}
                  showPercentage={featureStats.limit > 0}
                  showNumbers={true}
                  size="medium"
                />
              </div>
              
              {featureStats.resetTime && (
                <div className="usage-stats__item-reset">
                  <span className="usage-stats__reset-label">
                    {t('subscription.usage.nextReset')}:
                  </span>
                  <span className="usage-stats__reset-time">
                    {formatResetTime(featureStats.resetTime)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="usage-stats__summary">
        <div className="usage-stats__summary-item">
          <span className="usage-stats__summary-label">
            {t('subscription.usage.totalUsed')}:
          </span>
          <span className="usage-stats__summary-value">
            {Object.values(currentStats).reduce((total, stat) => total + (stat?.used || 0), 0)}
          </span>
        </div>
        
        <div className="usage-stats__summary-item">
          <span className="usage-stats__summary-label">
            {t('subscription.usage.period')}:
          </span>
          <span className="usage-stats__summary-value">
            {t(`subscription.usage.${selectedPeriod}`)}
          </span>
        </div>
      </div>
    </div>
  );
};