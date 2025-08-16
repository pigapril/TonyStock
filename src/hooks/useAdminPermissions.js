/**
 * useAdminPermissions React Hook - Simplified Version
 * 
 * Provides React integration for admin permissions functionality.
 * Simplified to eliminate race conditions and complex state synchronization.
 * 
 * Features:
 * - Simple, predictable admin status management
 * - Single source of truth from utility class
 * - Minimal state synchronization
 * - Immediate admin status availability
 * - Graceful error handling
 * 
 * @author SentimentInsideOut Team
 * @version 2.0.0 - Simplified to fix race conditions and complex state sync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../components/Auth/useAuth';
import adminPermissions from '../utils/adminPermissions';

/**
 * Simplified custom hook for admin permissions management
 * 
 * @returns {object} Admin permissions state and methods
 * @returns {boolean} returns.isAdmin - Current admin status
 * @returns {boolean} returns.loading - Loading state
 * @returns {Error|null} returns.error - Last error encountered
 * @returns {function} returns.checkAdminStatus - Async method to check admin status
 * @returns {function} returns.refreshAdminStatus - Force refresh admin status
 * @returns {function} returns.clearAdminStatus - Clear admin status and cache
 * @returns {function} returns.isCurrentUserAdmin - Synchronous admin status check
 * @returns {function} returns.shouldShowAdminFeatures - Whether admin features should be shown
 */
export function useAdminPermissions() {
    const { user, isAuthenticated, loading: authLoading, isAdmin: authIsAdmin, adminLoading } = useAuth();
    const [isAdmin, setIsAdmin] = useState(() => {
        // Initialize with current utility state if available
        try {
            return adminPermissions.isCurrentUserAdmin();
        } catch {
            return false;
        }
    });
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
     * Check admin status and update state - Simplified version
     */
    const checkAdminStatus = useCallback(async () => {
        // Don't check if auth is still loading or user is not authenticated
        if (authLoading || !isAuthenticated || !user) {
            if (isMountedRef.current) {
                setIsAdmin(false);
                setError(null);
            }
            return false;
        }
        
        try {
            if (isMountedRef.current) {
                setLoading(true);
                setError(null);
            }
            
            const adminStatus = await adminPermissions.checkIsAdmin();
            
            if (isMountedRef.current) {
                setIsAdmin(adminStatus);
            }
            
            return adminStatus;
            
        } catch (err) {
            console.error('useAdminPermissions: Failed to check admin status:', err);
            
            if (isMountedRef.current) {
                setError(err);
                // Use utility class for fallback
                const utilityStatus = adminPermissions.isCurrentUserAdmin();
                setIsAdmin(utilityStatus);
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
        adminPermissions.clearCache();
        return await checkAdminStatus();
    }, [checkAdminStatus]);
    
    /**
     * Clear admin status and error state
     */
    const clearAdminStatus = useCallback(() => {
        adminPermissions.clearCache();
        if (isMountedRef.current) {
            setIsAdmin(false);
            setError(null);
        }
    }, []);
    
    // Single effect to handle all state changes
    useEffect(() => {
        // Handle authentication state changes
        if (isAuthenticated && user && !authLoading) {
            checkAdminStatus();
        } else if (!isAuthenticated || !user) {
            clearAdminStatus();
        }
        
        // Set up utility class listener
        const handleAdminStatusChange = (status) => {
            if (isMountedRef.current && status !== null) {
                setIsAdmin(status);
            }
        };
        
        adminPermissions.addListener(handleAdminStatusChange);
        
        // Set up authentication event listeners
        const handleLoginSuccess = () => {
            if (isMountedRef.current) {
                checkAdminStatus();
            }
        };
        
        const handleLogoutSuccess = () => {
            clearAdminStatus();
        };
        
        window.addEventListener('loginSuccess', handleLoginSuccess);
        window.addEventListener('logoutSuccess', handleLogoutSuccess);
        
        return () => {
            adminPermissions.removeListener(handleAdminStatusChange);
            window.removeEventListener('loginSuccess', handleLoginSuccess);
            window.removeEventListener('logoutSuccess', handleLogoutSuccess);
        };
    }, [isAuthenticated, user, authLoading, checkAdminStatus, clearAdminStatus]);
    
    // No complex loading state synchronization needed - keep it simple
    
    /**
     * Get synchronous admin status (delegates to utility class)
     */
    const isCurrentUserAdmin = useCallback(() => {
        return adminPermissions.isCurrentUserAdmin();
    }, []);
    
    /**
     * Check if admin features should be shown
     */
    const shouldShowAdminFeatures = useCallback(() => {
        return isCurrentUserAdmin() && isAuthenticated;
    }, [isCurrentUserAdmin, isAuthenticated]);
    
    return {
        // State - Use AuthContext admin status as primary source
        isAdmin: authIsAdmin,
        loading: loading || authLoading || adminLoading,
        error,
        isAuthenticated,
        user,
        lastKnownStatus: authIsAdmin, // Use current admin status as last known
        
        // Methods
        checkAdminStatus,
        refreshAdminStatus,
        clearAdminStatus,
        isCurrentUserAdmin: () => authIsAdmin,
        shouldShowAdminFeatures: () => authIsAdmin && isAuthenticated
    };
}

export default useAdminPermissions;