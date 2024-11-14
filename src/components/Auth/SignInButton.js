import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Analytics } from '../../utils/analytics';
import './styles/SignInButton.css';
import { handleApiError } from '../../utils/errorHandler';

export const SignInButton = ({ variant = 'default' }) => {
    const { googleLogin, loading } = useAuth();
    
    const handleClick = async () => {
        if (!loading) {
            try {
                Analytics.auth.login({ 
                    method: 'google', 
                    status: 'initiated',
                    variant 
                });
                await googleLogin();
            } catch (error) {
                const handledError = handleApiError(error);
                Analytics.error({
                    status: handledError.status,
                    errorCode: handledError.errorCode,
                    message: handledError.message
                });
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
        }
    };

    return (
        <button 
            className={`signin-button signin-button--${variant}`}
            onClick={handleClick}
            onKeyPress={handleKeyPress}
            disabled={loading}
            aria-label="使用 Google 登入"
            tabIndex={0}
        >
            <img 
                src="/google-icon.svg" 
                alt="Google" 
                className="signin-button__icon"
            />
            {loading ? '登入中...' : '使用 Google 登入'}
        </button>
    );
}; 