import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Analytics } from '../../utils/analytics';
import './styles/SignInButton.css';

export const SignInButton = ({ variant = 'default' }) => {
    const buttonRef = useRef(null);
    const { renderGoogleButton, loading } = useAuth();
    const [browserSupport, setBrowserSupport] = useState(null);
    
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
        if (!loading && buttonRef.current) {
            renderGoogleButton(buttonRef.current);
            
            Analytics.auth.login({ 
                method: 'google', 
                status: 'button_rendered',
                variant,
                browserSupport
            });
        }
    }, [loading, renderGoogleButton, variant, browserSupport]);

    return (
        <div 
            ref={buttonRef}
            className={`signin-button-container signin-button-container--${variant}`}
            aria-label="使用 Google 登入"
            data-fedcm-support={browserSupport?.isSupported}
        />
    );
}; 