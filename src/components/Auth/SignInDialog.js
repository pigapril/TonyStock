import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { SignInButton } from './SignInButton';
import Analytics from '../../utils/analytics';
import './styles/SignInDialog.css';

export const SignInDialog = ({ isOpen, onClose }) => {
    const dialogRef = useRef(null);
    const { loading } = useAuth();

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
            document.addEventListener('keydown', handleEscapeKey);
            dialogRef.current?.focus();
        }

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isOpen, onClose]);

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
                    請選擇登入方式以繼續使用服務
                </p>

                {loading ? (
                    <div className="signin-dialog__loading">
                        載入中...
                    </div>
                ) : (
                    <div className="signin-dialog__buttons">
                        <SignInButton />
                    </div>
                )}
            </div>
        </div>
    );
}; 