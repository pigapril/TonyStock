/**
 * Enhanced API Client
 * Wraps the existing apiClient with authentication guard and retry logic
 */

import apiClient from '../api/apiClient';
import authGuard from './authGuard';
import { handleApiError } from './errorHandler';

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
        // Create a unique key for request deduplication
        const requestKey = this._createRequestKey(method, url, data);
        
        // Check if the same request is already in progress
        if (this.requestQueue.has(requestKey)) {
            console.log(`🔄 Deduplicating request: ${method.toUpperCase()} ${url}`);
            return await this.requestQueue.get(requestKey);
        }

        // Create the request promise
        const requestPromise = this._executeRequest(method, url, data, config);
        
        // Add to queue
        this.requestQueue.set(requestKey, requestPromise);
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            // Remove from queue when done
            this.requestQueue.delete(requestKey);
        }
    }

    /**
     * Execute the actual request
     * @private
     */
    async _executeRequest(method, url, data, config) {
        // Check network connectivity
        if (!this.isOnline) {
            throw new Error('No network connection available');
        }

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

    /**
     * Create a unique key for request deduplication
     * @private
     */
    _createRequestKey(method, url, data) {
        const dataHash = data ? JSON.stringify(data) : '';
        return `${method.toUpperCase()}:${url}:${btoa(dataHash).substring(0, 10)}`;
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