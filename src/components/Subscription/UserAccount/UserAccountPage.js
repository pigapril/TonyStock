import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Auth/useAuth';
import { useSubscription } from '../SubscriptionContext';
import { PlanInfo } from './components/PlanInfo';
// import { UsageStats } from './components/UsageStats'; // Hidden per user request
import { SubscriptionHistory } from './components/SubscriptionHistory';
import PaymentHistory from '../../Payment/PaymentHistory';
import { RedemptionCodeInput } from '../../Redemption/RedemptionCodeInput';
import { RedemptionHistory } from '../../Redemption/RedemptionHistory';
import { ActivePromotions } from '../../Redemption/ActivePromotions';
import { Analytics } from '../../../utils/analytics';
import './UserAccountPage.css';

export const UserAccountPage = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { userPlan, usageStats, subscriptionHistory, loading, error, refreshUserPlan } = useSubscription();

  useEffect(() => {
    Analytics.track('user_account_page_viewed', {
      userId: user?.id,
      planType: userPlan?.type || 'unknown'
    });
  }, [user, userPlan]);

  const handleLogout = async () => {
    try {
      Analytics.track('user_logout_from_account_page', {
        userId: user?.id
      });
      
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      
      Analytics.error({
        type: 'AUTH_ERROR',
        code: error.code || 500,
        message: error.message || 'Logout failed',
        context: 'UserAccountPage.handleLogout'
      });
    }
  };

  /**
   * Handle successful redemption
   */
  const handleRedemptionSuccess = async (redemptionData) => {
    // Refresh user plan data to reflect changes
    await refreshUserPlan();
    
    Analytics.track('redemption_success_on_account_page', {
      userId: user?.id,
      benefitType: redemptionData.benefits?.type,
      discountAmount: redemptionData.benefits?.discountAmount
    });
  };

  /**
   * Handle redemption error
   */
  const handleRedemptionError = (error) => {
    Analytics.track('redemption_error_on_account_page', {
      userId: user?.id,
      errorCode: error.errorCode
    });
  };

  if (!user) {
    return (
      <div className="user-account-page">
        <div className="user-account-container">
          <div className="user-account-error">
            <h2>{t('userProfile.loginRequired')}</h2>
            <p>{t('userProfile.loginRequiredMessage')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-account-page">
      <div className="user-account-container">
        {/* Header Section */}
        <header className="user-account-header">
          <div className="user-account-header__content">
            <div className="user-account-header__avatar">
              <img 
                src={user.avatarUrl} 
                alt={t('userProfile.avatarAlt', { username: user.username })}
                className="user-account-header__avatar-image"
              />
            </div>
            <div className="user-account-header__info">
              <h1 className="user-account-header__title">
                {t('subscription.userAccount.title')}
              </h1>
              <div className="user-account-header__details">
                <p className="username">{user.username}</p>
                <p className="email">{user.email}</p>
              </div>
            </div>
            <div className="user-account-header__actions">
              <button className="logout-button" onClick={handleLogout}>
                {t('subscription.userAccount.logout')}
              </button>
            </div>
          </div>
        </header>

        {/* Error State */}
        {error && (
          <div className="user-account-error">
            <p>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="user-account-loading">
            <div className="user-account-loading__spinner" />
            <p>{t('common.loading')}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="user-account-content">
          {/* Current Plan Section */}
          <section className="user-account-section">
            <h2 className="user-account-section__title">
              {t('subscription.userAccount.currentPlan')}
            </h2>
            <PlanInfo plan={userPlan} loading={loading} />
          </section>

          {/* Active Promotions Section */}
          <section className="user-account-section">
            <h2 className="user-account-section__title">
              {t('redemption.activePromotions.title')}
            </h2>
            <div className="user-account-section__content">
              <ActivePromotions />
            </div>
          </section>

          {/* Redemption Code Section */}
          <section className="user-account-section">
            <h2 className="user-account-section__title">
              {t('subscription.userAccount.redemptionCode')}
            </h2>
            <div className="user-account-section__content">
              <div className="user-account-redemption">
                <p className="user-account-redemption__description">
                  {t('subscription.userAccount.redemptionDescription')}
                </p>
                <div className="user-account-redemption__input">
                  <RedemptionCodeInput
                    location="account"
                    onRedemptionSuccess={handleRedemptionSuccess}
                    onRedemptionError={handleRedemptionError}
                    placeholder={t('redemption.inputPlaceholder')}
                    showPreview={true}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Redemption History Section */}
          <section className="user-account-section">
            <h2 className="user-account-section__title">
              {t('redemption.history.title')}
            </h2>
            <div className="user-account-section__content">
              <RedemptionHistory />
            </div>
          </section>

          {/* Usage Statistics Section - Hidden per user request */}
          {/* 
          <section className="user-account-section">
            <h2 className="user-account-section__title">
              {t('subscription.userAccount.usageStats')}
            </h2>
            <UsageStats stats={usageStats} loading={loading} />
          </section>
          */}

          {/* Subscription History Section */}
          <section className="user-account-section">
            <h2 className="user-account-section__title">
              {t('subscription.userAccount.subscriptionHistory')}
            </h2>
            <SubscriptionHistory history={subscriptionHistory} loading={loading} />
          </section>

          {/* Payment History Section */}
          <section className="user-account-section">
            <h2 className="user-account-section__title">
              {t('subscription.userAccount.paymentHistory')}
            </h2>
            <PaymentHistory />
          </section>
        </div>
      </div>
    </div>
  );
};