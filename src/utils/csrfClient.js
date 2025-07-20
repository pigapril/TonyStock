/**
 * CSRF Token 客戶端工具
 * 用於管理前端應用程式中的CSRF token
 */

class CSRFClient {
    constructor() {
        this.csrfToken = null;
        this.isInitialized = false;
    }

    /**
     * 初始化CSRF token
     * 在用戶登入後呼叫
     */
    async initializeCSRFToken() {
        try {
            console.log('Initializing CSRF token...');
            const baseURL = process.env.REACT_APP_API_BASE_URL || '';
            const response = await fetch(`${baseURL}/api/auth/csrf-token`, {
                method: 'GET',
                credentials: 'include', // 包含cookies。
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('CSRF token response:', {
                status: response.status,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (!response.ok) {
                throw new Error(`CSRF token request failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('CSRF token response data:', data);
            
            if (data.status === 'success' && data.data.csrfToken) {
                this.csrfToken = data.data.csrfToken;
                this.isInitialized = true;
                
                console.log('CSRF token initialized successfully', {
                    tokenLength: this.csrfToken.length,
                    isInitialized: this.isInitialized
                });
                return this.csrfToken;
            } else {
                throw new Error('Invalid CSRF token response');
            }
        } catch (error) {
            console.error('Failed to initialize CSRF token:', error);
            this.csrfToken = null;
            this.isInitialized = false;
            throw error;
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
        console.log('CSRF token cleared');
    }

    /**
     * 直接設置CSRF token（用於登入回傳）
     * @param {string} token
     */
    setCSRFToken(token) {
        if (token) {
            this.csrfToken = token;
            this.isInitialized = true;
            console.log('CSRF token set directly from login response');
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
            console.log('CSRF token added to headers:', {
                tokenLength: this.csrfToken.length,
                headerName: 'X-CSRF-Token'
            });
        } else {
            console.warn('No CSRF token available for request');
        }

        return headers;
    }

    /**
     * 執行受CSRF保護的API請求
     * @param {string} url - API端點URL
     * @param {Object} options - 請求選項
     * @returns {Promise} API回應
     */
    async fetchWithCSRF(url, options = {}) {
        // 確保CSRF token已初始化
        if (!this.isTokenInitialized()) {
            console.log('CSRF token not initialized, initializing...');
            await this.initializeCSRFToken();
        }

        const baseURL = process.env.REACT_APP_API_BASE_URL || '';
        const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;
        
        const headers = this.getHeaders(options.headers);
        
        // 添加詳細的請求日誌
        console.log('CSRF request details:', {
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

        try {
            const response = await fetch(fullUrl, requestOptions);
            
            // 如果收到403錯誤，可能是CSRF token過期，嘗試重新初始化
            if (response.status === 403) {
                console.warn('CSRF token may be expired, attempting to reinitialize...');
                await this.initializeCSRFToken();
                
                // 重新嘗試請求
                const retryHeaders = this.getHeaders(options.headers);
                const retryOptions = {
                    ...options,
                    headers: retryHeaders,
                    credentials: 'include'
                };
                
                const retryResponse = await fetch(fullUrl, retryOptions);
                
                // 如果重試後仍然是403，記錄詳細錯誤
                if (retryResponse.status === 403) {
                    console.error('CSRF token reinitialization failed, request still blocked');
                    console.error('Request details:', {
                        url: fullUrl,
                        method: options.method || 'GET',
                        hasToken: !!this.csrfToken,
                        cookies: document.cookie
                    });
                }
                
                return retryResponse;
            }
            
            return response;
        } catch (error) {
            console.error('CSRF protected request failed:', error);
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
}

// 建立全域CSRF客戶端實例
const csrfClient = new CSRFClient();

export default csrfClient; 