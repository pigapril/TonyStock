/**
 * Authentication Guard
 * Ensures API requests are made with proper authentication and CSRF protection
 * 增強版：整合 AuthStateManager 和改進錯誤處理
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
        this.maxRetries = 2; // 減少重試次數，避免與上層重試疊加
        this.retryDelay = 1000; // 1 second
        
        // 新增：錯誤統計和監控
        this.errorStats = {
            initializationFailures: 0,
            requestFailures: 0,
            consecutiveFailures: 0,
            lastFailureTime: null
        };
        
        // 訂閱認證狀態變更
        this.authStateSubscription = authStateManager.subscribe((authState) => {
            this._handleAuthStateChange(authState);
        });
    }

    /**
     * 處理認證狀態變更
     */
    _handleAuthStateChange(authState) {
        console.log('🔄 AuthGuard: Auth state changed:', {
            isAuthenticated: authState.isAuthenticated,
            source: authState.source,
            confidence: authState.confidence
        });
        
        // 如果用戶登出，清理 CSRF token
        if (!authState.isAuthenticated && authState.source !== 'cache_invalidated') {
            console.log('🧹 AuthGuard: User logged out, clearing CSRF token');
            csrfClient.clearCSRFToken();
        }
    }

    /**
     * Ensure authentication is ready before making API requests
     * @returns {Promise<boolean>} True if authenticated and ready
     */
    async ensureAuthenticated() {
        // If already initializing, wait for it to complete
        if (this.authPromise) {
            console.log('🔄 AuthGuard: Waiting for ongoing authentication initialization...');
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
            this.errorStats.initializationFailures++;
            this.errorStats.consecutiveFailures++;
            this.errorStats.lastFailureTime = Date.now();
            throw error;
        }
    }

    /**
     * Initialize authentication state (改進版)
     * @private
     */
    async _initializeAuth() {
        console.log('🔐 AuthGuard: Initializing authentication...');
        
        try {
            // Step 1: 使用 AuthStateManager 檢查認證狀態
            const authState = await authStateManager.getAuthState();
            
            if (!authState.isAuthenticated) {
                console.log('❌ AuthGuard: User not authenticated - skipping CSRF token initialization');
                return false;
            }

            console.log('✅ AuthGuard: User is authenticated, proceeding with CSRF token initialization');

            // Step 2: 只有在用戶已認證時才初始化 CSRF token
            await this._ensureCSRFToken();

            // Step 3: 驗證 session 仍然有效
            await this._validateSession();

            // 重置錯誤統計
            this.errorStats.consecutiveFailures = 0;

            console.log('✅ AuthGuard: Authentication ready');
            return true;

        } catch (error) {
            console.error('❌ AuthGuard: Authentication initialization failed:', error);
            
            // Log diagnostic information
            authDiagnostics.logAuthState('auth_guard_init_failed', {
                error: error.message,
                timestamp: new Date().toISOString(),
                authStateReliable: authStateManager.isAuthStateReliable(),
                consecutiveFailures: this.errorStats.consecutiveFailures
            });
            
            throw error;
        }
    }

    /**
     * Ensure CSRF token is initialized (改進版)
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
                
                // 檢查是否是認證問題
                if (error.message.includes('403') || error.message.includes('401')) {
                    // 強制刷新認證狀態
                    console.log('🔄 AuthGuard: Refreshing auth state due to CSRF init failure');
                    await authStateManager.getAuthState(true);
                }
                
                throw new Error('CSRF token initialization failed');
            }
        } else {
            console.log('✅ AuthGuard: CSRF token already initialized');
        }
    }

    /**
     * Validate that the session is still active (改進版)
     * @private
     */
    async _validateSession() {
        try {
            // Make a lightweight authenticated request to validate session
            const response = await csrfClient.fetchWithCSRF('/api/auth/validate-session', { method: 'GET' });
            
            if (!response.ok) {
                // 如果是 403 錯誤，可能是認證狀態不一致
                if (response.status === 403) {
                    console.warn('⚠️ AuthGuard: Session validation returned 403, invalidating auth cache');
                    authStateManager.invalidateCache();
                }
                
                throw new Error(`Session validation failed: ${response.status}`);
            }

            console.log('✅ AuthGuard: Session validated');

        } catch (error) {
            console.error('❌ AuthGuard: Session validation failed:', error);
            throw new Error('Session validation failed');
        }
    }

    /**
     * Make an authenticated API request with retry logic (改進版)
     * @param {Function} requestFn - Function that makes the API request
     * @param {Object} options - Options for the request
     * @returns {Promise} Request result
     */
    async makeAuthenticatedRequest(requestFn, options = {}) {
        const { maxRetries = this.maxRetries, retryDelay = this.retryDelay } = options;
        const requestId = `auth_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`🔐 AuthGuard: Starting authenticated request ${requestId}`);
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Ensure authentication is ready
                const isAuthenticated = await this.ensureAuthenticated();
                
                if (!isAuthenticated) {
                    // For unauthenticated requests, try to make the request anyway
                    // Let the backend decide how to handle it
                    console.log(`⚠️ AuthGuard: Making request ${requestId} without authentication`);
                    try {
                        const result = await requestFn();
                        console.log(`✅ AuthGuard: Unauthenticated request ${requestId} succeeded`);
                        return result;
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
                    console.log(`✅ AuthGuard: Request ${requestId} succeeded on attempt ${attempt}`);
                }
                
                // 重置錯誤統計
                this.errorStats.consecutiveFailures = 0;
                
                return result;

            } catch (error) {
                this.errorStats.requestFailures++;
                this.errorStats.consecutiveFailures++;
                this.errorStats.lastFailureTime = Date.now();
                
                console.error(`❌ AuthGuard: Request ${requestId} attempt ${attempt} failed:`, error);

                // Check if this is a 403 error that might be resolved by re-authentication
                if (this._is403Error(error) && attempt < maxRetries) {
                    console.log(`🔄 AuthGuard: Retrying request ${requestId} (attempt ${attempt + 1}/${maxRetries})`);
                    
                    // 強制刷新認證狀態和清理快取
                    console.log('🔄 AuthGuard: Invalidating auth cache and CSRF token');
                    authStateManager.invalidateCache();
                    csrfClient.clearCSRFToken();
                    
                    // Clear auth promise to force re-initialization
                    this.authPromise = null;
                    
                    // Wait before retrying with exponential backoff
                    const delay = this._calculateRetryDelay(attempt, retryDelay);
                    console.log(`⏰ AuthGuard: Waiting ${delay}ms before retry...`);
                    await this._delay(delay);
                    continue;
                }

                // If all retries failed or it's not a retryable error, throw
                console.error(`❌ AuthGuard: Request ${requestId} failed after ${attempt} attempts`);
                throw error;
            }
        }
    }

    /**
     * 計算重試延遲（改進版）
     */
    _calculateRetryDelay(attempt, baseDelay) {
        // 指數退避 + 隨機抖動
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.3 + 0.85; // 85% - 115%
        return Math.floor(exponentialDelay * jitter);
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
        
        // 重置 AuthStateManager 和 CSRF Client
        authStateManager.reset();
        csrfClient.clearCSRFToken();
        
        // 重置錯誤統計
        this.errorStats = {
            initializationFailures: 0,
            requestFailures: 0,
            consecutiveFailures: 0,
            lastFailureTime: null
        };
    }

    /**
     * Check if authentication is currently being initialized
     */
    isInitializing() {
        return !!this.authPromise;
    }

    /**
     * 獲取錯誤統計（用於診斷）
     */
    getErrorStats() {
        return {
            ...this.errorStats,
            authStateReliable: authStateManager.isAuthStateReliable(),
            csrfTokenInitialized: csrfClient.isTokenInitialized(),
            authStateHealth: authStateManager.getHealthStatus(),
            csrfHealth: csrfClient.getHealthStatus()
        };
    }

    /**
     * 獲取健康狀態
     */
    getHealthStatus() {
        const now = Date.now();
        const timeSinceLastFailure = this.errorStats.lastFailureTime ? 
            now - this.errorStats.lastFailureTime : null;
        
        let status = 'healthy';
        if (this.errorStats.consecutiveFailures >= 3) {
            status = 'critical';
        } else if (this.errorStats.consecutiveFailures >= 1) {
            status = 'warning';
        }
        
        return {
            status,
            consecutiveFailures: this.errorStats.consecutiveFailures,
            timeSinceLastFailure,
            totalInitFailures: this.errorStats.initializationFailures,
            totalRequestFailures: this.errorStats.requestFailures,
            isInitializing: !!this.authPromise,
            authStateReliable: authStateManager.isAuthStateReliable(),
            csrfTokenReady: csrfClient.isTokenInitialized()
        };
    }

    /**
     * 執行健康檢查
     */
    async performHealthCheck() {
        console.log('🏥 AuthGuard: Performing health check...');
        
        const healthCheck = {
            timestamp: new Date().toISOString(),
            authGuard: this.getHealthStatus(),
            authStateManager: authStateManager.getHealthStatus(),
            csrfClient: csrfClient.getHealthStatus()
        };
        
        // 嘗試執行一個輕量級的認證檢查
        try {
            const isAuthenticated = await this.ensureAuthenticated();
            healthCheck.authenticationTest = {
                status: 'pass',
                isAuthenticated
            };
        } catch (error) {
            healthCheck.authenticationTest = {
                status: 'fail',
                error: error.message
            };
        }
        
        console.log('🏥 AuthGuard: Health check completed:', healthCheck);
        return healthCheck;
    }

    /**
     * 清理資源
     */
    destroy() {
        if (this.authStateSubscription) {
            this.authStateSubscription();
            this.authStateSubscription = null;
        }
        
        this.reset();
        console.log('🧹 AuthGuard: Destroyed');
    }
}

// Create singleton instance
const authGuard = new AuthGuard();

// 在 window 上暴露以便調試
if (typeof window !== 'undefined') {
    window.authGuard = authGuard;
}

export default authGuard;