import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Analytics } from '../../utils/analytics';
import './styles/SignInDialog.css';

export const SignInDialog = ({ isOpen, onClose, message, returnPath }) => {
    const dialogRef = useRef(null);
    const buttonRef = useRef(null);
    const { loading, renderGoogleButton } = useAuth();

    useEffect(() => {
        const handleEscapeKey = (event) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
                Analytics.auth.login({ 
                    method: 'google', 
                    status: 'cancelled',
                    reason: 'escape_key'
                });
            }
        };

        if (isOpen) {
            console.log('SignInDialog render attempt:', {
                buttonRef: {
                    exists: !!buttonRef.current,
                    id: buttonRef.current?.id,
                    className: buttonRef.current?.className
                },
                loading,
                hasRenderFunction: !!renderGoogleButton,
                googleSDK: {
                    hasSDK: !!window.google,
                    hasAccounts: !!window.google?.accounts,
                    hasId: !!window.google?.accounts?.id,
                    hasRender: !!window.google?.accounts?.id?.renderButton
                },
                timestamp: new Date().toISOString()
            });

            document.addEventListener('keydown', handleEscapeKey);
            dialogRef.current?.focus();
            
            // 當對話框開啟時渲染 Google 按鈕
            if (!loading && buttonRef.current) {
                renderGoogleButton(buttonRef.current, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'rectangular',
                    logo_alignment: 'left',
                    context: 'dialog'
                });
            }

            // 可選：顯示 One Tap
            if (window.google?.accounts?.id) {
                window.google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed()) {
                        Analytics.auth.login({
                            method: 'google_one_tap',
                            status: 'not_displayed',
                            reason: notification.getNotDisplayedReason()
                        });
                    }
                });
            }
        }

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isOpen, onClose, loading, renderGoogleButton]);

    if (!isOpen) return null;

    return (
        <div 
            className="signin-dialog-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                    Analytics.auth.login({ 
                        method: 'google', 
                        status: 'cancelled',
                        reason: 'overlay_click'
                    });
                }
            }}
        >
            <div 
                className="signin-dialog"
                ref={dialogRef}
                role="dialog"
                aria-labelledby="dialog-title"
                aria-modal="true"
                tabIndex={-1}
            >
                <button 
                    className="signin-dialog__close"
                    onClick={onClose}
                    aria-label="關閉登入視窗"
                >
                    ✕
                </button>
                
                <h2 id="dialog-title" className="signin-dialog__title">
                    登入
                </h2>
                
                <p className="signin-dialog__description">
                    {message || '請選擇登入方式以繼續使用服務'}
                </p>

                {loading ? (
                    <div className="signin-dialog__loading">
                        載入中...
                    </div>
                ) : (
                    <div className="signin-dialog__buttons">
                        <div 
                            ref={buttonRef}
                            className="google-button-container"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}; 