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
                console.log('Starting auth callback process');
                
                const response = await fetch(`/api/auth/google/callback${location.search}`, {
                    credentials: 'include'
                });
                
                const data = await response.json();
                console.log('Auth response:', data);
                
                if (data.status === 'success' && data.data.user) {
                    console.log('Auth successful, user:', data.data.user);
                    await checkAuthStatus();
                    
                    const redirectPath = localStorage.getItem('auth_redirect') || '/';
                    localStorage.removeItem('auth_redirect');
                    
                    Analytics.auth.login({
                        method: 'google',
                        status: 'success',
                        userId: data.data.user.id
                    });

                    navigate(redirectPath, { replace: true });
                } else {
                    console.error('Auth response format unexpected:', data);
                    throw new Error('登入回應格式異常');
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