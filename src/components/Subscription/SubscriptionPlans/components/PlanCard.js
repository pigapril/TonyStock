import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { PlanBadge } from '../../shared/PlanBadge';
import { AppleButton } from '../../shared/AppleButton';
import { useSubscription } from '../../SubscriptionContext';
import { Analytics } from '../../../../utils/analytics';
import { getPricingDisplayData, formatPrice, formatDiscount } from '../../../../utils/pricingUtils';
import './PlanCard.css';

export const PlanCard = ({ plan, currentPlan, isCurrentUser, billingPeriod = 'monthly' }) => {
  const { t } = useTranslation();
  const { lang } = useParams();
  const { updatePlan, loading } = useSubscription();
  const navigate = useNavigate();
  const [paymentLoading, setPaymentLoading] = useState(false);

  const isCurrentPlan = currentPlan === plan.id;
  const isFree = plan.id === 'free';
  const isPro = plan.id === 'pro';

  const handlePlanSelect = async () => {
    if (isCurrentPlan || loading || paymentLoading) return;

    try {
      Analytics.track('subscription_plan_select_clicked', {
        planId: plan.id,
        currentPlan: currentPlan || 'none',
        isUpgrade: plan.id === 'pro' && currentPlan === 'free'
      });

      if (!isCurrentUser) {
        // Redirect to login or show auth dialog
        console.log('User needs to login first');
        return;
      }

      // 如果是免費方案，直接降級
      if (isFree) {
        await updatePlan(plan.id);
        Analytics.track('subscription_plan_updated_success', {
          newPlan: plan.id,
          oldPlan: currentPlan || 'none'
        });
        return;
      }

      // 如果是 Pro 方案，導航到付款頁面
      if (isPro) {
        navigate(`/${lang}/payment?plan=${plan.id}&period=${billingPeriod}`);
        return;
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



  const pricingData = getPricingDisplayData(plan, billingPeriod);

  const formatPriceDisplay = (price) => {
    if (price === 0) return t('subscription.subscriptionPlans.freePlan.price');
    return formatPrice(price);
  };

  const getButtonText = () => {
    if (paymentLoading) return '處理中...';
    if (isCurrentPlan) return t('subscription.subscriptionPlans.current');
    if (isFree) return t('subscription.subscriptionPlans.downgrade');
    if (isPro) return '立即付款升級';
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
        </div>
        
        <h3 className="plan-card__name">{plan.name}</h3>
        <p className="plan-card__description">
          {t(`subscription.subscriptionPlans.${plan.id}Plan.description`)}
        </p>
      </div>

      <div className="plan-card__pricing">
        <div className="plan-card__price-row">
          <div className="plan-card__price">
            <span className="plan-card__price-amount">
              {formatPriceDisplay(pricingData.displayPrice)}
            </span>
            {!isFree && (
              <span className="plan-card__price-period">
                {pricingData.period}
              </span>
            )}
          </div>
          
          {!isFree && pricingData.showDiscount && (
            <div className="plan-card__discount-info">
              <div className="plan-card__discount-badge">
                {t('subscription.billingPeriod.save')} {formatDiscount(pricingData.discountPercentage)}
              </div>
              {billingPeriod === 'yearly' && (
                <div className="plan-card__original-price">
                  {formatPriceDisplay(pricingData.originalPrice)}/年
                </div>
              )}
            </div>
          )}
        </div>
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
          disabled={isCurrentPlan || loading || paymentLoading}
          loading={loading || paymentLoading}
          className="plan-card__button"
        >
          {getButtonText()}
        </AppleButton>
      </div>


    </div>
  );
};