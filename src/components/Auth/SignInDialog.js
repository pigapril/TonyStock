import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import './SignInDialog.css';

const SignInDialog = ({ onClose }) => {
    const { login } = useAuth();

    const handleGoogleLogin = async () => {
        try {
            await login(window.location.pathname);
            onClose();
        } catch (error) {
            console.error('Google login failed:', error);
        }
    };

    return (
        <div className="signin-dialog-overlay" onClick={onClose}>
            <div className="signin-dialog" onClick={e => e.stopPropagation()}>
                <div className="dialog-header">
                    <h2>登入</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                <div className="dialog-content">
                    <button 
                        className="google-login-option"
                        onClick={handleGoogleLogin}
                    >
                        <img 
                            src="/images/google-logo.svg" 
                            alt="Google Logo" 
                        />
                        使用 Google 帳號登入
                    </button>
                    {/* 未來可以在這裡添加其他登入選項 */}
                </div>
            </div>
        </div>
    );
};

export default SignInDialog; 