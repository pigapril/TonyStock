import { useDialog } from '../../hooks/useDialog';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../Common/Dialog';
import { useRef, useEffect } from 'react';
import { Analytics } from '../../utils/analytics';

export function AuthDialog() {
    const { dialog, closeDialog } = useDialog();
    const { renderGoogleButton } = useAuth();
    const navigate = useNavigate();
    const buttonRef = useRef(null);

    useEffect(() => {
        if (buttonRef.current && dialog.isOpen) {
            renderGoogleButton(buttonRef.current);
            
            Analytics.ui.dialog.open({
                type: 'auth',
                source: dialog.source || 'user_action'
            });
        }
    }, [dialog.isOpen, renderGoogleButton]);

    if (dialog.type !== 'auth') return null;

    return (
        <Dialog
            open={dialog.isOpen}
            onClose={closeDialog}
            title="🚀 登入享受完整體驗！"
            titleClassName="auth-dialog-title"
            description={
                <div className="auth-dialog-description">
                    <div>登入 Google 帳戶，盡情查看更多內容</div>
                    <div>我們也會努力推出更多個人化功能！</div>
                </div>
            }
        >
            <div className="auth-dialog-content">
                <div 
                    ref={buttonRef} 
                    className="google-button-container" 
                    style={{ minHeight: '40px' }}
                />
            </div>
        </Dialog>
    );
} 