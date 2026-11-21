/**
 * Authentication State Manager
 * 管理認證狀態的一致性，避免頻繁的 API 呼叫和間歇性錯誤
 */

import requestTracker from './requestTracker';
import authStatusFix from './authStatusFix';
import { systemLogger } from './logger';

class AuthStateManager {
    constructor() {
        this.authState = null;
        this.lastCheck = null;
        this.checkInProgress = false;
        this.cacheTimeout = 30000; // 30秒快取
        this.maxRetries = 2;
        this.pendingPromise = null;
        
        // 新增：頁面載入狀態檢測
        this.stateRevision = 0;

        // 新增：狀態同步機制
        this.subscribers = new Set();
        this.stateHistory = [];
        this.maxHistorySize = 10;
        
        // 新增：錯誤追蹤
        this.consecutiveFailures = 0;
        this.lastSuccessTime = null;
        
        // 新增：並發控制改進
    }

    /**
     * 獲取認證狀態（帶智能快取）
     */
    async getAuthState(forceRefresh = false) {
        // Single-flight takes precedence over cache and force-refresh flags:
        // concurrent callers must share the in-flight server check.
        if (this.pendingPromise) {
            systemLogger.debug('AuthStateManager: Joining in-flight auth check');
            return this.pendingPromise;
        }

        if (!forceRefresh && this.isCacheValid()) {
            systemLogger.debug('AuthStateManager: Using cached auth state:', {
                isAuthenticated: this.authState.isAuthenticated,
                age: Date.now() - this.lastCheck,
                confidence: this.authState.confidence
            });
            return this.authState;
        }

        const revision = this.stateRevision;
        const requestPromise = this._performAuthCheck(revision);
        this.pendingPromise = requestPromise;

        try {
            return await requestPromise;
        } finally {
            // A login/logout may invalidate this request and start a newer one.
            // An older request must never clear the newer in-flight promise.
            if (this.pendingPromise === requestPromise) {
                this.pendingPromise = null;
            }
        }
    }

    /**
     * 執行認證檢查（帶重試機制）
     */
    async _performAuthCheck(revision) {
        const previousState = this.authState;
        const previousCheck = this.lastCheck;
        systemLogger.debug('AuthStateManager: Performing auth check...');
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const authState = await this._checkAuthStatusOnce();

                // Ignore a response that started before a login/logout/cache reset.
                if (revision !== this.stateRevision) return this.authState;

                // 重置失敗計數器
                this.consecutiveFailures = 0;
                this.lastSuccessTime = Date.now();
                
                // 更新快取
                this.authState = {
                    ...authState,
                    lastChecked: Date.now(),
                    source: 'api',
                    confidence: 'high',
                    attempt,
                    consecutiveFailures: this.consecutiveFailures
                };
                this.lastCheck = Date.now();

                // 記錄狀態歷史
                this._recordStateHistory(this.authState);
                
                // 通知訂閱者
                this._notifySubscribers(this.authState);

                systemLogger.debug('✅ AuthStateManager: Auth check successful:', {
                    isAuthenticated: authState.isAuthenticated,
                    attempt,
                    confidence: 'high',
                    consecutiveFailures: this.consecutiveFailures
                });

                return this.authState;

            } catch (error) {
                if (revision !== this.stateRevision) return this.authState;
                this.consecutiveFailures++;
                systemLogger.warn(`⚠️ AuthStateManager: Auth check attempt ${attempt} failed:`, error.message);

                // 如果是最後一次嘗試，返回失敗狀態
                if (attempt === this.maxRetries) {
                    if (revision !== this.stateRevision) return this.authState;

                    const previousStateIsRecent = previousState
                        && previousCheck
                        && Date.now() - previousCheck < this.cacheTimeout * 2;
                    this.authState = previousStateIsRecent
                        ? {
                            ...previousState,
                            lastChecked: Date.now(),
                            confidence: 'low',
                            stale: true,
                            error: error.message,
                            attempt,
                            consecutiveFailures: this.consecutiveFailures
                        }
                        : {
                            isAuthenticated: false,
                            user: null,
                            lastChecked: Date.now(),
                            source: 'api',
                            confidence: 'low',
                            error: error.message,
                            attempt,
                            consecutiveFailures: this.consecutiveFailures
                        };
                    this.lastCheck = previousStateIsRecent ? previousCheck : Date.now();

                    // 記錄失敗狀態
                    this._recordStateHistory(this.authState);
                    this._notifySubscribers(this.authState);

                    systemLogger.error('❌ AuthStateManager: All auth check attempts failed');
                    return this.authState;
                }

                // 等待後重試
                const delay = this._calculateRetryDelay(attempt);
                systemLogger.debug(`🔄 AuthStateManager: Retrying in ${delay}ms...`);
                await this._delay(delay);
            }
        }
    }

            /**
     * 執行單次認證狀態檢查。HttpOnly cookies are sent by the browser; no cookie polling or artificial delay is needed.
     */
    async _checkAuthStatusOnce() {
        const requestId = requestTracker.startTracking('/api/auth/status', {
            method: 'GET',
            credentials: 'include'
        });

        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        let timeoutId;
        try {
            // Cookies are attached by the browser with credentials: include.
            // Waiting for document.cookie is incorrect for HttpOnly sessions and
            // only adds delay; no artificial throttling is needed for this exempt endpoint.
            if (controller) timeoutId = setTimeout(() => controller.abort(), 8000);
            const authState = await authStatusFix.checkAuthStatus({ signal: controller?.signal });

            if (authState.error) {
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
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    }

    /**
     * 檢查快取是否有效（改進版）
     */
    isCacheValid() {
        if (!this.authState || !this.lastCheck) {
            return false;
        }

        const age = Date.now() - this.lastCheck;
        const baseTimeout = this.cacheTimeout;
        
        // 根據連續失敗次數調整快取超時
        const adjustedTimeout = this.consecutiveFailures > 0 
            ? Math.max(baseTimeout / (this.consecutiveFailures + 1), 5000) // 最少 5 秒
            : baseTimeout;
        
        // 根據信心度調整快取有效性
        const confidenceMultiplier = this.authState.confidence === 'high' ? 1 : 0.5;
        const effectiveTimeout = adjustedTimeout * confidenceMultiplier;
        
        const isValid = age < effectiveTimeout;

        if (!isValid) {
            systemLogger.debug('⏰ AuthStateManager: Cache expired:', {
                age,
                baseTimeout,
                adjustedTimeout,
                effectiveTimeout,
                consecutiveFailures: this.consecutiveFailures,
                confidence: this.authState.confidence
            });
        }

        return isValid;
    }

            /**
     * 計算重試延遲（改進版 - 增加延遲避免觸發 IP 封鎖）
     */
    _calculateRetryDelay(attempt) {
        // /api/auth/status is exempt from rate limiting; use only a short backoff.
        const baseDelays = [500, 1000];
        const baseDelay = baseDelays[attempt - 1] || 12000;
        
        // 根據連續失敗次數增加延遲
        const failureMultiplier = Math.min(this.consecutiveFailures * 0.5 + 1, 3);
        
        const jitter = Math.random() * 0.2 + 0.9; // 90% - 110%
        
        const finalDelay = Math.floor(baseDelay * failureMultiplier * jitter);
        
        systemLogger.debug(`AuthStateManager: Calculated retry delay: ${finalDelay}ms`, {
            attempt,
            baseDelay,
            failureMultiplier,
        });
        
        return finalDelay;
    }

    /**
     * 記錄狀態歷史
     */
    _recordStateHistory(state) {
        this.stateHistory.push({
            ...state,
            timestamp: Date.now()
        });
        
        // 保持歷史記錄大小限制
        if (this.stateHistory.length > this.maxHistorySize) {
            this.stateHistory.shift();
        }
    }

    /**
     * 通知訂閱者狀態變更
     */
    _notifySubscribers(newState) {
        this.subscribers.forEach(callback => {
            try {
                callback(newState);
            } catch (error) {
                systemLogger.error('AuthStateManager: Subscriber callback error:', error);
            }
        });
    }

    /**
     * 訂閱狀態變更
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        
        // 如果有當前狀態，立即通知
        if (this.authState) {
            callback(this.authState);
        }
        
        // 返回取消訂閱函數
        return () => {
            this.subscribers.delete(callback);
        };
    }

    /**
     * 清除認證狀態快取
     */
    invalidateCache() {
        systemLogger.debug('🗑️ AuthStateManager: Invalidating auth cache');
        const oldState = this.authState;
        this.stateRevision += 1;
        
        this.authState = null;
        this.lastCheck = null;
        this.checkInProgress = false;
        this.pendingPromise = null;
        
        // 通知訂閱者快取已失效
        if (oldState) {
            this._notifySubscribers({ 
                isAuthenticated: false, 
                source: 'cache_invalidated',
                confidence: 'none'
            });
        }
    }

    /**
     * 設置認證狀態（用於登入後直接設置）
     */
    setAuthState(authState) {
        systemLogger.debug('AuthStateManager: Setting authoritative auth state directly');
        this.stateRevision += 1;
        this.pendingPromise = null;

        this.authState = {
            ...authState,
            lastChecked: Date.now(),
            source: 'direct',
            confidence: 'high',
            consecutiveFailures: 0
        };
        this.lastCheck = Date.now();
        this.consecutiveFailures = 0;
        this.lastSuccessTime = Date.now();
        
        // 記錄和通知
        this._recordStateHistory(this.authState);
        this._notifySubscribers(this.authState);
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
            authState: this.authState,
            consecutiveFailures: this.consecutiveFailures,
            lastSuccessTime: this.lastSuccessTime,
            subscriberCount: this.subscribers.size,
            stateHistoryLength: this.stateHistory.length
        };
    }

    /**
     * 獲取狀態歷史（用於診斷）
     */
    getStateHistory() {
        return [...this.stateHistory];
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
        systemLogger.debug('🔄 AuthStateManager: Resetting state');
        this.invalidateCache();
        this.consecutiveFailures = 0;
        this.lastSuccessTime = null;
        this.stateHistory = [];
    }

    /**
     * 設置快取超時時間
     */
    setCacheTimeout(timeout) {
        this.cacheTimeout = timeout;
        systemLogger.debug(`⏱️ AuthStateManager: Cache timeout set to ${timeout}ms`);
    }

    /**
     * 檢查認證狀態是否可信
     */
    isAuthStateReliable() {
        if (!this.authState) return false;
        
        const age = Date.now() - this.lastCheck;
        const isRecent = age < this.cacheTimeout;
        const isHighConfidence = this.authState.confidence === 'high';
        const hasLowFailures = this.consecutiveFailures < 2;
        
        return isRecent && isHighConfidence && hasLowFailures;
    }

    /**
     * 獲取系統健康狀態
     */
    getHealthStatus() {
        const now = Date.now();
        const timeSinceLastSuccess = this.lastSuccessTime ? now - this.lastSuccessTime : null;
        
        let status = 'healthy';
        if (this.consecutiveFailures >= 3) {
            status = 'critical';
        } else if (this.consecutiveFailures >= 1 || (timeSinceLastSuccess && timeSinceLastSuccess > 300000)) {
            status = 'warning';
        }
        
        return {
            status,
            consecutiveFailures: this.consecutiveFailures,
            timeSinceLastSuccess,
            cacheAge: this.lastCheck ? now - this.lastCheck : null,
            isReliable: this.isAuthStateReliable()
        };
    }
}

// 創建全域實例
const authStateManager = new AuthStateManager();

// 在 window 上暴露以便調試
if (typeof window !== 'undefined') {
    window.authStateManager = authStateManager;
}

export default authStateManager;