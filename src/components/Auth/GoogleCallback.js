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
                const response = await fetch(`/api/auth/google/callback${location.search}`, {
                    credentials: 'include'
                });
                
                const data = await response.json();
                
                if (data.status === 'success' && data.data.user) {
                    await checkAuthStatus();
                    
                    const redirectPath = localStorage.getItem('auth_redirect') || '/';
                    localStorage.removeItem('auth_redirect');
                    
                    Analytics.auth.login({
                        method: 'google',
                        status: 'success',
                        userId: data.data.user.id
                    });

                    navigate(redirectPath, { replace: true });
                } else if (data.status === 'error') {
                    throw new Error(data.error.message);
                }
            } catch (error) {
                console.error('Auth callback failed:', error);
                
                navigate('/auth/error', { 
                    state: { 
                        error: error.message,
                        returnPath: localStorage.getItem('auth_redirect') || '/'
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