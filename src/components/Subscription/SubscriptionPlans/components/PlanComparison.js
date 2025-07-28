import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlanBadge } from '../../shared/PlanBadge';
import './PlanComparison.css';

// Tooltip component
const Tooltip = ({ children, content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="tooltip-container"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="tooltip-content">
          {content}
        </div>
      )}
    </div>
  );
};

export const PlanComparison = ({ plans }) => {
  const { t } = useTranslation();

  // Feature explanations for tooltips
  const featureExplanations = {
    apiCalls: t('planComparison.tooltips.apiCalls', 'Number of API requests you can make per day for data retrieval'),
    priceAnalysis: t('planComparison.tooltips.priceAnalysis', 'Daily limit for price trend analysis using our LOHAS Five-Line system'),
    watchlistCategories: t('planComparison.tooltips.watchlistCategories', 'Number of custom categories you can create to organize your watchlist'),
    newsAccess: t('planComparison.tooltips.newsAccess', 'Access to market news and updates'),
    advancedAnalytics: t('planComparison.tooltips.advancedAnalytics', 'Advanced charting tools and technical indicators'),
    dataExport: t('planComparison.tooltips.dataExport', 'Ability to export your analysis data and reports'),
    apiAccess: t('planComparison.tooltips.apiAccess', 'Direct API access for third-party integrations'),
    customReporting: t('planComparison.tooltips.customReporting', 'Create custom reports and dashboards'),
    adFree: t('planComparison.tooltips.adFree', 'Remove all advertisements from the platform'),
    communitySupport: t('planComparison.tooltips.communitySupport', 'Access to community forums and user guides'),
    emailSupport: t('planComparison.tooltips.emailSupport', 'Priority email support with faster response times'),
    phoneSupport: t('planComparison.tooltips.phoneSupport', 'Direct phone and live chat support')
  };

  // Define all features for comparison
  const comparisonFeatures = [
    {
      category: t('planComparison.categories.usage', 'Usage Limits'),
      features: [
        {
          key: 'apiCalls',
          label: t('planComparison.features.apiCalls', 'API Calls per Day'),
          free: '1,000',
          pro: '10,000',
          ultra: t('planComparison.unlimited', 'Unlimited')
        },
        {
          key: 'priceAnalysis',
          label: t('planComparison.features.priceAnalysis', 'Price Analyses per Day'),
          free: '10',
          pro: '100',
          ultra: t('planComparison.unlimited', 'Unlimited')
        },
        {
          key: 'watchlistCategories',
          label: t('planComparison.features.watchlistCategories', 'Watchlist Categories'),
          free: '5',
          pro: '20',
          ultra: '100'
        },
        {
          key: 'newsAccess',
          label: t('planComparison.features.newsAccess', 'News & Market Updates'),
          free: t('planComparison.limited', 'Limited'),
          pro: t('planComparison.full', 'Full Access'),
          ultra: t('planComparison.full', 'Full Access')
        }
      ]
    },
    {
      category: t('planComparison.categories.features', 'Features'),
      features: [
        {
          key: 'advancedAnalytics',
          label: t('planComparison.features.advancedAnalytics', 'Advanced Analytics Tools'),
          free: false,
          pro: true,
          ultra: true
        },
        {
          key: 'dataExport',
          label: t('planComparison.features.dataExport', 'Data Export'),
          free: false,
          pro: t('planComparison.limited', 'Limited'),
          ultra: t('planComparison.unlimited', 'Unlimited')
        },
        {
          key: 'apiAccess',
          label: t('planComparison.features.apiAccess', 'API Access for Integrations'),
          free: false,
          pro: false,
          ultra: true
        },
        {
          key: 'customReporting',
          label: t('planComparison.features.customReporting', 'Custom Reporting'),
          free: false,
          pro: false,
          ultra: true
        },
        {
          key: 'adFree',
          label: t('planComparison.features.adFree', 'Ad-Free Experience'),
          free: false,
          pro: true,
          ultra: true
        }
      ]
    },
    {
      category: t('planComparison.categories.support', 'Support'),
      features: [
        {
          key: 'communitySupport',
          label: t('planComparison.features.communitySupport', 'Community Support'),
          free: true,
          pro: true,
          ultra: true
        },
        {
          key: 'emailSupport',
          label: t('planComparison.features.emailSupport', 'Priority Email Support'),
          free: false,
          pro: true,
          ultra: true
        },
        {
          key: 'phoneSupport',
          label: t('planComparison.features.phoneSupport', 'Phone & Chat Support'),
          free: false,
          pro: false,
          ultra: true
        }
      ]
    }
  ];

  const renderFeatureValue = (value, planType) => {
    if (typeof value === 'boolean') {
      return value ? (
        <svg className="plan-comparison__check-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="10" fill="#34C759"/>
          <path d="M8 10.5L9 11.5L12.5 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg className="plan-comparison__cross-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="10" fill="#FF3B30"/>
          <path d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    }
    
    return (
      <span className={`plan-comparison__feature-value plan-comparison__feature-value--${planType}`}>
        {value}
      </span>
    );
  };

  const getCurrentPlanType = () => {
    const currentPlan = plans.find(plan => plan.current);
    return currentPlan ? currentPlan.id : null;
  };

  const currentPlanType = getCurrentPlanType();

  return (
    <div className="plan-comparison">
      <div className="plan-comparison__header">
        <h2 className="plan-comparison__title">
          {t('planComparison.title', 'Compare All Plans')}
        </h2>
        <p className="plan-comparison__subtitle">
          {t('planComparison.subtitle', 'Choose the plan that best fits your trading and analysis needs')}
        </p>
      </div>

      <div className="plan-comparison__table-container">
        <table className="plan-comparison__table">
          <thead>
            <tr className="plan-comparison__header-row">
              <th className="plan-comparison__feature-header">
                {t('planComparison.features', 'Features')}
              </th>
              <th className="plan-comparison__plan-header">
                <div className="plan-comparison__plan-info">
                  <PlanBadge plan="free" size="small" />
                  <div className="plan-comparison__plan-details">
                    <span className="plan-comparison__plan-name">
                      {t('subscription.plans.free', 'Free')}
                    </span>
                    <span className="plan-comparison__plan-price">
                      {t('planComparison.freePrice', '$0')}
                    </span>
                  </div>
                  {currentPlanType === 'free' && (
                    <span className="plan-comparison__current-badge">
                      {t('planComparison.current', 'Current')}
                    </span>
                  )}
                </div>
              </th>
              <th className="plan-comparison__plan-header plan-comparison__plan-header--popular">
                <div className="plan-comparison__plan-info">
                  <PlanBadge plan="pro" size="small" />
                  <div className="plan-comparison__plan-details">
                    <span className="plan-comparison__plan-name">
                      {t('subscription.plans.pro', 'Pro')}
                    </span>
                    <span className="plan-comparison__plan-price">
                      NT$299<span className="plan-comparison__plan-period">/月</span>
                    </span>
                  </div>
                  {currentPlanType === 'pro' && (
                    <span className="plan-comparison__current-badge">
                      {t('planComparison.current', 'Current')}
                    </span>
                  )}
                </div>
                <div className="plan-comparison__popular-badge">
                  {t('planComparison.popular', 'Most Popular')}
                </div>
              </th>
              <th className="plan-comparison__plan-header">
                <div className="plan-comparison__plan-info">
                  <PlanBadge plan="ultra" size="small" />
                  <div className="plan-comparison__plan-details">
                    <span className="plan-comparison__plan-name">
                      {t('subscription.plans.ultra', 'Ultra')}
                    </span>
                    <span className="plan-comparison__plan-price">
                      NT$599<span className="plan-comparison__plan-period">/月</span>
                    </span>
                  </div>
                  {currentPlanType === 'ultra' && (
                    <span className="plan-comparison__current-badge">
                      {t('planComparison.current', 'Current')}
                    </span>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisonFeatures.map((category, categoryIndex) => (
              <React.Fragment key={categoryIndex}>
                <tr className="plan-comparison__category-row">
                  <td className="plan-comparison__category-header" colSpan="4">
                    {category.category}
                  </td>
                </tr>
                {category.features.map((feature, featureIndex) => (
                  <tr key={featureIndex} className="plan-comparison__feature-row">
                    <td className="plan-comparison__feature-name">
                      <Tooltip content={featureExplanations[feature.key]}>
                        <span className="plan-comparison__feature-label">
                          {feature.label}
                          <svg className="plan-comparison__info-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="6.5" stroke="#86868B" strokeWidth="1"/>
                            <path d="M7 6v3M7 4.5h.01" stroke="#86868B" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </span>
                      </Tooltip>
                    </td>
                    <td className="plan-comparison__feature-cell">
                      {renderFeatureValue(feature.free, 'free')}
                    </td>
                    <td className="plan-comparison__feature-cell plan-comparison__feature-cell--popular">
                      {renderFeatureValue(feature.pro, 'pro')}
                    </td>
                    <td className="plan-comparison__feature-cell">
                      {renderFeatureValue(feature.ultra, 'ultra')}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="plan-comparison__mobile-cards">
        {plans.map((plan) => (
          <div key={plan.id} className={`plan-comparison__mobile-card ${plan.popular ? 'plan-comparison__mobile-card--popular' : ''}`}>
            <div className="plan-comparison__mobile-header">
              <PlanBadge plan={plan.id} size="medium" />
              <div className="plan-comparison__mobile-plan-info">
                <h3 className="plan-comparison__mobile-plan-name">{plan.name}</h3>
                <div className="plan-comparison__mobile-plan-price">
                  {plan.price === 0 ? t('planComparison.freePrice', '$0') : `NT$${plan.price}/月`}
                </div>
              </div>
              {plan.current && (
                <span className="plan-comparison__current-badge">
                  {t('planComparison.current', 'Current')}
                </span>
              )}
            </div>
            
            {comparisonFeatures.map((category, categoryIndex) => (
              <div key={categoryIndex} className="plan-comparison__mobile-category">
                <h4 className="plan-comparison__mobile-category-title">{category.category}</h4>
                <ul className="plan-comparison__mobile-feature-list">
                  {category.features.map((feature, featureIndex) => {
                    const value = feature[plan.id];
                    return (
                      <li key={featureIndex} className="plan-comparison__mobile-feature-item">
                        <span className="plan-comparison__mobile-feature-name">{feature.label}</span>
                        <span className="plan-comparison__mobile-feature-value">
                          {renderFeatureValue(value, plan.id)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};