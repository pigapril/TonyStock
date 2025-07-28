import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Auth/useAuth';
import { useSubscription } from '../context/SubscriptionContext';
import { PlanInfo } from './components/PlanInfo';
import { UsageStats } from './components/UsageStats';
import { SubscriptionHistory } from './components/SubscriptionHistory';
import { AccountSettings } from './components/AccountSettings';
import './UserAccountPage.css';

export const UserAccountPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { refreshSubscriptionData, loading } = useSubscription();

  // Refresh data when component mounts
  useEffect(() => {
    refreshSubscriptionData();
  }, [refreshSubscriptionData]);

  if (!user) {
    return (
      <div className="user-account-page">
        <div className="user-account-page__error">
          <h1>{t('userAccount.notLoggedIn', 'Please log in to view your account')}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="user-account-page">
      <div className="user-account-page__container">
        {/* Header Section */}
        <header className="user-account-page__header">
          <div className="user-account-page__user-info">
            <div className="user-account-page__avatar">
              <img 
                src={user.avatarUrl || '/default-avatar.png'} 
                alt={t('userAccount.avatarAlt', 'User avatar')}
                className="user-account-page__avatar-image"
              />
            </div>
            <div className="user-account-page__user-details">
              <h1 className="user-account-page__username">{user.username}</h1>
              <p className="user-account-page__email">{user.email}</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="user-account-page__main">
          {loading ? (
            <div className="user-account-page__loading">
              <div className="user-account-page__loading-spinner" />
              <p>{t('userAccount.loading', 'Loading account information...')}</p>
            </div>
          ) : (
            <div className="user-account-page__sections">
              {/* Current Plan Section */}
              <section className="user-account-page__section">
                <h2 className="user-account-page__section-title">
                  {t('userAccount.currentPlan', 'Current Plan')}
                </h2>
                <PlanInfo />
              </section>

              {/* Usage Statistics Section */}
              <section className="user-account-page__section">
                <h2 className="user-account-page__section-title">
                  {t('userAccount.usageStats', 'Usage Statistics')}
                </h2>
                <UsageStats />
              </section>

              {/* Subscription History Section */}
              <section className="user-account-page__section">
                <h2 className="user-account-page__section-title">
                  {t('userAccount.subscriptionHistory', 'Subscription History')}
                </h2>
                <SubscriptionHistory />
              </section>

              {/* Account Settings Section */}
              <section className="user-account-page__section">
                <h2 className="user-account-page__section-title">
                  {t('userAccount.accountSettings', 'Account Settings')}
                </h2>
                <AccountSettings />
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};