import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import './GoogleLoginButton.css';

const GoogleLoginButton = () => {
    const { login } = useAuth();

    const handleLogin = async () => {
        try {
            await login(window.location.pathname);
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    return (
        <button 
            className="google-login-button" 
            onClick={handleLogin}
            aria-label="使用 Google 登入"
        >
            <span className="button-text">Sign In</span>
        </button>
    );
};

export default GoogleLoginButton; 