import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../context/SubscriptionContext';
import { PlanBadge } from '../../shared/PlanBadge';
import { AppleButton } from '../../shared/AppleButton';
import './PlanInfo.css';

export const PlanInfo = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userPlan, loading } = useSubscription();

  const handleUpgrade = () => {
    const lang = document.documentElement.lang || 'zh-TW';
    navigate(`/${lang}/subscription-plans`);
  };

  const getPlanFeatures = (planType) => {
    const features = {
      free: [
        t('planInfo.features.free.api', '1,000 API calls per day'),
        t('planInfo.features.free.analysis', '10 price analyses per day'),
        t('planInfo.features.free.watchlist', '5 watchlist categories'),
        t('planInfo.features.free.support', 'Community support')
      ],
      pro: [
        t('planInfo.features.pro.api', '10,000 API calls per day'),
        t('planInfo.features.pro.analysis', '100 price analyses per day'),
        t('planInfo.features.pro.watchlist', '20 watchlist categories'),
        t('planInfo.features.pro.support', 'Priority support')
      ],
      ultra: [
        t('planInfo.features.ultra.api', 'Unlimited API calls'),
        t('planInfo.features.ultra.analysis', 'Unlimited price analyses'),
        t('planInfo.features.ultra.watchlist', '100 watchlist categories'),
        t('planInfo.features.ultra.support', 'Premium support')
      ]
    };
    return features[planType] || features.free;
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString(document.documentElement.lang || 'zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="plan-info">
        <div className="plan-info__loading">
          <div className="plan-info__loading-spinner" />
          <p>{t('planInfo.loading', 'Loading plan information...')}</p>
        </div>
      </div>
    );
  }

  const plan = userPlan || { type: 'free', status: 'active' };
  const features = getPlanFeatures(plan.type);

  return (
    <div className="plan-info">
      <div className="plan-info__header">
        <div className="plan-info__badge-section">
          <PlanBadge plan={plan.type} size="large" />
          <div className="plan-info__status">
            <span className={`plan-info__status-indicator plan-info__status-indicator--${plan.status}`} />
            <span className="plan-info__status-text">
              {t(`planInfo.status.${plan.status}`, plan.status)}
            </span>
          </div>
        </div>
        
        {plan.type !== 'ultra' && (
          <AppleButton
            variant="primary"
            size="medium"
            onClick={handleUpgrade}
            className="plan-info__upgrade-btn"
          >
            {plan.type === 'free' 
              ? t('planInfo.upgrade', 'Upgrade Plan')
              : t('planInfo.upgradeToUltra', 'Upgrade to Ultra')
            }
          </AppleButton>
        )}
      </div>

      <div className="plan-info__details">
        <div className="plan-info__features">
          <h3 className="plan-info__features-title">
            {t('planInfo.featuresTitle', 'Plan Features')}
          </h3>
          <ul className="plan-info__features-list">
            {features.map((feature, index) => (
              <li key={index} className="plan-info__feature-item">
                <svg className="plan-info__feature-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill="#34C759"/>
                  <path d="M6.5 8.5L7.5 9.5L10.5 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {plan.startDate && (
          <div className="plan-info__dates">
            <div className="plan-info__date-item">
              <span className="plan-info__date-label">
                {t('planInfo.startDate', 'Start Date')}
              </span>
              <span className="plan-info__date-value">
                {formatDate(plan.startDate)}
              </span>
            </div>
            
            {plan.endDate && (
              <div className="plan-info__date-item">
                <span className="plan-info__date-label">
                  {t('planInfo.endDate', 'End Date')}
                </span>
                <span className="plan-info__date-value">
                  {formatDate(plan.endDate)}
                </span>
              </div>
            )}
            
            {plan.autoRenew !== undefined && (
              <div className="plan-info__date-item">
                <span className="plan-info__date-label">
                  {t('planInfo.autoRenew', 'Auto Renew')}
                </span>
                <span className="plan-info__date-value">
                  {plan.autoRenew 
                    ? t('planInfo.enabled', 'Enabled')
                    : t('planInfo.disabled', 'Disabled')
                  }
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};