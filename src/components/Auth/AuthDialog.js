import { useDialog } from '../../hooks/useDialog';
import { useAuth } from '../Auth/useAuth'; // 更新路徑
import { Dialog } from '../Common/Dialog';
import { useRef, useEffect } from 'react';
import { Analytics } from '../../utils/analytics';

export function AuthDialog() {
    const { dialog, closeDialog } = useDialog();
    const { loading, renderGoogleButton, user } = useAuth();
    const buttonRef = useRef(null);

    useEffect(() => {
        const handleLoginSuccess = () => {
            console.log('Login success event received');
            closeDialog();
        };

        window.addEventListener('loginSuccess', handleLoginSuccess);
        
        if (dialog.isOpen && dialog.type === 'auth') {
            if (user) {
                console.log('Auth dialog closing due to user presence');
                closeDialog();
                return;
            }

            if (buttonRef.current) {
                if (window.google?.accounts?.id) {
                    window.google.accounts.id.cancel();
                }

                renderGoogleButton(buttonRef.current, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'rectangular',
                    logo_alignment: 'left',
                    context: dialog.source || 'dialog'
                });
                
                Analytics.ui.dialog.open({
                    type: 'auth',
                    source: dialog.source || 'user_action'
                });
            }
        }

        return () => {
            if (window.google?.accounts?.id) {
                window.google.accounts.id.cancel();
            }
            window.removeEventListener('loginSuccess', handleLoginSuccess);
        };
    }, [dialog.isOpen, dialog.type, dialog.source, closeDialog, renderGoogleButton, user]);

    const handleClose = () => {
        closeDialog();
        Analytics.auth.login({ 
            method: 'google', 
            status: 'cancelled',
            reason: 'user_close'
        });
    };

    if (dialog.type !== 'auth') return null;

    const defaultDescription = (
        <div className="auth-dialog-description">
            <img 
                src="/images/watchlist-preview.png" 
                alt="追蹤清單功能預覽"
                className="auth-dialog-preview-image"
            />
            <ul className="feature-list">
                <li>🎯 追蹤感興趣的股票</li>
                <li>📊 一次分析多個結果</li>
                <li>💬 由AI客服回答問題</li>
            </ul>
        </div>
    );

    return (
        <Dialog
            open={dialog.isOpen}
            onClose={handleClose}
            title={dialog.props?.customTitle || "🚀 登入就能使用完整功能！"}
            titleClassName="auth-dialog-title"
        >
            <div className="auth-dialog-content">
                {loading ? (
                    <div className="signin-dialog__loading">
                        載入中...
                    </div>
                ) : (
                    <div 
                        ref={buttonRef} 
                        className="google-button-container" 
                    />
                )}
                
                {dialog.props?.customDescription || defaultDescription}
            </div>
        </Dialog>
    );
} 