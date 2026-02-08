import { useDialog } from '../../components/Common/Dialog/useDialog';
import { useAuth } from '../Auth/useAuth'; // 更新路徑
import { Dialog } from '../Common/Dialog/Dialog';
import { useRef, useEffect } from 'react';
import { Analytics } from '../../utils/analytics';
import { useTranslation } from 'react-i18next';

export function AuthDialog() {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;
    const { dialog, closeDialog } = useDialog();
    const { loading, renderGoogleButton, user } = useAuth();
    const buttonRef = useRef(null);

    const getImagePath = (baseName, extension = 'png') => {
        const langSuffix = currentLang !== 'zh-TW' ? '-en' : '';
        return `/images/${baseName}${langSuffix}.${extension}`;
    };

    useEffect(() => {
        const handleLoginSuccess = () => {
            console.log('Login success event received');
            closeDialog();
        };

        window.addEventListener('loginSuccess', handleLoginSuccess);

        if (dialog.isOpen && dialog.type === 'auth') {
            if (user) {
                console.log('Auth dialog closing due to user presence');
                closeDialog();
                return;
            }

            if (buttonRef.current) {
                if (window.google?.accounts?.id) {
                    window.google.accounts.id.cancel();
                }

                renderGoogleButton(buttonRef.current, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'rectangular',
                    logo_alignment: 'center',
                    context: dialog.source || 'dialog'
                });

                Analytics.ui.dialog.open({
                    type: 'auth',
                    source: dialog.source || 'user_action'
                });
            }
        }

        return () => {
            if (window.google?.accounts?.id) {
                window.google.accounts.id.cancel();
            }
            window.removeEventListener('loginSuccess', handleLoginSuccess);
        };
    }, [dialog.isOpen, dialog.type, dialog.source, closeDialog, renderGoogleButton, user]);

    const handleClose = () => {
        closeDialog();
        Analytics.auth.login({
            method: 'google',
            status: 'cancelled',
            reason: 'user_close'
        });
    };

    if (dialog.type !== 'auth') return null;

    const defaultDescription = (
        <div className="auth-dialog-description">
            <img
                src={getImagePath('home-feature1')}
                alt={t('authDialog.previewAlt')}
                className="auth-dialog-preview-image"
            />
            <ul className="feature-list">
                <li>{t('authDialog.feature1')}</li>
                <li>{t('authDialog.feature2')}</li>
                <li>{t('authDialog.feature3')}</li>
            </ul>
        </div>
    );

    return (
        <Dialog
            open={dialog.isOpen}
            onClose={handleClose}
            title={dialog.props?.customTitle || t('authDialog.title')}
            titleClassName="auth-dialog-title"
        >
            <div className="auth-dialog-content">
                {loading && (
                    <div className="signin-dialog__loading">
                        <div className="signin-dialog__loading__spinner"></div>
                        <span>{t('signInButton.loading')}</span>
                    </div>
                )}
                <div
                    ref={buttonRef}
                    className={`google-button-container ${loading ? 'google-button-container--hidden' : ''}`}
                />

                {dialog.props?.customDescription || defaultDescription}
            </div>
        </Dialog>
    );
} 