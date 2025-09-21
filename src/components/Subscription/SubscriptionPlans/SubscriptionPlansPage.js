import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../Auth/useAuth';
import { useSubscription } from '../SubscriptionContext';
import { PlanCard } from './components/PlanCard';
import { BillingPeriodToggle } from '../shared/BillingPeriodToggle';
import { RedemptionCodeInput } from '../../Redemption/RedemptionCodeInput';
import { Analytics } from '../../../utils/analytics';
import subscriptionService from '../../../api/subscriptionService';
import './SubscriptionPlansPage.css';

export const SubscriptionPlansPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { userPlan } = useSubscription();
  const location = useLocation();
  const [upgradeNotification, setUpgradeNotification] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [appliedRedemption, setAppliedRedemption] = useState(null);
  const [planAdjustments, setPlanAdjustments] = useState({});

  useEffect(() => {
    Analytics.track('subscription_plans_page_viewed', {
      userId: user?.id,
      currentPlan: userPlan?.type || 'unknown'
    });

    // 檢查是否從 ProtectedRoute 重定向過來
    if (location.state?.reason === 'watchlist_upgrade_required') {
      setUpgradeNotification({
        message: location.state.message || t('protectedRoute.watchlistUpgradeRequired'),
        from: location.state.from
      });
      
      Analytics.track('upgrade_notification_shown', {
        reason: 'watchlist_access_denied',
        from: location.state.from,
        userId: user?.id
      });
    }
  }, [user, userPlan, location.state, t]);

  const availablePlans = subscriptionService.getAvailablePlans();

  const handleBillingPeriodChange = (period) => {
    setBillingPeriod(period);
    
    // 🔧 修復：當計費週期改變時，重新計算 planAdjustments
    if (appliedRedemption?.benefits) {
      console.log('🔧 計費週期改變，重新計算 planAdjustments，新週期:', period);
      recalculatePlanAdjustments(appliedRedemption, period);
    }
    
    Analytics.track('billing_period_changed', {
      userId: user?.id,
      newPeriod: period,
      currentPlan: userPlan?.type || 'unknown'
    });
  };

  /**
   * 🔧 修復：重新計算 planAdjustments 的通用函數
   * @param {Object} redemptionData - 兌換碼數據
   * @param {string} currentBillingPeriod - 當前計費週期
   */
  const recalculatePlanAdjustments = (redemptionData, currentBillingPeriod = billingPeriod) => {
    if (!redemptionData?.benefits) {
      console.log('🔧 沒有 redemptionData.benefits，清空 planAdjustments');
      setPlanAdjustments({});
      return;
    }

    const adjustments = {};
    
    // 檢查是否有目標方案限制
    const targetPlan = redemptionData.targetPlan;
    const hasTargetPlanRestriction = targetPlan && targetPlan !== 'all';
    
    console.log('🔧 重新計算 planAdjustments，計費週期:', currentBillingPeriod, '目標方案:', targetPlan);
    
    // Calculate plan adjustments based on redemption benefits
    availablePlans.forEach(plan => {
      // 免費方案永遠不應該有折扣
      if (plan.id === 'free') {
        adjustments[plan.id] = {
          originalPrice: 0,
          adjustedPrice: 0,
          discount: null,
          benefits: null
        };
        return;
      }
      
      // 如果有目標方案限制，只對目標方案應用折扣
      if (hasTargetPlanRestriction && plan.id !== targetPlan) {
        // 對於非目標方案，不應用折扣
        adjustments[plan.id] = {
          originalPrice: plan.price?.[currentBillingPeriod] || 0,
          adjustedPrice: plan.price?.[currentBillingPeriod] || 0,
          discount: null,
          benefits: null
        };
        return;
      }
      
      // 🔧 修復：使用傳入的 currentBillingPeriod 而不是狀態中的 billingPeriod
      const originalPrice = plan.price?.[currentBillingPeriod] || 0;
      let adjustedPrice = originalPrice;
      let discount = null;
      
      if (redemptionData.benefits.type === 'discount') {
        // 修復：支持新的 discountType 格式
        if (redemptionData.benefits.discountType === 'PERCENTAGE_DISCOUNT' || redemptionData.benefits.discountType === 'percentage') {
          // 修復：使用正確的字段名
          const discountPercentage = redemptionData.benefits.savingsPercentage || redemptionData.benefits.discountPercentage || 0;
          const discountAmount = (originalPrice * discountPercentage) / 100;
          adjustedPrice = Math.max(0, Math.round(originalPrice - discountAmount)); // 🔧 四捨五入，與後端保持一致
          discount = {
            type: 'percentage',
            value: discountPercentage,
            amount: Math.round(discountAmount) // 🔧 四捨五入折扣金額
          };
        } else if (redemptionData.benefits.discountType === 'FIXED_AMOUNT_DISCOUNT' || redemptionData.benefits.discountType === 'fixed') {
          // 支援多種金額字段名稱：estimatedValue, discountAmount, amount
          const discountAmount = redemptionData.benefits.estimatedValue || redemptionData.benefits.discountAmount || redemptionData.benefits.amount || 0;
          adjustedPrice = Math.max(0, Math.round(originalPrice - discountAmount)); // 🔧 四捨五入，與後端保持一致
          discount = {
            type: 'fixed',
            value: discountAmount,
            amount: Math.round(discountAmount) // 🔧 四捨五入折扣金額
          };
        }
      }
      
      adjustments[plan.id] = {
        originalPrice,
        adjustedPrice,
        discount,
        benefits: redemptionData.benefits
      };
      
      console.log(`🔧 方案 ${plan.id} (${currentBillingPeriod}):`, {
        originalPrice,
        adjustedPrice,
        discount
      });
    });
    
    console.log('🔧 設置新的 planAdjustments:', adjustments);
    setPlanAdjustments(adjustments);
  };

  /**
   * Handle successful redemption code preview
   */
  const handleRedemptionPreview = (previewData) => {
    if (previewData?.benefits) {
      console.log('🔍 SubscriptionPlansPage.handleRedemptionPreview，當前計費週期:', billingPeriod);
      
      // 🔧 修復：使用新的通用函數來計算 planAdjustments
      recalculatePlanAdjustments(previewData, billingPeriod);
      
      // 🔧 修復：在預覽時也設置 appliedRedemption，確保有 code 字段
      if (previewData.code) {
        setAppliedRedemption(previewData);
      }
      
      Analytics.track('redemption_preview_applied_to_pricing', {
        userId: user?.id,
        benefitType: previewData.benefits.type,
        discountAmount: previewData.benefits.discountAmount,
        billingPeriod,
        targetPlan: previewData.targetPlan,
        hasTargetPlanRestriction: !!(previewData.targetPlan && previewData.targetPlan !== 'all')
      });
    }
  };

  /**
   * Handle successful redemption
   */
  const handleRedemptionSuccess = (redemptionData) => {
    console.log('🎉 SubscriptionPlansPage.handleRedemptionSuccess called with:', redemptionData);
    console.log('🔍 redemptionData.code:', redemptionData.code);
    
    setAppliedRedemption(redemptionData);
    
    // 🔧 修復：使用新的通用函數來計算 planAdjustments
    recalculatePlanAdjustments(redemptionData, billingPeriod);
    
    Analytics.track('redemption_success_on_pricing_page', {
      userId: user?.id,
      benefitType: redemptionData.benefits?.type,
      discountAmount: redemptionData.benefits?.discountAmount
    });
  };

  /**
   * Handle redemption error
   */
  const handleRedemptionError = (error) => {
    // Clear any preview adjustments on error
    setPlanAdjustments({});
    
    Analytics.track('redemption_error_on_pricing_page', {
      userId: user?.id,
      errorCode: error.errorCode
    });
  };

  return (
    <div className="subscription-plans-page">
      <div className="subscription-plans-container">
        {/* Upgrade Notification - 顯示在頁面頂部 */}
        {upgradeNotification && (
          <div className="upgrade-notification">
            <div className="upgrade-notification__content">
              <h3 className="upgrade-notification__title">
                {t('subscription.upgradeRequired.title')}
              </h3>
              <p className="upgrade-notification__message">
                {upgradeNotification.message}
              </p>
              <button 
                className="upgrade-notification__close"
                onClick={() => setUpgradeNotification(null)}
                aria-label={t('common.close')}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <header className="subscription-plans-header">
          <h1 className="subscription-plans-header__title">
            {t('subscription.subscriptionPlans.title')}
          </h1>
          <p className="subscription-plans-header__subtitle">
            {t('subscription.subscriptionPlans.subtitle')}
          </p>
        </header>

        {/* Billing Period Toggle */}
        <BillingPeriodToggle
          value={billingPeriod}
          onChange={handleBillingPeriodChange}
        />

        {/* Plan Cards */}
        <section className="subscription-plans-cards">
          {availablePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlan={userPlan?.type}
              isCurrentUser={!!user}
              billingPeriod={billingPeriod}
              planAdjustment={planAdjustments[plan.id]}
              appliedRedemption={appliedRedemption}
            />
          ))}
        </section>

        {/* Apple-style Redemption Section - Moved after plans */}
        <section className="apple-redemption-section">
          <div className="apple-redemption-card">
            <div className="apple-redemption-header">
              <div className="apple-redemption-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="apple-redemption-title-group">
                <h3 className="apple-redemption-title">
                  {t('redemption.pricing.title')}
                </h3>
                <p className="apple-redemption-subtitle">
                  {t('redemption.pricing.subtitle')}
                </p>
              </div>
            </div>
            
            <div className="apple-redemption-content">
              <RedemptionCodeInput
                location="pricing"
                onPreviewSuccess={handleRedemptionPreview}
                onRedemptionSuccess={handleRedemptionSuccess}
                onRedemptionError={handleRedemptionError}
                placeholder={t('redemption.pricing.placeholder')}
                showPreview={true}
                autoFocus={false}
              />
            </div>

            {/* Applied Redemption Display */}
            {appliedRedemption && (
              <div className="apple-redemption-success">
                <div className="apple-redemption-success-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="apple-redemption-success-content">
                  <h4>{t('redemption.pricing.appliedTitle')}</h4>
                  <p>{t('redemption.pricing.appliedMessage')}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};