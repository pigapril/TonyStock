import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../../context/SubscriptionContext';
import { UsageProgressBar } from '../../shared/UsageProgressBar';
import './UsageStats.css';

export const UsageStats = () => {
  const { t } = useTranslation();
  const { usageStats, loading } = useSubscription();
  const [activeTab, setActiveTab] = useState('daily');

  const formatResetTime = (resetTime) => {
    if (!resetTime) return '';
    const date = new Date(resetTime);
    const now = new Date();
    const diffHours = Math.ceil((date - now) / (1000 * 60 * 60));
    
    if (diffHours <= 24) {
      return t('usageStats.resetsInHours', 'Resets in {{hours}} hours', { hours: diffHours });
    } else {
      const diffDays = Math.ceil(diffHours / 24);
      return t('usageStats.resetsInDays', 'Resets in {{days}} days', { days: diffDays });
    }
  };

  const getFeatureDisplayName = (featureType) => {
    const featureNames = {
      api: t('usageStats.features.api', 'API Calls'),
      priceAnalysis: t('usageStats.features.priceAnalysis', 'Price Analysis'),
      news: t('usageStats.features.news', 'News Access'),
      search: t('usageStats.features.search', 'Search Queries')
    };
    return featureNames[featureType] || featureNames.api;
  };

  if (loading) {
    return (
      <div className="usage-stats">
        <div className="usage-stats__loading">
          <div className="usage-stats__loading-spinner" />
          <p>{t('usageStats.loading', 'Loading usage statistics...')}</p>
        </div>
      </div>
    );
  }

  if (!usageStats) {
    return (
      <div className="usage-stats">
        <div className="usage-stats__empty">
          <p>{t('usageStats.noData', 'No usage data available')}</p>
        </div>
      </div>
    );
  }

  const currentStats = usageStats[activeTab] || {};
  const featureTypes = ['api', 'priceAnalysis', 'news', 'search'];

  return (
    <div className="usage-stats">
      {/* Tab Navigation */}
      <div className="usage-stats__tabs">
        <button
          className={`usage-stats__tab ${activeTab === 'daily' ? 'usage-stats__tab--active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          {t('usageStats.daily', 'Daily')}
        </button>
        <button
          className={`usage-stats__tab ${activeTab === 'monthly' ? 'usage-stats__tab--active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          {t('usageStats.monthly', 'Monthly')}
        </button>
      </div>

      {/* Usage Progress Bars */}
      <div className="usage-stats__content">
        <div className="usage-stats__period-info">
          <h3 className="usage-stats__period-title">
            {activeTab === 'daily' 
              ? t('usageStats.dailyUsage', 'Daily Usage')
              : t('usageStats.monthlyUsage', 'Monthly Usage')
            }
          </h3>
          {currentStats.api && (
            <p className="usage-stats__reset-info">
              {formatResetTime(currentStats.api.resetTime)}
            </p>
          )}
        </div>

        <div className="usage-stats__progress-list">
          {featureTypes.map((featureType) => {
            const stats = currentStats[featureType];
            if (!stats) return null;

            return (
              <div key={featureType} className="usage-stats__progress-item">
                <UsageProgressBar
                  used={stats.used}
                  limit={stats.limit}
                  label={getFeatureDisplayName(featureType)}
                  size="medium"
                  showPercentage={true}
                  showNumbers={true}
                />
              </div>
            );
          })}
        </div>

        {/* Summary Card */}
        <div className="usage-stats__summary">
          <h4 className="usage-stats__summary-title">
            {t('usageStats.summary', 'Usage Summary')}
          </h4>
          <div className="usage-stats__summary-grid">
            {featureTypes.map((featureType) => {
              const stats = currentStats[featureType];
              if (!stats) return null;

              const percentage = stats.limit === -1 ? 0 : Math.round((stats.used / stats.limit) * 100);
              const isNearLimit = percentage >= 80 && stats.limit !== -1;
              const isOverLimit = percentage >= 100 && stats.limit !== -1;

              return (
                <div key={featureType} className="usage-stats__summary-item">
                  <div className="usage-stats__summary-header">
                    <span className="usage-stats__summary-label">
                      {getFeatureDisplayName(featureType)}
                    </span>
                    <span className={`usage-stats__summary-status ${
                      isOverLimit ? 'usage-stats__summary-status--over' :
                      isNearLimit ? 'usage-stats__summary-status--near' :
                      'usage-stats__summary-status--normal'
                    }`}>
                      {stats.limit === -1 
                        ? t('usageStats.unlimited', 'Unlimited')
                        : `${percentage}%`
                      }
                    </span>
                  </div>
                  <div className="usage-stats__summary-numbers">
                    {stats.used.toLocaleString()} 
                    {stats.limit !== -1 && ` / ${stats.limit.toLocaleString()}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};