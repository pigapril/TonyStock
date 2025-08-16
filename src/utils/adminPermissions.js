/**
 * Frontend Admin Permissions Utility
 * 
 * Provides client-side admin permission checking functionality.
 * Integrates with the backend admin status API and existing authentication system.
 * 
 * Features:
 * - Backend API integration for admin status checking
 * - Synchronous admin status checks with caching
 * - UI conditional rendering helpers
 * - Proper error handling for network failures
 * - Session management integration
 * 
 * @author SentimentInsideOut Team
 * @version 1.0.0
 */

import apiClient from '../api/apiClient';
import { handleApiError } from './errorHandler';

/**
 * Admin Permissions Utility Class
 * Handles all admin permission checking functionality on the frontend
 */
class AdminPermissions {
    constructor() {
        this.adminStatus = null;
        this.loading = false;
        this.lastCheck = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
        this.listeners = new Set();
        
        // Bind methods to preserve context
        this.checkIsAdmin = this.checkIsAdmin.bind(this);
        this.isCurrentUserAdmin = this.isCurrentUserAdmin.bind(this);
        this.shouldShowAdminFeatures = this.shouldShowAdminFeatures.bind(this);
        this.clearCache = this.clearCache.bind(this);
        this.addListener = this.addListener.bind(this);
        this.removeListener = this.removeListener.bind(this);
        
        // Listen for authentication changes
        this.setupAuthListeners();
    }
    
    /**
     * Setup listeners for authentication state changes
     * Automatically clears admin status when user logs out
     */
    setupAuthListeners() {
        // Listen for login success events
        window.addEventListener('loginSuccess', () => {
            console.log('AdminPermissions: Login detected, clearing cache');
            this.clearCache();
        });
        
        // Listen for logout events
        window.addEventListener('logoutSuccess', () => {
            console.log('AdminPermissions: Logout detected, clearing cache');
            this.clearCache();
        });
    }
    
    /**
     * Check if the current user is an admin by calling the backend API
     * This method is asynchronous and should be used for initial checks
     * 
     * @returns {Promise<boolean>} True if user is admin, false otherwise
     */
    async checkIsAdmin() {
        try {
            // Check if we have a valid cached result
            if (this.adminStatus !== null && this.lastCheck && 
                (Date.now() - this.lastCheck) < this.cacheTimeout) {
                console.log('AdminPermissions: Using cached admin status:', this.adminStatus);
                return this.adminStatus;
            }
            
            // Prevent multiple simultaneous requests
            if (this.loading) {
                console.log('AdminPermissions: Admin status check already in progress');
                // Wait for the current request to complete
                return new Promise((resolve) => {
                    const checkStatus = () => {
                        if (!this.loading) {
                            resolve(this.adminStatus || false);
                        } else {
                            setTimeout(checkStatus, 100);
                        }
                    };
                    checkStatus();
                });
            }
            
            this.loading = true;
            
            console.log('AdminPermissions: Checking admin status via API');
            
            // Call the backend admin status endpoint
            const response = await apiClient.get('/api/auth/admin-status');
            
            const data = response.data;
            const isAdmin = data?.data?.isAdmin || false;
            const isAuthenticated = data?.data?.isAuthenticated || false;
            
            console.log('AdminPermissions: API response:', {
                isAuthenticated,
                isAdmin,
                timestamp: new Date().toISOString()
            });
            
            // Update cache
            this.adminStatus = isAdmin;
            this.lastCheck = Date.now();
            
            // Notify listeners of status change
            this.notifyListeners(isAdmin);
            
            return isAdmin;
            
        } catch (error) {
            console.error('AdminPermissions: Failed to check admin status:', error);
            
            // Handle different types of errors
            const handledError = handleApiError(error);
            
            // For network errors or server issues, maintain current status if available
            if (error.code === 'ERR_NETWORK' || error.response?.status >= 500) {
                console.warn('AdminPermissions: Network/server error, maintaining current status');
                if (this.adminStatus !== null) {
                    return this.adminStatus;
                }
            }
            
            // For authentication errors (401, 403), clear admin status
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.warn('AdminPermissions: Authentication error, clearing admin status');
                this.adminStatus = false;
                this.lastCheck = Date.now();
                this.notifyListeners(false);
                return false;
            }
            
            // For other errors, default to false for security
            console.warn('AdminPermissions: Unknown error, defaulting to non-admin');
            this.adminStatus = false;
            this.lastCheck = Date.now();
            this.notifyListeners(false);
            return false;
            
        } finally {
            this.loading = false;
        }
    }
    
    /**
     * Synchronous check for current user admin status
     * Uses cached value if available, otherwise returns false
     * 
     * @returns {boolean} True if user is admin based on cached data
     */
    isCurrentUserAdmin() {
        // Return cached status if available and not expired
        if (this.adminStatus !== null && this.lastCheck && 
            (Date.now() - this.lastCheck) < this.cacheTimeout) {
            return this.adminStatus;
        }
        
        // If no cached data or expired, trigger async check but return false for safety
        if (!this.loading) {
            this.checkIsAdmin().catch(error => {
                console.error('AdminPermissions: Background admin check failed:', error);
            });
        }
        
        return false; // Default to false for security
    }
    
    /**
     * Determine if admin features should be shown in the UI
     * This is the primary method for conditional rendering
     * 
     * @returns {boolean} True if admin features should be displayed
     */
    shouldShowAdminFeatures() {
        return this.isCurrentUserAdmin();
    }
    
    /**
     * Clear the admin status cache
     * Useful when user authentication state changes
     */
    clearCache() {
        console.log('AdminPermissions: Clearing admin status cache');
        this.adminStatus = null;
        this.lastCheck = null;
        this.loading = false;
        
        // Notify listeners of cache clear
        this.notifyListeners(null);
    }
    
    /**
     * Get the current loading state
     * 
     * @returns {boolean} True if currently checking admin status
     */
    isLoading() {
        return this.loading;
    }
    
    /**
     * Get the last check timestamp
     * 
     * @returns {number|null} Timestamp of last admin status check
     */
    getLastCheckTime() {
        return this.lastCheck;
    }
    
    /**
     * Check if the cached status is still valid
     * 
     * @returns {boolean} True if cached status is valid
     */
    isCacheValid() {
        return this.adminStatus !== null && this.lastCheck && 
               (Date.now() - this.lastCheck) < this.cacheTimeout;
    }
    
    /**
     * Add a listener for admin status changes
     * 
     * @param {function} listener - Function to call when admin status changes
     */
    addListener(listener) {
        if (typeof listener === 'function') {
            this.listeners.add(listener);
        }
    }
    
    /**
     * Remove a listener for admin status changes
     * 
     * @param {function} listener - Function to remove from listeners
     */
    removeListener(listener) {
        this.listeners.delete(listener);
    }
    
    /**
     * Notify all listeners of admin status changes
     * 
     * @param {boolean|null} status - New admin status
     */
    notifyListeners(status) {
        this.listeners.forEach(listener => {
            try {
                listener(status);
            } catch (error) {
                console.error('AdminPermissions: Listener error:', error);
            }
        });
    }
    
    /**
     * Force refresh admin status from server
     * Bypasses cache and makes a fresh API call
     * 
     * @returns {Promise<boolean>} Fresh admin status from server
     */
    async refreshAdminStatus() {
        console.log('AdminPermissions: Force refreshing admin status');
        this.clearCache();
        return await this.checkIsAdmin();
    }
    
    /**
     * Get debug information about the current state
     * 
     * @returns {object} Debug information
     */
    getDebugInfo() {
        return {
            adminStatus: this.adminStatus,
            loading: this.loading,
            lastCheck: this.lastCheck,
            cacheValid: this.isCacheValid(),
            cacheAge: this.lastCheck ? Date.now() - this.lastCheck : null,
            listenersCount: this.listeners.size
        };
    }
}

// Create and export a singleton instance
const adminPermissions = new AdminPermissions();

export default adminPermissions;

// Also export the class for testing purposes
export { AdminPermissions };