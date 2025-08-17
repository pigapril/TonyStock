/**
 * Frontend Admin Permissions Utility
 * 
 * Provides client-side admin permission checking functionality.
 * Integrates with the backend admin status API and existing authentication system.
 * 
 * Features:
 * - Backend API integration for admin status checking
 * - Direct API calls without caching for real-time permission checks
 * - UI conditional rendering helpers
 * - Simple error handling that defaults to false for security
 * - Session management integration
 * - Comprehensive logging for debugging state synchronization
 * 
 * @author SentimentInsideOut Team
 * @version 1.2.0
 */

import apiClient from '../api/apiClient';

/**
 * Comprehensive logging utility for admin permissions debugging
 */
class AdminPermissionsLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 100; // Keep last 100 log entries
        this.startTime = Date.now();
    }
    
    /**
     * Log an event with detailed context and timing information
     */
    log(level, event, details = {}) {
        const timestamp = new Date().toISOString();
        const relativeTime = Date.now() - this.startTime;
        
        const logEntry = {
            timestamp,
            relativeTime,
            level,
            event,
            details,
            stackTrace: level === 'error' ? new Error().stack : undefined
        };
        
        // Add to internal log storage
        this.logs.push(logEntry);
        
        // Keep only the most recent logs to prevent memory leaks
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        
        // Console output with appropriate level
        const consoleMessage = `AdminPermissions[${relativeTime}ms]: ${event}`;
        switch (level) {
            case 'error':
                console.error(consoleMessage, logEntry);
                break;
            case 'warn':
                console.warn(consoleMessage, logEntry);
                break;
            case 'info':
                console.info(consoleMessage, logEntry);
                break;
            case 'debug':
            default:
                console.log(consoleMessage, logEntry);
                break;
        }
    }
    
    /**
     * Get recent logs for debugging
     */
    getRecentLogs(count = 20) {
        return this.logs.slice(-count);
    }
    
    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = [];
    }
    
    /**
     * Get performance metrics
     */
    getMetrics() {
        const apiCalls = this.logs.filter(log => log.event.includes('API_CALL'));
        const errors = this.logs.filter(log => log.level === 'error');
        const authEvents = this.logs.filter(log => log.event.includes('AUTH'));
        
        return {
            totalLogs: this.logs.length,
            apiCalls: apiCalls.length,
            errors: errors.length,
            authEvents: authEvents.length,
            uptime: Date.now() - this.startTime,
            averageApiResponseTime: this.calculateAverageApiResponseTime()
        };
    }
    
    /**
     * Calculate average API response time from logs
     */
    calculateAverageApiResponseTime() {
        const apiStartLogs = this.logs.filter(log => log.event === 'API_CALL_STARTED');
        const apiEndLogs = this.logs.filter(log => 
            log.event === 'API_CALL_SUCCESS' || log.event === 'API_CALL_ERROR'
        );
        
        if (apiStartLogs.length === 0 || apiEndLogs.length === 0) {
            return null;
        }
        
        let totalTime = 0;
        let completedCalls = 0;
        
        apiStartLogs.forEach(startLog => {
            const endLog = apiEndLogs.find(endLog => 
                endLog.details.callId === startLog.details.callId &&
                endLog.relativeTime > startLog.relativeTime
            );
            
            if (endLog) {
                totalTime += (endLog.relativeTime - startLog.relativeTime);
                completedCalls++;
            }
        });
        
        return completedCalls > 0 ? Math.round(totalTime / completedCalls) : null;
    }
}

/**
 * Admin Permissions Utility Class
 * Handles all admin permission checking functionality on the frontend
 */
class AdminPermissions {
    constructor() {
        // Initialize comprehensive logging
        this.logger = new AdminPermissionsLogger();
        this.callCounter = 0;
        this.activeApiCalls = new Map(); // Track concurrent API calls
        
        this.logger.log('info', 'UTILITY_INITIALIZED', {
            timestamp: new Date().toISOString(),
            version: '1.2.0'
        });
        
        // Listen for authentication changes
        this.setupAuthListeners();
    }
    
    /**
     * Setup listeners for authentication state changes
     * Logs authentication events for debugging with comprehensive details
     */
    setupAuthListeners() {
        // Listen for login success events
        window.addEventListener('loginSuccess', (event) => {
            this.logger.log('info', 'AUTH_LOGIN_SUCCESS_EVENT', {
                eventType: 'loginSuccess',
                eventDetail: event.detail,
                timestamp: new Date().toISOString(),
                activeApiCalls: this.activeApiCalls.size,
                source: 'window_event'
            });
        });
        
        // Listen for logout events
        window.addEventListener('logoutSuccess', (event) => {
            this.logger.log('info', 'AUTH_LOGOUT_SUCCESS_EVENT', {
                eventType: 'logoutSuccess',
                eventDetail: event.detail,
                timestamp: new Date().toISOString(),
                activeApiCalls: this.activeApiCalls.size,
                source: 'window_event'
            });
            
            // Cancel any active API calls on logout
            if (this.activeApiCalls.size > 0) {
                this.logger.log('warn', 'CANCELLING_API_CALLS_ON_LOGOUT', {
                    activeCallsCount: this.activeApiCalls.size,
                    activeCalls: Array.from(this.activeApiCalls.keys())
                });
                this.activeApiCalls.clear();
            }
        });
        
        // Listen for authentication state changes (if available)
        window.addEventListener('authStateChange', (event) => {
            this.logger.log('info', 'AUTH_STATE_CHANGE_EVENT', {
                eventType: 'authStateChange',
                eventDetail: event.detail,
                timestamp: new Date().toISOString(),
                activeApiCalls: this.activeApiCalls.size,
                source: 'window_event'
            });
        });
        
        this.logger.log('debug', 'AUTH_LISTENERS_SETUP', {
            listeners: ['loginSuccess', 'logoutSuccess', 'authStateChange']
        });
    }
    
    /**
     * Check if the current user is an admin by calling the backend API
     * This method always makes a direct API call without caching
     * 
     * @returns {Promise<boolean>} True if user is admin, false otherwise
     */
    async checkIsAdmin() {
        const callId = ++this.callCounter;
        const startTime = Date.now();
        
        // Log API call initiation with race condition detection
        this.logger.log('info', 'API_CALL_STARTED', {
            callId,
            endpoint: '/api/auth/admin-status',
            method: 'GET',
            startTime,
            concurrentCalls: this.activeApiCalls.size,
            activeCalls: Array.from(this.activeApiCalls.keys()),
            raceConditionRisk: this.activeApiCalls.size > 0
        });
        
        // Track this API call
        this.activeApiCalls.set(callId, {
            startTime,
            endpoint: '/api/auth/admin-status'
        });
        
        try {
            // Call the backend admin status endpoint
            const response = await apiClient.get('/api/auth/admin-status');
            const responseTime = Date.now() - startTime;
            
            const data = response.data;
            const isAdmin = data?.data?.isAdmin || false;
            const isAuthenticated = data?.data?.isAuthenticated || false;
            
            // Log successful API response with detailed analysis
            this.logger.log('info', 'API_CALL_SUCCESS', {
                callId,
                responseTime,
                isAuthenticated,
                isAdmin,
                responseStatus: response.status,
                responseHeaders: {
                    'content-type': response.headers['content-type'],
                    'x-request-id': response.headers['x-request-id']
                },
                responseData: data,
                concurrentCallsAtStart: this.activeApiCalls.size - 1,
                wasRaceCondition: this.activeApiCalls.size > 1,
                timestamp: new Date().toISOString()
            });
            
            // Check for potential state conflicts
            if (data?.data?.isAuthenticated === false && isAdmin === true) {
                this.logger.log('warn', 'STATE_CONFLICT_DETECTED', {
                    callId,
                    conflict: 'User marked as admin but not authenticated',
                    isAuthenticated,
                    isAdmin,
                    responseData: data
                });
            }
            
            return isAdmin;
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            // Log detailed error information
            this.logger.log('error', 'API_CALL_ERROR', {
                callId,
                responseTime,
                errorMessage: error.message,
                errorCode: error.code,
                errorStatus: error.response?.status,
                errorData: error.response?.data,
                errorHeaders: error.response?.headers,
                networkError: !error.response,
                timeoutError: error.code === 'ECONNABORTED',
                authError: error.response?.status === 401 || error.response?.status === 403,
                serverError: error.response?.status >= 500,
                concurrentCallsAtStart: this.activeApiCalls.size - 1,
                wasRaceCondition: this.activeApiCalls.size > 1,
                stack: error.stack
            });
            
            // Analyze error type for debugging
            if (error.response?.status === 401) {
                this.logger.log('warn', 'AUTHENTICATION_ERROR', {
                    callId,
                    message: 'User not authenticated - admin check failed',
                    shouldRedirectToLogin: true
                });
            } else if (error.response?.status === 403) {
                this.logger.log('warn', 'AUTHORIZATION_ERROR', {
                    callId,
                    message: 'User authenticated but not authorized for admin status check',
                    possibleCause: 'CSRF token issue or insufficient permissions'
                });
            } else if (error.response?.status >= 500) {
                this.logger.log('error', 'SERVER_ERROR', {
                    callId,
                    message: 'Server error during admin status check',
                    shouldRetry: true,
                    retryAfter: error.response?.headers['retry-after']
                });
            } else if (!error.response) {
                this.logger.log('error', 'NETWORK_ERROR', {
                    callId,
                    message: 'Network error during admin status check',
                    possibleCause: 'Connection timeout, DNS failure, or network unavailable'
                });
            }
            
            // Simple error handling: always return false for security
            // No cache fallback logic or complex error handling
            return false;
            
        } finally {
            // Remove from active calls tracking
            this.activeApiCalls.delete(callId);
            
            const finalTime = Date.now() - startTime;
            this.logger.log('debug', 'API_CALL_COMPLETED', {
                callId,
                totalTime: finalTime,
                remainingConcurrentCalls: this.activeApiCalls.size
            });
        }
    }
    
    /**
     * Async check for current user admin status
     * Always makes a direct API call without using cache
     * 
     * @returns {Promise<boolean>} True if user is admin, false otherwise
     */
    async isCurrentUserAdmin() {
        this.logger.log('debug', 'IS_CURRENT_USER_ADMIN_CALLED', {
            caller: 'isCurrentUserAdmin',
            delegatingTo: 'checkIsAdmin'
        });
        return await this.checkIsAdmin();
    }
    
    /**
     * Determine if admin features should be shown in the UI
     * This is the primary method for conditional rendering
     * Always makes a direct API call to get current admin status
     * 
     * @returns {Promise<boolean>} True if admin features should be displayed
     */
    async shouldShowAdminFeatures() {
        this.logger.log('debug', 'SHOULD_SHOW_ADMIN_FEATURES_CALLED', {
            caller: 'shouldShowAdminFeatures',
            delegatingTo: 'checkIsAdmin',
            purpose: 'UI conditional rendering'
        });
        return await this.checkIsAdmin();
    }
    
    /**
     * Force refresh admin status from server
     * Makes a direct API call to get current admin status
     * 
     * @returns {Promise<boolean>} Fresh admin status from server
     */
    async refreshAdminStatus() {
        this.logger.log('info', 'REFRESH_ADMIN_STATUS_CALLED', {
            caller: 'refreshAdminStatus',
            delegatingTo: 'checkIsAdmin',
            purpose: 'Force refresh from server',
            activeApiCalls: this.activeApiCalls.size
        });
        return await this.checkIsAdmin();
    }
    
    /**
     * Get comprehensive debug information about the current state
     * 
     * @returns {object} Detailed debug information
     */
    getDebugInfo() {
        const metrics = this.logger.getMetrics();
        const recentLogs = this.logger.getRecentLogs(10);
        
        return {
            utility: {
                message: 'AdminPermissions utility - cache removed, using direct API calls',
                version: '1.2.0',
                timestamp: new Date().toISOString(),
                uptime: metrics.uptime
            },
            apiCalls: {
                totalCalls: this.callCounter,
                activeCalls: this.activeApiCalls.size,
                activeCallDetails: Array.from(this.activeApiCalls.entries()).map(([id, call]) => ({
                    callId: id,
                    startTime: call.startTime,
                    duration: Date.now() - call.startTime,
                    endpoint: call.endpoint
                })),
                averageResponseTime: metrics.averageApiResponseTime
            },
            logging: {
                totalLogs: metrics.totalLogs,
                errorCount: metrics.errors,
                authEventCount: metrics.authEvents,
                recentLogs: recentLogs.map(log => ({
                    timestamp: log.timestamp,
                    relativeTime: log.relativeTime,
                    level: log.level,
                    event: log.event,
                    details: log.details
                }))
            },
            raceConditions: {
                potentialRaceConditions: recentLogs.filter(log => 
                    log.details?.raceConditionRisk === true
                ).length,
                concurrentCallsDetected: recentLogs.filter(log => 
                    log.details?.wasRaceCondition === true
                ).length
            },
            stateConflicts: {
                conflictsDetected: recentLogs.filter(log => 
                    log.event === 'STATE_CONFLICT_DETECTED'
                ).length
            },
            errors: {
                networkErrors: recentLogs.filter(log => 
                    log.details?.networkError === true
                ).length,
                authErrors: recentLogs.filter(log => 
                    log.details?.authError === true
                ).length,
                serverErrors: recentLogs.filter(log => 
                    log.details?.serverError === true
                ).length
            }
        };
    }
    
    /**
     * Get recent logs for debugging
     * 
     * @param {number} count - Number of recent logs to return
     * @returns {Array} Recent log entries
     */
    getRecentLogs(count = 20) {
        return this.logger.getRecentLogs(count);
    }
    
    /**
     * Clear all logs (useful for testing)
     */
    clearLogs() {
        this.logger.clearLogs();
        this.logger.log('info', 'LOGS_CLEARED', {
            clearedAt: new Date().toISOString()
        });
    }
    
    /**
     * Get performance metrics
     */
    getMetrics() {
        return this.logger.getMetrics();
    }
}

// Create and export a singleton instance
const adminPermissions = new AdminPermissions();

export default adminPermissions;

// Also export the class for testing purposes
export { AdminPermissions };