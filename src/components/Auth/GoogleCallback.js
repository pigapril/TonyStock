import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Analytics } from '../../utils/analytics';

export const GoogleCallback = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { checkAuthStatus } = useAuth();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                console.log('Google callback details:', {
                    url: window.location.href,
                    search: location.search,
                    pathname: location.pathname,
                    referrer: document.referrer,
                    timestamp: new Date().toISOString()
                });

                const searchParams = new URLSearchParams(location.search);
                console.log('URL parameters:', Object.fromEntries(searchParams.entries()));
                const error = searchParams.get('error');
                const success = searchParams.get('success');
                const code = searchParams.get('code');

                console.log('Callback parameters:', {
                    error,
                    success,
                    code: code ? 'exists' : 'missing',
                    timestamp: new Date().toISOString()
                });

                if (error) {
                    console.error('Google callback error:', error);
                    throw new Error(decodeURIComponent(error));
                }

                if (success) {
                    const authDetails = {
                        userAgent: navigator.userAgent,
                        platform: navigator.platform,
                        isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
                        cookies: document.cookie,
                        localStorage: {
                            redirect: localStorage.getItem('auth_redirect'),
                        },
                        timestamp: new Date().toISOString()
                    };
                    console.log('Auth process details:', JSON.stringify(authDetails, null, 2));

                    console.log('Starting auth status check...');
                    await checkAuthStatus();
                    
                    const redirectPath = localStorage.getItem('auth_redirect') || '/';
                    console.log('Redirect details:', JSON.stringify({
                        path: redirectPath,
                        currentLocation: window.location.href,
                        timestamp: new Date().toISOString()
                    }, null, 2));
                    
                    Analytics.auth.login({
                        method: 'google',
                        status: 'success',
                        platform: navigator.userAgent
                    });

                    navigate(redirectPath, { replace: true });
                }
            } catch (error) {
                console.error('Callback error details:', {
                    error: error.message,
                    stack: error.stack,
                    url: window.location.href,
                    cookies: document.cookie,
                    timestamp: new Date().toISOString()
                });
                
                Analytics.error({
                    status: 'error',
                    errorCode: 'GOOGLE_CALLBACK_ERROR',
                    message: error.message,
                    userAgent: navigator.userAgent
                });
                
                const redirectPath = localStorage.getItem('auth_redirect') || '/';
                console.log('Error redirect to:', redirectPath);
                
                navigate(redirectPath, { 
                    replace: true,
                    state: { 
                        showSignInDialog: true, 
                        error: error.message 
                    }
                });
            }
        };

        handleCallback();
    }, [location, navigate, checkAuthStatus]);

    return (
        <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>處理登入中...</p>
        </div>
    );
}; 