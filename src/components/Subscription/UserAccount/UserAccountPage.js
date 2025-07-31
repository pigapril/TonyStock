import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Auth/useAuth';
import { useSubscription } from '../SubscriptionContext';
import { PlanInfo } from './components/PlanInfo';
import { UsageStats } from './components/UsageStats';
import { SubscriptionHistory } from './components/SubscriptionHistory';
import { AccountSettings } from './components/AccountSettings';
import { Analytics } from '../../../utils/analytics';
import './UserAccountPage.css';

export const UserAccountPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { userPlan, usageStats, subscriptionHistory, loading, error } = useSubscription();

  useEffect(() => {
    Analytics.track('user_account_page_viewed', {
      userId: user?.id,
      planType: userPlan?.type || 'unknown'
    });
  }, [user, userPlan]);

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
              <p className="user-account-header__username">
                {user.username}
              </p>
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

          {/* Usage Statistics Section */}
          <section className="user-account-section">
            <h2 className="user-account-section__title">
              {t('subscription.userAccount.usageStats')}
            </h2>
            <UsageStats stats={usageStats} loading={loading} />
          </section>

          {/* Subscription History Section */}
          <section className="user-account-section">
            <h2 className="user-account-section__title">
              {t('subscription.userAccount.subscriptionHistory')}
            </h2>
            <SubscriptionHistory history={subscriptionHistory} loading={loading} />
          </section>

          {/* Account Settings Section */}
          <section className="user-account-section">
            <h2 className="user-account-section__title">
              {t('subscription.userAccount.accountSettings')}
            </h2>
            <AccountSettings user={user} />
          </section>
        </div>
      </div>
    </div>
  );
};