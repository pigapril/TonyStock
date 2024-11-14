import { createContext, useState, useEffect } from 'react';
import { Analytics } from '../utils/analytics';
import { handleApiError } from '../utils/errorHandler';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 初始化時檢查登入狀態
    useEffect(() => {
        checkAuthStatus();
    }, []);

    // 檢查認證狀態
    const checkAuthStatus = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/auth/status`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                Analytics.auth.statusCheck({ status: 'success' });
            } else {
                setUser(null);
                const errorData = await response.json();
                const error = handleApiError({ response: { data: errorData } });
                setError(error.message);
            }
        } catch (error) {
            const handledError = handleApiError(error);
            setError(handledError.message);
            Analytics.error({
                type: 'AUTH_ERROR',
                code: handledError.code || 500,
                message: handledError.message
            });
        } finally {
            setLoading(false);
        }
    };

    // 登出處理
    const logout = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                setUser(null);
                Analytics.auth.logout({ status: 'success' });
            } else {
                const errorData = await response.json();
                const error = handleApiError({ response: { data: errorData } });
                throw new Error(error.message);
            }
        } catch (error) {
            const handledError = handleApiError(error);
            setError(handledError.message);
            Analytics.error({
                type: 'AUTH_ERROR',
                code: handledError.code || 500,
                message: handledError.message
            });
        }
    };

    const value = {
        user,
        loading,
        error,
        logout,
        checkAuthStatus
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
} 