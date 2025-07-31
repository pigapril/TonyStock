import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../Auth/useAuth';
import { AppleButton } from '../../shared/AppleButton';
import { Analytics } from '../../../../utils/analytics';
import './AccountSettings.css';

export const AccountSettings = ({ user }) => {
  const { t } = useTranslation();
  const { logout } = useAuth();

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
        context: 'AccountSettings.handleLogout'
      });
    }
  };

  const copyEmail = () => {
    if (navigator.clipboard && user?.email) {
      navigator.clipboard.writeText(user.email);
      
      // Show a simple feedback (you could use a toast notification here)
      const button = document.querySelector('.account-settings__email-copy');
      if (button) {
        const originalText = button.textContent;
        button.textContent = t('common.copied');
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
      
      Analytics.track('user_email_copied', {
        userId: user?.id
      });
    }
  };

  if (!user) {
    return (
      <div className="account-settings account-settings--error">
        <p>{t('subscription.userAccount.userNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="account-settings">
      {/* Email Section */}
      <div className="account-settings__section">
        <div className="account-settings__section-header">
          <h4 className="account-settings__section-title">
            {t('subscription.userAccount.email')}
          </h4>
        </div>
        <div className="account-settings__email-container">
          <div className="account-settings__email-info">
            <span className="account-settings__email-address">
              {user.email}
            </span>
            <span className="account-settings__email-status">
              {t('subscription.userAccount.emailVerified')}
            </span>
          </div>
          <button
            className="account-settings__email-copy"
            onClick={copyEmail}
            title={t('common.copyToClipboard')}
          >
            📋
          </button>
        </div>
      </div>

      {/* Account Actions Section */}
      <div className="account-settings__section">
        <div className="account-settings__section-header">
          <h4 className="account-settings__section-title">
            {t('subscription.userAccount.accountActions')}
          </h4>
        </div>
        <div className="account-settings__actions">
          <AppleButton
            variant="destructive"
            size="medium"
            onClick={handleLogout}
            className="account-settings__logout-button"
          >
            {t('subscription.userAccount.logout')}
          </AppleButton>
        </div>
      </div>

      {/* User Information Section */}
      <div className="account-settings__section">
        <div className="account-settings__section-header">
          <h4 className="account-settings__section-title">
            {t('subscription.userAccount.userInfo')}
          </h4>
        </div>
        <div className="account-settings__info-grid">
          <div className="account-settings__info-item">
            <span className="account-settings__info-label">
              {t('subscription.userAccount.userId')}:
            </span>
            <span className="account-settings__info-value">
              {user.id}
            </span>
          </div>
          
          <div className="account-settings__info-item">
            <span className="account-settings__info-label">
              {t('subscription.userAccount.username')}:
            </span>
            <span className="account-settings__info-value">
              {user.username}
            </span>
          </div>
          
          <div className="account-settings__info-item">
            <span className="account-settings__info-label">
              {t('subscription.userAccount.joinDate')}:
            </span>
            <span className="account-settings__info-value">
              {user.createdAt ? new Intl.DateTimeFormat('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }).format(new Date(user.createdAt)) : t('common.unknown')}
            </span>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="account-settings__privacy-notice">
        <div className="account-settings__privacy-icon">🔒</div>
        <div className="account-settings__privacy-text">
          <p className="account-settings__privacy-title">
            {t('subscription.userAccount.privacyTitle')}
          </p>
          <p className="account-settings__privacy-description">
            {t('subscription.userAccount.privacyDescription')}
          </p>
        </div>
      </div>
    </div>
  );
};