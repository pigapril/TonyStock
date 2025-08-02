/**
 * Authentication State Manager
 * 管理認證狀態的一致性，避免頻繁的 API 呼叫和間歇性錯誤
 */

import requestTracker from './requestTracker';
import authStatusFix from './authStatusFix';

class AuthStateManager {
    constructor() {
        this.authState = null;
        this.lastCheck = null;
        this.checkInProgress = false;
        this.cacheTimeout = 30000; // 30秒快取
        this.retryDelays = [1000, 2000, 4000]; // 指數退避
        this.maxRetries = 3;
        this.pendingPromise = null;
    }

    /**
     * 獲取認證狀態（帶智能快取）
     */
    async getAuthState(forceRefresh = false) {
        // 如果有正在進行的檢查，等待其完成
        if (this.pendingPromise && !forceRefresh) {
            console.log('🔄 AuthStateManager: Waiting for pending auth check...');
            return await this.pendingPromise;
        }

        // 檢查快取是否有效
        if (!forceRefresh && this.isCacheValid()) {
            console.log('✅ AuthStateManager: Using cached auth state:', {
                isAuthenticated: this.authState.isAuthenticated,
                age: Date.now() - this.lastCheck,
                source: 'cache'
            });
            return this.authState;
        }

        // 開始新的認證檢查
        this.pendingPromise = this._performAuthCheck();
        
        try {
            const result = await this.pendingPromise;
            return result;
        } finally {
            this.pendingPromise = null;
        }
    }

    /**
     * 執行認證檢查（帶重試機制）
     */
    async _performAuthCheck() {
        console.log('🔍 AuthStateManager: Performing auth check...');
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const authState = await this._checkAuthStatusOnce();
                
                // 更新快取
                this.authState = {
                    ...authState,
                    lastChecked: Date.now(),
                    source: 'api',
                    confidence: 'high',
                    attempt
                };
                this.lastCheck = Date.now();

                console.log('✅ AuthStateManager: Auth check successful:', {
                    isAuthenticated: authState.isAuthenticated,
                    attempt,
                    confidence: 'high'
                });

                return this.authState;

            } catch (error) {
                console.warn(`⚠️ AuthStateManager: Auth check attempt ${attempt} failed:`, error.message);

                // 如果是最後一次嘗試，返回失敗狀態
                if (attempt === this.maxRetries) {
                    this.authState = {
                        isAuthenticated: false,
                        lastChecked: Date.now(),
                        source: 'api',
                        confidence: 'low',
                        error: error.message,
                        attempt
                    };
                    this.lastCheck = Date.now();

                    console.error('❌ AuthStateManager: All auth check attempts failed');
                    return this.authState;
                }

                // 等待後重試
                const delay = this.retryDelays[attempt - 1] || 4000;
                console.log(`🔄 AuthStateManager: Retrying in ${delay}ms...`);
                await this._delay(delay);
            }
        }
    }

    /**
     * 執行單次認證狀態檢查
     */
    async _checkAuthStatusOnce() {
        const requestId = requestTracker.startTracking('/api/auth/status', {
            method: 'GET',
            credentials: 'include'
        });

        try {
            // 使用增強的認證狀態檢查
            const authState = await authStatusFix.checkAuthStatus();
            
            // 如果有錯誤，記錄但不拋出異常
            if (authState.error) {
                console.warn('⚠️ AuthStateManager: Auth status check returned error:', authState.error);
                requestTracker.completeTracking(requestId, null, new Error(authState.error));
                throw new Error(authState.error);
            }
            
            requestTracker.completeTracking(requestId, {
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/json']])
            });

            return authState;

        } catch (error) {
            requestTracker.completeTracking(requestId, null, error);
            throw error;
        }
    }

    /**
     * 檢查快取是否有效
     */
    isCacheValid() {
        if (!this.authState || !this.lastCheck) {
            return false;
        }

        const age = Date.now() - this.lastCheck;
        const isValid = age < this.cacheTimeout;

        if (!isValid) {
            console.log('⏰ AuthStateManager: Cache expired:', {
                age,
                timeout: this.cacheTimeout
            });
        }

        return isValid;
    }

    /**
     * 清除認證狀態快取
     */
    invalidateCache() {
        console.log('🗑️ AuthStateManager: Invalidating auth cache');
        this.authState = null;
        this.lastCheck = null;
        this.checkInProgress = false;
        this.pendingPromise = null;
    }

    /**
     * 設置認證狀態（用於登入後直接設置）
     */
    setAuthState(authState) {
        console.log('📝 AuthStateManager: Setting auth state directly:', authState);
        this.authState = {
            ...authState,
            lastChecked: Date.now(),
            source: 'direct',
            confidence: 'high'
        };
        this.lastCheck = Date.now();
    }

    /**
     * 獲取當前快取狀態（用於調試）
     */
    getCacheInfo() {
        return {
            hasCache: !!this.authState,
            lastCheck: this.lastCheck,
            age: this.lastCheck ? Date.now() - this.lastCheck : null,
            isValid: this.isCacheValid(),
            checkInProgress: this.checkInProgress,
            authState: this.authState
        };
    }

    /**
     * 延遲函數
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 重置管理器狀態
     */
    reset() {
        console.log('🔄 AuthStateManager: Resetting state');
        this.invalidateCache();
    }

    /**
     * 設置快取超時時間
     */
    setCacheTimeout(timeout) {
        this.cacheTimeout = timeout;
        console.log(`⏱️ AuthStateManager: Cache timeout set to ${timeout}ms`);
    }

    /**
     * 檢查認證狀態是否可信
     */
    isAuthStateReliable() {
        if (!this.authState) return false;
        
        const age = Date.now() - this.lastCheck;
        const isRecent = age < this.cacheTimeout;
        const isHighConfidence = this.authState.confidence === 'high';
        
        return isRecent && isHighConfidence;
    }
}

// 創建全域實例
const authStateManager = new AuthStateManager();

// 在 window 上暴露以便調試
if (typeof window !== 'undefined') {
    window.authStateManager = authStateManager;
}

export default authStateManager;