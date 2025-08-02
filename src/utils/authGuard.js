/**
 * Authentication Guard
 * Ensures API requests are made with proper authentication and CSRF protection
 */

import csrfClient from './csrfClient';
import { authDiagnostics } from './authDiagnostics';
import apiClient from '../api/apiClient';
import requestTracker from './requestTracker';
import authStateManager from './authStateManager';

class AuthGuard {
    constructor() {
        this.authPromise = null;
        this.isInitializing = false;
        this.retryQueue = [];
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    /**
     * Ensure authentication is ready before making API requests
     * @returns {Promise<boolean>} True if authenticated and ready
     */
    async ensureAuthenticated() {
        // If already initializing, wait for it to complete
        if (this.authPromise) {
            return await this.authPromise;
        }

        // Start initialization
        this.authPromise = this._initializeAuth();
        
        try {
            const result = await this.authPromise;
            this.authPromise = null; // Clear promise on completion
            return result;
        } catch (error) {
            this.authPromise = null; // Clear promise on error
            throw error;
        }
    }

    /**
     * Initialize authentication state
     * @private
     */
    async _initializeAuth() {
        console.log('🔐 AuthGuard: Initializing authentication...');
        
        try {
            // Step 1: Check if user is authenticated first
            const authStatus = await this._checkAuthStatus();
            
            if (!authStatus.isAuthenticated) {
                console.log('❌ AuthGuard: User not authenticated - skipping CSRF token initialization');
                return false;
            }

            console.log('✅ AuthGuard: User is authenticated, proceeding with CSRF token initialization');

            // Step 2: Only initialize CSRF token if user is authenticated
            await this._ensureCSRFToken();

            // Step 3: Validate session is still active
            await this._validateSession();

            console.log('✅ AuthGuard: Authentication ready');
            return true;

        } catch (error) {
            console.error('❌ AuthGuard: Authentication initialization failed:', error);
            
            // Log diagnostic information
            authDiagnostics.logAuthState('auth_guard_init_failed', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            throw error;
        }
    }

    /**
     * Check authentication status with intelligent caching and retry
     * @private
     */
    async _checkAuthStatus() {
        try {
            const authState = await authStateManager.getAuthState();
            return authState;
        } catch (error) {
            console.error('AuthGuard: Failed to check auth status via AuthStateManager:', error);
            return { isAuthenticated: false };
        }
    }

    /**
     * Ensure CSRF token is initialized
     * @private
     */
    async _ensureCSRFToken() {
        if (!csrfClient.isTokenInitialized()) {
            console.log('🛡️ AuthGuard: Initializing CSRF token...');
            
            try {
                await csrfClient.initializeCSRFToken();
                console.log('✅ AuthGuard: CSRF token initialized');
            } catch (error) {
                console.error('❌ AuthGuard: CSRF token initialization failed:', error);
                throw new Error('CSRF token initialization failed');
            }
        } else {
            console.log('✅ AuthGuard: CSRF token already initialized');
        }
    }

    /**
     * Validate that the session is still active
     * @private
     */
    async _validateSession() {
        try {
            // Make a lightweight authenticated request to validate session
            const response = await csrfClient.fetchWithCSRF('/api/auth/validate-session', { method: 'GET' });
            
            if (!response.ok) {
                throw new Error(`Session validation failed: ${response.status}`);
            }

            console.log('✅ AuthGuard: Session validated');

        } catch (error) {
            console.error('❌ AuthGuard: Session validation failed:', error);
            throw new Error('Session validation failed');
        }
    }

    /**
     * Make an authenticated API request with retry logic
     * @param {Function} requestFn - Function that makes the API request
     * @param {Object} options - Options for the request
     * @returns {Promise} Request result
     */
    async makeAuthenticatedRequest(requestFn, options = {}) {
        const { maxRetries = this.maxRetries, retryDelay = this.retryDelay } = options;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Ensure authentication is ready
                const isAuthenticated = await this.ensureAuthenticated();
                
                if (!isAuthenticated) {
                    // For unauthenticated requests, try to make the request anyway
                    // Let the backend decide how to handle it
                    console.log('⚠️ AuthGuard: Making request without authentication');
                    try {
                        return await requestFn();
                    } catch (error) {
                        // If it's a 401 error, that's expected for unauthenticated requests
                        if (error.response?.status === 401) {
                            throw new Error('Authentication required');
                        }
                        throw error;
                    }
                }

                // Make the request with authentication
                const result = await requestFn();
                
                // Log successful request
                if (attempt > 1) {
                    console.log(`✅ AuthGuard: Request succeeded on attempt ${attempt}`);
                }
                
                return result;

            } catch (error) {
                console.error(`❌ AuthGuard: Request attempt ${attempt} failed:`, error);

                // Check if this is a 403 error that might be resolved by re-authentication
                if (this._is403Error(error) && attempt < maxRetries) {
                    console.log(`🔄 AuthGuard: Retrying request (attempt ${attempt + 1}/${maxRetries})`);
                    
                    // Clear auth state to force re-initialization
                    this.authPromise = null;
                    
                    // Wait before retrying
                    await this._delay(retryDelay * attempt);
                    continue;
                }

                // If all retries failed or it's not a retryable error, throw
                throw error;
            }
        }
    }

    /**
     * Check if error is a 403 Forbidden error
     * @private
     */
    _is403Error(error) {
        return error.response?.status === 403 || 
               error.status === 403 || 
               error.message?.includes('403') ||
               error.message?.includes('Forbidden');
    }

    /**
     * Delay execution
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Reset authentication state (useful for logout or auth errors)
     */
    reset() {
        console.log('🔄 AuthGuard: Resetting authentication state');
        this.authPromise = null;
        this.isInitializing = false;
        this.retryQueue = [];
        
        // 重置 AuthStateManager
        authStateManager.reset();
    }

    /**
     * Check if authentication is currently being initialized
     */
    isInitializing() {
        return !!this.authPromise;
    }
}

// Create singleton instance
const authGuard = new AuthGuard();

export default authGuard;