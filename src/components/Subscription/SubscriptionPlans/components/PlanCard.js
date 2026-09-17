import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { PlanBadge } from '../../shared/PlanBadge';
import { AppleButton } from '../../shared/AppleButton';
import { useSubscription } from '../../SubscriptionContext';
import { useDialog } from '../../../Common/Dialog/useDialog';
import { useAuth } from '../../../Auth/useAuth';
import { Analytics } from '../../../../utils/analytics';
import { getPricingDisplayData, formatPrice, formatDiscount } from '../../../../utils/pricingUtils';
import { canAccessPaymentFeatures } from '../../../../utils/premiumWhitelist';

import './PlanCard.css';

export const PlanCard = ({
  plan,
  currentPlan,
  isCurrentUser,
  billingPeriod = 'monthly',
  planAdjustment = null,
  appliedRedemption = null,
  cardTrialEligible = false,
  onShowFreeTrialDialog = null
}) => {
  const { t } = useTranslation();
  const { lang } = useParams();
  const { userPlan, subscriptionHistory, loading } = useSubscription();
  const { openDialog } = useDialog();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 臨時免費模式和白名單檢查
  const isTemporaryFreeMode = process.env.REACT_APP_TEMPORARY_FREE_MODE === 'true';
  const canUserAccessPayment = canAccessPaymentFeatures(user?.email);



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

        // ✅ Admin 升級或兌換碼升級的用戶（autoRenew: false）
        // 不視為「當前方案」，允許他們隨時付費訂閱
        if (userPlan.autoRenew === false) {
          return false;
        }

        // ✅ 使用 isActive 而非 status（考慮時間因素）
        // 只有活躍且未過期的訂閱才視為當前方案
        return userPlan.isActive !== false && !userPlan.isExpired;
      }
    }

    return false;
  })();

  // 檢查是否為已取消但仍有效的訂閱
  const isCancelledButActive = (() => {
    // ✅ 使用 isActive 而非 status（考慮時間因素）
    return userPlan &&
      userPlan.type === plan.id &&
      (userPlan.cancelAtPeriodEnd || userPlan.isCancelled) &&
      (userPlan.isActive !== false && !userPlan.isExpired);
  })();

  const handlePlanSelect = async () => {
    // 檢查價格待定狀態
    if (plan.displayPrice && !plan.showRealPrice) {
      return;
    }

    // 檢查臨時免費模式和白名單
    if (isTemporaryFreeMode && !canUserAccessPayment && onShowFreeTrialDialog) {
      onShowFreeTrialDialog();
      Analytics.track('temporary_free_mode_dialog_shown', {
        planId: plan.id,
        currentPlan: currentPlan || 'none',
        userEmail: user?.email ? `${user.email.substring(0, 3)}***` : 'unknown',
        isWhitelisted: canUserAccessPayment
      });
      return;
    }

    if (isCurrentPlan || loading) {
      return;
    }

    try {
      Analytics.track('subscription_plan_select_clicked', {
        planId: plan.id,
        currentPlan: currentPlan || 'none',
        isUpgrade: plan.id === 'pro' && currentPlan === 'free'
      });

      if (!isCurrentUser) {
        // 觸發登入對話框
        console.log('User needs to login first - opening auth dialog');
        openDialog('auth', {
          source: 'subscription_plan_select',
          customTitle: t('authDialog.upgradeTitle'),
          customDescription: (
            <div className="auth-dialog-description">
              <p>{t('authDialog.upgradeDescription', { planName: plan.name })}</p>
              <ul className="feature-list">
                <li>{t('authDialog.feature1')}</li>
                <li>{t('authDialog.feature2')}</li>
                <li>{t('authDialog.feature3')}</li>
              </ul>
            </div>
          )
        });
        
        Analytics.auth.loginRequired({
          source: 'subscription_plan_select',
          planId: plan.id,
          action: 'upgrade_attempt'
        });
        return;
      }

      // 如果是免費方案且用戶已經是付費用戶，提示到用戶帳戶頁面取消
      if (isFree && currentPlan !== 'free') {
        // 導航到用戶帳戶頁面，讓用戶在那裡取消訂閱
        navigate(`/${lang}/user-account`);
        return;
      }

      // 處理已取消但仍有效的訂閱重新訂閱場景
      // 場景：用戶已取消訂閱（ECPay 定期定額已停止），但服務仍在有效期內
      // 根據 ECPay 政策，需要創建新的定期定額訂單，系統會自動延長剩餘服務時間
      if (isCancelledButActive && isPro) {
        console.log('🔍 PlanCard 處理已取消但仍有效的訂閱重新訂閱');

        Analytics.track('subscription_reactivation_via_new_payment', {
          planType: plan.id,
          reason: 'ecpay_policy_requires_new_payment'
        });

        // 直接導航到付款頁面，後端會處理延長邏輯
        let paymentUrl = `/${lang}/payment?plan=${plan.id}&period=${billingPeriod}&extend=true`;

        // 🔧 修復：無論是否有折扣，都要傳遞優惠碼
        if (appliedRedemption && appliedRedemption.code) {
          paymentUrl += `&redemption=${encodeURIComponent(appliedRedemption.code)}`;
        }

        // 🔧 修復：如果有優惠碼應用，將完整的折扣信息添加到URL參數
        console.log('🔍 PlanCard 檢查折扣條件 (重新訂閱):', {
          hasAppliedRedemption: !!appliedRedemption,
          hasBenefits: !!(appliedRedemption && appliedRedemption.benefits),
          hasRedemptionDiscount: adjustedPricing.hasRedemptionDiscount,
          appliedRedemption: appliedRedemption,
          adjustedPricing: adjustedPricing
        });

        if (appliedRedemption && appliedRedemption.benefits && adjustedPricing.hasRedemptionDiscount) {
          const benefits = appliedRedemption.benefits;
          const discount = adjustedPricing.redemptionDiscount;

          // 傳遞折扣類型
          paymentUrl += `&discountType=${benefits.discountType || discount.type}`;

          // 傳遞折扣值
          if (benefits.discountType === 'PERCENTAGE_DISCOUNT' || discount.type === 'percentage') {
            paymentUrl += `&discountValue=${benefits.savingsPercentage || benefits.discountPercentage || discount.value}`;
          } else {
            paymentUrl += `&discountValue=${benefits.estimatedValue || benefits.discountAmount || benefits.amount || discount.value}`;
          }

          // 傳遞原價和最終價格
          paymentUrl += `&originalPrice=${adjustedPricing.originalPrice}`;
          paymentUrl += `&finalPrice=${adjustedPricing.displayPrice}`;

          console.log('🔍 PlanCard 傳遞給 PaymentPage 的完整參數 (重新訂閱):', {
            redemptionCode: appliedRedemption.code,
            discountType: benefits.discountType || discount.type,
            discountValue: benefits.discountType === 'PERCENTAGE_DISCOUNT' || discount.type === 'percentage'
              ? (benefits.savingsPercentage || benefits.discountPercentage || discount.value)
              : (benefits.estimatedValue || benefits.discountAmount || benefits.amount || discount.value),
            originalPrice: adjustedPricing.originalPrice,
            finalPrice: adjustedPricing.displayPrice
          });
        }

        navigate(paymentUrl);
        return;
      }

      // 如果是 Pro 方案，導航到付款頁面
      if (isPro) {
        let paymentUrl = `/${lang}/payment?plan=${plan.id}&period=${billingPeriod}`;

        // 🔧 修復：無論是否有折扣，都要傳遞優惠碼
        if (appliedRedemption && appliedRedemption.code) {
          paymentUrl += `&redemption=${encodeURIComponent(appliedRedemption.code)}`;
        }

        // 🔧 修復：如果有優惠碼應用，將完整的折扣信息添加到URL參數
        console.log('🔍 PlanCard 檢查折扣條件:', {
          hasAppliedRedemption: !!appliedRedemption,
          hasBenefits: !!(appliedRedemption && appliedRedemption.benefits),
          hasRedemptionDiscount: adjustedPricing.hasRedemptionDiscount,
          appliedRedemption: appliedRedemption,
          adjustedPricing: adjustedPricing
        });

        if (appliedRedemption && appliedRedemption.benefits && adjustedPricing.hasRedemptionDiscount) {
          const benefits = appliedRedemption.benefits;
          const discount = adjustedPricing.redemptionDiscount;

          // 傳遞折扣類型
          paymentUrl += `&discountType=${benefits.discountType || discount.type}`;

          // 傳遞折扣值
          if (benefits.discountType === 'PERCENTAGE_DISCOUNT' || discount.type === 'percentage') {
            paymentUrl += `&discountValue=${benefits.savingsPercentage || benefits.discountPercentage || discount.value}`;
          } else {
            paymentUrl += `&discountValue=${benefits.estimatedValue || benefits.discountAmount || benefits.amount || discount.value}`;
          }

          // 傳遞原價和最終價格
          paymentUrl += `&originalPrice=${adjustedPricing.originalPrice}`;
          paymentUrl += `&finalPrice=${adjustedPricing.displayPrice}`;

          console.log('🔍 PlanCard 傳遞給 PaymentPage 的完整參數:', {
            redemptionCode: appliedRedemption.code,
            discountType: benefits.discountType || discount.type,
            discountValue: benefits.discountType === 'PERCENTAGE_DISCOUNT' || discount.type === 'percentage'
              ? (benefits.savingsPercentage || benefits.discountPercentage || discount.value)
              : (benefits.estimatedValue || benefits.discountAmount || benefits.amount || discount.value),
            originalPrice: adjustedPricing.originalPrice,
            finalPrice: adjustedPricing.displayPrice
          });
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



  // 有資格試用的人只給試用入口。資格由後端決定，但已經有訂閱的人一律不顯示，
  // 不依賴那一支查詢：既有付費者看到的畫面不能因為這個功能而改變。
  // 綁卡軌沒有接折扣系統，套用了優惠碼的人要走原本的付款頁，優惠才會生效。
  const showCardTrialEntry = isPro && cardTrialEligible && !appliedRedemption && !isCurrentPlan && !isCancelledButActive;

  const handleCardTrialSelect = () => {
    Analytics.track('card_trial_entry_clicked', {
      planId: plan.id,
      billingPeriod
    });
    navigate(`/${lang}/payment/card-trial?period=${billingPeriod}`);
  };

  const pricingData = getPricingDisplayData(plan, billingPeriod);

  const formatPriceDisplay = (price) => {
    if (price === 0) return t('subscription.subscriptionPlans.freePlan.price');
    
    // 檢查是否有自定義顯示價格
    if (plan.displayPrice && !plan.showRealPrice) {
      return billingPeriod === 'yearly' ? plan.displayPrice.yearly : plan.displayPrice.monthly;
    }
    
    return formatPrice(price);
  };

  // Get adjusted pricing if redemption code is applied
  const getAdjustedPricing = () => {
    console.log(`🔍 PlanCard[${plan.id}] getAdjustedPricing - planAdjustment:`, planAdjustment);

    if (!planAdjustment) {
      console.log(`🔍 PlanCard[${plan.id}] 沒有 planAdjustment，返回原始 pricingData`);
      return pricingData;
    }

    const result = {
      ...pricingData,
      displayPrice: planAdjustment.adjustedPrice,
      originalPrice: planAdjustment.originalPrice,
      hasRedemptionDiscount: !!(planAdjustment.discount && (planAdjustment.discount.value > 0 || planAdjustment.discount.amount > 0)), // 確保折扣值大於0
      redemptionDiscount: planAdjustment.discount
    };

    console.log(`🔍 PlanCard[${plan.id}] planAdjustment.discount:`, planAdjustment.discount);
    console.log(`🔍 PlanCard[${plan.id}] hasRedemptionDiscount 計算:`, !!(planAdjustment.discount && (planAdjustment.discount.value > 0 || planAdjustment.discount.amount > 0)));
    console.log(`🔍 PlanCard[${plan.id}] 返回調整後的 pricing:`, result);
    return result;
  };

  const adjustedPricing = getAdjustedPricing();

  // 🔍 調試：檢查 planAdjustment 和 adjustedPricing
  console.log(`🔍 PlanCard[${plan.id}] planAdjustment:`, planAdjustment);
  console.log(`🔍 PlanCard[${plan.id}] adjustedPricing:`, adjustedPricing);

  const getButtonText = () => {
    if (loading) return t('payment.form.processing');

    // 檢查是否為價格待定狀態
    if (plan.displayPrice && !plan.showRealPrice) {
      return t('subscription.subscriptionPlans.comingSoon');
    }

    // 🔧 未登入用戶的處理邏輯
    if (!isCurrentUser) {
      if (isFree) {
        return t('subscription.subscriptionPlans.loginToStart');
      }
      if (isPro) {
        return t('subscription.subscriptionPlans.loginToUpgrade');
      }
      return t('subscription.subscriptionPlans.loginRequired');
    }

    // 活躍的當前方案
    if (isCurrentPlan) return t('subscription.subscriptionPlans.current');

    // 已取消但仍有效的訂閱
    if (isCancelledButActive) return t('subscription.subscriptionPlans.resumeSubscription');

    // 免費方案邏輯
    if (isFree && currentPlan !== 'free') return t('subscription.subscriptionPlans.manageSubscription');
    if (isFree) return t('subscription.subscriptionPlans.current');

    // Pro 方案邏輯
    if (isPro) {
      // ✅ 檢查是否為 Admin 升級或兌換碼升級（autoRenew: false）
      const isTrialOrPromo = userPlan && userPlan.type === 'pro' && 
                             userPlan.autoRenew === false &&
                             userPlan.isActive !== false && 
                             !userPlan.isExpired;
      
      if (isTrialOrPromo) {
        return t('subscription.subscriptionPlans.upgradeToFullPlan', '升級為付費方案');
      }

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
            {!isFree && !(plan.displayPrice && !plan.showRealPrice) && (
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
          {t(`subscription.subscriptionPlans.${plan.id}Plan.features`, { returnObjects: true }).map((feature, index) => {
            // 檢查是否為免費方案中被禁用的功能
            const isDisabledFeature = plan.id === 'free' && (
              feature.includes('追蹤清單功能') ||
              feature.includes('無廣告體驗') ||
              feature.includes('Watchlist Feature') ||
              feature.includes('Ad-free Experience')
            );

            // 檢查是否為免費方案中受限制的功能（樂活五線譜和市場情緒分析）
            const isLimitedFeature = plan.id === 'free' && (
              feature.includes('樂活五線譜') ||
              feature.includes('市場情緒分析') ||
              feature.includes('Lohas Spectrum') ||
              feature.includes('Market Sentiment')
            );

            // 決定圖示和樣式
            let icon = '✓';
            let className = 'plan-card__feature-item';

            if (isDisabledFeature) {
              icon = '✗';
              className += ' plan-card__feature-item--disabled';
            } else if (isLimitedFeature) {
              icon = '⚠️';
              className += ' plan-card__feature-item--limited';
            }

            return (
              <li key={index} className={className}>
                <span className="plan-card__feature-icon">
                  {icon}
                </span>
                <span className="plan-card__feature-text">{feature}</span>
              </li>
            );
          })}
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
        {showCardTrialEntry ? (
          <AppleButton
            variant="primary"
            size="large"
            onClick={handleCardTrialSelect}
            disabled={loading || (plan.displayPrice && !plan.showRealPrice)}
            loading={loading}
            className="plan-card__button"
          >
            {t('cardTrial.planCard.startTrial')}
          </AppleButton>
        ) : (
          <AppleButton
            variant={getButtonVariant()}
            size="large"
            onClick={handlePlanSelect}
            disabled={isCurrentPlan || loading || (plan.displayPrice && !plan.showRealPrice)}
            loading={loading}
            className="plan-card__button"
          >
            {getButtonText()}
          </AppleButton>
        )}
      </div>

    </div>
  );
};