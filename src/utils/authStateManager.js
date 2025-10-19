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
        this.retryDelays = [1000, 2000, 4000]; // 指數退避
        this.maxRetries = 3;
        this.pendingPromise = null;
        
        // 新增：頁面載入狀態檢測
        this.isPageLoading = document.readyState !== 'complete';
        this.cookieReadyPromise = this._waitForCookiesReady();
        
        // 監聽頁面載入完成
        if (this.isPageLoading) {
            window.addEventListener('load', () => {
                this.isPageLoading = false;
                systemLogger.debug('📄 AuthStateManager: Page load completed');
            });
        }
        
        // 新增：狀態同步機制
        this.subscribers = new Set();
        this.stateHistory = [];
        this.maxHistorySize = 10;
        
        // 新增：錯誤追蹤
        this.consecutiveFailures = 0;
        this.lastSuccessTime = null;
        
        // 新增：並發控制改進
        this.requestQueue = [];
        this.isProcessingQueue = false;
        
        // 新增：Cookie 同步檢測
        this.lastCookieCheck = null;
        this.cookieCheckInterval = 1000; // 1秒檢查一次
    }

    /**
     * 獲取認證狀態（帶智能快取）
     */
    async getAuthState(forceRefresh = false) {
        // 如果有正在進行的檢查，等待其完成
        if (this.pendingPromise && !forceRefresh) {
            systemLogger.debug('🔄 AuthStateManager: Waiting for pending auth check...');
            return await this.pendingPromise;
        }

        // 檢查快取是否有效
        if (!forceRefresh && this.isCacheValid()) {
            systemLogger.debug('✅ AuthStateManager: Using cached auth state:', {
                isAuthenticated: this.authState.isAuthenticated,
                age: Date.now() - this.lastCheck,
                source: 'cache',
                confidence: this.authState.confidence
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
        systemLogger.debug('🔍 AuthStateManager: Performing auth check...');
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const authState = await this._checkAuthStatusOnce();
                
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
                this.consecutiveFailures++;
                systemLogger.warn(`⚠️ AuthStateManager: Auth check attempt ${attempt} failed:`, error.message);

                // 如果是最後一次嘗試，返回失敗狀態
                if (attempt === this.maxRetries) {
                    this.authState = {
                        isAuthenticated: false,
                        lastChecked: Date.now(),
                        source: 'api',
                        confidence: 'low',
                        error: error.message,
                        attempt,
                        consecutiveFailures: this.consecutiveFailures
                    };
                    this.lastCheck = Date.now();

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
     * 執行單次認證狀態檢查（增加延遲避免 IP 封鎖）
     */
    async _checkAuthStatusOnce() {
        // 等待 Cookie 就緒
        await this.cookieReadyPromise;
        
        // 檢查 Cookie 是否發生變化，如果是則稍微延遲
        if (this._hasCookiesChanged()) {
            systemLogger.debug('🍪 AuthStateManager: Cookies changed, adding delay');
            await this._delay(500); // 增加到 500ms
        }

        const requestId = requestTracker.startTracking('/api/auth/status', {
            method: 'GET',
            credentials: 'include'
        });

        try {
            // 大幅增加延遲避免觸發 IP 封鎖
            const baseDelay = this.isPageLoading ? 800 : 300; // 增加延遲
            const randomDelay = Math.random() * baseDelay + baseDelay; // 確保最少延遲
            await new Promise(resolve => setTimeout(resolve, randomDelay));
            
            // 使用增強的認證狀態檢查，但添加超時保護
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Auth check timeout')), 20000); // 增加到 20 秒
            });
            
            const authCheckPromise = authStatusFix.checkAuthStatus();
            const authState = await Promise.race([authCheckPromise, timeoutPromise]);
            
            // 如果有錯誤，記錄但不拋出異常
            if (authState.error) {
                systemLogger.warn('⚠️ AuthStateManager: Auth status check returned error:', authState.error);
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
        // 大幅增加基礎延遲，避免觸發 IP 封鎖
        const baseDelays = [3000, 6000, 12000]; // 3秒, 6秒, 12秒
        const baseDelay = baseDelays[attempt - 1] || 12000;
        
        // 根據連續失敗次數增加延遲
        const failureMultiplier = Math.min(this.consecutiveFailures * 0.5 + 1, 3);
        
        // 如果是頁面載入時的第一次嘗試，使用較短的延遲
        const pageLoadMultiplier = (this.isPageLoading && attempt === 1) ? 0.7 : 1;
        
        // 添加隨機抖動避免雷群效應
        const jitter = Math.random() * 0.3 + 0.85; // 85% - 115%
        
        const finalDelay = Math.floor(baseDelay * failureMultiplier * pageLoadMultiplier * jitter);
        
        systemLogger.debug(`🔄 AuthStateManager: Calculated retry delay: ${finalDelay}ms`, {
            attempt,
            baseDelay,
            failureMultiplier,
            pageLoadMultiplier,
            isPageLoading: this.isPageLoading
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
        systemLogger.debug('📝 AuthStateManager: Setting auth state directly:', authState);
        
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
     * 等待 Cookie 就緒（解決頁面重新整理時的時序問題）
     */
    async _waitForCookiesReady() {
        // 如果頁面已經載入完成，直接返回
        if (!this.isPageLoading) {
            return true;
        }

        systemLogger.debug('⏳ AuthStateManager: Waiting for cookies to be ready...');
        
        return new Promise((resolve) => {
            const checkCookies = () => {
                // 更寬容的檢查：只要有任何 Cookie 或頁面載入完成就認為就緒
                const hasCookies = document.cookie.length > 0;
                
                // 如果有 Cookie 或頁面載入完成，認為 cookie 已就緒
                if (hasCookies || !this.isPageLoading) {
                    systemLogger.debug('✅ AuthStateManager: Cookies are ready', {
                        hasCookies,
                        cookieLength: document.cookie.length,
                        pageLoading: this.isPageLoading
                    });
                    resolve(true);
                    return;
                }
                
                // 繼續等待
                setTimeout(checkCookies, 100);
            };
            
            checkCookies();
            
            // 最多等待 2 秒（減少等待時間）
            setTimeout(() => {
                systemLogger.debug('⏰ AuthStateManager: Cookie wait timeout, proceeding anyway');
                resolve(true);
            }, 2000);
        });
    }

    /**
     * 檢查 Cookie 是否發生變化
     */
    _hasCookiesChanged() {
        const currentCookies = document.cookie;
        const changed = this.lastCookieCheck !== null && this.lastCookieCheck !== currentCookies;
        this.lastCookieCheck = currentCookies;
        return changed;
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