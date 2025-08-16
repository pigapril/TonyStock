/**
 * useAdminPermissions React Hook
 * 
 * Provides React integration for admin permissions functionality.
 * Integrates with existing authentication hooks/context and provides
 * reactive admin status with proper loading states and error handling.
 * 
 * Features:
 * - Reactive admin status updates
 * - Enhanced loading state management with utility class synchronization
 * - Last known status tracking for graceful degradation
 * - Proper listener management for utility class state changes
 * - React state synchronization with utility class state
 * - Automatic refresh on authentication changes
 * - Error handling and recovery
 * - Integration with existing auth context
 * 
 * @author SentimentInsideOut Team
 * @version 1.1.0 - Enhanced with improved state management and synchronization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../components/Auth/useAuth';
import adminPermissions from '../utils/adminPermissions';

/**
 * Custom hook for admin permissions management
 * 
 * @returns {object} Admin permissions state and methods
 * @returns {boolean} returns.isAdmin - Current admin status
 * @returns {boolean} returns.loading - Loading state (includes auth loading)
 * @returns {Error|null} returns.error - Last error encountered
 * @returns {number|null} returns.lastChecked - Timestamp of last check
 * @returns {boolean|null} returns.lastKnownStatus - Last known admin status for graceful degradation
 * @returns {boolean} returns.shouldShowAdminFeatures - Whether admin features should be shown
 * @returns {function} returns.checkAdminStatus - Async method to check admin status
 * @returns {function} returns.refreshAdminStatus - Force refresh admin status
 * @returns {function} returns.clearAdminStatus - Clear admin status and cache
 * @returns {function} returns.isCurrentUserAdmin - Synchronous admin status check
 * @returns {function} returns.getDebugInfo - Get debug information
 */
export function useAdminPermissions() {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastChecked, setLastChecked] = useState(null);
    const [lastKnownStatus, setLastKnownStatus] = useState(null); // New: Track last known status
    
    // Use ref to track if component is mounted
    const isMountedRef = useRef(true);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    
    /**
     * Check admin status and update state
     * Enhanced to properly sync with utility class state including lastKnownStatus
     */
    const checkAdminStatus = useCallback(async () => {
        // Don't check if auth is still loading or user is not authenticated
        if (authLoading || !isAuthenticated || !user) {
            if (isMountedRef.current) {
                setIsAdmin(false);
                setError(null);
                setLastChecked(null);
                setLastKnownStatus(null);
            }
            return false;
        }
        
        try {
            if (isMountedRef.current) {
                setLoading(true);
                setError(null);
            }
            
            console.log('useAdminPermissions: Checking admin status for user:', user.email);
            
            const adminStatus = await adminPermissions.checkIsAdmin();
            
            if (isMountedRef.current) {
                setIsAdmin(adminStatus);
                setLastKnownStatus(adminStatus); // Update last known status
                setLastChecked(Date.now());
                
                console.log('useAdminPermissions: Admin status updated:', {
                    isAdmin: adminStatus,
                    lastKnownStatus: adminStatus,
                    userId: user.id || user.userId,
                    timestamp: new Date().toISOString()
                });
            }
            
            return adminStatus;
            
        } catch (err) {
            console.error('useAdminPermissions: Failed to check admin status:', err);
            
            if (isMountedRef.current) {
                setError(err);
                // Don't immediately set isAdmin to false - let the utility class handle graceful degradation
                const utilityStatus = adminPermissions.isCurrentUserAdmin();
                setIsAdmin(utilityStatus);
                
                // Update lastKnownStatus from utility class if available
                try {
                    const debugInfo = adminPermissions.getDebugInfo();
                    if (debugInfo?.cacheState?.lastKnownStatus !== null) {
                        setLastKnownStatus(debugInfo.cacheState.lastKnownStatus);
                    }
                } catch (error) {
                    console.warn('useAdminPermissions: Failed to get lastKnownStatus from utility class:', error);
                }
            }
            
            return false;
            
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [user, isAuthenticated, authLoading]);
    
    /**
     * Force refresh admin status
     */
    const refreshAdminStatus = useCallback(async () => {
        console.log('useAdminPermissions: Force refreshing admin status');
        adminPermissions.clearCache();
        return await checkAdminStatus();
    }, [checkAdminStatus]);
    
    /**
     * Clear admin status and error state
     * Enhanced to clear lastKnownStatus as well
     */
    const clearAdminStatus = useCallback(() => {
        console.log('useAdminPermissions: Clearing admin status');
        adminPermissions.clearCache();
        if (isMountedRef.current) {
            setIsAdmin(false);
            setError(null);
            setLastChecked(null);
            setLastKnownStatus(null); // Clear last known status
        }
    }, []);
    
    // Effect to check admin status when authentication state changes
    useEffect(() => {
        let timeoutId;
        
        if (isAuthenticated && user && !authLoading) {
            // Small delay to ensure auth context is fully settled
            timeoutId = setTimeout(() => {
                checkAdminStatus();
            }, 100);
        } else {
            // Clear admin status when user is not authenticated
            clearAdminStatus();
        }
        
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [isAuthenticated, user, authLoading, checkAdminStatus, clearAdminStatus]);
    
    // Enhanced effect to listen for admin status changes from the utility
    // Properly synchronizes React state with utility class state including lastKnownStatus
    useEffect(() => {
        const handleAdminStatusChange = (status) => {
            if (isMountedRef.current) {
                console.log('useAdminPermissions: Admin status changed via listener:', status);
                
                try {
                    // Get full state from utility class for proper synchronization
                    const debugInfo = adminPermissions.getDebugInfo();
                    const utilityState = debugInfo?.cacheState;
                    
                    // Update all relevant state to match utility class
                    if (status !== null) {
                        setIsAdmin(status);
                        setLastKnownStatus(status);
                    } else {
                        // Handle cache clear scenario
                        setIsAdmin(false);
                        setLastKnownStatus(null);
                    }
                    
                    // Sync other state properties if available
                    if (utilityState) {
                        setLastChecked(utilityState.lastCheck);
                        setLoading(utilityState.loading);
                        
                        console.log('useAdminPermissions: State synchronized with utility class:', {
                            isAdmin: status,
                            lastKnownStatus: status,
                            loading: utilityState.loading,
                            lastCheck: utilityState.lastCheck
                        });
                    } else {
                        console.log('useAdminPermissions: Basic state update (no utility state available):', {
                            isAdmin: status,
                            lastKnownStatus: status
                        });
                    }
                } catch (error) {
                    console.warn('useAdminPermissions: Failed to sync with utility class:', error);
                    
                    // Fallback to basic status update
                    if (status !== null) {
                        setIsAdmin(status);
                        setLastKnownStatus(status);
                    } else {
                        setIsAdmin(false);
                        setLastKnownStatus(null);
                    }
                }
            }
        };
        
        // Add listener for utility class state changes
        adminPermissions.addListener(handleAdminStatusChange);
        
        // Initial state synchronization on mount
        const initialSync = () => {
            if (isMountedRef.current) {
                try {
                    const debugInfo = adminPermissions.getDebugInfo();
                    const utilityState = debugInfo?.cacheState;
                    
                    if (utilityState) {
                        console.log('useAdminPermissions: Initial state sync with utility class:', utilityState);
                        
                        // Sync all state with utility class
                        setIsAdmin(utilityState.adminStatus || false);
                        setLastKnownStatus(utilityState.lastKnownStatus);
                        setLastChecked(utilityState.lastCheck);
                        setLoading(utilityState.loading);
                    } else {
                        console.log('useAdminPermissions: No utility state available for initial sync');
                    }
                } catch (error) {
                    console.warn('useAdminPermissions: Failed to get debug info for initial sync:', error);
                }
            }
        };
        
        // Perform initial sync
        initialSync();
        
        return () => {
            adminPermissions.removeListener(handleAdminStatusChange);
        };
    }, []);
    
    // Effect to handle authentication events
    useEffect(() => {
        const handleLoginSuccess = () => {
            console.log('useAdminPermissions: Login success detected');
            // Small delay to ensure auth context is updated
            setTimeout(() => {
                if (isMountedRef.current) {
                    checkAdminStatus();
                }
            }, 500);
        };
        
        const handleLogoutSuccess = () => {
            console.log('useAdminPermissions: Logout success detected');
            clearAdminStatus();
        };
        
        window.addEventListener('loginSuccess', handleLoginSuccess);
        window.addEventListener('logoutSuccess', handleLogoutSuccess);
        
        return () => {
            window.removeEventListener('loginSuccess', handleLoginSuccess);
            window.removeEventListener('logoutSuccess', handleLogoutSuccess);
        };
    }, [checkAdminStatus, clearAdminStatus]);
    
    // Enhanced loading state management for better UX
    // Synchronizes loading state with utility class and provides graceful loading indicators
    useEffect(() => {
        let loadingCheckInterval;
        
        // Function to sync loading state with utility class
        const syncLoadingState = () => {
            if (isMountedRef.current) {
                try {
                    const debugInfo = adminPermissions.getDebugInfo();
                    const utilityLoading = debugInfo?.cacheState?.loading || false;
                    const hasPendingOperations = debugInfo?.promiseManagement?.hasPendingOperations || false;
                    
                    // Update loading state based on utility class state
                    const shouldBeLoading = utilityLoading || hasPendingOperations;
                    
                    if (loading !== shouldBeLoading) {
                        console.log('useAdminPermissions: Syncing loading state:', {
                            currentLoading: loading,
                            shouldBeLoading,
                            utilityLoading,
                            hasPendingOperations
                        });
                        setLoading(shouldBeLoading);
                    }
                } catch (error) {
                    console.warn('useAdminPermissions: Failed to sync loading state:', error);
                }
            }
        };
        
        // Initial sync
        syncLoadingState();
        
        // Set up periodic sync for loading state (every 100ms when there might be pending operations)
        const startLoadingSync = () => {
            if (!loadingCheckInterval) {
                loadingCheckInterval = setInterval(syncLoadingState, 100);
            }
        };
        
        const stopLoadingSync = () => {
            if (loadingCheckInterval) {
                clearInterval(loadingCheckInterval);
                loadingCheckInterval = null;
            }
        };
        
        // Start syncing if there are pending operations or we're loading
        try {
            const debugInfo = adminPermissions.getDebugInfo();
            if (loading || debugInfo?.promiseManagement?.hasPendingOperations) {
                startLoadingSync();
            }
        } catch (error) {
            console.warn('useAdminPermissions: Failed to check initial loading state:', error);
            if (loading) {
                startLoadingSync();
            }
        }
        
        // Listen for changes that might affect loading state
        const handleLoadingStateChange = () => {
            syncLoadingState();
            
            // Start/stop interval based on current state
            try {
                const debugInfo = adminPermissions.getDebugInfo();
                if (debugInfo?.cacheState?.loading || debugInfo?.promiseManagement?.hasPendingOperations) {
                    startLoadingSync();
                } else {
                    stopLoadingSync();
                }
            } catch (error) {
                console.warn('useAdminPermissions: Failed to handle loading state change:', error);
                stopLoadingSync();
            }
        };
        
        // Add listener for utility class changes
        adminPermissions.addListener(handleLoadingStateChange);
        
        return () => {
            stopLoadingSync();
            adminPermissions.removeListener(handleLoadingStateChange);
        };
    }, [loading]);
    
    /**
     * Get synchronous admin status (uses cached value)
     * Enhanced to ensure React state stays in sync with utility class
     */
    const isCurrentUserAdmin = useCallback(() => {
        const utilityStatus = adminPermissions.isCurrentUserAdmin();
        
        // Ensure React state is synchronized with utility class
        if (isMountedRef.current && utilityStatus !== isAdmin) {
            console.log('useAdminPermissions: Synchronizing React state with utility class:', {
                reactState: isAdmin,
                utilityState: utilityStatus
            });
            setIsAdmin(utilityStatus);
        }
        
        return utilityStatus;
    }, [isAdmin]);
    
    /**
     * Check if admin features should be shown
     */
    const shouldShowAdminFeatures = useCallback(() => {
        return isAdmin && isAuthenticated;
    }, [isAdmin, isAuthenticated]);
    
    /**
     * Get debug information
     * Enhanced to include lastKnownStatus and state synchronization info
     */
    const getDebugInfo = useCallback(() => {
        try {
            const utilityDebugInfo = adminPermissions.getDebugInfo();
            const utilityState = utilityDebugInfo?.cacheState;
            
            return {
                hookState: {
                    isAdmin,
                    loading,
                    error: error?.message,
                    lastChecked,
                    lastKnownStatus, // Include last known status
                    isAuthenticated,
                    authLoading,
                    hasUser: !!user
                },
                utilityState: utilityDebugInfo,
                synchronization: utilityState ? {
                    isAdminSynced: isAdmin === (utilityState.adminStatus || false),
                    lastKnownStatusSynced: lastKnownStatus === utilityState.lastKnownStatus,
                    lastCheckedSynced: lastChecked === utilityState.lastCheck,
                    loadingSynced: loading === utilityState.loading
                } : {
                    isAdminSynced: 'N/A',
                    lastKnownStatusSynced: 'N/A',
                    lastCheckedSynced: 'N/A',
                    loadingSynced: 'N/A'
                }
            };
        } catch (error) {
            console.warn('useAdminPermissions: Failed to get debug info:', error);
            return {
                hookState: {
                    isAdmin,
                    loading,
                    error: error?.message,
                    lastChecked,
                    lastKnownStatus,
                    isAuthenticated,
                    authLoading,
                    hasUser: !!user
                },
                utilityState: null,
                synchronization: {
                    error: 'Failed to get utility state'
                }
            };
        }
    }, [isAdmin, loading, error, lastChecked, lastKnownStatus, isAuthenticated, authLoading, user]);
    
    return {
        // State
        isAdmin,
        loading: loading || authLoading,
        error,
        lastChecked,
        lastKnownStatus, // Expose last known status
        
        // Computed values
        shouldShowAdminFeatures: shouldShowAdminFeatures(),
        
        // Methods
        checkAdminStatus,
        refreshAdminStatus,
        clearAdminStatus,
        isCurrentUserAdmin,
        
        // Debug
        getDebugInfo
    };
}

export default useAdminPermissions;