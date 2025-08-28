import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { PlanBadge } from '../../shared/PlanBadge';
import { AppleButton } from '../../shared/AppleButton';
import { useSubscription } from '../../SubscriptionContext';
import { Analytics } from '../../../../utils/analytics';
import { getPricingDisplayData, formatPrice, formatDiscount } from '../../../../utils/pricingUtils';
import subscriptionService from '../../../../services/subscriptionService';
import { useAuth } from '../../../Auth/useAuth';
import './PlanCard.css';

export const PlanCard = ({ 
  plan, 
  currentPlan, 
  isCurrentUser, 
  billingPeriod = 'monthly',
  planAdjustment = null,
  appliedRedemption = null
}) => {
  const { t } = useTranslation();
  const { lang } = useParams();
  const { updatePlan, loading, refreshSubscriptionHistory } = useSubscription();
  const { checkAuthStatus } = useAuth();
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

      // 如果是免費方案且用戶已經是付費用戶，提示到用戶帳戶頁面取消
      if (isFree && currentPlan !== 'free') {
        // 導航到用戶帳戶頁面，讓用戶在那裡取消訂閱
        navigate(`/${lang}/user-account`);
        return;
      }

      // 如果是 Pro 方案，導航到付款頁面
      if (isPro) {
        let paymentUrl = `/${lang}/payment?plan=${plan.id}&period=${billingPeriod}`;
        
        // 如果有折扣，將折扣信息添加到URL參數
        if (adjustedPricing.hasRedemptionDiscount && adjustedPricing.redemptionDiscount) {
          const discount = adjustedPricing.redemptionDiscount;
          paymentUrl += `&discountType=${discount.type}`;
          
          if (discount.type === 'percentage') {
            // 對於百分比折扣，傳遞百分比值
            paymentUrl += `&discountValue=${discount.value}`;
          } else {
            // 對於固定金額折扣，傳遞金額值
            paymentUrl += `&discountValue=${discount.value}`;
          }
          
          paymentUrl += `&originalPrice=${adjustedPricing.originalPrice}`;
          paymentUrl += `&finalPrice=${adjustedPricing.displayPrice}`;
        }
        
        navigate(paymentUrl);
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

  // Get adjusted pricing if redemption code is applied
  const getAdjustedPricing = () => {
    if (!planAdjustment) return pricingData;
    
    return {
      ...pricingData,
      displayPrice: planAdjustment.adjustedPrice,
      originalPrice: planAdjustment.originalPrice,
      hasRedemptionDiscount: true,
      redemptionDiscount: planAdjustment.discount
    };
  };

  const adjustedPricing = getAdjustedPricing();

  const getButtonText = () => {
    if (paymentLoading) return t('payment.form.processing');
    if (isCurrentPlan) return t('subscription.subscriptionPlans.current');
    if (isFree && currentPlan !== 'free') return t('subscription.subscriptionPlans.manageSubscription');
    if (isFree) return t('subscription.subscriptionPlans.current');
    if (isPro) return t('payment.form.upgradeNow');
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
              {formatPriceDisplay(adjustedPricing.displayPrice)}
            </span>
            {!isFree && (
              <span className="plan-card__price-period">
                {adjustedPricing.period}
              </span>
            )}
          </div>
          
          {/* Redemption Discount Display */}
          {adjustedPricing.hasRedemptionDiscount && adjustedPricing.redemptionDiscount && (
            <div className="plan-card__redemption-discount">
              <div className="plan-card__original-price-redemption">
                {formatPriceDisplay(adjustedPricing.originalPrice)}
              </div>
              <div className="plan-card__redemption-badge">
                {adjustedPricing.redemptionDiscount.type === 'percentage' 
                  ? t('redemption.pricing.discountBadge.percentage', { 
                      percentage: adjustedPricing.redemptionDiscount.value 
                    })
                  : t('redemption.pricing.discountBadge.fixed', { 
                      amount: formatPrice(adjustedPricing.redemptionDiscount.amount) 
                    })
                }
              </div>
            </div>
          )}
          
          {/* Regular Billing Discount Display */}
          {!adjustedPricing.hasRedemptionDiscount && !isFree && pricingData.showDiscount && (
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

        {/* Applied Redemption Indicator */}
        {appliedRedemption && (
          <div className="plan-card__applied-redemption">
            <div className="plan-card__applied-redemption-icon">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span>{t('redemption.pricing.appliedIndicator')}</span>
          </div>
        )}

        {/* Not Applicable Indicator */}
        {planAdjustment && !planAdjustment.discount && planAdjustment.benefits && !isFree && (
          <div className="plan-card__not-applicable">
            <div className="plan-card__not-applicable-icon">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <span>{t('payment.redemption.notApplicable')}</span>
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