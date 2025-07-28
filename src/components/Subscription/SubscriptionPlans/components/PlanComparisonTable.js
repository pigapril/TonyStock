import React, { useState, useMemo, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { withCache, optimisticUpdate } from '../../../../services/subscriptionCache';
import './PlanComparisonTable.css';

const PlanComparisonTable = ({ plans, currentPlan, onSelectPlan }) => {
  const { t } = useTranslation();
  const [highlightedPlan, setHighlightedPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Memoized feature definitions for better performance
  const features = useMemo(() => [
    {
      key: 'api_calls',
      category: 'api',
      name: t('subscription.features.api_calls'),
      description: t('subscription.features.api_calls_desc'),
      icon: '🔌'
    },
    {
      key: 'price_analysis',
      category: 'analysis',
      name: t('subscription.features.price_analysis'),
      description: t('subscription.features.price_analysis_desc'),
      icon: '📊'
    },
    {
      key: 'news_access',
      category: 'data',
      name: t('subscription.features.news_access'),
      description: t('subscription.features.news_access_desc'),
      icon: '📰'
    },
    {
      key: 'search_queries',
      category: 'search',
      name: t('subscription.features.search_queries'),
      description: t('subscription.features.search_queries_desc'),
      icon: '🔍'
    },
    {
      key: 'watchlist_categories',
      category: 'watchlist',
      name: t('subscription.features.watchlist_categories'),
      description: t('subscription.features.watchlist_categories_desc'),
      icon: '📋'
    },
    {
      key: 'stocks_per_category',
      category: 'watchlist',
      name: t('subscription.features.stocks_per_category'),
      description: t('subscription.features.stocks_per_category_desc'),
      icon: '📈'
    },
    {
      key: 'real_time_data',
      category: 'premium',
      name: t('subscription.features.real_time_data'),
      description: t('subscription.features.real_time_data_desc'),
      icon: '⚡'
    },
    {
      key: 'advanced_analytics',
      category: 'premium',
      name: t('subscription.features.advanced_analytics'),
      description: t('subscription.features.advanced_analytics_desc'),
      icon: '🧮'
    },
    {
      key: 'priority_support',
      category: 'support',
      name: t('subscription.features.priority_support'),
      description: t('subscription.features.priority_support_desc'),
      icon: '🎧'
    },
    {
      key: 'api_rate_limit',
      category: 'technical',
      name: t('subscription.features.api_rate_limit'),
      description: t('subscription.features.api_rate_limit_desc'),
      icon: '⏱️'
    }
  ], [t]);

  // Memoized feature value getter
  const getFeatureValue = useMemo(() => (plan, featureKey) => {
    const planData = plans.find(p => p.id === plan.id);
    if (!planData) return '-';

    switch (featureKey) {
      case 'api_calls':
        return planData.limits?.api?.daily === -1 
          ? t('subscription.unlimited') 
          : `${planData.limits?.api?.daily?.toLocaleString() || 0}/${t('subscription.day')}`;
      
      case 'price_analysis':
        return planData.limits?.priceAnalysis?.daily === -1 
          ? t('subscription.unlimited') 
          : `${planData.limits?.priceAnalysis?.daily || 0}/${t('subscription.day')}`;
      
      case 'news_access':
        return planData.limits?.news?.daily === -1 
          ? t('subscription.unlimited') 
          : `${planData.limits?.news?.daily || 0}/${t('subscription.day')}`;
      
      case 'search_queries':
        return planData.limits?.search?.daily === -1 
          ? t('subscription.unlimited') 
          : `${planData.limits?.search?.daily || 0}/${t('subscription.day')}`;
      
      case 'watchlist_categories':
        return planData.extendedFeatures?.watchlist?.maxCategories === -1 
          ? t('subscription.unlimited') 
          : planData.extendedFeatures?.watchlist?.maxCategories || 0;
      
      case 'stocks_per_category':
        return planData.extendedFeatures?.watchlist?.maxStocksPerCategory === -1 
          ? t('subscription.unlimited') 
          : planData.extendedFeatures?.watchlist?.maxStocksPerCategory || 0;
      
      case 'real_time_data':
        return planData.extendedFeatures?.realTimeData ? '✅' : '❌';
      
      case 'advanced_analytics':
        return planData.extendedFeatures?.advancedAnalytics ? '✅' : '❌';
      
      case 'priority_support':
        return planData.extendedFeatures?.prioritySupport ? '✅' : '❌';
      
      case 'api_rate_limit':
        return planData.extendedFeatures?.apiRateLimit || t('subscription.standard');
      
      default:
        return '-';
    }
  }, [plans, t]);

  // Optimistic plan selection with rollback
  const handlePlanSelect = async (plan) => {
    setIsLoading(true);
    
    // Optimistic update
    const rollback = optimisticUpdate(
      'currentPlan', 
      'userPlan', 
      () => plan.id, 
      currentPlan
    );

    try {
      await onSelectPlan(plan);
    } catch (error) {
      // Rollback on error
      rollback();
      console.error('Failed to select plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Memoized grouped features for performance
  const groupedFeatures = useMemo(() => {
    return features.reduce((acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    }, {});
  }, [features]);

  const categoryNames = useMemo(() => ({
    api: t('subscription.categories.api'),
    analysis: t('subscription.categories.analysis'),
    data: t('subscription.categories.data'),
    search: t('subscription.categories.search'),
    watchlist: t('subscription.categories.watchlist'),
    premium: t('subscription.categories.premium'),
    support: t('subscription.categories.support'),
    technical: t('subscription.categories.technical')
  }), [t]);

  return (
    <div className="plan-comparison-table">
      <div className="comparison-header">
        <h3>{t('subscription.compare_plans')}</h3>
        <p className="comparison-subtitle">
          {t('subscription.compare_plans_subtitle')}
        </p>
      </div>

      <div className="comparison-table-container">
        <table className="comparison-table">
          <thead>
            <tr>
              <th className="feature-header">{t('subscription.features')}</th>
              {plans.map(plan => (
                <th 
                  key={plan.id}
                  className={`plan-header ${plan.id === currentPlan ? 'current' : ''} ${highlightedPlan === plan.id ? 'highlighted' : ''}`}
                  onMouseEnter={() => setHighlightedPlan(plan.id)}
                  onMouseLeave={() => setHighlightedPlan(null)}
                >
                  <div className="plan-header-content">
                    <div className="plan-name">{plan.name}</div>
                    <div className="plan-price">
                      {plan.price === 0 ? (
                        <span className="free-badge">{t('subscription.free')}</span>
                      ) : (
                        <>
                          <span className="price-amount">${plan.price}</span>
                          <span className="price-period">/{t('subscription.month')}</span>
                        </>
                      )}
                    </div>
                    {plan.id === currentPlan && (
                      <div className="current-plan-badge">
                        {t('subscription.current_plan')}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
              <React.Fragment key={category}>
                <tr className="category-row">
                  <td className="category-header" colSpan={plans.length + 1}>
                    {categoryNames[category]}
                  </td>
                </tr>
                {categoryFeatures.map(feature => (
                  <tr key={feature.key} className="feature-row">
                    <td className="feature-cell">
                      <div className="feature-info">
                        <span className="feature-icon">{feature.icon}</span>
                        <div className="feature-details">
                          <div className="feature-name">{feature.name}</div>
                          <div className="feature-description">{feature.description}</div>
                        </div>
                      </div>
                    </td>
                    {plans.map(plan => (
                      <td 
                        key={`${plan.id}-${feature.key}`}
                        className={`comparison-cell ${plan.id === currentPlan ? 'current-plan' : ''} ${highlightedPlan === plan.id ? 'highlighted' : ''}`}
                        onMouseEnter={() => setHighlightedPlan(plan.id)}
                        onMouseLeave={() => setHighlightedPlan(null)}
                      >
                        <div className="feature-value">
                          {getFeatureValue(plan, feature.key)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="comparison-actions">
        <div className="action-buttons">
          {plans.map(plan => (
            plan.id !== currentPlan && (
              <button
                key={plan.id}
                className={`upgrade-button ${plan.id === highlightedPlan ? 'highlighted' : ''} ${isLoading ? 'loading' : ''}`}
                onClick={() => handlePlanSelect(plan)}
                onMouseEnter={() => setHighlightedPlan(plan.id)}
                onMouseLeave={() => setHighlightedPlan(null)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  plan.price > (plans.find(p => p.id === currentPlan)?.price || 0) 
                    ? t('subscription.upgrade_to', { plan: plan.name })
                    : t('subscription.switch_to', { plan: plan.name })
                )}
              </button>
            )
          ))}
        </div>
        
        <div className="comparison-notes">
          <p className="note">
            <span className="note-icon">💡</span>
            {t('subscription.comparison_note')}
          </p>
          <p className="note">
            <span className="note-icon">🔄</span>
            {t('subscription.change_anytime')}
          </p>
        </div>
      </div>
    </div>
  );
};

// Wrap with cache for better performance
export default React.memo(PlanComparisonTable);