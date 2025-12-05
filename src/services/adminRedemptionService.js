/**
 * Admin Redemption Service - Handles admin-specific redemption code API calls
 * 
 * Features:
 * - Code generation (single and bulk)
 * - Code management and lifecycle operations
 * - Analytics and reporting
 * - Export functionality
 * - Manual code application
 * - Error handling and retry logic
 */

import enhancedApiClient from '../utils/enhancedApiClient';
import { systemLogger } from '../utils/logger';

class AdminRedemptionService {
    constructor() {
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        
        // Cache configuration
        this.cache = new Map();
        this.cacheConfig = {
            codes: { ttl: 2 * 60 * 1000 }, // 2 minutes
            analytics: { ttl: 5 * 60 * 1000 }, // 5 minutes
        };
        
        // Request deduplication
        this.pendingRequests = new Map();
    }

    /**
     * Execute request with retry logic
     * @private
     */
    async _executeWithRetry(requestFn, context = {}) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx) except for specific cases
                if (error.response?.status >= 400 && error.response?.status < 500) {
                    if (error.response.status !== 429 && error.response.status !== 408) {
                        return {
                            success: false,
                            error: error.response?.data?.message || error.message,
                            errorCode: error.response?.data?.code || 'CLIENT_ERROR',
                            details: error.response?.data?.details,
                            httpStatus: error.response?.status
                        };
                    }
                }
                
                if (attempt === this.retryAttempts) {
                    systemLogger.error('Max retry attempts reached', {
                        context,
                        attempts: attempt,
                        error: error.message
                    });
                    break;
                }
                
                const delay = this.getRetryDelay(error, attempt);
                systemLogger.warn(`Request failed, retrying in ${delay}ms`, {
                    context,
                    attempt,
                    error: error.message
                });
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        return {
            success: false,
            error: lastError.response?.data?.message || lastError.message || 'Request failed after retries',
            errorCode: lastError.response?.data?.code || 'RETRY_EXHAUSTED',
            details: lastError.response?.data?.details,
            httpStatus: lastError.response?.status,
            retryAttempts: this.retryAttempts
        };
    }

    /**
     * Get retry delay based on error type
     * @private
     */
    getRetryDelay(error, attempt) {
        if (error.response?.headers?.['retry-after']) {
            const retryAfter = parseInt(error.response.headers['retry-after']);
            return retryAfter * 1000;
        }
        
        const baseDelay = this.retryDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.1 * baseDelay;
        return Math.min(baseDelay + jitter, 30000);
    }

    /**
     * Generate single or bulk redemption codes
     * @param {Object} config - Code configuration
     * @param {number} count - Number of codes to generate (1 for single)
     * @returns {Promise<Object>} Generation response
     */
    async generateCodes(config, count = 1) {
        return await this._executeWithRetry(async () => {
            systemLogger.info('Generating redemption codes', { 
                codeType: config.codeType,
                count,
                campaignName: config.campaignName 
            });

            const response = await enhancedApiClient.post('/api/admin/redemption/generate', {
                ...config,
                count
            });

            if (response.data.status === 'success') {
                // Clear codes cache after generation
                this.clearCacheType('codes');
                
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || 'Code generation failed');
            }
        }, { operation: 'generateCodes', codeType: config.codeType, count });
    }

    /**
     * Get redemption codes with filtering and pagination
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} Codes response
     */
    async getCodes(params = {}) {
        const cacheKey = this._createCacheKey('codes', params);
        
        // Check cache first
        const cachedData = this._getCachedData(cacheKey);
        if (cachedData) {
            systemLogger.info('Returning cached admin codes');
            return {
                success: true,
                data: cachedData,
                fromCache: true
            };
        }

        return await this._executeWithRetry(async () => {
            const queryParams = new URLSearchParams();
            
            Object.entries(params).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    queryParams.append(key, value);
                }
            });

            const response = await enhancedApiClient.get(`/api/admin/redemption/codes?${queryParams.toString()}`);

            if (response.data.status === 'success') {
                // Cache the successful response
                this._setCachedData(cacheKey, response.data.data, this.cacheConfig.codes.ttl);
                
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || 'Failed to get codes');
            }
        }, { operation: 'getCodes', params });
    }

    /**
     * Update code configuration
     * @param {string} codeId - Code ID to update
     * @param {Object} updates - Update data
     * @returns {Promise<Object>} Update response
     */
    async updateCode(codeId, updates) {
        return await this._executeWithRetry(async () => {
            systemLogger.info('Updating redemption code', { codeId, updates: Object.keys(updates) });

            const response = await enhancedApiClient.put(`/api/admin/redemption/codes/${codeId}`, updates);

            if (response.data.status === 'success') {
                // Clear codes cache after update
                this.clearCacheType('codes');
                
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || 'Code update failed');
            }
        }, { operation: 'updateCode', codeId });
    }

    /**
     * Deactivate a redemption code
     * @param {string} codeId - Code ID to deactivate
     * @param {string} reason - Deactivation reason
     * @returns {Promise<Object>} Deactivation response
     */
    async deactivateCode(codeId, reason = 'Manual deactivation') {
        return await this._executeWithRetry(async () => {
            systemLogger.info('Deactivating redemption code', { codeId, reason });

            const response = await enhancedApiClient.put(`/api/admin/redemption/codes/${codeId}/deactivate`, {
                reason
            });

            if (response.data.status === 'success') {
                // Clear codes cache after deactivation
                this.clearCacheType('codes');
                
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || 'Code deactivation failed');
            }
        }, { operation: 'deactivateCode', codeId });
    }

    /**
     * Activate a redemption code
     * @param {string} codeId - Code ID to activate
     * @param {Date} activationDate - Optional scheduled activation date
     * @returns {Promise<Object>} Activation response
     */
    async activateCode(codeId, activationDate = null) {
        return await this._executeWithRetry(async () => {
            systemLogger.info('Activating redemption code', { codeId, activationDate });

            const response = await enhancedApiClient.put(`/api/admin/redemption/codes/${codeId}/activate`, {
                activationDate: activationDate ? activationDate.toISOString() : null
            });

            if (response.data.status === 'success') {
                // Clear codes cache after activation
                this.clearCacheType('codes');
                
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || 'Code activation failed');
            }
        }, { operation: 'activateCode', codeId });
    }

    /**
     * Manually apply redemption code to specific user
     * @param {string} userId - Target user ID
     * @param {string} code - Redemption code
     * @param {Object} options - Application options
     * @returns {Promise<Object>} Application response
     */
    async manuallyApplyCode(userId, code, options = {}) {
        return await this._executeWithRetry(async () => {
            systemLogger.info('Manually applying redemption code', { 
                userId, 
                code: code.substring(0, 4) + '***',
                options 
            });

            const response = await enhancedApiClient.post('/api/admin/redemption/apply', {
                userId,
                code,
                reason: options.reason || 'Manual application by admin',
                bypassValidation: options.bypassValidation || false,
                notifyUser: options.notifyUser !== false
            });

            if (response.data.status === 'success') {
                // Clear relevant caches after manual application
                this.clearCacheType('codes');
                
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || 'Manual code application failed');
            }
        }, { operation: 'manuallyApplyCode', userId, code: code.substring(0, 4) + '***' });
    }

    /**
     * Get comprehensive analytics
     * @param {Object} params - Analytics parameters
     * @returns {Promise<Object>} Analytics response
     */
    async getAnalytics(params = {}) {
        const cacheKey = this._createCacheKey('analytics', params);
        
        // Check cache first
        const cachedData = this._getCachedData(cacheKey);
        if (cachedData) {
            systemLogger.info('Returning cached analytics');
            return {
                success: true,
                data: cachedData,
                fromCache: true
            };
        }

        return await this._executeWithRetry(async () => {
            const queryParams = new URLSearchParams();
            
            Object.entries(params).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    if (value instanceof Date) {
                        queryParams.append(key, value.toISOString());
                    } else {
                        queryParams.append(key, value);
                    }
                }
            });

            const response = await enhancedApiClient.get(`/api/admin/redemption/analytics?${queryParams.toString()}`);

            if (response.data.status === 'success') {
                // Cache the successful response
                this._setCachedData(cacheKey, response.data.data, this.cacheConfig.analytics.ttl);
                
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || 'Failed to get analytics');
            }
        }, { operation: 'getAnalytics', params });
    }

    /**
     * Export redemption data
     * @param {Object} params - Export parameters
     * @returns {Promise<Object>} Export response
     */
    async exportData(params = {}) {
        return await this._executeWithRetry(async () => {
            systemLogger.info('Exporting redemption data', { 
                format: params.format,
                type: params.type 
            });

            const queryParams = new URLSearchParams();
            
            Object.entries(params).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    if (value instanceof Date) {
                        queryParams.append(key, value.toISOString());
                    } else {
                        queryParams.append(key, value);
                    }
                }
            });

            const response = await enhancedApiClient.get(`/api/admin/redemption/export?${queryParams.toString()}`);

            // Handle CSV format (plain text response)
            if (params.format === 'csv') {
                // For CSV, response.data is the raw CSV string
                return {
                    success: true,
                    data: response.data,
                    format: 'csv'
                };
            }

            // Handle JSON format (structured response)
            if (response.data.status === 'success') {
                return {
                    success: true,
                    data: response.data,
                    format: 'json'
                };
            } else {
                throw new Error(response.data.message || 'Export failed');
            }
        }, { operation: 'exportData', params });
    }

    /**
     * Bulk operations on multiple codes
     * @param {Array} codeIds - Array of code IDs
     * @param {string} operation - Operation to perform ('activate', 'deactivate', 'delete')
     * @param {Object} options - Operation options
     * @returns {Promise<Object>} Bulk operation response
     */
    async bulkOperation(codeIds, operation, options = {}) {
        return await this._executeWithRetry(async () => {
            systemLogger.info('Performing bulk operation', { 
                operation,
                codeCount: codeIds.length,
                options 
            });

            const promises = codeIds.map(async (codeId) => {
                try {
                    switch (operation) {
                        case 'activate':
                            return await this.activateCode(codeId, options.activationDate);
                        case 'deactivate':
                            return await this.deactivateCode(codeId, options.reason);
                        case 'update':
                            return await this.updateCode(codeId, options.updates);
                        default:
                            throw new Error(`Unsupported bulk operation: ${operation}`);
                    }
                } catch (error) {
                    return {
                        success: false,
                        codeId,
                        error: error.message
                    };
                }
            });

            const results = await Promise.all(promises);
            
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success);

            return {
                success: true,
                data: {
                    total: codeIds.length,
                    successful,
                    failed: failed.length,
                    results,
                    failedCodes: failed
                }
            };
        }, { operation: 'bulkOperation', operation: operation, codeCount: codeIds.length });
    }

    /**
     * Get cached data if available and not expired
     * @private
     */
    _getCachedData(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        
        return entry.data;
    }

    /**
     * Set data in cache with TTL
     * @private
     */
    _setCachedData(key, data, ttl) {
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttl,
            createdAt: Date.now()
        });
    }

    /**
     * Create cache key for request
     * @private
     */
    _createCacheKey(type, params = {}) {
        const paramString = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');
        return `${type}:${paramString}`;
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.cache.clear();
        systemLogger.info('Admin redemption service cache cleared');
    }

    /**
     * Clear specific cache type
     */
    clearCacheType(type) {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${type}:`)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.cache.delete(key));
        systemLogger.info(`Cleared admin cache for type: ${type}`, { count: keysToDelete.length });
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        const stats = {
            totalEntries: this.cache.size,
            pendingRequests: this.pendingRequests.size,
            byType: {}
        };
        
        for (const key of this.cache.keys()) {
            const type = key.split(':')[0];
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        }
        
        return stats;
    }

    /**
     * Format error message for display
     * @param {Object} error - Error object from API response
     * @param {Function} t - Translation function
     * @returns {string} Formatted error message
     */
    formatErrorMessage(error, t) {
        if (!error) return t('admin.errors.unknown');

        const errorCode = error.errorCode || 'UNKNOWN';
        const translationKey = `admin.errors.${errorCode.toLowerCase()}`;
        
        const translatedMessage = t(translationKey);
        if (translationKey !== translatedMessage) {
            return translatedMessage;
        }

        return error.error || t('admin.errors.unknown');
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.clearCache();
        this.pendingRequests.clear();
        systemLogger.info('AdminRedemptionService destroyed');
    }
}

// Export singleton instance
const adminRedemptionService = new AdminRedemptionService();
export default adminRedemptionService;