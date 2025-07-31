import React from 'react';
import { useTranslation } from 'react-i18next';
import './PlanComparison.css';

export const PlanComparison = ({ plans }) => {
  const { t } = useTranslation();

  const features = [
    {
      key: 'lohasSpectrum',
      name: t('subscription.features.lohasSpectrum'),
      description: t('subscription.features.lohasSpectrumDesc')
    },
    {
      key: 'marketSentiment',
      name: t('subscription.features.marketSentiment'),
      description: t('subscription.features.marketSentimentDesc')
    },
    {
      key: 'watchlist',
      name: t('subscription.features.watchlist'),
      description: t('subscription.features.watchlistDesc')
    },
    {
      key: 'ads',
      name: t('subscription.features.ads'),
      description: t('subscription.features.adsDesc')
    }
  ];

  const getFeatureValue = (plan, featureKey) => {
    const feature = plan.features[featureKey];
    
    if (featureKey === 'ads') {
      return feature ? '✓' : '✗';
    }
    
    if (!feature || feature.limit === 0) {
      return '✗';
    }
    
    if (feature.limit === -1) {
      return t('subscription.usage.unlimited');
    }
    
    return feature.limit.toString();
  };

  const getFeatureDescription = (plan, featureKey) => {
    const feature = plan.features[featureKey];
    return feature?.description || '';
  };

  return (
    <div className="plan-comparison">
      <div className="plan-comparison__header">
        <h2 className="plan-comparison__title">
          {t('subscription.comparison.title')}
        </h2>
        <p className="plan-comparison__subtitle">
          {t('subscription.comparison.subtitle')}
        </p>
      </div>

      <div className="plan-comparison__table">
        <div className="plan-comparison__table-header">
          <div className="plan-comparison__feature-header">
            {t('subscription.comparison.features')}
          </div>
          {plans.map(plan => (
            <div key={plan.id} className="plan-comparison__plan-header">
              <h3 className="plan-comparison__plan-name">{plan.name}</h3>
              <div className="plan-comparison__plan-price">
                {plan.price.monthly === 0 
                  ? t('subscription.subscriptionPlans.freePlan.price')
                  : `NT$${plan.price.monthly}/月`
                }
              </div>
            </div>
          ))}
        </div>

        <div className="plan-comparison__table-body">
          {features.map(feature => (
            <div key={feature.key} className="plan-comparison__row">
              <div className="plan-comparison__feature-cell">
                <div className="plan-comparison__feature-name">
                  {feature.name}
                </div>
                <div className="plan-comparison__feature-description">
                  {feature.description}
                </div>
              </div>
              {plans.map(plan => (
                <div key={plan.id} className="plan-comparison__value-cell">
                  <div className="plan-comparison__value">
                    {getFeatureValue(plan, feature.key)}
                  </div>
                  <div className="plan-comparison__value-description">
                    {getFeatureDescription(plan, feature.key)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};