/**
 * useAdminPermissions React Hook (Simplified Version)
 * 
 * 簡化版本，優先使用 AuthContext 提供的 admin 狀態，減少不必要的 API 調用
 * 
 * @author SentimentInsideOut Team
 * @version 1.2.0 (Simplified)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../components/Auth/useAuth';
import adminPermissions from '../utils/adminPermissions';

/**
 * Custom hook for admin permissions management (Simplified)
 * 
 * @returns {object} Admin permissions state and methods
 */
export function useAdminPermissions() {
    const { user, isAuthenticated, loading: authLoading, isAdmin: authContextIsAdmin, adminLoading: authContextAdminLoading } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Use ref to track if component is mounted
    const isMountedRef = useRef(true);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    
    /**
     * 簡化的日誌記錄
     */
    const logAdminState = useCallback((event, details) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`🔐 useAdminPermissions: ${event}`, {
                ...details,
                timestamp: new Date().toISOString()
            });
        }
    }, []);
    
    /**
     * 檢查 admin 狀態 - 簡化版本
     */
    const checkAdminStatus = useCallback(async () => {
        // 如果用戶未認證，直接返回 false
        if (!isAuthenticated || !user) {
            logAdminState('USER_NOT_AUTHENTICATED', {
                isAuthenticated,
                hasUser: !!user
            });
            
            if (isMountedRef.current) {
                setIsAdmin(false);
                setError(null);
            }
            return false;
        }
        
        // 優先使用 AuthContext 提供的 admin 狀態
        if (authContextIsAdmin !== undefined && authContextIsAdmin !== null) {
            logAdminState('USING_AUTH_CONTEXT_ADMIN_STATUS', {
                authContextIsAdmin,
                currentIsAdmin: isAdmin,
                willUpdate: authContextIsAdmin !== isAdmin
            });
            
            if (isMountedRef.current && authContextIsAdmin !== isAdmin) {
                setIsAdmin(authContextIsAdmin);
                setError(null);
            }
            return authContextIsAdmin;
        }
        
        // 如果 AuthContext 沒有提供 admin 狀態，則進行 API 調用
        if (loading || authContextAdminLoading) {
            logAdminState('ADMIN_STATUS_LOADING', {
                hookLoading: loading,
                authContextAdminLoading
            });
            return isAdmin; // 返回當前狀態
        }
        
        try {
            if (isMountedRef.current) {
                setLoading(true);
                setError(null);
            }
            
            logAdminState('API_CALL_STARTED', {
                reason: 'AuthContext admin status not available',
                userId: user?.id || user?.userId
            });
            
            const adminStatus = await adminPermissions.checkIsAdmin();
            
            if (isMountedRef.current) {
                setIsAdmin(adminStatus);
                
                logAdminState('API_CALL_SUCCESS', {
                    adminStatus,
                    userId: user?.id || user?.userId
                });
            }
            
            return adminStatus;
            
        } catch (err) {
            logAdminState('API_CALL_ERROR', {
                error: err.message,
                userId: user?.id || user?.userId
            });
            
            if (isMountedRef.current) {
                setError(err);
                setIsAdmin(false);
            }
            
            return false;
            
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [user, isAuthenticated, authContextIsAdmin, authContextAdminLoading, loading, isAdmin, logAdminState]);
    
    /**
     * Force refresh admin status
     */
    const refreshAdminStatus = useCallback(async () => {
        logAdminState('FORCE_REFRESH_REQUESTED', {});
        return await checkAdminStatus();
    }, [checkAdminStatus]);
    
    /**
     * Clear admin status
     */
    const clearAdminStatus = useCallback(() => {
        logAdminState('ADMIN_STATUS_CLEARED', {
            previousStatus: isAdmin
        });
        
        if (isMountedRef.current) {
            setIsAdmin(false);
            setError(null);
            setLoading(false);
        }
    }, [isAdmin, logAdminState]);
    
    // 主要的狀態同步邏輯 - 大幅簡化
    useEffect(() => {
        logAdminState('AUTH_STATE_CHANGE', {
            isAuthenticated,
            hasUser: !!user,
            userId: user?.id || user?.userId,
            authContextIsAdmin,
            authContextAdminLoading,
            currentIsAdmin: isAdmin
        });
        
        // 處理已認證用戶
        if (isAuthenticated && user) {
            // 優先使用 AuthContext 的 admin 狀態
            if (authContextIsAdmin !== undefined && authContextIsAdmin !== null) {
                if (authContextIsAdmin !== isAdmin) {
                    logAdminState('SYNCING_WITH_AUTH_CONTEXT', {
                        authContextIsAdmin,
                        currentIsAdmin: isAdmin
                    });
                    
                    if (isMountedRef.current) {
                        setIsAdmin(authContextIsAdmin);
                        setError(null);
                    }
                }
                return; // 使用 AuthContext 狀態，不需要額外檢查
            }
            
            // 如果 AuthContext 沒有提供狀態且當前沒有在載入，則檢查
            if (!authContextAdminLoading && !loading) {
                checkAdminStatus();
            }
        } 
        // 處理未認證用戶
        else if (!isAuthenticated && !authLoading) {
            if (isAdmin || loading) {
                clearAdminStatus();
            }
        }
    }, [
        isAuthenticated, 
        user?.id, 
        user?.userId,
        authContextIsAdmin,
        authContextAdminLoading,
        authLoading,
        checkAdminStatus,
        clearAdminStatus,
        isAdmin,
        loading
    ]);
    
    /**
     * Check if admin features should be shown
     */
    const shouldShowAdminFeatures = useCallback(() => {
        const result = isAdmin && isAuthenticated;
        logAdminState('SHOULD_SHOW_ADMIN_FEATURES', {
            result,
            isAdmin,
            isAuthenticated
        });
        return result;
    }, [isAdmin, isAuthenticated, logAdminState]);
    
    /**
     * Get debug information
     */
    const getDebugInfo = useCallback(() => {
        return {
            hookState: {
                isAdmin,
                loading,
                error: error?.message,
                isAuthenticated,
                hasUser: !!user,
                userId: user?.id || user?.userId
            },
            authContextState: {
                authContextIsAdmin,
                authContextAdminLoading,
                authLoading
            },
            shouldShowAdminFeatures: shouldShowAdminFeatures(),
            timestamp: new Date().toISOString()
        };
    }, [isAdmin, loading, error, isAuthenticated, user, authContextIsAdmin, authContextAdminLoading, authLoading, shouldShowAdminFeatures]);
    
    return {
        isAdmin,
        loading: loading || authContextAdminLoading,
        error,
        checkAdminStatus,
        refreshAdminStatus,
        clearAdminStatus,
        shouldShowAdminFeatures,
        getDebugInfo
    };
}

export default useAdminPermissions;
