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
                
                // 直接從當前 URL 獲取回調數據
                const response = await fetch(`/api/auth/google/callback${location.search}`, {
                    credentials: 'include'
                });
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    console.log('Auth successful, updating status');
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
                console.error('Auth callback failed:', error);
                // ... 錯誤處理邏輯 ...
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