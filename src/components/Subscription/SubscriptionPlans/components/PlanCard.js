import React from 'react';
import { useTranslation } from 'react-i18next';
import { PlanBadge } from '../../shared/PlanBadge';
import { AppleButton } from '../../shared/AppleButton';
import { useSubscription } from '../../SubscriptionContext';
import { Analytics } from '../../../../utils/analytics';
import './PlanCard.css';

export const PlanCard = ({ plan, currentPlan, isCurrentUser }) => {
  const { t } = useTranslation();
  const { updatePlan, loading } = useSubscription();

  const isCurrentPlan = currentPlan === plan.id;
  const isFree = plan.id === 'free';

  const handlePlanSelect = async () => {
    if (isCurrentPlan || loading) return;

    try {
      Analytics.track('subscription_plan_select_clicked', {
        planId: plan.id,
        currentPlan: currentPlan || 'none',
        isUpgrade: plan.id === 'pro' && currentPlan === 'free'
      });

      if (isCurrentUser) {
        await updatePlan(plan.id);
        Analytics.track('subscription_plan_updated_success', {
          newPlan: plan.id,
          oldPlan: currentPlan || 'none'
        });
      } else {
        // Redirect to login or show auth dialog
        console.log('User needs to login first');
      }
    } catch (error) {
      console.error('Failed to update plan:', error);
      Analytics.error({
        type: 'SUBSCRIPTION_ERROR',
        code: error.code || 500,
        message: error.message || 'Failed to update plan',
        context: 'PlanCard.handlePlanSelect'
      });
    }
  };

  const formatPrice = (price) => {
    if (price === 0) return t('subscription.subscriptionPlans.freePlan.price');
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getButtonText = () => {
    if (isCurrentPlan) return t('subscription.subscriptionPlans.current');
    if (isFree) return t('subscription.subscriptionPlans.downgrade');
    return t('subscription.subscriptionPlans.upgrade');
  };

  const getButtonVariant = () => {
    if (isCurrentPlan) return 'outline';
    if (isFree) return 'secondary';
    return 'primary';
  };

  return (
    <div className={`plan-card ${isCurrentPlan ? 'plan-card--current' : ''} ${plan.popular ? 'plan-card--popular' : ''}`}>
      {plan.popular && (
        <div className="plan-card__popular-badge">
          {t('subscription.subscriptionPlans.popular')}
        </div>
      )}
      
      <div className="plan-card__header">
        <div className="plan-card__badge-container">
          <PlanBadge plan={plan.id} size="large" />
          {isCurrentPlan && (
            <span className="plan-card__current-indicator">
              {t('subscription.subscriptionPlans.currentPlan')}
            </span>
          )}
        </div>
        
        <h3 className="plan-card__name">{plan.name}</h3>
        <p className="plan-card__description">
          {t(`subscription.subscriptionPlans.${plan.id}Plan.description`)}
        </p>
      </div>

      <div className="plan-card__pricing">
        <div className="plan-card__price">
          <span className="plan-card__price-amount">
            {formatPrice(plan.price.monthly)}
          </span>
          {!isFree && (
            <span className="plan-card__price-period">
              {t('subscription.subscriptionPlans.proPlan.period')}
            </span>
          )}
        </div>
        
        {!isFree && (
          <div className="plan-card__price-yearly">
            {formatPrice(plan.price.yearly)} {t('subscription.subscriptionPlans.proPlan.periodYearly')}
          </div>
        )}
      </div>

      <div className="plan-card__features">
        <ul className="plan-card__features-list">
          {t(`subscription.subscriptionPlans.${plan.id}Plan.features`, { returnObjects: true }).map((feature, index) => (
            <li key={index} className="plan-card__feature-item">
              <span className="plan-card__feature-icon">✓</span>
              <span className="plan-card__feature-text">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="plan-card__action">
        <AppleButton
          variant={getButtonVariant()}
          size="large"
          onClick={handlePlanSelect}
          disabled={isCurrentPlan || loading}
          loading={loading}
          className="plan-card__button"
        >
          {getButtonText()}
        </AppleButton>
      </div>
    </div>
  );
};