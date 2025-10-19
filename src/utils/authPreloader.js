/**
 * Authentication Preloader
 * 在應用程式載入前就開始檢查認證狀態，避免登入狀態的延遲顯示
 */

import authService from '../components/Auth/auth.service';
import { systemLogger } from './logger';

class AuthPreloader {
    constructor() {
        this.preloadedState = null;
        this.preloadPromise = null;
        this.isPreloading = false;
        this.preloadStartTime = null;
    }

    /**
     * 開始預載入認證狀態
     * 這個方法應該在應用程式初始化時立即調用
     */
    startPreload() {
        if (this.isPreloading || this.preloadedState) {
            return this.preloadPromise;
        }

        systemLogger.info('🚀 AuthPreloader: Starting auth state preload...');
        this.isPreloading = true;
        this.preloadStartTime = Date.now();

        this.preloadPromise = this._performPreload();
        return this.preloadPromise;
    }

    /**
     * 執行預載入
     */
    async _performPreload() {
        try {
            // 檢查是否有基本的認證 cookies
            const hasAuthCookies = this._hasAuthCookies();
            
            if (!hasAuthCookies) {
                systemLogger.info('🍪 AuthPreloader: No auth cookies found, user likely not logged in');
                this.preloadedState = {
                    isAuthenticated: false,
                    user: null,
                    source: 'cookie_check',
                    confidence: 'high',
                    preloadTime: Date.now() - this.preloadStartTime
                };
                return this.preloadedState;
            }

            // 如果有 cookies，進行快速認證檢查
            systemLogger.info('🍪 AuthPreloader: Auth cookies found, checking status...');
            const { user } = await authService.checkStatus();
            
            this.preloadedState = {
                isAuthenticated: !!user,
                user: user || null,
                source: 'api_preload',
                confidence: 'high',
                preloadTime: Date.now() - this.preloadStartTime
            };

            systemLogger.info('✅ AuthPreloader: Preload completed:', {
                isAuthenticated: this.preloadedState.isAuthenticated,
                hasUser: !!this.preloadedState.user,
                preloadTime: this.preloadedState.preloadTime
            });

            return this.preloadedState;

        } catch (error) {
            systemLogger.warn('⚠️ AuthPreloader: Preload failed:', error.message);
            
            // 預載入失敗時，根據 cookies 做基本判斷
            const hasAuthCookies = this._hasAuthCookies();
            
            this.preloadedState = {
                isAuthenticated: false,
                user: null,
                source: 'preload_failed',
                confidence: hasAuthCookies ? 'low' : 'medium',
                error: error.message,
                preloadTime: Date.now() - this.preloadStartTime
            };

            return this.preloadedState;
        } finally {
            this.isPreloading = false;
        }
    }

    /**
     * 檢查是否有認證相關的 cookies
     */
    _hasAuthCookies() {
        const cookies = document.cookie;
        
        // 檢查常見的認證 cookie 名稱
        const authCookiePatterns = [
            'connect.sid',      // Express session
            'session',          // 通用 session
            'auth',             // 認證 token
            'token',            // JWT token
            'user',             // 用戶信息
            'logged_in',        // 登入狀態
            'access_token',     // 存取 token
            'refresh_token'     // 刷新 token
        ];

        return authCookiePatterns.some(pattern => 
            cookies.includes(`${pattern}=`) || cookies.includes(`${pattern.toUpperCase()}=`)
        );
    }

    /**
     * 獲取預載入的認證狀態
     */
    getPreloadedState() {
        return this.preloadedState;
    }

    /**
     * 檢查預載入是否完成
     */
    isPreloadComplete() {
        return !this.isPreloading && this.preloadedState !== null;
    }

    /**
     * 等待預載入完成
     */
    async waitForPreload(timeout = 3000) {
        if (this.isPreloadComplete()) {
            return this.preloadedState;
        }

        if (!this.preloadPromise) {
            this.startPreload();
        }

        try {
            // 設置超時，避免無限等待
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Preload timeout')), timeout);
            });

            await Promise.race([this.preloadPromise, timeoutPromise]);
            return this.preloadedState;
        } catch (error) {
            systemLogger.warn('⏰ AuthPreloader: Wait timeout, returning current state');
            return this.preloadedState;
        }
    }

    /**
     * 清除預載入狀態
     */
    clear() {
        systemLogger.debug('🗑️ AuthPreloader: Clearing preloaded state');
        this.preloadedState = null;
        this.preloadPromise = null;
        this.isPreloading = false;
        this.preloadStartTime = null;
    }

    /**
     * 獲取預載入統計信息
     */
    getStats() {
        return {
            hasPreloadedState: !!this.preloadedState,
            isPreloading: this.isPreloading,
            preloadTime: this.preloadedState?.preloadTime || null,
            source: this.preloadedState?.source || null,
            confidence: this.preloadedState?.confidence || null
        };
    }
}

// 創建全域實例
const authPreloader = new AuthPreloader();

// 立即開始預載入（如果在瀏覽器環境中）
if (typeof window !== 'undefined') {
    // 在 DOM 載入後立即開始預載入
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            authPreloader.startPreload();
        });
    } else {
        // 如果 DOM 已經載入，立即開始
        authPreloader.startPreload();
    }
    
    // 暴露到 window 以便調試
    window.authPreloader = authPreloader;
}

export default authPreloader;