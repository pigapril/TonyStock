import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { PlanBadge } from '../../shared/PlanBadge';
import { AppleButton } from '../../shared/AppleButton';
import { useSubscription } from '../../SubscriptionContext';
import { useAuth } from '../../../Auth/useAuth';
import subscriptionService from '../../../../services/subscriptionService';
import { Analytics } from '../../../../utils/analytics';
import './PlanInfo.css';

export const PlanInfo = ({ plan, loading }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lang } = useParams();
  const { refreshUserPlan, refreshSubscriptionHistory } = useSubscription();
  const { checkAuthStatus } = useAuth();
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleUpgrade = () => {
    navigate(`/${lang}/subscription-plans`);
  };

  const handleCancelSubscription = async () => {
    if (cancelLoading) return;

    try {
      setCancelLoading(true);
      
      Analytics.track('subscription_cancel_initiated', {
        planType: plan.type,
        location: 'user_account'
      });

      const cancelResult = await subscriptionService.cancelSubscription({
        cancelAtPeriodEnd: true,
        reason: 'user_requested'
      });
      
      if (cancelResult.success) {
        Analytics.track('subscription_cancelled_success', {
          reason: 'user_requested',
          cancelAtPeriodEnd: true,
          oldPlan: plan.type
        });
        
        // 刷新用戶狀態和訂閱歷史
        if (checkAuthStatus) {
          await checkAuthStatus();
        }
        await refreshUserPlan();
        await refreshSubscriptionHistory();
        
        setShowCancelConfirm(false);
        
        // 顯示成功提示
        alert(t('subscription.userAccount.cancelSuccess'));
      } else {
        throw new Error(cancelResult.error || '取消訂閱失敗');
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      Analytics.error({
        type: 'SUBSCRIPTION_ERROR',
        code: 'CANCEL_FAILED',
        message: error.message,
        context: 'user_account'
      });
      // 這裡可以添加錯誤提示
      alert(t('subscription.cancelError', { error: error.message }));
    } finally {
      setCancelLoading(false);
    }
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
          
          {plan.type !== 'free' && plan.status === 'active' && !plan.cancelAtPeriodEnd && (
            <AppleButton 
              variant="secondary" 
              onClick={() => setShowCancelConfirm(true)}
              className="plan-info__cancel-button"
            >
              {t('subscription.userAccount.cancelSubscription')}
            </AppleButton>
          )}
          
          {plan.cancelAtPeriodEnd && (
            <div className="plan-info__cancel-notice">
              <span className="plan-info__cancel-icon">⚠️</span>
              <span className="plan-info__cancel-text">
                {t('subscription.userAccount.cancelledNotice', { 
                  endDate: formatDate(plan.endDate) 
                })}
              </span>
            </div>
          )}
        </div>
        
        {/* Cancel Confirmation Dialog */}
        {showCancelConfirm && (
          <div className="plan-info__cancel-dialog-overlay">
            <div className="plan-info__cancel-dialog">
              <h3 className="plan-info__cancel-dialog-title">
                {t('subscription.userAccount.cancelConfirmTitle')}
              </h3>
              <p className="plan-info__cancel-dialog-message">
                {t('subscription.userAccount.cancelConfirmMessage', {
                  endDate: formatDate(plan.endDate)
                })}
              </p>
              <div className="plan-info__cancel-dialog-actions">
                <AppleButton 
                  variant="outline" 
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={cancelLoading}
                >
                  {t('common.cancel')}
                </AppleButton>
                <AppleButton 
                  variant="destructive" 
                  onClick={handleCancelSubscription}
                  loading={cancelLoading}
                  disabled={cancelLoading}
                >
                  {t('subscription.userAccount.confirmCancel')}
                </AppleButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};