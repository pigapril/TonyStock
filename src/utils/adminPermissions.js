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
        
        // New properties for enhanced caching logic
        this.pendingPromise = null;        // Current ongoing API call
        this.promiseQueue = [];           // Queue of waiting promises
        this.lastKnownStatus = null;      // Last known admin status for graceful degradation
        this.gracePeriod = 30000;         // Grace period for cache expiration (30 seconds)
        this.gracePeriodEnd = null;       // When grace period ends
        
        // Debug and monitoring properties
        this.apiCallStats = {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            lastCallDuration: 0
        };
        
        // Background refresh scheduling
        this.backgroundRefreshTimer = null;
        
        // Enhanced error handling and recovery properties
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000, // 1 second base delay
            maxDelay: 30000, // 30 seconds max delay
            backoffMultiplier: 2
        };
        this.currentRetryCount = 0;
        this.lastErrorType = null;
        this.consecutiveFailures = 0;
        this.stateValidationTimer = null;
        this.stateValidationInterval = 60000; // 1 minute
        
        // Error classification tracking
        this.errorHistory = [];
        this.maxErrorHistorySize = 50;
        
        // Bind methods to preserve context
        this.checkIsAdmin = this.checkIsAdmin.bind(this);
        this.isCurrentUserAdmin = this.isCurrentUserAdmin.bind(this);
        this.shouldShowAdminFeatures = this.shouldShowAdminFeatures.bind(this);
        this.clearCache = this.clearCache.bind(this);
        this.addListener = this.addListener.bind(this);
        this.removeListener = this.removeListener.bind(this);
        this.backgroundRefresh = this.backgroundRefresh.bind(this);
        this.isInGracePeriod = this.isInGracePeriod.bind(this);
        this._performAdminCheck = this._performAdminCheck.bind(this);
        this._cleanupPromiseQueue = this._cleanupPromiseQueue.bind(this);
        this._scheduleBackgroundRefresh = this._scheduleBackgroundRefresh.bind(this);
        this._classifyError = this._classifyError.bind(this);
        this._shouldRetry = this._shouldRetry.bind(this);
        this._calculateRetryDelay = this._calculateRetryDelay.bind(this);
        this._performRetryableAdminCheck = this._performRetryableAdminCheck.bind(this);
        this._validateStateConsistency = this._validateStateConsistency.bind(this);
        this._recoverFromInconsistentState = this._recoverFromInconsistentState.bind(this);
        this._startStateValidation = this._startStateValidation.bind(this);
        this._stopStateValidation = this._stopStateValidation.bind(this);
        
        // Listen for authentication changes
        this.setupAuthListeners();
        
        // Start state consistency validation
        this._startStateValidation();
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
     * Enhanced with Promise queue management to prevent multiple simultaneous API calls
     * 
     * @returns {Promise<boolean>} True if user is admin, false otherwise
     */
    async checkIsAdmin() {
        try {
            // Check if we have a valid cached result
            if (this.isCacheValid()) {
                console.log('AdminPermissions: Using cached admin status:', this.adminStatus);
                return this.adminStatus;
            }
            
            // If there's already a pending promise, add to queue and return the same promise
            if (this.pendingPromise) {
                console.log('AdminPermissions: Adding to promise queue, returning existing pending promise');
                
                // Create a new promise that resolves when the pending one completes
                const queuedPromise = this.pendingPromise.then(result => {
                    console.log('AdminPermissions: Queued promise resolved with result:', result);
                    return result;
                }).catch(error => {
                    console.error('AdminPermissions: Queued promise rejected with error:', error);
                    throw error;
                });
                
                // Add to queue for tracking
                this.promiseQueue.push(queuedPromise);
                
                return queuedPromise;
            }
            
            // Create and cache the new promise
            console.log('AdminPermissions: Creating new admin check promise');
            this.pendingPromise = this._performAdminCheck();
            
            try {
                const result = await this.pendingPromise;
                console.log('AdminPermissions: Admin check completed with result:', result);
                return result;
            } finally {
                // Clear the pending promise and process queue
                console.log('AdminPermissions: Cleaning up pending promise and queue');
                this.pendingPromise = null;
                this._cleanupPromiseQueue();
            }
            
        } catch (error) {
            console.error('AdminPermissions: Failed to check admin status:', error);
            this.pendingPromise = null; // Clear pending promise on error
            this._cleanupPromiseQueue(); // Clean up queue on error
            throw error; // Re-throw to maintain error handling behavior
        }
    }
    
    /**
     * Internal method to perform the actual admin check API call with retry logic
     * Enhanced with exponential backoff retry mechanism and error classification
     * 
     * @returns {Promise<boolean>} True if user is admin, false otherwise
     * @private
     */
    async _performAdminCheck() {
        return this._performRetryableAdminCheck();
    }
    
    /**
     * Perform admin check with exponential backoff retry mechanism
     * Handles different error types with appropriate retry strategies
     * 
     * @param {number} retryCount - Current retry attempt (0-based)
     * @returns {Promise<boolean>} True if user is admin, false otherwise
     * @private
     */
    async _performRetryableAdminCheck(retryCount = 0) {
        const startTime = Date.now();
        this.apiCallStats.totalCalls++;
        this.currentRetryCount = retryCount;
        
        try {
            this.loading = true;
            
            console.log(`AdminPermissions: Checking admin status via API (attempt ${retryCount + 1}/${this.retryConfig.maxRetries + 1})`);
            
            // Call the backend admin status endpoint
            const response = await apiClient.get('/api/auth/admin-status');
            
            const data = response.data;
            const isAdmin = data?.data?.isAdmin || false;
            const isAuthenticated = data?.data?.isAuthenticated || false;
            
            console.log('AdminPermissions: API response:', {
                isAuthenticated,
                isAdmin,
                timestamp: new Date().toISOString(),
                retryCount
            });
            
            // Success - reset retry counters and update state
            this.currentRetryCount = 0;
            this.consecutiveFailures = 0;
            this.lastErrorType = null;
            
            // Update cache and last known status
            this.adminStatus = isAdmin;
            this.lastKnownStatus = isAdmin;
            this.lastCheck = Date.now();
            this.gracePeriodEnd = null; // Clear grace period on successful update
            
            // Update stats
            this.apiCallStats.successfulCalls++;
            this.apiCallStats.lastCallDuration = Date.now() - startTime;
            
            // Schedule next background refresh
            this._scheduleBackgroundRefresh();
            
            // Notify listeners of status change
            this.notifyListeners(isAdmin);
            
            return isAdmin;
            
        } catch (error) {
            console.error(`AdminPermissions: Failed to check admin status (attempt ${retryCount + 1}):`, error);
            
            // Update stats
            this.apiCallStats.failedCalls++;
            this.apiCallStats.lastCallDuration = Date.now() - startTime;
            this.consecutiveFailures++;
            
            // Classify the error for appropriate handling
            const errorClassification = this._classifyError(error);
            this.lastErrorType = errorClassification.type;
            
            // Add to error history for debugging
            this._addToErrorHistory(error, errorClassification, retryCount);
            
            // Handle different types of errors with retry logic
            if (this._shouldRetry(errorClassification, retryCount)) {
                const retryDelay = this._calculateRetryDelay(retryCount);
                console.log(`AdminPermissions: Retrying in ${retryDelay}ms due to ${errorClassification.type} error`);
                
                // Wait for the calculated delay before retrying
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                
                // Recursive retry
                return this._performRetryableAdminCheck(retryCount + 1);
            }
            
            // No more retries or non-retryable error - handle based on error type
            return this._handleFinalError(error, errorClassification);
            
        } finally {
            this.loading = false;
        }
    }
    
    /**
     * Synchronous check for current user admin status
     * Enhanced to handle pending API calls gracefully and provide better UX
     * 
     * @returns {boolean} True if user is admin based on cached data or last known status
     */
    isCurrentUserAdmin() {
        // 1. If we have a valid cache, return it immediately
        if (this.isCacheValid()) {
            return this.adminStatus;
        }
        
        // 2. If there's a pending API call and we have a last known status, return it
        if (this.loading && this.lastKnownStatus !== null) {
            console.log('AdminPermissions: API call in progress, returning last known status:', this.lastKnownStatus);
            return this.lastKnownStatus;
        }
        
        // 3. If we're in the grace period, return last known status
        if (this.isInGracePeriod()) {
            console.log('AdminPermissions: In grace period, returning last known status:', this.lastKnownStatus);
            return this.lastKnownStatus || false;
        }
        
        // 4. If no API call is in progress, trigger background refresh
        if (!this.loading && !this.pendingPromise) {
            this.backgroundRefresh();
        }
        
        // 5. Return last known status or false as fallback
        return this.lastKnownStatus || false;
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
     * Enhanced to clear all new caching properties and properly cleanup promises
     */
    clearCache() {
        console.log('AdminPermissions: Clearing admin status cache');
        this.adminStatus = null;
        this.lastCheck = null;
        this.loading = false;
        
        // Clear new caching properties with proper cleanup
        const hadPendingOperations = this.hasPendingOperations();
        this.pendingPromise = null;
        this.lastKnownStatus = null;
        this.gracePeriodEnd = null;
        this._cleanupPromiseQueue();
        this._cancelScheduledRefresh();
        
        // Clear error handling properties
        this.currentRetryCount = 0;
        this.consecutiveFailures = 0;
        this.lastErrorType = null;
        
        if (hadPendingOperations) {
            console.log('AdminPermissions: Cleared pending operations during cache clear');
        }
        
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
     * Check if we're currently in the grace period
     * During grace period, we use last known status even if cache is expired
     * 
     * @returns {boolean} True if currently in grace period
     */
    isInGracePeriod() {
        return this.gracePeriodEnd !== null && Date.now() < this.gracePeriodEnd;
    }
    
    /**
     * Trigger a background refresh of admin status
     * Enhanced to handle expired cache scenarios and provide better UX
     * This doesn't block the current operation but updates cache for future calls
     */
    backgroundRefresh() {
        if (!this.loading && !this.pendingPromise) {
            console.log('AdminPermissions: Triggering background refresh');
            
            // Start the background refresh
            this.checkIsAdmin().catch(error => {
                console.error('AdminPermissions: Background refresh failed:', error);
                
                // If background refresh fails and we're past grace period,
                // extend grace period slightly to avoid immediate failures
                if (!this.isInGracePeriod() && this.lastKnownStatus !== null) {
                    console.log('AdminPermissions: Extending grace period due to background refresh failure');
                    this.gracePeriodEnd = Date.now() + (this.gracePeriod / 2); // Half grace period extension
                }
            });
        } else {
            console.log('AdminPermissions: Background refresh skipped - already loading or pending promise exists');
        }
    }
    
    /**
     * Clean up the promise queue by removing resolved promises
     * This prevents memory leaks from accumulating resolved promises
     * @private
     */
    _cleanupPromiseQueue() {
        // Filter out any resolved/rejected promises from the queue
        const initialQueueSize = this.promiseQueue.length;
        
        // Since promises don't have a direct way to check if they're settled,
        // we'll clear the entire queue when the main promise completes
        // This is safe because all queued promises are derived from the main promise
        this.promiseQueue = [];
        
        if (initialQueueSize > 0) {
            console.log(`AdminPermissions: Cleaned up ${initialQueueSize} promises from queue`);
        }
    }
    
    /**
     * Get the current promise queue size for debugging
     * @returns {number} Number of promises currently in queue
     */
    getPromiseQueueSize() {
        return this.promiseQueue.length;
    }
    
    /**
     * Check if there are any pending operations (main promise or queued promises)
     * @returns {boolean} True if there are pending operations
     */
    hasPendingOperations() {
        return this.pendingPromise !== null || this.promiseQueue.length > 0;
    }
    
    /**
     * Schedule a background refresh to occur before cache expires
     * This ensures smooth user experience by refreshing cache proactively
     * @private
     */
    _scheduleBackgroundRefresh() {
        // Clear any existing timer
        if (this.backgroundRefreshTimer) {
            clearTimeout(this.backgroundRefreshTimer);
            this.backgroundRefreshTimer = null;
        }
        
        // Schedule refresh to occur 30 seconds before cache expires
        const refreshDelay = Math.max(1000, this.cacheTimeout - 30000); // At least 1 second delay
        
        console.log(`AdminPermissions: Scheduling background refresh in ${refreshDelay}ms`);
        
        this.backgroundRefreshTimer = setTimeout(() => {
            console.log('AdminPermissions: Executing scheduled background refresh');
            this.backgroundRefresh();
            this.backgroundRefreshTimer = null;
        }, refreshDelay);
    }
    
    /**
     * Cancel any scheduled background refresh
     * @private
     */
    _cancelScheduledRefresh() {
        if (this.backgroundRefreshTimer) {
            clearTimeout(this.backgroundRefreshTimer);
            this.backgroundRefreshTimer = null;
            console.log('AdminPermissions: Cancelled scheduled background refresh');
        }
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
     * Cleanup method to properly dispose of the instance
     * Should be called when the instance is no longer needed
     */
    cleanup() {
        console.log('AdminPermissions: Cleaning up instance');
        
        // Stop all timers
        this._stopStateValidation();
        this._cancelScheduledRefresh();
        
        // Clear all state
        this.clearCache();
        this.clearErrorHistory();
        
        // Clear all listeners
        this.listeners.clear();
        
        // Remove event listeners
        window.removeEventListener('loginSuccess', this.clearCache);
        window.removeEventListener('logoutSuccess', this.clearCache);
    }
    
    /**
     * Classify error types for appropriate handling and retry strategies
     * 
     * @param {Error} error - The error to classify
     * @returns {object} Error classification with type and retry strategy
     * @private
     */
    _classifyError(error) {
        const classification = {
            type: 'unknown',
            retryable: false,
            severity: 'medium',
            description: 'Unknown error'
        };
        
        // Network connectivity errors - highly retryable
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
            classification.type = 'network';
            classification.retryable = true;
            classification.severity = 'high';
            classification.description = 'Network connectivity issue';
        }
        // Timeout errors - retryable
        else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            classification.type = 'timeout';
            classification.retryable = true;
            classification.severity = 'medium';
            classification.description = 'Request timeout';
        }
        // Server errors (5xx) - retryable
        else if (error.response?.status >= 500) {
            classification.type = 'server';
            classification.retryable = true;
            classification.severity = 'high';
            classification.description = `Server error (${error.response.status})`;
        }
        // Rate limiting (429) - retryable with longer delay
        else if (error.response?.status === 429) {
            classification.type = 'rate_limit';
            classification.retryable = true;
            classification.severity = 'medium';
            classification.description = 'Rate limit exceeded';
        }
        // Authentication errors (401, 403) - not retryable
        else if (error.response?.status === 401 || error.response?.status === 403) {
            classification.type = 'auth';
            classification.retryable = false;
            classification.severity = 'low';
            classification.description = `Authentication error (${error.response.status})`;
        }
        // Client errors (4xx except 401, 403, 429) - not retryable
        else if (error.response?.status >= 400 && error.response?.status < 500) {
            classification.type = 'client';
            classification.retryable = false;
            classification.severity = 'low';
            classification.description = `Client error (${error.response.status})`;
        }
        // DNS resolution errors - retryable
        else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
            classification.type = 'dns';
            classification.retryable = true;
            classification.severity = 'high';
            classification.description = 'DNS resolution error';
        }
        // Connection refused - retryable
        else if (error.code === 'ECONNREFUSED') {
            classification.type = 'connection_refused';
            classification.retryable = true;
            classification.severity = 'high';
            classification.description = 'Connection refused';
        }
        
        return classification;
    }
    
    /**
     * Determine if an error should be retried based on classification and retry count
     * 
     * @param {object} errorClassification - Error classification from _classifyError
     * @param {number} retryCount - Current retry attempt count
     * @returns {boolean} True if should retry
     * @private
     */
    _shouldRetry(errorClassification, retryCount) {
        // Don't retry if we've exceeded max retries
        if (retryCount >= this.retryConfig.maxRetries) {
            return false;
        }
        
        // Don't retry non-retryable errors
        if (!errorClassification.retryable) {
            return false;
        }
        
        // Don't retry if we have too many consecutive failures
        if (this.consecutiveFailures > this.retryConfig.maxRetries * 2) {
            console.warn('AdminPermissions: Too many consecutive failures, stopping retries');
            return false;
        }
        
        return true;
    }
    
    /**
     * Calculate retry delay using exponential backoff with jitter
     * 
     * @param {number} retryCount - Current retry attempt count
     * @returns {number} Delay in milliseconds
     * @private
     */
    _calculateRetryDelay(retryCount) {
        // Base exponential backoff
        let delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount);
        
        // Cap at max delay
        delay = Math.min(delay, this.retryConfig.maxDelay);
        
        // Add jitter (±25% randomization) to prevent thundering herd
        const jitter = delay * 0.25 * (Math.random() * 2 - 1);
        delay = Math.max(100, delay + jitter); // Minimum 100ms delay
        
        // Special handling for rate limiting - use longer delays
        if (this.lastErrorType === 'rate_limit') {
            delay = Math.max(delay, 5000); // Minimum 5 seconds for rate limiting
        }
        
        return Math.round(delay);
    }
    
    /**
     * Handle final error after all retries are exhausted
     * 
     * @param {Error} error - The original error
     * @param {object} errorClassification - Error classification
     * @returns {boolean} Final admin status to return
     * @private
     */
    _handleFinalError(error, errorClassification) {
        console.error('AdminPermissions: All retries exhausted, handling final error:', {
            type: errorClassification.type,
            description: errorClassification.description,
            consecutiveFailures: this.consecutiveFailures
        });
        
        // Handle different error types appropriately
        switch (errorClassification.type) {
            case 'network':
            case 'timeout':
            case 'server':
            case 'dns':
            case 'connection_refused':
                // For infrastructure errors, maintain last known status if available
                console.warn('AdminPermissions: Infrastructure error, maintaining last known status');
                if (this.lastKnownStatus !== null) {
                    // Start or extend grace period
                    if (!this.gracePeriodEnd) {
                        this.gracePeriodEnd = Date.now() + this.gracePeriod;
                        console.log('AdminPermissions: Starting grace period until', new Date(this.gracePeriodEnd));
                    } else {
                        // Extend grace period for persistent infrastructure issues
                        this.gracePeriodEnd = Date.now() + this.gracePeriod;
                        console.log('AdminPermissions: Extending grace period until', new Date(this.gracePeriodEnd));
                    }
                    return this.lastKnownStatus;
                }
                break;
                
            case 'auth':
                // For authentication errors, clear all status
                console.warn('AdminPermissions: Authentication error, clearing all status');
                this.adminStatus = false;
                this.lastKnownStatus = false;
                this.lastCheck = Date.now();
                this.gracePeriodEnd = null;
                this.notifyListeners(false);
                return false;
                
            case 'rate_limit':
                // For rate limiting, maintain last known status and extend grace period
                console.warn('AdminPermissions: Rate limited, maintaining last known status');
                if (this.lastKnownStatus !== null) {
                    this.gracePeriodEnd = Date.now() + (this.gracePeriod * 2); // Double grace period for rate limiting
                    return this.lastKnownStatus;
                }
                break;
                
            case 'client':
            default:
                // For client errors and unknown errors, use conservative approach
                console.warn('AdminPermissions: Client/unknown error, using conservative approach');
                break;
        }
        
        // Default conservative approach
        const conservativeStatus = this.lastKnownStatus || false;
        this.adminStatus = conservativeStatus;
        this.lastCheck = Date.now();
        this.notifyListeners(conservativeStatus);
        return conservativeStatus;
    }
    
    /**
     * Add error to history for debugging and pattern analysis
     * 
     * @param {Error} error - The error that occurred
     * @param {object} classification - Error classification
     * @param {number} retryCount - Retry attempt count
     * @private
     */
    _addToErrorHistory(error, classification, retryCount) {
        const errorEntry = {
            timestamp: Date.now(),
            type: classification.type,
            description: classification.description,
            severity: classification.severity,
            retryCount,
            status: error.response?.status,
            code: error.code,
            message: error.message,
            consecutiveFailures: this.consecutiveFailures
        };
        
        this.errorHistory.push(errorEntry);
        
        // Keep history size manageable
        if (this.errorHistory.length > this.maxErrorHistorySize) {
            this.errorHistory.shift();
        }
    }
    
    /**
     * Validate state consistency between different components
     * Checks for inconsistencies and triggers recovery if needed
     * 
     * @private
     */
    _validateStateConsistency() {
        const inconsistencies = [];
        
        // Check if cache is valid but we have no admin status
        if (this.isCacheValid() && this.adminStatus === null) {
            inconsistencies.push('cache_valid_but_no_status');
        }
        
        // Check if we have admin status but no last check time
        if (this.adminStatus !== null && !this.lastCheck) {
            inconsistencies.push('status_without_timestamp');
        }
        
        // Check if grace period is active but we have no last known status
        if (this.isInGracePeriod() && this.lastKnownStatus === null) {
            inconsistencies.push('grace_period_without_known_status');
        }
        
        // Check if we have pending operations but loading is false
        if (this.hasPendingOperations() && !this.loading) {
            inconsistencies.push('pending_operations_not_loading');
        }
        
        // Check for stale grace period (should not last more than 2x grace period)
        if (this.gracePeriodEnd && (Date.now() - this.gracePeriodEnd) > this.gracePeriod) {
            inconsistencies.push('stale_grace_period');
        }
        
        if (inconsistencies.length > 0) {
            console.warn('AdminPermissions: State inconsistencies detected:', inconsistencies);
            this._recoverFromInconsistentState(inconsistencies);
        }
    }
    
    /**
     * Recover from inconsistent state by applying corrective measures
     * 
     * @param {string[]} inconsistencies - List of detected inconsistencies
     * @private
     */
    _recoverFromInconsistentState(inconsistencies) {
        console.log('AdminPermissions: Recovering from inconsistent state:', inconsistencies);
        
        let recoveryActions = [];
        
        inconsistencies.forEach(inconsistency => {
            switch (inconsistency) {
                case 'cache_valid_but_no_status':
                    // Clear invalid cache
                    this.adminStatus = null;
                    this.lastCheck = null;
                    recoveryActions.push('cleared_invalid_cache');
                    break;
                    
                case 'status_without_timestamp':
                    // Add current timestamp
                    this.lastCheck = Date.now();
                    recoveryActions.push('added_missing_timestamp');
                    break;
                    
                case 'grace_period_without_known_status':
                    // Clear grace period
                    this.gracePeriodEnd = null;
                    recoveryActions.push('cleared_invalid_grace_period');
                    break;
                    
                case 'pending_operations_not_loading':
                    // Clear pending operations
                    this.pendingPromise = null;
                    this._cleanupPromiseQueue();
                    recoveryActions.push('cleared_stale_pending_operations');
                    break;
                    
                case 'stale_grace_period':
                    // Clear stale grace period
                    this.gracePeriodEnd = null;
                    recoveryActions.push('cleared_stale_grace_period');
                    break;
            }
        });
        
        if (recoveryActions.length > 0) {
            console.log('AdminPermissions: Applied recovery actions:', recoveryActions);
            
            // Notify listeners of potential state change
            this.notifyListeners(this.adminStatus);
            
            // Trigger a background refresh to restore proper state
            this.backgroundRefresh();
        }
    }
    
    /**
     * Start periodic state consistency validation
     * 
     * @private
     */
    _startStateValidation() {
        if (this.stateValidationTimer) {
            return; // Already running
        }
        
        console.log('AdminPermissions: Starting state consistency validation');
        
        this.stateValidationTimer = setInterval(() => {
            this._validateStateConsistency();
        }, this.stateValidationInterval);
    }
    
    /**
     * Stop periodic state consistency validation
     * 
     * @private
     */
    _stopStateValidation() {
        if (this.stateValidationTimer) {
            clearInterval(this.stateValidationTimer);
            this.stateValidationTimer = null;
            console.log('AdminPermissions: Stopped state consistency validation');
        }
    }
    
    /**
     * Get error history for debugging
     * 
     * @returns {Array} Array of error entries
     */
    getErrorHistory() {
        return [...this.errorHistory]; // Return copy to prevent external modification
    }
    
    /**
     * Clear error history
     */
    clearErrorHistory() {
        this.errorHistory = [];
        console.log('AdminPermissions: Cleared error history');
    }
    
    /**
     * Get retry configuration
     * 
     * @returns {object} Current retry configuration
     */
    getRetryConfig() {
        return { ...this.retryConfig }; // Return copy
    }
    
    /**
     * Update retry configuration
     * 
     * @param {object} newConfig - New retry configuration
     */
    updateRetryConfig(newConfig) {
        this.retryConfig = { ...this.retryConfig, ...newConfig };
        console.log('AdminPermissions: Updated retry configuration:', this.retryConfig);
    }
    
    /**
     * Get debug information about the current state
     * Enhanced with new caching properties, timing information, and promise queue details
     * 
     * @returns {object} Debug information
     */
    getDebugInfo() {
        const now = Date.now();
        return {
            cacheState: {
                adminStatus: this.adminStatus,
                lastKnownStatus: this.lastKnownStatus,
                loading: this.loading,
                lastCheck: this.lastCheck,
                cacheValid: this.isCacheValid(),
                inGracePeriod: this.isInGracePeriod(),
                hasPendingPromise: this.pendingPromise !== null,
                gracePeriodEnd: this.gracePeriodEnd
            },
            promiseManagement: {
                hasPendingPromise: this.pendingPromise !== null,
                promiseQueueSize: this.promiseQueue.length,
                hasPendingOperations: this.hasPendingOperations(),
                totalPendingOperations: (this.pendingPromise ? 1 : 0) + this.promiseQueue.length,
                hasScheduledRefresh: this.backgroundRefreshTimer !== null
            },
            timings: {
                cacheAge: this.lastCheck ? now - this.lastCheck : null,
                gracePeriodRemaining: this.gracePeriodEnd ? Math.max(0, this.gracePeriodEnd - now) : null,
                nextRefreshIn: this.lastCheck ? Math.max(0, (this.lastCheck + this.cacheTimeout) - now) : null
            },
            apiCalls: {
                totalCalls: this.apiCallStats.totalCalls,
                successfulCalls: this.apiCallStats.successfulCalls,
                failedCalls: this.apiCallStats.failedCalls,
                lastCallDuration: this.apiCallStats.lastCallDuration,
                successRate: this.apiCallStats.totalCalls > 0 ? 
                    (this.apiCallStats.successfulCalls / this.apiCallStats.totalCalls * 100).toFixed(1) + '%' : 'N/A'
            },
            errorHandling: {
                currentRetryCount: this.currentRetryCount,
                consecutiveFailures: this.consecutiveFailures,
                lastErrorType: this.lastErrorType,
                errorHistorySize: this.errorHistory.length,
                retryConfig: this.retryConfig,
                recentErrors: this.errorHistory.slice(-5).map(err => ({
                    timestamp: new Date(err.timestamp).toISOString(),
                    type: err.type,
                    description: err.description,
                    retryCount: err.retryCount
                }))
            },
            stateValidation: {
                validationActive: this.stateValidationTimer !== null,
                validationInterval: this.stateValidationInterval,
                lastValidation: 'N/A' // Could be enhanced to track last validation time
            },
            listenersCount: this.listeners.size
        };
    }
}

// Create and export a singleton instance
const adminPermissions = new AdminPermissions();

export default adminPermissions;

// Also export the class for testing purposes
export { AdminPermissions };