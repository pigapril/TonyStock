import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../Auth/useAuth'; // 更新路徑
import { Analytics } from '../../utils/analytics';
import { useTranslation } from 'react-i18next';
import './styles/SignInButton.css';

export const SignInButton = ({ variant = 'default' }) => {
    const buttonRef = useRef(null);
    const { renderGoogleButton, loading, isGoogleInitialized } = useAuth();
    const [browserSupport, setBrowserSupport] = useState(null);
    const { t } = useTranslation();
    
    useEffect(() => {
        const checkBrowser = () => {
            const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
            const chromeVersion = parseInt((/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [])[1], 10);
            const hasFedCMSupport = !!(
                window.google?.accounts?.id?.initialize &&
                'FederatedCredential' in window
            );

            setBrowserSupport({
                isSupported: isChrome && chromeVersion >= 117 && hasFedCMSupport,
                browserInfo: {
                    isChrome,
                    chromeVersion,
                    hasFedCMSupport
                }
            });
        };

        checkBrowser();
    }, []);

    useEffect(() => {
        if (!loading && isGoogleInitialized && buttonRef.current) {
            renderGoogleButton(buttonRef.current);
            
            Analytics.auth.login({ 
                method: 'google', 
                status: 'button_rendered',
                variant,
                browserSupport
            });
        }
    }, [loading, isGoogleInitialized, renderGoogleButton, variant, browserSupport]);

    if (!isGoogleInitialized) {
        return (
            <div className={`signin-button-loading signin-button-loading--${variant}`}>
                <div className="signin-button-loading__spinner"></div>
                <span>{t('signInButton.loading')}</span>
            </div>
        );
    }

    return (
        <div 
            ref={buttonRef}
            className={`signin-button-container signin-button-container--${variant}`}
            aria-label={t('signInButton.googleAriaLabel')}
            data-fedcm-support={browserSupport?.isSupported}
        />
    );
}; 