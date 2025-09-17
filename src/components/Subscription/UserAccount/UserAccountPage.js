import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Auth/useAuth';
import { useSubscription } from '../SubscriptionContext';
import { PlanInfo } from './components/PlanInfo';
// import { UsageStats } from './components/UsageStats'; // Hidden per user request
import PaymentHistory from '../../Payment/PaymentHistory';
import { Analytics } from '../../../utils/analytics';
import './UserAccountPage.css';

export const UserAccountPage = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { userPlan, loading, error } = useSubscription();
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    Analytics.track('user_account_page_viewed', {
      userId: user?.id,
      planType: userPlan?.type || 'unknown'
    });
  }, [user, userPlan]);

  const handleAvatarError = () => {
    console.warn('User account avatar failed to load:', user?.avatarUrl);
    setAvatarError(true);
  };

  const handleAvatarLoad = () => {
    setAvatarError(false);
  };

  // 生成預設頭像（使用用戶名首字母）
  const getDefaultAvatar = () => {
    const initial = user?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?';
    return (
      <div className="user-account-header__avatar-default">
        {initial}
      </div>
    );
  };

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
              {!avatarError && user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={t('userProfile.avatarAlt', { username: user.username })}
                  className="user-account-header__avatar-image"
                  onError={handleAvatarError}
                  onLoad={handleAvatarLoad}
                />
              ) : (
                getDefaultAvatar()
              )}
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

          {/* Usage Statistics Section - Hidden per user request */}
          {/* 
          <section className="user-account-section">
            <h2 className="user-account-section__title">
              {t('subscription.userAccount.usageStats')}
            </h2>
            <UsageStats stats={usageStats} loading={loading} />
          </section>
          */}

          {/* Payment History Section */}
          <section className="user-account-section user-account-section--payment-history">
            <PaymentHistory userId={user?.id} />
          </section>
        </div>
      </div>
    </div>
  );
};