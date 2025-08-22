/**
 * Authentication State Cache
 * 使用 localStorage 持久化認證狀態，實現即時顯示
 */

class AuthStateCache {
    constructor() {
        this.cacheKey = 'auth_state_cache';
        this.maxAge = 5 * 60 * 1000; // 5分鐘
        this.listeners = new Set();
    }

    /**
     * 保存認證狀態到快取
     */
    saveAuthState(authState) {
        try {
            const cacheData = {
                authState,
                timestamp: Date.now(),
                version: '1.0'
            };

            localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
            
            console.log('💾 AuthStateCache: Saved auth state:', {
                isAuthenticated: authState.isAuthenticated,
                hasUser: !!authState.user,
                timestamp: new Date(cacheData.timestamp).toISOString()
            });

            // 通知監聽者
            this._notifyListeners(authState);
        } catch (error) {
            console.warn('⚠️ AuthStateCache: Failed to save auth state:', error);
        }
    }

    /**
     * 從快取載入認證狀態
     */
    loadAuthState() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) {
                console.log('📭 AuthStateCache: No cached auth state found');
                return null;
            }

            const cacheData = JSON.parse(cached);
            const age = Date.now() - cacheData.timestamp;

            // 檢查快取是否過期
            if (age > this.maxAge) {
                console.log('⏰ AuthStateCache: Cached auth state expired:', {
                    age: Math.round(age / 1000),
                    maxAge: Math.round(this.maxAge / 1000)
                });
                this.clearAuthState();
                return null;
            }

            console.log('📦 AuthStateCache: Loaded cached auth state:', {
                isAuthenticated: cacheData.authState.isAuthenticated,
                hasUser: !!cacheData.authState.user,
                age: Math.round(age / 1000),
                confidence: 'cached'
            });

            return {
                ...cacheData.authState,
                source: 'cache',
                confidence: 'medium',
                cacheAge: age
            };
        } catch (error) {
            console.warn('⚠️ AuthStateCache: Failed to load cached auth state:', error);
            this.clearAuthState();
            return null;
        }
    }

    /**
     * 清除快取的認證狀態
     */
    clearAuthState() {
        try {
            localStorage.removeItem(this.cacheKey);
            console.log('🗑️ AuthStateCache: Cleared cached auth state');
            
            // 通知監聽者狀態已清除
            this._notifyListeners(null);
        } catch (error) {
            console.warn('⚠️ AuthStateCache: Failed to clear cached auth state:', error);
        }
    }

    /**
     * 檢查是否有有效的快取
     */
    hasValidCache() {
        const cached = this.loadAuthState();
        return cached !== null;
    }

    /**
     * 獲取快取統計信息
     */
    getCacheStats() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) {
                return { hasCache: false };
            }

            const cacheData = JSON.parse(cached);
            const age = Date.now() - cacheData.timestamp;
            const isExpired = age > this.maxAge;

            return {
                hasCache: true,
                age,
                isExpired,
                timestamp: cacheData.timestamp,
                version: cacheData.version,
                isAuthenticated: cacheData.authState?.isAuthenticated || false
            };
        } catch (error) {
            return { hasCache: false, error: error.message };
        }
    }

    /**
     * 監聽認證狀態變更
     */
    subscribe(callback) {
        this.listeners.add(callback);
        
        // 立即通知當前狀態
        const currentState = this.loadAuthState();
        if (currentState) {
            callback(currentState);
        }
        
        return () => {
            this.listeners.delete(callback);
        };
    }

    /**
     * 通知所有監聽者
     */
    _notifyListeners(authState) {
        this.listeners.forEach(callback => {
            try {
                callback(authState);
            } catch (error) {
                console.error('AuthStateCache: Listener callback error:', error);
            }
        });
    }

    /**
     * 更新用戶信息（保持認證狀態）
     */
    updateUserInfo(userInfo) {
        const currentState = this.loadAuthState();
        if (currentState && currentState.isAuthenticated) {
            this.saveAuthState({
                ...currentState,
                user: userInfo,
                lastUpdated: Date.now()
            });
        }
    }

    /**
     * 設置快取過期時間
     */
    setMaxAge(maxAge) {
        this.maxAge = maxAge;
        console.log(`⏱️ AuthStateCache: Max age set to ${maxAge}ms`);
    }

    /**
     * 強制刷新快取（標記為需要重新驗證）
     */
    markForRefresh() {
        const currentState = this.loadAuthState();
        if (currentState) {
            this.saveAuthState({
                ...currentState,
                needsRefresh: true,
                confidence: 'low'
            });
        }
    }
}

// 創建全域實例
const authStateCache = new AuthStateCache();

// 暴露到 window 以便調試
if (typeof window !== 'undefined') {
    window.authStateCache = authStateCache;
}

export default authStateCache;