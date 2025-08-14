import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PlanBadge } from '../../shared/PlanBadge';
import { AppleButton } from '../../shared/AppleButton';
import { useSubscription } from '../../SubscriptionContext';
import { Analytics } from '../../../../utils/analytics';
import { getPricingDisplayData, formatPrice, formatDiscount } from '../../../../utils/pricingUtils';
import PaymentFlow from '../../../Payment/PaymentFlow';
import './PlanCard.css';

export const PlanCard = ({ plan, currentPlan, isCurrentUser, billingPeriod = 'monthly' }) => {
  const { t } = useTranslation();
  const { updatePlan, loading } = useSubscription();
  const navigate = useNavigate();
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
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

      // 如果是 Pro 方案，啟動付款流程
      if (isPro) {
        setShowPaymentFlow(true);
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

  const handlePaymentSuccess = (subscription) => {
    setShowPaymentFlow(false);
    setPaymentLoading(false);
    
    Analytics.track('subscription_payment_success', {
      planId: plan.id,
      billingPeriod,
      subscriptionId: subscription.id
    });

    // 刷新訂閱狀態
    if (updatePlan) {
      updatePlan(plan.id);
    }

    // 導航到成功頁面或帳戶頁面
    navigate('/account', { 
      state: { 
        paymentSuccess: true,
        newPlan: plan.id 
      }
    });
  };

  const handlePaymentError = (error) => {
    setShowPaymentFlow(false);
    setPaymentLoading(false);
    
    Analytics.error({
      type: 'PAYMENT_ERROR',
      code: error.code || 500,
      message: error.message || 'Payment failed',
      context: 'PlanCard.handlePaymentError'
    });

    console.error('Payment failed:', error);
  };

  const handlePaymentCancel = () => {
    setShowPaymentFlow(false);
    setPaymentLoading(false);
    
    Analytics.track('subscription_payment_cancelled', {
      planId: plan.id,
      billingPeriod
    });
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

      {/* 付款流程彈窗 */}
      {showPaymentFlow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">升級到 Pro 方案</h2>
              <button
                onClick={handlePaymentCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <PaymentFlow
              planType={plan.id}
              billingPeriod={billingPeriod}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onCancel={handlePaymentCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};