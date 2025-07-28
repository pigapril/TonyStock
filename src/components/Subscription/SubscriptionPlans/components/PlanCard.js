import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppleButton } from '../../shared/AppleButton';
import { PlanBadge } from '../../shared/PlanBadge';
import { Analytics } from '../../../../utils/analytics';
import './PlanCard.css';

export const PlanCard = ({ plan, className = '' }) => {
  const { t } = useTranslation();

  const handleSelectPlan = () => {
    if (plan.current) {
      return; // Already on this plan
    }

    Analytics.ui.button.click({
      buttonType: 'selectPlan',
      planId: plan.id,
      planName: plan.name,
      price: plan.price
    });

    // TODO: Implement plan selection/upgrade flow
    console.log(`Selected plan: ${plan.id}`);
    
    // For now, show an alert
    alert(t('planCard.comingSoon', 'Payment integration coming soon! Please contact support for plan upgrades.'));
  };

  const formatPrice = (price) => {
    if (price === 0) {
      return t('planCard.free', 'Free');
    }
    return new Intl.NumberFormat(document.documentElement.lang || 'zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getButtonText = () => {
    if (plan.current) {
      return t('planCard.currentPlan', 'Current Plan');
    }
    if (plan.price === 0) {
      return t('planCard.getStarted', 'Get Started');
    }
    return t('planCard.upgrade', 'Upgrade Now');
  };

  const getButtonVariant = () => {
    if (plan.current) {
      return 'secondary';
    }
    if (plan.popular) {
      return 'primary';
    }
    return 'secondary';
  };

  const cardClass = [
    'plan-card',
    plan.popular ? 'plan-card--popular' : '',
    plan.current ? 'plan-card--current' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      {plan.popular && (
        <div className="plan-card__popular-badge">
          <span>{t('planCard.popular', 'Most Popular')}</span>
        </div>
      )}
      
      {plan.current && (
        <div className="plan-card__current-badge">
          <span>{t('planCard.current', 'Current')}</span>
        </div>
      )}

      <div className="plan-card__header">
        <div className="plan-card__plan-info">
          <PlanBadge plan={plan.id} size="large" />
          <h3 className="plan-card__name">{plan.name}</h3>
        </div>
        <div className="plan-card__pricing">
          <span className="plan-card__price">{formatPrice(plan.price)}</span>
          {plan.price > 0 && (
            <span className="plan-card__period">{plan.period}</span>
          )}
        </div>
        <p className="plan-card__description">{plan.description}</p>
      </div>

      <div className="plan-card__features">
        <h4 className="plan-card__features-title">
          {t('planCard.featuresIncluded', 'What\'s included')}
        </h4>
        <ul className="plan-card__features-list">
          {plan.features.map((feature, index) => (
            <li key={index} className="plan-card__feature-item">
              <svg className="plan-card__feature-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="8" fill="#34C759"/>
                <path d="M6.5 8.5L7.5 9.5L10.5 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {plan.limitations && plan.limitations.length > 0 && (
          <div className="plan-card__limitations">
            <h5 className="plan-card__limitations-title">
              {t('planCard.limitations', 'Limitations')}
            </h5>
            <ul className="plan-card__limitations-list">
              {plan.limitations.map((limitation, index) => (
                <li key={index} className="plan-card__limitation-item">
                  <svg className="plan-card__limitation-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="8" fill="#FF9500"/>
                    <path d="M8 4v5M8 12h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="plan-card__action">
        <AppleButton
          variant={getButtonVariant()}
          size="large"
          onClick={handleSelectPlan}
          disabled={plan.current}
          className="plan-card__button"
        >
          {getButtonText()}
        </AppleButton>
      </div>
    </div>
  );
};