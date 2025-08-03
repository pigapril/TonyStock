/**
 * CSRF Token 客戶端工具
 * 用於管理前端應用程式中的CSRF token
 * 增強版：整合 AuthStateManager 和智能錯誤處理
 */

import requestTracker from './requestTracker';
import authStateManager from './authStateManager';

class CSRFClient {
    constructor() {
        this.csrfToken = null;
        this.isInitialized = false;
        this.initializationPromise = null;
        this.retryCount = 0;
        this.maxRetries = 2;
        this.retryDelays = [500, 1500];
        
        // 錯誤統計
        this.errorStats = {
            initializationFailures: 0,
            tokenRefreshFailures: 0,
            lastFailureTime: null,
            consecutiveFailures: 0
        };
    }

    /**
     * 初始化CSRF token（增強版）
     * 在用戶登入後呼叫
     */
    async initializeCSRFToken() {
        // 如果正在初始化，等待完成
        if (this.initializationPromise) {
            console.log('🔄 CSRFClient: Waiting for ongoing initialization...');
            return await this.initializationPromise;
        }

        // 開始初始化
        this.initializationPromise = this._performInitialization();
        
        try {
            const result = await this.initializationPromise;
            return result;
        } finally {
            this.initializationPromise = null;
        }
    }

    /**
     * 執行 CSRF token 初始化
     */
    async _performInitialization() {
        console.log('🛡️ CSRFClient: Starting CSRF token initialization...');
        
        for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
            const requestId = requestTracker.startTracking('/api/auth/csrf-token', {
                method: 'GET',
                credentials: 'include'
            });

            try {
                const baseURL = process.env.REACT_APP_API_BASE_URL || '';
                const response = await fetch(`${baseURL}/api/auth/csrf-token`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                console.log('🛡️ CSRFClient: CSRF token response:', {
                    status: response.status,
                    ok: response.ok,
                    headers: Object.fromEntries(response.headers.entries())
                });

                if (!response.ok) {
                    // 記錄失敗的請求
                    requestTracker.completeTracking(requestId, response, new Error(`HTTP ${response.status}: ${response.statusText}`));
                    
                    // 如果是 403 錯誤，可能需要重新認證
                    if (response.status === 403) {
                        await this._handleCSRFError(response, attempt);
                        
                        if (attempt <= this.maxRetries) {
                            const delay = this.retryDelays[attempt - 1] || 1500;
                            console.log(`🔄 CSRFClient: Retrying CSRF initialization in ${delay}ms (attempt ${attempt + 1})`);
                            await this._delay(delay);
                            continue;
                        }
                    }
                    
                    throw new Error(`CSRF token request failed: ${response.status}`);
                }

                const data = await response.json();
                console.log('🛡️ CSRFClient: CSRF token response data:', data);
                
                if (data.status === 'success' && data.data.csrfToken) {
                    this.csrfToken = data.data.csrfToken;
                    this.isInitialized = true;
                    this.retryCount = 0;
                    this.errorStats.consecutiveFailures = 0;
                    
                    // 記錄成功的請求
                    requestTracker.completeTracking(requestId, response);
                    
                    console.log('✅ CSRFClient: CSRF token initialized successfully', {
                        tokenLength: this.csrfToken.length,
                        isInitialized: this.isInitialized,
                        attempt
                    });
                    
                    return this.csrfToken;
                } else {
                    throw new Error('Invalid CSRF token response');
                }

            } catch (error) {
                // 記錄失敗的請求
                requestTracker.completeTracking(requestId, null, error);
                
                this.errorStats.initializationFailures++;
                this.errorStats.consecutiveFailures++;
                this.errorStats.lastFailureTime = Date.now();
                
                console.error(`❌ CSRFClient: CSRF initialization attempt ${attempt} failed:`, error);
                
                // 如果是最後一次嘗試，拋出錯誤
                if (attempt > this.maxRetries) {
                    this.csrfToken = null;
                    this.isInitialized = false;
                    throw error;
                }
                
                // 等待後重試
                const delay = this.retryDelays[attempt - 1] || 1500;
                console.log(`🔄 CSRFClient: Retrying in ${delay}ms...`);
                await this._delay(delay);
            }
        }
    }

    /**
     * 處理 CSRF 錯誤
     */
    async _handleCSRFError(response, attempt) {
        console.log('🚨 CSRFClient: Handling CSRF error:', {
            status: response.status,
            attempt,
            consecutiveFailures: this.errorStats.consecutiveFailures
        });

        // 如果是 403 錯誤，檢查認證狀態
        if (response.status === 403) {
            try {
                console.log('🔍 CSRFClient: Checking auth state due to 403 error...');
                const authState = await authStateManager.getAuthState(true); // 強制刷新
                
                if (!authState.isAuthenticated) {
                    console.warn('⚠️ CSRFClient: User not authenticated, CSRF token initialization expected to fail');
                    throw new Error('User not authenticated');
                }
                
                console.log('✅ CSRFClient: User is authenticated, will retry CSRF initialization');
            } catch (authError) {
                console.error('❌ CSRFClient: Auth state check failed:', authError);
                throw new Error('Authentication verification failed');
            }
        }
    }

    /**
     * 獲取當前的CSRF token
     * @returns {string|null} CSRF token或null
     */
    getCSRFToken() {
        return this.csrfToken;
    }

    /**
     * 檢查CSRF token是否已初始化
     * @returns {boolean} 是否已初始化
     */
    isTokenInitialized() {
        return this.isInitialized && !!this.csrfToken;
    }

    /**
     * 清除CSRF token
     * 在用戶登出時呼叫
     */
    clearCSRFToken() {
        this.csrfToken = null;
        this.isInitialized = false;
        this.initializationPromise = null;
        this.retryCount = 0;
        console.log('🧹 CSRFClient: CSRF token cleared');
    }

    /**
     * 直接設置CSRF token（用於登入回傳）
     * @param {string} token
     */
    setCSRFToken(token) {
        if (token) {
            this.csrfToken = token;
            this.isInitialized = true;
            this.retryCount = 0;
            this.errorStats.consecutiveFailures = 0;
            console.log('📝 CSRFClient: CSRF token set directly from login response');
        }
    }

    /**
     * 獲取請求標頭
     * @param {Object} customHeaders - 自定義標頭
     * @returns {Object} 請求標頭
     */
    getHeaders(customHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...customHeaders
        };

        // 如果有CSRF token，添加到標頭
        if (this.csrfToken) {
            headers['X-CSRF-Token'] = this.csrfToken;
            console.log('🛡️ CSRFClient: CSRF token added to headers:', {
                tokenLength: this.csrfToken.length,
                headerName: 'X-CSRF-Token'
            });
        } else {
            console.warn('⚠️ CSRFClient: No CSRF token available for request');
        }

        return headers;
    }

    /**
     * 執行受CSRF保護的API請求（增強版）
     * @param {string} url - API端點URL
     * @param {Object} options - 請求選項
     * @returns {Promise} API回應
     */
    async fetchWithCSRF(url, options = {}) {
        const requestId = requestTracker.startTracking(url, {
            method: options.method || 'GET',
            credentials: 'include',
            headers: options.headers || {}
        });

        try {
            // 確保CSRF token已初始化（僅在已認證時）
            if (!this.isTokenInitialized()) {
                console.log('🛡️ CSRFClient: CSRF token not initialized, attempting to initialize...');
                
                try {
                    await this.initializeCSRFToken();
                } catch (error) {
                    // 如果是401錯誤（未認證），不要拋出錯誤，讓請求繼續
                    // 這樣可以讓未認證的請求正常進行，由後端決定如何處理
                    if (error.message.includes('401') || error.message.includes('User not authenticated')) {
                        console.warn('⚠️ CSRFClient: CSRF token initialization failed due to authentication - proceeding without token');
                    } else {
                        requestTracker.completeTracking(requestId, null, error);
                        throw error;
                    }
                }
            }

            const baseURL = process.env.REACT_APP_API_BASE_URL || '';
            const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;
            
            const headers = this.getHeaders(options.headers);
            
            // 添加詳細的請求日誌
            console.log('🛡️ CSRFClient: Making CSRF-protected request:', {
                url: fullUrl,
                method: options.method || 'GET',
                hasToken: !!this.csrfToken,
                tokenLength: this.csrfToken ? this.csrfToken.length : 0,
                headers: headers,
                credentials: 'include'
            });
            
            const requestOptions = {
                ...options,
                headers,
                credentials: 'include' // 包含cookies
            };

            const response = await fetch(fullUrl, requestOptions);
            
            // 如果收到403錯誤，可能是CSRF token過期，嘗試重新初始化
            if (response.status === 403 && this.csrfToken) {
                console.warn('🚨 CSRFClient: Received 403 error, CSRF token may be expired');
                
                try {
                    // 檢查認證狀態
                    const authState = await authStateManager.getAuthState(true);
                    
                    if (authState.isAuthenticated) {
                        console.log('🔄 CSRFClient: User still authenticated, attempting to refresh CSRF token...');
                        
                        // 清除舊 token 並重新初始化
                        this.csrfToken = null;
                        this.isInitialized = false;
                        
                        await this.initializeCSRFToken();
                        
                        // 重新嘗試請求
                        const retryHeaders = this.getHeaders(options.headers);
                        const retryOptions = {
                            ...options,
                            headers: retryHeaders,
                            credentials: 'include'
                        };
                        
                        console.log('🔄 CSRFClient: Retrying request with new CSRF token...');
                        const retryResponse = await fetch(fullUrl, retryOptions);
                        
                        // 記錄重試結果
                        requestTracker.completeTracking(requestId, retryResponse, 
                            retryResponse.ok ? null : new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`)
                        );
                        
                        if (retryResponse.status === 403) {
                            console.error('❌ CSRFClient: Request still blocked after token refresh');
                            this.errorStats.tokenRefreshFailures++;
                        }
                        
                        return retryResponse;
                    } else {
                        console.warn('⚠️ CSRFClient: User no longer authenticated, cannot refresh CSRF token');
                    }
                } catch (reinitError) {
                    console.warn('❌ CSRFClient: CSRF token refresh failed:', reinitError);
                    this.errorStats.tokenRefreshFailures++;
                    // 返回原始回應，讓上層處理
                }
            }
            
            // 記錄請求結果
            requestTracker.completeTracking(requestId, response, 
                response.ok ? null : new Error(`HTTP ${response.status}: ${response.statusText}`)
            );
            
            return response;
            
        } catch (error) {
            console.error('❌ CSRFClient: CSRF protected request failed:', error);
            requestTracker.completeTracking(requestId, null, error);
            throw error;
        }
    }

    /**
     * 執行POST請求
     * @param {string} url - API端點URL
     * @param {Object} data - 請求資料
     * @param {Object} options - 額外選項
     * @returns {Promise} API回應
     */
    async post(url, data, options = {}) {
        return this.fetchWithCSRF(url, {
            method: 'POST',
            body: JSON.stringify(data),
            ...options
        });
    }

    /**
     * 執行PUT請求
     * @param {string} url - API端點URL
     * @param {Object} data - 請求資料
     * @param {Object} options - 額外選項
     * @returns {Promise} API回應
     */
    async put(url, data, options = {}) {
        return this.fetchWithCSRF(url, {
            method: 'PUT',
            body: JSON.stringify(data),
            ...options
        });
    }

    /**
     * 執行DELETE請求
     * @param {string} url - API端點URL
     * @param {Object} options - 額外選項
     * @returns {Promise} API回應
     */
    async delete(url, options = {}) {
        return this.fetchWithCSRF(url, {
            method: 'DELETE',
            ...options
        });
    }

    /**
     * 執行PATCH請求
     * @param {string} url - API端點URL
     * @param {Object} data - 請求資料
     * @param {Object} options - 額外選項
     * @returns {Promise} API回應
     */
    async patch(url, data, options = {}) {
        return this.fetchWithCSRF(url, {
            method: 'PATCH',
            body: JSON.stringify(data),
            ...options
        });
    }

    /**
     * 獲取錯誤統計（用於診斷）
     */
    getErrorStats() {
        return {
            ...this.errorStats,
            isInitialized: this.isInitialized,
            hasToken: !!this.csrfToken,
            tokenLength: this.csrfToken ? this.csrfToken.length : 0
        };
    }

    /**
     * 重置錯誤統計
     */
    resetErrorStats() {
        this.errorStats = {
            initializationFailures: 0,
            tokenRefreshFailures: 0,
            lastFailureTime: null,
            consecutiveFailures: 0
        };
        console.log('🧹 CSRFClient: Error stats reset');
    }

    /**
     * 延遲函數
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
            isInitialized: this.isInitialized,
            hasToken: !!this.csrfToken,
            consecutiveFailures: this.errorStats.consecutiveFailures,
            timeSinceLastFailure,
            totalInitFailures: this.errorStats.initializationFailures,
            totalRefreshFailures: this.errorStats.tokenRefreshFailures
        };
    }
}

// 建立全域CSRF客戶端實例
const csrfClient = new CSRFClient();

// 在 window 上暴露以便調試
if (typeof window !== 'undefined') {
    window.csrfClient = csrfClient;
}

export default csrfClient;