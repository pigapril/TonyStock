import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { PlanBadge } from '../../shared/PlanBadge';
import { AppleButton } from '../../shared/AppleButton';
import './PlanInfo.css';

export const PlanInfo = ({ plan, loading }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lang } = useParams();

  const handleUpgrade = () => {
    navigate(`/${lang}/subscription-plans`);
  };

  if (loading) {
    return (
      <div className="plan-info plan-info--loading">
        <div className="plan-info__skeleton">
          <div className="plan-info__skeleton-badge" />
          <div className="plan-info__skeleton-text" />
          <div className="plan-info__skeleton-text plan-info__skeleton-text--short" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="plan-info plan-info--error">
        <p>{t('subscription.userAccount.planLoadError')}</p>
      </div>
    );
  }

  const formatDate = (date) => {
    if (!date) return null;
    return new Intl.DateTimeFormat(lang === 'zh-TW' ? 'zh-TW' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="plan-info">
      <div className="plan-info__main">
        <PlanBadge plan={plan.type} size="large" />
        
        <div className="plan-info__details">
          {plan.startDate && (
            <div className="plan-info__date">
              <span className="plan-info__date-label">
                {t('subscription.history.startDate')}:
              </span>
              <span className="plan-info__date-value">
                {formatDate(plan.startDate)}
              </span>
            </div>
          )}
          
          {plan.endDate && (
            <div className="plan-info__date">
              <span className="plan-info__date-label">
                {plan.status === 'active' 
                  ? t('subscription.history.renewalDate')
                  : t('subscription.history.endDate')
                }:
              </span>
              <span className="plan-info__date-value">
                {formatDate(plan.endDate)}
              </span>
            </div>
          )}
          
          {plan.autoRenew && plan.type !== 'free' && (
            <div className="plan-info__auto-renew">
              <span className="plan-info__auto-renew-icon">🔄</span>
              <span className="plan-info__auto-renew-text">
                {t('subscription.autoRenewEnabled')}
              </span>
            </div>
          )}
        </div>
        
        {plan.type === 'free' && (
          <div className="plan-info__action">
            <AppleButton 
              variant="primary" 
              onClick={handleUpgrade}
              className="plan-info__upgrade-button"
            >
              {t('subscription.subscriptionPlans.upgrade')}
            </AppleButton>
          </div>
        )}
      </div>
    </div>
  );
};