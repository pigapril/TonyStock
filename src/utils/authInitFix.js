/**
 * 認證初始化修復
 * 解決頁面重新整理時的認證狀態同步問題
 */

class AuthInitFix {
    constructor() {
        this.initialized = false;
        this.initPromise = null;
    }

    /**
     * 初始化認證狀態（頁面載入時調用）
     */
    async initialize() {
        if (this.initialized) {
            return true;
        }

        if (this.initPromise) {
            return await this.initPromise;
        }

        this.initPromise = this._performInitialization();
        const result = await this.initPromise;
        this.initPromise = null;
        
        return result;
    }

    async _performInitialization() {
        console.log('🚀 AuthInitFix: Starting authentication initialization...');

        try {
            // 1. 等待 DOM 完全載入
            await this._waitForDOMReady();

            // 2. 等待 Cookie 同步
            await this._waitForCookieSync();

            // 3. 預熱認證狀態
            await this._preheatAuthState();

            this.initialized = true;
            console.log('✅ AuthInitFix: Authentication initialization completed');
            return true;

        } catch (error) {
            console.error('❌ AuthInitFix: Initialization failed:', error);
            return false;
        }
    }

    /**
     * 等待 DOM 就緒
     */
    async _waitForDOMReady() {
        if (document.readyState === 'complete') {
            return;
        }

        return new Promise((resolve) => {
            const checkReady = () => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    setTimeout(checkReady, 50);
                }
            };
            checkReady();
        });
    }

        /**
     * 等待 Cookie 同步
     */
    async _waitForCookieSync() {
        console.log('🍪 AuthInitFix: Waiting for cookie synchronization...');
        
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 10; // 減少最大嘗試次數到 1 秒

            const checkCookies = () => {
                attempts++;
                
                const cookies = document.cookie;
                // 更寬容的檢查：只要有任何 Cookie 就認為同步完成
                const hasCookies = cookies.length > 0;
                
                if (hasCookies || attempts >= maxAttempts) {
                    console.log('✅ AuthInitFix: Cookie sync completed', {
                        hasCookies,
                        attempts,
                        cookieCount: cookies.split(';').length,
                        cookieLength: cookies.length
                    });
                    resolve();
                } else {
                    setTimeout(checkCookies, 100);
                }
            };

            checkCookies();
        });
    }

    /**
     * 預熱認證狀態
     */
    async _preheatAuthState() {
        console.log('🔥 AuthInitFix: Preheating auth state...');
        
        try {
            // 導入 authStateManager（動態導入避免循環依賴）
            const { default: authStateManager } = await import('./authStateManager');
            
            // 設置較短的快取超時，讓第一次檢查更快
            const originalTimeout = authStateManager.cacheTimeout;
            authStateManager.setCacheTimeout(5000); // 5 秒
            
            // 執行一次認證狀態檢查
            await authStateManager.getAuthState(false);
            
            // 恢復原始超時設置
            authStateManager.setCacheTimeout(originalTimeout);
            
            console.log('✅ AuthInitFix: Auth state preheated');
            
        } catch (error) {
            console.warn('⚠️ AuthInitFix: Auth state preheat failed:', error);
        }
    }

    /**
     * 重置初始化狀態
     */
    reset() {
        this.initialized = false;
        this.initPromise = null;
        console.log('🔄 AuthInitFix: Reset initialization state');
    }
}

// 創建全域實例
const authInitFix = new AuthInitFix();

// 自動在頁面載入時初始化
if (typeof window !== 'undefined') {
    // 如果頁面已經載入完成，立即初始化
    if (document.readyState === 'complete') {
        authInitFix.initialize();
    } else {
        // 否則等待載入完成
        window.addEventListener('load', () => {
            authInitFix.initialize();
        });
    }
    
    // 暴露到 window 以便調試
    window.authInitFix = authInitFix;
}

export default authInitFix;
