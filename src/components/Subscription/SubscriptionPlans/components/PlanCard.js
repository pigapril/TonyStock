import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { PlanBadge } from '../../shared/PlanBadge';
import { AppleButton } from '../../shared/AppleButton';
import { useSubscription } from '../../SubscriptionContext';
import { Analytics } from '../../../../utils/analytics';
import { getPricingDisplayData, formatPrice, formatDiscount } from '../../../../utils/pricingUtils';

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
  const { userPlan, subscriptionHistory, loading } = useSubscription();
  const navigate = useNavigate();
  const [paymentLoading, setPaymentLoading] = useState(false);

  const isFree = plan.id === 'free';
  const isPro = plan.id === 'pro';

  // 智能判斷當前方案狀態
  const isCurrentPlan = (() => {
    if (!currentPlan) {
      return plan.id === 'free';
    }

    if (currentPlan === plan.id) {
      if (plan.id === 'free') {
        return true;
      }

      // 對於付費方案，檢查訂閱狀態
      if (userPlan && userPlan.type === plan.id) {
        // 如果訂閱已取消但仍有效，不視為當前方案（允許重新訂閱）
        if (userPlan.cancelAtPeriodEnd || userPlan.isCancelled) {
          return false;
        }

        // 只有活躍且未取消的訂閱才視為當前方案
        return userPlan.status === 'active';
      }
    }

    return false;
  })();

  // 檢查是否為已取消但仍有效的訂閱
  const isCancelledButActive = (() => {
    return userPlan &&
      userPlan.type === plan.id &&
      (userPlan.cancelAtPeriodEnd || userPlan.isCancelled) &&
      userPlan.status === 'active';
  })();

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

      // 如果是已取消但仍有效的訂閱，直接調用重新啟動 API
      if (isCancelledButActive && isPro) {
        try {
          setPaymentLoading(true);
          
          // 動態導入 CSRF 客戶端
          const { default: csrfClient } = await import('../../../../utils/csrfClient');
          
          const response = await csrfClient.post('/api/payment/reactivate-subscription', {});
          
          if (response.ok) {
            const result = await response.json();
            
            // 重新啟動成功，刷新訂閱狀態
            if (window.location.reload) {
              window.location.reload();
            }
            
            Analytics.track('subscription_reactivated', {
              planType: plan.id,
              subscriptionId: result.data?.id
            });
            
            console.log('訂閱已成功重新啟動');
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || '重新啟動失敗');
          }
        } catch (error) {
          console.error('重新啟動訂閱失敗:', error);
          
          Analytics.error({
            type: 'SUBSCRIPTION_REACTIVATION_ERROR',
            code: error.code || 500,
            message: error.message || 'Failed to reactivate subscription',
            context: 'PlanCard.handlePlanSelect'
          });
          
          // 如果重新啟動失敗，仍然可以導航到付款頁面作為備用方案
          alert(t('subscription.reactivation.error') || '重新啟動失敗，請稍後再試');
        } finally {
          setPaymentLoading(false);
        }
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

          // 🔧 關鍵修復：傳遞優惠碼本身
          if (appliedRedemption && appliedRedemption.code) {
            paymentUrl += `&redemptionCode=${encodeURIComponent(appliedRedemption.code)}`;
          }
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

    // 活躍的當前方案
    if (isCurrentPlan) return t('subscription.subscriptionPlans.current');

    // 已取消但仍有效的訂閱
    if (isCancelledButActive) return t('subscription.subscriptionPlans.resumeSubscription');

    // 免費方案邏輯
    if (isFree && currentPlan !== 'free') return t('subscription.subscriptionPlans.manageSubscription');
    if (isFree) return t('subscription.subscriptionPlans.current');

    // Pro 方案邏輯
    if (isPro) {
      // 檢查用戶是否曾經有過 Pro 訂閱（從訂閱歷史或當前狀態判斷）
      const hasHadProSubscription = (() => {
        // 檢查當前用戶計劃是否曾經是 Pro（但現在已過期或取消）
        if (userPlan && userPlan.type === 'pro' && 
            (userPlan.status === 'expired' || userPlan.status === 'cancelled')) {
          return true;
        }
        
        // 檢查訂閱歷史中是否有 Pro 訂閱記錄
        if (subscriptionHistory && Array.isArray(subscriptionHistory)) {
          return subscriptionHistory.some(sub => 
            sub.planType === 'pro' || sub.type === 'pro'
          );
        }
        
        return false;
      })();
      
      // 如果用戶曾經有過 Pro 訂閱但現在已過期/取消，顯示重新訂閱
      if (hasHadProSubscription) {
        return t('subscription.subscriptionPlans.resubscribe');
      }
      
      // 對於新用戶或從未有過 Pro 訂閱的用戶，顯示立即升級
      return t('payment.form.upgradeNow');
    }

    return t('subscription.subscriptionPlans.upgrade');
  };

  const getButtonVariant = () => {
    if (isCurrentPlan) return 'outline';
    if (isCancelledButActive) return 'primary'; // 恢復訂閱使用主要按鈕樣式
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
                    amount: formatPrice(adjustedPricing.redemptionDiscount.value)
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

      {/* 已取消但仍有效的狀態指示器 */}
      {isCancelledButActive && (
        <div className="plan-card__status-indicator plan-card__status-indicator--cancelled">
          <div className="plan-card__status-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="plan-card__status-content">
            <div className="plan-card__status-title">
              {t('subscription.status.cancelledButActive')}
            </div>
            <div className="plan-card__status-subtitle">
              {t('subscription.status.expiresOn', {
                date: new Date(userPlan?.endDate).toLocaleDateString()
              })}
            </div>
          </div>
        </div>
      )}

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