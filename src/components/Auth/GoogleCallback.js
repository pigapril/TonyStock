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
                const searchParams = new URLSearchParams(location.search);
                const error = searchParams.get('error');
                const success = searchParams.get('success');

                if (error) {
                    throw new Error(decodeURIComponent(error));
                }

                if (success) {
                    await checkAuthStatus();
                    
                    const redirectPath = localStorage.getItem('auth_redirect') || '/';
                    localStorage.removeItem('auth_redirect');
                    
                    Analytics.auth.login({
                        method: 'google',
                        status: 'success'
                    });

                    navigate(redirectPath, { replace: true });
                }
            } catch (error) {
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