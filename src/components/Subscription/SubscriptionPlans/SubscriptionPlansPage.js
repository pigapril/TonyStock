import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../Auth/useAuth';
import { useSubscription } from '../SubscriptionContext';
import { PlanCard } from './components/PlanCard';
import { PlanComparison } from './components/PlanComparison';
import { Analytics } from '../../../utils/analytics';
import subscriptionService from '../../../api/subscriptionService';
import './SubscriptionPlansPage.css';

export const SubscriptionPlansPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { userPlan } = useSubscription();
  const location = useLocation();
  const [upgradeNotification, setUpgradeNotification] = useState(null);

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

  return (
    <div className="subscription-plans-page">
      <div className="subscription-plans-container">
        {/* Upgrade Notification */}
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

        {/* Plan Cards */}
        <section className="subscription-plans-cards">
          {availablePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlan={userPlan?.type}
              isCurrentUser={!!user}
            />
          ))}
        </section>

        {/* Feature Comparison */}
        <section className="subscription-plans-comparison">
          <PlanComparison plans={availablePlans} />
        </section>
      </div>
    </div>
  );
};