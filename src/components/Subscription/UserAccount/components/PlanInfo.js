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

  const planConfig = {
    free: {
      name: t('subscription.plans.free'),
      description: t('subscription.subscriptionPlans.freePlan.description'),
      features: t('subscription.subscriptionPlans.freePlan.features', { returnObjects: true }),
      color: 'gray'
    },
    pro: {
      name: t('subscription.plans.pro'),
      description: t('subscription.subscriptionPlans.proPlan.description'),
      features: t('subscription.subscriptionPlans.proPlan.features', { returnObjects: true }),
      color: 'blue'
    }
  };

  const currentPlanConfig = planConfig[plan.type] || planConfig.free;

  const formatDate = (date) => {
    if (!date) return null;
    return new Intl.DateTimeFormat(lang === 'zh-TW' ? 'zh-TW' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'expired': return 'danger';
      case 'cancelled': return 'warning';
      default: return 'gray';
    }
  };

  return (
    <div className="plan-info">
      <div className="plan-info__header">
        <div className="plan-info__badge-container">
          <PlanBadge plan={plan.type} size="large" />
          <div className="plan-info__status">
            <span className={`plan-info__status-indicator plan-info__status-indicator--${getStatusColor(plan.status)}`} />
            <span className="plan-info__status-text">
              {t(`subscription.statuses.${plan.status}`, plan.status)}
            </span>
          </div>
        </div>
        
        <div className="plan-info__actions">
          {plan.type === 'free' && (
            <AppleButton 
              variant="primary" 
              onClick={handleUpgrade}
              className="plan-info__upgrade-button"
            >
              {t('subscription.subscriptionPlans.upgrade')}
            </AppleButton>
          )}
        </div>
      </div>

      <div className="plan-info__content">
        <div className="plan-info__details">
          <h3 className="plan-info__name">{currentPlanConfig.name}</h3>
          <p className="plan-info__description">{currentPlanConfig.description}</p>
          
          {plan.startDate && (
            <div className="plan-info__date-info">
              <div className="plan-info__date-item">
                <span className="plan-info__date-label">
                  {t('subscription.history.startDate')}:
                </span>
                <span className="plan-info__date-value">
                  {formatDate(plan.startDate)}
                </span>
              </div>
              
              {plan.endDate && (
                <div className="plan-info__date-item">
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
            </div>
          )}
        </div>

        <div className="plan-info__features">
          <h4 className="plan-info__features-title">
            {t('subscription.features.included')}
          </h4>
          <ul className="plan-info__features-list">
            {currentPlanConfig.features.map((feature, index) => (
              <li key={index} className="plan-info__feature-item">
                <span className="plan-info__feature-icon">✓</span>
                <span className="plan-info__feature-text">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {plan.autoRenew && plan.type !== 'free' && (
        <div className="plan-info__auto-renew">
          <div className="plan-info__auto-renew-icon">🔄</div>
          <span className="plan-info__auto-renew-text">
            {t('subscription.autoRenewEnabled')}
          </span>
        </div>
      )}
    </div>
  );
};