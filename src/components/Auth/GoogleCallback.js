import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Analytics } from '../../utils/analytics';

export const GoogleCallback = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { handleGoogleCallback } = useAuth();

    useEffect(() => {
        const processCallback = async () => {
            try {
                console.log('Starting callback process...', location.search);
                
                const user = await handleGoogleCallback(location.search);
                console.log('Callback successful, user:', user);

                const redirectPath = localStorage.getItem('auth_redirect') || '/';
                localStorage.removeItem('auth_redirect');
                
                console.log('Redirecting to:', redirectPath);

                if (user && user.id) {
                    Analytics.auth.login({
                        method: 'google',
                        status: 'success',
                        userId: user.id
                    });
                }

                navigate(redirectPath, { replace: true });
            } catch (error) {
                console.error('Auth callback failed:', error);
                
                Analytics.auth.login({
                    method: 'google',
                    status: 'error',
                    error: error.message
                });

                navigate('/', {
                    replace: true,
                    state: {
                        error: '登入失敗，請稍後再試'
                    }
                });
            }
        };

        processCallback();
    }, [location.search, navigate, handleGoogleCallback]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#fff'
        }}>
            <div className="loading-spinner"></div>
            <p style={{ marginTop: '20px', color: '#333' }}>登入處理中，請稍候...</p>
        </div>
    );
}; 