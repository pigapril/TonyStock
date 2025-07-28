import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../Auth/useAuth';
import { AppleButton } from '../../shared/AppleButton';
import { Analytics } from '../../../../utils/analytics';
import csrfClient from '../../../../utils/csrfClient';
import './AccountSettings.css';

export const AccountSettings = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      csrfClient.clearCSRFToken();
      
      Analytics.user.logout({
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      
      // Redirect to home page
      const lang = document.documentElement.lang || 'zh-TW';
      window.location.href = `/${lang}/`;
    } catch (error) {
      console.error('Logout error:', error);
      Analytics.error({
        type: 'AUTH_ERROR',
        code: error.code || 500,
        message: error.message
      });
    }
  };

  const handleChangePassword = () => {
    // This would typically open a change password dialog or navigate to a change password page
    // For now, we'll just log the action
    Analytics.ui.button.click({
      buttonType: 'changePassword',
      location: 'accountSettings'
    });
    
    // TODO: Implement change password functionality
    console.log('Change password clicked');
  };

  const handleDeleteAccount = () => {
    // This would typically open a confirmation dialog
    // For now, we'll just log the action
    Analytics.ui.button.click({
      buttonType: 'deleteAccount',
      location: 'accountSettings'
    });
    
    // TODO: Implement delete account functionality
    console.log('Delete account clicked');
  };

  const handleExportData = () => {
    // This would typically trigger a data export
    Analytics.ui.button.click({
      buttonType: 'exportData',
      location: 'accountSettings'
    });
    
    // TODO: Implement data export functionality
    console.log('Export data clicked');
  };

  return (
    <div className="account-settings">
      {/* Account Information */}
      <div className="account-settings__section">
        <h3 className="account-settings__section-title">
          {t('accountSettings.accountInfo', 'Account Information')}
        </h3>
        <div className="account-settings__info-grid">
          <div className="account-settings__info-item">
            <span className="account-settings__info-label">
              {t('accountSettings.email', 'Email')}
            </span>
            <span className="account-settings__info-value">
              {user?.email}
            </span>
          </div>
          <div className="account-settings__info-item">
            <span className="account-settings__info-label">
              {t('accountSettings.username', 'Username')}
            </span>
            <span className="account-settings__info-value">
              {user?.username}
            </span>
          </div>
          <div className="account-settings__info-item">
            <span className="account-settings__info-label">
              {t('accountSettings.memberSince', 'Member Since')}
            </span>
            <span className="account-settings__info-value">
              {user?.createdAt 
                ? new Date(user.createdAt).toLocaleDateString(document.documentElement.lang || 'zh-TW', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : t('accountSettings.unknown', 'Unknown')
              }
            </span>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="account-settings__section">
        <h3 className="account-settings__section-title">
          {t('accountSettings.security', 'Security')}
        </h3>
        <div className="account-settings__actions">
          <AppleButton
            variant="secondary"
            size="medium"
            onClick={handleChangePassword}
            className="account-settings__action-btn"
          >
            {t('accountSettings.changePassword', 'Change Password')}
          </AppleButton>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="account-settings__section">
        <h3 className="account-settings__section-title">
          {t('accountSettings.dataPrivacy', 'Data & Privacy')}
        </h3>
        <div className="account-settings__actions">
          <AppleButton
            variant="secondary"
            size="medium"
            onClick={handleExportData}
            className="account-settings__action-btn"
          >
            {t('accountSettings.exportData', 'Export My Data')}
          </AppleButton>
        </div>
        <p className="account-settings__privacy-note">
          {t('accountSettings.privacyNote', 'We respect your privacy and will never share your personal information with third parties.')}
        </p>
      </div>

      {/* Account Actions */}
      <div className="account-settings__section">
        <h3 className="account-settings__section-title">
          {t('accountSettings.accountActions', 'Account Actions')}
        </h3>
        <div className="account-settings__actions">
          <AppleButton
            variant="primary"
            size="large"
            onClick={handleLogout}
            className="account-settings__logout-btn"
          >
            {t('accountSettings.logout', 'Sign Out')}
          </AppleButton>
          
          <AppleButton
            variant="danger"
            size="medium"
            onClick={handleDeleteAccount}
            className="account-settings__delete-btn"
          >
            {t('accountSettings.deleteAccount', 'Delete Account')}
          </AppleButton>
        </div>
      </div>

      {/* Help & Support */}
      <div className="account-settings__section">
        <h3 className="account-settings__section-title">
          {t('accountSettings.helpSupport', 'Help & Support')}
        </h3>
        <div className="account-settings__help-links">
          <a 
            href="mailto:support@sentimentinsideout.com"
            className="account-settings__help-link"
          >
            {t('accountSettings.contactSupport', 'Contact Support')}
          </a>
          <a 
            href="/privacy-policy"
            className="account-settings__help-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('accountSettings.privacyPolicy', 'Privacy Policy')}
          </a>
          <a 
            href="/terms-of-service"
            className="account-settings__help-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('accountSettings.termsOfService', 'Terms of Service')}
          </a>
        </div>
      </div>
    </div>
  );
};