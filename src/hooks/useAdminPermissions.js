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
 * 
 * @author SentimentInsideOut Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../components/Auth/useAuth';
import adminPermissions from '../utils/adminPermissions';

/**
 * Custom hook for admin permissions management
 * 
 * @returns {object} Admin permissions state and methods
 */
export function useAdminPermissions() {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastChecked, setLastChecked] = useState(null);
    
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
     */
    const checkAdminStatus = useCallback(async () => {
        // Don't check if auth is still loading or user is not authenticated
        if (authLoading || !isAuthenticated || !user) {
            if (isMountedRef.current) {
                setIsAdmin(false);
                setError(null);
                setLastChecked(null);
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
                setLastChecked(Date.now());
                
                console.log('useAdminPermissions: Admin status updated:', {
                    isAdmin: adminStatus,
                    userId: user.id || user.userId,
                    timestamp: new Date().toISOString()
                });
            }
            
            return adminStatus;
            
        } catch (err) {
            console.error('useAdminPermissions: Failed to check admin status:', err);
            
            if (isMountedRef.current) {
                setError(err);
                setIsAdmin(false); // Default to false for security
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
     */
    const clearAdminStatus = useCallback(() => {
        console.log('useAdminPermissions: Clearing admin status');
        adminPermissions.clearCache();
        if (isMountedRef.current) {
            setIsAdmin(false);
            setError(null);
            setLastChecked(null);
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
    
    // Effect to listen for admin status changes from the utility
    useEffect(() => {
        const handleAdminStatusChange = (status) => {
            if (isMountedRef.current && status !== null) {
                console.log('useAdminPermissions: Admin status changed via listener:', status);
                setIsAdmin(status);
                setLastChecked(Date.now());
            }
        };
        
        adminPermissions.addListener(handleAdminStatusChange);
        
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
    
    /**
     * Get synchronous admin status (uses cached value)
     */
    const isCurrentUserAdmin = useCallback(() => {
        return adminPermissions.isCurrentUserAdmin();
    }, []);
    
    /**
     * Check if admin features should be shown
     */
    const shouldShowAdminFeatures = useCallback(() => {
        return isAdmin && isAuthenticated;
    }, [isAdmin, isAuthenticated]);
    
    /**
     * Get debug information
     */
    const getDebugInfo = useCallback(() => {
        return {
            hookState: {
                isAdmin,
                loading,
                error: error?.message,
                lastChecked,
                isAuthenticated,
                authLoading,
                hasUser: !!user
            },
            utilityState: adminPermissions.getDebugInfo()
        };
    }, [isAdmin, loading, error, lastChecked, isAuthenticated, authLoading, user]);
    
    return {
        // State
        isAdmin,
        loading: loading || authLoading,
        error,
        lastChecked,
        
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