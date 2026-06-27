/**
 * Enhanced API Client
 * Wraps the existing apiClient with authentication guard and retry logic
 */

import axios from 'axios';
import apiClient from '../api/apiClient';
import authGuard from './authGuard';

class EnhancedApiClient {
    constructor() {
        this.requestQueue = new Map();
        this.isOnline = navigator.onLine;
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 Network: Back online');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('🌐 Network: Gone offline');
        });
    }

    /**
     * Make a GET request with authentication guard
     */
    async get(url, config = {}) {
        return this._makeRequest('get', url, undefined, config);
    }

    /**
     * Make a POST request with authentication guard
     */
    async post(url, data, config = {}) {
        return this._makeRequest('post', url, data, config);
    }

    /**
     * Make a PUT request with authentication guard
     */
    async put(url, data, config = {}) {
        return this._makeRequest('put', url, data, config);
    }

    /**
     * Make a DELETE request with authentication guard
     */
    async delete(url, config = {}) {
        return this._makeRequest('delete', url, undefined, config);
    }

    /**
     * Make an authenticated request with retry logic and deduplication
     * @private
     */
    async _makeRequest(method, url, data, config = {}) {
        const shouldDeduplicate = this._shouldDeduplicate(config);

        // Create a unique key for request deduplication
        const requestKey = this._createRequestKey(method, url, data, config);
        
        // Check if the same request is already in progress
        if (shouldDeduplicate && this.requestQueue.has(requestKey)) {
            console.log(`🔄 Deduplicating request: ${method.toUpperCase()} ${url}`);
            return await this.requestQueue.get(requestKey);
        }

        // Create the request promise
        const requestPromise = this._executeRequest(method, url, data, config);
        
        // Add to queue
        if (shouldDeduplicate) {
            this.requestQueue.set(requestKey, requestPromise);
        }
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            // Remove from queue when done
            if (shouldDeduplicate) {
                this.requestQueue.delete(requestKey);
            }
        }
    }

    /**
     * Execute the actual request
     * @private
     */
    async _executeRequest(method, url, data, config) {
        // 不再用 navigator.onLine 事前硬擋請求：該旗標在桌面瀏覽器常誤報離線
        //（VPN、睡眠喚醒、虛擬網卡），一旦誤判會讓整站 API 全部失效。
        // 改為照常送出；真正的網路失敗在下方 catch 依實際錯誤判斷與標記。

        // Use auth guard for authenticated requests
        return await authGuard.makeAuthenticatedRequest(async () => {
            console.log(`📡 Making ${method.toUpperCase()} request to ${url}`);
            
            const startTime = Date.now();
            
            try {
                let response;
                
                switch (method.toLowerCase()) {
                    case 'get':
                        response = await apiClient.get(url, config);
                        break;
                    case 'post':
                        response = await apiClient.post(url, data, config);
                        break;
                    case 'put':
                        response = await apiClient.put(url, data, config);
                        break;
                    case 'delete':
                        response = await apiClient.delete(url, config);
                        break;
                    default:
                        throw new Error(`Unsupported HTTP method: ${method}`);
                }

                const duration = Date.now() - startTime;
                console.log(`✅ Request completed: ${method.toUpperCase()} ${url} (${duration}ms)`);
                
                return response;

            } catch (error) {
                const duration = Date.now() - startTime;
                if (this._isCanceledRequest(error)) {
                    console.info(`🛑 Request canceled: ${method.toUpperCase()} ${url} (${duration}ms)`);
                    throw error;
                }

                // 依「請求實際失敗」判斷離線（取代不可靠的 navigator.onLine 事前硬擋）
                if (this._isNetworkError(error)) {
                    error.isNetworkError = true;
                    if (!error.response) {
                        error.message = 'No network connection available';
                    }
                }

                console.error(`❌ Request failed: ${method.toUpperCase()} ${url} (${duration}ms)`, error);
                
                // Enhanced error context
                error.requestContext = {
                    method: method.toUpperCase(),
                    url,
                    duration,
                    timestamp: new Date().toISOString(),
                    isOnline: this.isOnline,
                    authGuardInitializing: typeof authGuard?.isInitializing === 'function' ? authGuard.isInitializing() : false
                };
                
                throw error;
            }
        }, {
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 1000
        });
    }

    _shouldDeduplicate(config = {}) {
        return !(config.signal || config.cancelToken);
    }

    _isCanceledRequest(error) {
        return axios.isCancel(error)
            || error?.code === 'ERR_CANCELED'
            || error?.name === 'CanceledError';
    }

    // 真正的網路層失敗：請求已送出但拿不到回應（無 error.response），
    // 例如離線、DNS 失敗、連線中斷。與「伺服器回了 4xx/5xx」區分開。
    _isNetworkError(error) {
        if (this._isCanceledRequest(error) || error?.response) {
            return false;
        }
        return error?.code === 'ERR_NETWORK'
            || error?.message === 'Network Error'
            || Boolean(error?.request);
    }

    /**
     * Create a unique key for request deduplication
     * @private
     */
    _createRequestKey(method, url, data, config = {}) {
        const paramsHash = config?.params ? JSON.stringify(config.params) : '';
        const dataHash = data ? JSON.stringify(data) : '';
        return `${method.toUpperCase()}:${url}:${paramsHash}::${dataHash}`;
    }

    /**
     * Clear the request queue (useful for cleanup)
     */
    clearQueue() {
        console.log('🧹 Clearing request queue');
        this.requestQueue.clear();
    }

    /**
     * Get current queue status
     */
    getQueueStatus() {
        return {
            pendingRequests: this.requestQueue.size,
            isOnline: this.isOnline,
            authGuardInitializing: typeof authGuard?.isInitializing === 'function' ? authGuard.isInitializing() : false
        };
    }
}

// Create singleton instance
const enhancedApiClient = new EnhancedApiClient();

export default enhancedApiClient;
