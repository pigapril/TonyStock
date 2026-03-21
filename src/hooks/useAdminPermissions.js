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

const ADMIN_CHECK_RETRY_DELAY_MS = 15000;

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
    const userKey = user?.id || user?.userId || user?.email || null;
    
    // Use ref to track if component is mounted
    const isMountedRef = useRef(true);
    const isAdminRef = useRef(false);
    const loadingRef = useRef(false);
    const checkedUserRef = useRef(null);
    const inFlightUserRef = useRef(null);
    const inFlightPromiseRef = useRef(null);
    const retryTimerRef = useRef(null);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const clearRetryTimer = useCallback(() => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        isAdminRef.current = isAdmin;
    }, [isAdmin]);

    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    useEffect(() => {
        clearRetryTimer();
    }, [userKey, isAuthenticated, clearRetryTimer]);
    
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

    const isRetryableAdminCheckError = useCallback((err) => {
        const status = err?.response?.status;

        return !err?.response
            || status >= 500
            || err?.code === 'ECONNABORTED';
    }, []);
    
    /**
     * 檢查 admin 狀態 - 簡化版本
     */
    const checkAdminStatus = useCallback(async ({ force = false } = {}) => {
        clearRetryTimer();

        // 如果用戶未認證，直接返回 false
        if (!isAuthenticated || !user) {
            logAdminState('USER_NOT_AUTHENTICATED', {
                isAuthenticated,
                hasUser: !!user
            });

            clearRetryTimer();
            
            if (isMountedRef.current) {
                setIsAdmin(false);
                setError(null);
            }

            checkedUserRef.current = null;
            inFlightUserRef.current = null;
            inFlightPromiseRef.current = null;
            return false;
        }
        
        // 優先使用 AuthContext 提供的 admin 狀態
        if (authContextIsAdmin !== undefined && authContextIsAdmin !== null) {
            logAdminState('USING_AUTH_CONTEXT_ADMIN_STATUS', {
                authContextIsAdmin,
                currentIsAdmin: isAdminRef.current,
                willUpdate: authContextIsAdmin !== isAdminRef.current
            });

            clearRetryTimer();
            
            if (isMountedRef.current && authContextIsAdmin !== isAdminRef.current) {
                setIsAdmin(authContextIsAdmin);
                setError(null);
            }

            checkedUserRef.current = userKey;
            return authContextIsAdmin;
        }
        
        // 如果 AuthContext 沒有提供 admin 狀態，則進行 API 調用
        if (!force && authContextAdminLoading) {
            logAdminState('ADMIN_STATUS_LOADING', {
                hookLoading: loadingRef.current,
                authContextAdminLoading
            });
            return isAdminRef.current;
        }

        if (!force && checkedUserRef.current === userKey) {
            logAdminState('USING_CACHED_HOOK_STATUS', {
                userKey,
                currentIsAdmin: isAdminRef.current
            });
            return isAdminRef.current;
        }

        if (!force && inFlightPromiseRef.current && inFlightUserRef.current === userKey) {
            logAdminState('REUSING_IN_FLIGHT_ADMIN_CHECK', {
                userKey
            });
            return await inFlightPromiseRef.current;
        }
        
        let shouldRetry = false;

        const requestPromise = (async () => {
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
                setError(null);
                
                logAdminState('API_CALL_SUCCESS', {
                    adminStatus,
                    userId: user?.id || user?.userId
                });
            }
            
            return adminStatus;
            
        })().catch((err) => {
            shouldRetry = isRetryableAdminCheckError(err);

            logAdminState('API_CALL_ERROR', {
                error: err.message,
                userId: user?.id || user?.userId
            });
            
            if (isMountedRef.current) {
                setError(err);
                setIsAdmin(false);
            }
            
            if (shouldRetry && isMountedRef.current && isAuthenticated && userKey) {
                clearRetryTimer();
                checkedUserRef.current = null;

                retryTimerRef.current = setTimeout(() => {
                    retryTimerRef.current = null;

                    if (!isMountedRef.current || !isAuthenticated || !user) {
                        return;
                    }

                    const currentUserKey = user?.id || user?.userId || user?.email || null;
                    if (currentUserKey !== userKey) {
                        return;
                    }

                    checkAdminStatus({ force: true });
                }, ADMIN_CHECK_RETRY_DELAY_MS);
            }

            return false;
            
        }).finally(() => {
            if (!shouldRetry) {
                checkedUserRef.current = userKey;
            }

            if (inFlightUserRef.current === userKey) {
                inFlightUserRef.current = null;
            }

            if (inFlightPromiseRef.current === requestPromise) {
                inFlightPromiseRef.current = null;
            }

            if (isMountedRef.current) {
                setLoading(false);
            }
        });

        inFlightUserRef.current = userKey;
        inFlightPromiseRef.current = requestPromise;

        return await requestPromise;
    }, [
        user,
        userKey,
        isAuthenticated,
        authContextIsAdmin,
        authContextAdminLoading,
        logAdminState,
        clearRetryTimer,
        isRetryableAdminCheckError
    ]);
    
    /**
     * Force refresh admin status
     */
    const refreshAdminStatus = useCallback(async () => {
        logAdminState('FORCE_REFRESH_REQUESTED', {});
        clearRetryTimer();
        checkedUserRef.current = null;
        return await checkAdminStatus({ force: true });
    }, [checkAdminStatus, clearRetryTimer]);
    
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
        clearRetryTimer();
        checkedUserRef.current = null;
        inFlightUserRef.current = null;
        inFlightPromiseRef.current = null;
    }, [isAdmin, logAdminState, clearRetryTimer]);
    
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
                checkedUserRef.current = userKey;

                if (authContextIsAdmin !== isAdminRef.current) {
                    logAdminState('SYNCING_WITH_AUTH_CONTEXT', {
                        authContextIsAdmin,
                        currentIsAdmin: isAdminRef.current
                    });
                    
                    if (isMountedRef.current) {
                        setIsAdmin(authContextIsAdmin);
                        setError(null);
                    }
                }
                return; // 使用 AuthContext 狀態，不需要額外檢查
            }
            
            // 如果 AuthContext 沒有提供狀態且當前沒有在載入，則檢查
            if (
                !authContextAdminLoading
                && !authLoading
                && checkedUserRef.current !== userKey
                && !inFlightPromiseRef.current
            ) {
                checkAdminStatus();
            }
        } 
        // 處理未認證用戶
        else if (!isAuthenticated && !authLoading) {
            if (isAdminRef.current || loadingRef.current) {
                clearAdminStatus();
            }
        }
    }, [
        isAuthenticated, 
        userKey,
        !!user,
        authContextIsAdmin,
        authContextAdminLoading,
        authLoading,
        checkAdminStatus,
        clearAdminStatus
    ]);

    useEffect(() => {
        return () => {
            clearRetryTimer();
        };
    }, [clearRetryTimer]);
    
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
