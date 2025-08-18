/**
 * useAdminPermissions React Hook
 * 
 * Provides React integration for admin permissions functionality.
 * Integrates with existing authentication hooks/context and provides
 * reactive admin status with proper loading states and error handling.
 * 
 * Features:
 * - Reactive admin status updates
 * - Loading state management
 * - Automatic refresh on authentication changes
 * - Error handling and recovery
 * - Integration with existing auth context
 * - Fixed authentication state synchronization
 * 
 * @author SentimentInsideOut Team
 * @version 1.1.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../components/Auth/useAuth';
import adminPermissions from '../utils/adminPermissions';

// Debounce utility for rapid authentication state changes
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    
    return debouncedValue;
};

/**
 * Custom hook for admin permissions management
 * 
 * @returns {object} Admin permissions state and methods
 */
export function useAdminPermissions() {
    const { user, isAuthenticated, loading: authLoading, isAdmin: authContextIsAdmin, adminLoading: authContextAdminLoading } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Use ref to track if component is mounted and prevent race conditions
    const isMountedRef = useRef(true);
    const lastApiCallRef = useRef(null);
    const authStateStableRef = useRef(false);
    const lastSuccessfulAdminStatusRef = useRef(null);
    const stateTransitionLogRef = useRef([]);
    
    // Debounce authentication state changes to prevent rapid API calls
    const debouncedAuthState = useDebounce({
        isAuthenticated,
        user: user?.id || user?.userId,
        authLoading,
        authContextAdminLoading
    }, 150); // 150ms debounce delay
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    
    /**
     * Enhanced logging for comprehensive state synchronization debugging
     */
    const logStateTransition = useCallback((event, details) => {
        // Only log in development mode to reduce production noise
        if (process.env.NODE_ENV !== 'development') {
            return;
        }
        
        const timestamp = new Date().toISOString();
        const relativeTime = Date.now() - (stateTransitionLogRef.current[0]?.relativeStartTime || Date.now());
        
        // Get current state values at time of logging to avoid stale closures
        const currentIsAdmin = isAdmin;
        const currentLoading = loading;
        const currentError = error;
        const currentIsAuthenticated = isAuthenticated;
        const currentAuthLoading = authLoading;
        const currentAuthContextAdminLoading = authContextAdminLoading;
        const currentAuthContextIsAdmin = authContextIsAdmin;
        const currentUser = user;
        const currentDebouncedAuthState = debouncedAuthState;
        
        // Detect potential race conditions
        const recentApiCalls = stateTransitionLogRef.current
            .filter(log => log.event === 'API_CALL_STARTED' && (Date.now() - log.relativeStartTime) < 1000)
            .length;
        
        const recentAuthChanges = stateTransitionLogRef.current
            .filter(log => log.event === 'AUTH_STATE_CHANGE' && (Date.now() - log.relativeStartTime) < 500)
            .length;
        
        // Detect state conflicts
        const hasStateConflict = currentAuthContextIsAdmin !== undefined && 
                                currentAuthContextIsAdmin !== null && 
                                currentAuthContextIsAdmin !== currentIsAdmin &&
                                currentIsAuthenticated;
        
        // Enhanced log entry with comprehensive debugging information
        const logEntry = {
            timestamp,
            relativeTime,
            relativeStartTime: Date.now(),
            event,
            details: {
                ...details,
                // Current hook state
                hookState: { 
                    isAdmin: currentIsAdmin, 
                    loading: currentLoading, 
                    error: currentError?.message,
                    errorStack: currentError?.stack
                },
                // Authentication context state
                authState: { 
                    isAuthenticated: currentIsAuthenticated, 
                    authLoading: currentAuthLoading, 
                    authContextAdminLoading: currentAuthContextAdminLoading, 
                    authContextIsAdmin: currentAuthContextIsAdmin,
                    hasUser: !!currentUser,
                    userId: currentUser?.id || currentUser?.userId,
                    userEmail: currentUser?.email
                },
                // Debounced state for comparison
                debouncedAuthState: currentDebouncedAuthState,
                // Race condition detection
                raceConditionAnalysis: {
                    recentApiCalls,
                    recentAuthChanges,
                    potentialRaceCondition: recentApiCalls > 1 || recentAuthChanges > 2,
                    concurrentOperations: currentLoading && (currentAuthLoading || currentAuthContextAdminLoading)
                },
                // State conflict detection
                stateConflictAnalysis: {
                    hasConflict: hasStateConflict,
                    conflictType: hasStateConflict ? 'auth_context_vs_hook_state' : null,
                    authContextValue: currentAuthContextIsAdmin,
                    hookStateValue: currentIsAdmin,
                    shouldResolveConflict: hasStateConflict && currentIsAuthenticated
                },
                // Timing analysis
                timingAnalysis: {
                    authStateStable: !currentAuthLoading && !currentAuthContextAdminLoading,
                    debouncedStateStable: !currentDebouncedAuthState.authLoading && !currentDebouncedAuthState.authContextAdminLoading,
                    stateStabilizationTime: relativeTime,
                    lastApiCall: lastApiCallRef.current,
                    hasRecentSuccessfulStatus: !!lastSuccessfulAdminStatusRef.current &&
                        (Date.now() - (lastSuccessfulAdminStatusRef.current?.timestamp || 0)) < 5000
                },
                // Component lifecycle
                componentState: {
                    isMounted: isMountedRef.current,
                    authStateStableRef: authStateStableRef.current
                }
            }
        };
        
        // Keep only last 50 log entries to prevent memory leaks but allow more detailed analysis
        stateTransitionLogRef.current = [
            ...stateTransitionLogRef.current.slice(-49),
            logEntry
        ];
        
        // 大幅減少控制台輸出 - 只記錄真正重要的事件
        const shouldLog = event.includes('ERROR') || 
                         event.includes('CONFLICT') || 
                         (event.includes('SUCCESS') && !event.includes('API_CALL_SUCCESS')) || // 排除 API 成功日誌
                         event.includes('CLEARED') ||
                         hasStateConflict;
        
        // 完全禁用某些重複性高的日誌
        const suppressedEvents = [
            'AUTH_STATE_CHANGE',
            'USING_AUTH_CONTEXT_STATUS', 
            'API_CALL_STARTED',
            'API_CALL_SUCCESS',
            'WAITING_FOR_AUTH_STABILIZATION',
            'AUTH_STATE_NOT_STABLE',
            'PRESERVING_RECENT_ADMIN_STATUS'
        ];
        
        if (suppressedEvents.includes(event)) {
            // 只在開發模式且有實際問題時才記錄
            if (process.env.NODE_ENV === 'development' && (hasStateConflict || logEntry.details.raceConditionAnalysis?.potentialRaceCondition)) {
                console.warn(`useAdminPermissions[${relativeTime}ms]: ${event} (suppressed, but has issues)`, {
                    hasStateConflict,
                    potentialRaceCondition: logEntry.details.raceConditionAnalysis?.potentialRaceCondition
                });
            }
            return;
        }
        
        if (shouldLog) {
            const consoleMessage = `useAdminPermissions[${relativeTime}ms]: ${event}`;
            
            // Determine log level based on event type and content
            if (event.includes('ERROR') || details?.error) {
                console.error(consoleMessage, logEntry);
            } else if (hasStateConflict || event.includes('CONFLICT')) {
                console.warn(consoleMessage, logEntry);
            } else {
                console.info(consoleMessage, logEntry);
            }
        }
        
    }, []); // Empty dependency array to prevent infinite re-renders
    
    /**
     * Check if authentication state is stable
     */
    const isAuthStateStable = useCallback(() => {
        const stable = !authLoading && !authContextAdminLoading;
        const debouncedStable = !debouncedAuthState.authLoading && !debouncedAuthState.authContextAdminLoading;
        return stable && debouncedStable;
    }, [authLoading, authContextAdminLoading, debouncedAuthState]);
    
    /**
     * Check admin status and update state with proper synchronization
     */
    const checkAdminStatus = useCallback(async () => {
        // Wait for authentication state to be stable
        if (!isAuthStateStable()) {
            logStateTransition('AUTH_STATE_NOT_STABLE', {
                reason: 'Waiting for auth state to stabilize',
                authLoading,
                authContextAdminLoading,
                debouncedAuthLoading: debouncedAuthState.authLoading,
                debouncedAuthContextAdminLoading: debouncedAuthState.authContextAdminLoading
            });
            return false;
        }
        
        // Don't check if user is not authenticated (use debounced state for stability)
        if (!debouncedAuthState.isAuthenticated || !debouncedAuthState.user) {
            logStateTransition('USER_NOT_AUTHENTICATED', {
                reason: 'User not authenticated, clearing admin status',
                debouncedIsAuthenticated: debouncedAuthState.isAuthenticated,
                debouncedHasUser: !!debouncedAuthState.user,
                currentIsAuthenticated: isAuthenticated,
                currentHasUser: !!user
            });
            
            if (isMountedRef.current) {
                setIsAdmin(false);
                setError(null);
                // Cancel any pending API calls
                lastApiCallRef.current = null;
                lastSuccessfulAdminStatusRef.current = null;
            }
            return false;
        }
        
        // Create a unique identifier for this API call to prevent race conditions
        const callId = Date.now() + Math.random();
        lastApiCallRef.current = callId;
        
        const apiCallStartTime = Date.now();
        
        try {
            if (isMountedRef.current) {
                setLoading(true);
                setError(null);
            }
            
            logStateTransition('API_CALL_STARTED', {
                email: user?.email,
                userId: user?.id || user?.userId,
                callId,
                authContextIsAdmin,
                lastSuccessfulStatus: lastSuccessfulAdminStatusRef.current,
                apiCallStartTime,
                concurrentApiCalls: lastApiCallRef.current !== null,
                authStateAtCallTime: {
                    isAuthenticated,
                    authLoading,
                    authContextAdminLoading,
                    authContextIsAdmin
                },
                debouncedAuthStateAtCallTime: debouncedAuthState,
                triggerReason: 'checkAdminStatus_called'
            });
            
            const adminStatus = await adminPermissions.checkIsAdmin();
            const apiCallDuration = Date.now() - apiCallStartTime;
            
            // Only update state if this is still the latest API call, component is mounted, and user is still authenticated
            const shouldUpdateState = isMountedRef.current && 
                                    lastApiCallRef.current === callId && 
                                    debouncedAuthState.isAuthenticated && 
                                    debouncedAuthState.user;
            
            if (shouldUpdateState) {
                // Store successful admin status to prevent override by auth state changes
                lastSuccessfulAdminStatusRef.current = {
                    status: adminStatus,
                    timestamp: Date.now(),
                    userId: user?.id || user?.userId
                };
                
                setIsAdmin(adminStatus);
                
                logStateTransition('API_CALL_SUCCESS', {
                    isAdmin: adminStatus,
                    userId: user?.id || user?.userId,
                    callId,
                    authContextIsAdmin,
                    stateUpdated: true,
                    apiCallDuration,
                    responseProcessingTime: Date.now() - (apiCallStartTime + apiCallDuration),
                    stateChangeAnalysis: {
                        previousAdminStatus: isAdmin,
                        newAdminStatus: adminStatus,
                        statusChanged: isAdmin !== adminStatus,
                        conflictWithAuthContext: authContextIsAdmin !== undefined && 
                                               authContextIsAdmin !== adminStatus,
                        authContextValue: authContextIsAdmin
                    },
                    authStateAtResponse: {
                        isAuthenticated,
                        authLoading,
                        authContextAdminLoading,
                        authContextIsAdmin,
                        stateStable: !authLoading && !authContextAdminLoading
                    },
                    debouncedAuthStateAtResponse: debouncedAuthState
                });
            } else {
                logStateTransition('API_CALL_DISCARDED', {
                    reason: 'Stale API response or state changed',
                    callId,
                    currentCallId: lastApiCallRef.current,
                    isMounted: isMountedRef.current,
                    debouncedIsAuthenticated: debouncedAuthState.isAuthenticated,
                    debouncedHasUser: !!debouncedAuthState.user,
                    apiCallDuration,
                    discardReasons: {
                        staleCall: lastApiCallRef.current !== callId,
                        componentUnmounted: !isMountedRef.current,
                        userNotAuthenticated: !debouncedAuthState.isAuthenticated,
                        userMissing: !debouncedAuthState.user
                    },
                    potentialDataLoss: adminStatus !== isAdmin,
                    authStateAtDiscard: {
                        isAuthenticated,
                        authLoading,
                        authContextAdminLoading,
                        authContextIsAdmin
                    }
                });
            }
            
            return adminStatus;
            
        } catch (err) {
            const apiCallDuration = Date.now() - apiCallStartTime;
            
            logStateTransition('API_CALL_ERROR', {
                error: err.message,
                callId,
                stack: err.stack,
                apiCallDuration,
                errorAnalysis: {
                    errorType: err.name,
                    isNetworkError: !err.response,
                    isAuthError: err.response?.status === 401 || err.response?.status === 403,
                    isServerError: err.response?.status >= 500,
                    isTimeoutError: err.code === 'ECONNABORTED',
                    statusCode: err.response?.status,
                    responseData: err.response?.data
                },
                authStateAtError: {
                    isAuthenticated,
                    authLoading,
                    authContextAdminLoading,
                    authContextIsAdmin,
                    stateStable: !authLoading && !authContextAdminLoading
                },
                debouncedAuthStateAtError: debouncedAuthState,
                recoveryStrategy: {
                    shouldRetry: err.response?.status >= 500,
                    shouldClearAuth: err.response?.status === 401,
                    shouldShowError: true,
                    fallbackToFalse: true
                }
            });
            
            // Only update error state if this is still the latest API call and user is still authenticated
            if (isMountedRef.current && lastApiCallRef.current === callId && debouncedAuthState.isAuthenticated && debouncedAuthState.user) {
                setError(err);
                setIsAdmin(false); // Default to false for security
                lastSuccessfulAdminStatusRef.current = null;
            }
            
            return false;
            
        } finally {
            // Only clear loading if this is still the latest API call
            if (isMountedRef.current && lastApiCallRef.current === callId) {
                setLoading(false);
            }
        }
    }, [user, isAuthenticated, authLoading, authContextAdminLoading, authContextIsAdmin, isAuthStateStable, debouncedAuthState, logStateTransition]);
    
    /**
     * Force refresh admin status
     */
    const refreshAdminStatus = useCallback(async () => {
        console.log('useAdminPermissions: Force refreshing admin status');
        return await checkAdminStatus();
    }, [checkAdminStatus]);
    
    /**
     * Clear admin status and error state - simplified without cache clearing
     */
    const clearAdminStatus = useCallback(() => {
        logStateTransition('ADMIN_STATUS_CLEARED', {
            reason: 'Manual clear or logout',
            previousStatus: isAdmin,
            hadSuccessfulStatus: !!lastSuccessfulAdminStatusRef.current
        });
        
        if (isMountedRef.current) {
            setIsAdmin(false);
            setError(null);
            setLoading(false);
            // Cancel any pending API calls
            lastApiCallRef.current = null;
            lastSuccessfulAdminStatusRef.current = null;
        }
    }, [isAdmin, logStateTransition]);
    
    // Effect to handle authentication state changes with proper synchronization and debouncing
    // 修復無限循環：減少不必要的狀態檢查和日誌輸出
    useEffect(() => {
        // Track authentication state stability
        authStateStableRef.current = isAuthStateStable();
        
        // 減少日誌輸出 - 只在重要狀態變化時記錄
        const shouldLogStateChange = 
            !authStateStableRef.current || 
            isAuthenticated !== debouncedAuthState.isAuthenticated ||
            (user?.id || user?.userId) !== debouncedAuthState.user;
        
        if (shouldLogStateChange) {
            logStateTransition('AUTH_STATE_CHANGE', {
                isAuthenticated,
                userId: user?.id || user?.userId,
                authLoading,
                authContextAdminLoading,
                authContextIsAdmin,
                isStable: authStateStableRef.current
            });
        }
        
        // Wait for authentication context to be ready before making any decisions
        if (!authStateStableRef.current) {
            return;
        }
        
        // Handle authenticated user state
        if (debouncedAuthState.isAuthenticated && debouncedAuthState.user) {
            // 優先使用 AuthContext 提供的管理員狀態，避免重複 API 調用
            if (authContextIsAdmin !== undefined && authContextIsAdmin !== null) {
                // 只在狀態實際不同時才更新，防止無限循環
                if (authContextIsAdmin !== isAdmin) {
                    if (isMountedRef.current) {
                        setIsAdmin(authContextIsAdmin);
                        setError(null);
                        lastSuccessfulAdminStatusRef.current = {
                            status: authContextIsAdmin,
                            timestamp: Date.now(),
                            userId: user?.id || user?.userId,
                            source: 'authContext'
                        };
                    }
                }
                return; // 使用 AuthContext 狀態，不進行額外檢查
            }
            
            // 只有在 AuthContext 沒有提供管理員狀態時才進行 API 調用
            const hasRecentSuccessfulStatus = lastSuccessfulAdminStatusRef.current && 
                (Date.now() - lastSuccessfulAdminStatusRef.current.timestamp) < 10000 && // 延長到 10 秒
                lastSuccessfulAdminStatusRef.current.userId === (user?.id || user?.userId);
            
            if (!hasRecentSuccessfulStatus) {
                checkAdminStatus();
            }
        } 
        // Handle unauthenticated user state
        else if (!debouncedAuthState.isAuthenticated && !debouncedAuthState.authLoading && !debouncedAuthState.authContextAdminLoading) {
            if (isAdmin || loading) { // 只在需要清除時才執行
                clearAdminStatus();
            }
        }
    }, [
        // 只監聽關鍵狀態變化，減少不必要的重新執行
        isAuthenticated, 
        user?.id, 
        user?.userId,
        authContextIsAdmin, // 監聽 AuthContext 的管理員狀態
        debouncedAuthState.isAuthenticated, 
        debouncedAuthState.user,
        debouncedAuthState.authLoading, 
        debouncedAuthState.authContextAdminLoading
    ]);
    

    
    // Effect to handle authentication events with proper state synchronization
    useEffect(() => {
        const handleLoginSuccess = () => {
            logStateTransition('LOGIN_SUCCESS_EVENT', {
                reason: 'Login success event detected'
            });
            
            // Clear any previous admin status to ensure fresh check
            lastSuccessfulAdminStatusRef.current = null;
            
            // Wait a bit for auth context to update, then check admin status
            setTimeout(() => {
                if (isMountedRef.current && isAuthStateStable()) {
                    logStateTransition('CHECKING_ADMIN_AFTER_LOGIN', {
                        reason: 'Checking admin status after login success'
                    });
                    checkAdminStatus();
                }
            }, 200); // Slightly longer delay to allow auth context and debounce to update
        };
        
        const handleLogoutSuccess = () => {
            logStateTransition('LOGOUT_SUCCESS_EVENT', {
                reason: 'Logout success event detected - clearing admin status'
            });
            
            // Immediate status clearing on logout
            if (isMountedRef.current) {
                setIsAdmin(false);
                setError(null);
                lastApiCallRef.current = null; // Cancel any pending API calls
                lastSuccessfulAdminStatusRef.current = null;
            }
        };
        
        window.addEventListener('loginSuccess', handleLoginSuccess);
        window.addEventListener('logoutSuccess', handleLogoutSuccess);
        
        return () => {
            window.removeEventListener('loginSuccess', handleLoginSuccess);
            window.removeEventListener('logoutSuccess', handleLogoutSuccess);
        };
    }, [checkAdminStatus, isAuthStateStable, logStateTransition]);
    

    
    /**
     * Check if admin features should be shown
     * Uses hook state instead of utility cache
     */
    const shouldShowAdminFeatures = useCallback(() => {
        return isAdmin && isAuthenticated;
    }, [isAdmin, isAuthenticated]);
    
    /**
     * Get comprehensive debug information with detailed state synchronization analysis
     */
    const getDebugInfo = useCallback(() => {
        const currentTime = Date.now();
        const recentLogs = stateTransitionLogRef.current.slice(-20);
        
        // Analyze recent activity patterns
        const recentApiCalls = recentLogs.filter(log => log.event.includes('API_CALL'));
        const recentAuthChanges = recentLogs.filter(log => log.event === 'AUTH_STATE_CHANGE');
        const recentErrors = recentLogs.filter(log => log.event.includes('ERROR'));
        const recentConflicts = recentLogs.filter(log => 
            log.details?.stateConflictAnalysis?.hasConflict || 
            log.details?.conflictAnalysis?.authContextVsHookConflict
        );
        
        // Calculate timing metrics
        const apiCallTimes = recentApiCalls
            .filter(log => log.details?.apiCallDuration)
            .map(log => log.details.apiCallDuration);
        const avgApiCallTime = apiCallTimes.length > 0 ? 
            Math.round(apiCallTimes.reduce((a, b) => a + b, 0) / apiCallTimes.length) : null;
        
        return {
            // Current hook state
            hookState: {
                isAdmin,
                loading,
                error: error?.message,
                errorStack: error?.stack,
                isAuthenticated,
                authLoading,
                authContextAdminLoading,
                authContextIsAdmin,
                hasUser: !!user,
                userId: user?.id || user?.userId,
                userEmail: user?.email,
                isAuthStateStable: isAuthStateStable(),
                lastApiCallId: lastApiCallRef.current,
                timestamp: new Date().toISOString()
            },
            
            // Authentication context state
            authContextState: {
                isAuthenticated,
                authLoading,
                authContextIsAdmin,
                authContextAdminLoading,
                hasUser: !!user,
                userId: user?.id || user?.userId,
                userEmail: user?.email
            },
            
            // Debounced state
            debouncedAuthState,
            
            // Synchronization analysis
            synchronizationState: {
                isStable: authStateStableRef.current,
                hasConflict: isAdmin !== authContextIsAdmin && authContextIsAdmin !== undefined,
                conflictType: isAdmin !== authContextIsAdmin && authContextIsAdmin !== undefined ? 
                    'auth_context_vs_hook_state' : null,
                usingAuthContext: authContextIsAdmin !== undefined && authContextIsAdmin !== null,
                lastSuccessfulStatus: lastSuccessfulAdminStatusRef.current,
                hasRecentSuccessfulStatus: lastSuccessfulAdminStatusRef.current && 
                    (currentTime - lastSuccessfulAdminStatusRef.current.timestamp) < 5000,
                successfulStatusAge: lastSuccessfulAdminStatusRef.current ? 
                    currentTime - lastSuccessfulAdminStatusRef.current.timestamp : null
            },
            
            // Race condition analysis
            raceConditionAnalysis: {
                hasActiveApiCall: !!lastApiCallRef.current,
                activeApiCallId: lastApiCallRef.current,
                recentApiCallCount: recentApiCalls.length,
                recentAuthChangeCount: recentAuthChanges.length,
                potentialRaceConditions: recentLogs.filter(log => 
                    log.details?.raceConditionAnalysis?.potentialRaceCondition
                ).length,
                concurrentOperations: loading && (authLoading || authContextAdminLoading)
            },
            
            // State conflict analysis
            stateConflictAnalysis: {
                totalConflicts: recentConflicts.length,
                activeConflicts: recentConflicts.filter(log => 
                    (currentTime - log.relativeStartTime) < 5000
                ).length,
                conflictTypes: [...new Set(recentConflicts.map(log => 
                    log.details?.stateConflictAnalysis?.conflictType || 
                    log.details?.conflictAnalysis?.conflictType
                ).filter(Boolean))],
                lastConflictTime: recentConflicts.length > 0 ? 
                    recentConflicts[recentConflicts.length - 1].timestamp : null
            },
            
            // Performance metrics
            performanceMetrics: {
                totalStateTransitions: stateTransitionLogRef.current.length,
                recentApiCalls: recentApiCalls.length,
                averageApiCallTime: avgApiCallTime,
                slowApiCalls: apiCallTimes.filter(time => time > 2000).length,
                failedApiCalls: recentApiCalls.filter(log => 
                    log.event === 'API_CALL_ERROR'
                ).length,
                discardedApiCalls: recentApiCalls.filter(log => 
                    log.event === 'API_CALL_DISCARDED'
                ).length
            },
            
            // Error analysis
            errorAnalysis: {
                totalErrors: recentErrors.length,
                errorTypes: [...new Set(recentErrors.map(log => 
                    log.details?.errorAnalysis?.errorType || log.details?.error
                ).filter(Boolean))],
                networkErrors: recentErrors.filter(log => 
                    log.details?.errorAnalysis?.isNetworkError
                ).length,
                authErrors: recentErrors.filter(log => 
                    log.details?.errorAnalysis?.isAuthError
                ).length,
                serverErrors: recentErrors.filter(log => 
                    log.details?.errorAnalysis?.isServerError
                ).length,
                lastErrorTime: recentErrors.length > 0 ? 
                    recentErrors[recentErrors.length - 1].timestamp : null
            },
            
            // Component lifecycle
            componentState: {
                isMounted: isMountedRef.current,
                authStateStableRef: authStateStableRef.current,
                hookInitialized: stateTransitionLogRef.current.length > 0,
                uptime: stateTransitionLogRef.current.length > 0 ? 
                    currentTime - stateTransitionLogRef.current[0].relativeStartTime : 0
            },
            
            // Recent state transition log
            stateTransitionLog: recentLogs.map(log => ({
                timestamp: log.timestamp,
                relativeTime: log.relativeTime,
                event: log.event,
                level: log.event.includes('ERROR') ? 'error' : 
                       log.event.includes('CONFLICT') || log.event.includes('RACE') ? 'warn' : 'info',
                summary: generateLogSummary(log),
                details: log.details
            })),
            
            // Utility debug info
            utilityDebugInfo: adminPermissions.getDebugInfo()
        };
    }, [isAdmin, loading, error, isAuthenticated, authLoading, authContextAdminLoading, authContextIsAdmin, user, isAuthStateStable, debouncedAuthState]);
    
    /**
     * Generate a human-readable summary for log entries
     */
    const generateLogSummary = useCallback((log) => {
        switch (log.event) {
            case 'API_CALL_STARTED':
                return `API call started (ID: ${log.details?.callId})`;
            case 'API_CALL_SUCCESS':
                return `API call succeeded - Admin: ${log.details?.isAdmin} (${log.details?.apiCallDuration}ms)`;
            case 'API_CALL_ERROR':
                return `API call failed - ${log.details?.error} (${log.details?.apiCallDuration}ms)`;
            case 'API_CALL_DISCARDED':
                return `API call discarded - ${log.details?.reason}`;
            case 'AUTH_STATE_CHANGE':
                return `Auth state changed - Authenticated: ${log.details?.currentAuthState?.isAuthenticated}, Admin: ${log.details?.currentAuthState?.authContextIsAdmin}`;
            case 'STATE_CONFLICT_DETECTED':
                return `State conflict - ${log.details?.stateConflictAnalysis?.conflictType}`;
            default:
                return log.event.toLowerCase().replace(/_/g, ' ');
        }
    }, []);
    
    /**
     * Get recent state transition logs for debugging
     */
    const getRecentLogs = useCallback((count = 20) => {
        return stateTransitionLogRef.current.slice(-count);
    }, []);
    
    /**
     * Clear state transition logs (useful for testing)
     */
    const clearLogs = useCallback(() => {
        stateTransitionLogRef.current = [];
        logStateTransition('LOGS_CLEARED', {
            clearedAt: new Date().toISOString(),
            reason: 'Manual clear requested'
        });
    }, [logStateTransition]);
    
    /**
     * Force log a custom event for debugging
     */
    const logCustomEvent = useCallback((event, details = {}) => {
        logStateTransition(`CUSTOM_${event.toUpperCase()}`, {
            ...details,
            customEvent: true,
            triggeredBy: 'external_call'
        });
    }, [logStateTransition]);

    return {
        // State
        isAdmin,
        loading: loading || authLoading,
        error,
        
        // Computed values
        shouldShowAdminFeatures: shouldShowAdminFeatures(),
        
        // Methods
        checkAdminStatus,
        refreshAdminStatus,
        clearAdminStatus,
        
        // Debug and logging methods
        getDebugInfo,
        getRecentLogs,
        clearLogs,
        logCustomEvent
    };
}

export default useAdminPermissions;