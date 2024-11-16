import { useDialog } from '../../hooks/useDialog';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../Common/Dialog';

export function AuthDialog() {
    const { dialog, closeDialog } = useDialog();
    const { googleLogin } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            await googleLogin();
            closeDialog();
            
            // 如果有返回路徑，則導向該路徑
            if (dialog.props?.returnPath) {
                navigate(dialog.props.returnPath);
            }
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    if (dialog.type !== 'auth') return null;

    return (
        <Dialog
            open={dialog.isOpen}
            onClose={closeDialog}
            title="🚀 登入享受完整體驗！"
            titleClassName="auth-dialog-title"
            description={
                <div className="auth-dialog-description">
                    <p>登入 Google 帳戶，盡情查看更多內容</p>
                    <p>我們也會努力推出更多個人化功能！</p>
                </div>
            }
        >
            <div className="auth-dialog-content">
                <button
                    onClick={handleLogin}
                    className="google-login-button"
                >
                    使用 Google 帳號登入
                </button>
            </div>
        </Dialog>
    );
} 