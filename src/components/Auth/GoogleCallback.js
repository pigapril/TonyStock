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
                console.log('Google Callback initiated:', {
                    search: location.search,
                    currentCookies: document.cookie,
                    timestamp: new Date().toISOString()
                });

                const searchParams = new URLSearchParams(location.search);
                const error = searchParams.get('error');
                const success = searchParams.get('success');

                if (error) {
                    throw new Error(decodeURIComponent(error));
                }

                if (success) {
                    console.log('Auth success, before checkAuthStatus:', {
                        cookies: document.cookie,
                        timestamp: new Date().toISOString()
                    });

                    await checkAuthStatus();
                    
                    console.log('After checkAuthStatus:', {
                        cookies: document.cookie,
                        timestamp: new Date().toISOString()
                    });
                    
                    const redirectPath = localStorage.getItem('auth_redirect') || '/';
                    localStorage.removeItem('auth_redirect');
                    
                    Analytics.auth.login({
                        method: 'google',
                        status: 'success'
                    });

                    navigate(redirectPath, { replace: true });
                }
            } catch (error) {
                console.log('Callback error state:', {
                    error: error.message,
                    cookies: document.cookie,
                    timestamp: new Date().toISOString()
                });
                
                Analytics.error({
                    status: 'error',
                    errorCode: 'GOOGLE_CALLBACK_ERROR',
                    message: error.message
                });
                
                const redirectPath = localStorage.getItem('auth_redirect') || '/';
                localStorage.removeItem('auth_redirect');
                
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