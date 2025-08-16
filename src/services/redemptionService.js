/**
 * Redemption Service - Handles redemption code API calls
 * 
 * Features:
 * - Code validation and preview
 * - Code redemption with confirmation
 * - Redemption history management
 * - Active promotions tracking
 * - Error handling and retry logic
 * - Caching for performance optimization
 * - Request deduplication
 */

import enhancedApiClient from '../utils/enhancedApiClient';
import { systemLogger } from '../utils/logger';

class RedemptionService {
    constructor() {
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        
        // Cache configuration
        this.cache = new Map();
        this.cacheConfig = {
            redemptionHistory: { ttl: 5 * 60 * 1000 }, // 5 minutes
            activePromotions: { ttl: 2 * 60 * 1000 }, // 2 minutes
            codeValidation: { ttl: 30 * 1000 }, // 30 seconds
        };
        
        // Request deduplication
        this.pendingRequests = new Map();
        
        // Auto-cleanup cache every 10 minutes
        this.cacheCleanupInterval = setInterval(() => {
            this._cleanupExpiredCache();
        }, 10 * 60 * 1000);
    }

    /**
     * Clean up expired cache entries
     * @private
     */
    _cleanupExpiredCache() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt <= now) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            systemLogger.info(`Cache cleanup: removed ${cleanedCount} expired entries`);
        }
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
                    // Only retry on 429 (rate limited) and 408 (timeout)
                    if (error.response.status !== 429 && error.response.status !== 408) {
                        // Return structured error for client errors
                        return {
                            success: false,
                            error: error.response?.data?.message || error.message,
                            errorCode: error.response?.data?.code || 'CLIENT_ERROR',
                            details: error.response?.data?.details,
                            requiresConfirmation: error.response?.data?.requiresConfirmation,
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
        
        // Return structured error for final failure
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
     * Deduplicate concurrent requests
     * @private
     */
    async _deduplicateRequest(key, requestFn) {
        if (this.pendingRequests.has(key)) {
            systemLogger.info('Deduplicating concurrent request', { key });
            return await this.pendingRequests.get(key);
        }
        
        const promise = requestFn();
        this.pendingRequests.set(key, promise);
        
        try {
            const result = await promise;
            return result;
        } finally {
            this.pendingRequests.delete(key);
        }
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.cache.clear();
        systemLogger.info('Redemption service cache cleared');
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
        systemLogger.info(`Cleared cache for type: ${type}`, { count: keysToDelete.length });
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
     * Preview redemption benefits without applying the code
     * @param {string} code - Redemption code to preview
     * @returns {Promise<Object>} Preview response with benefits
     */
    async previewRedemption(code) {
        const normalizedCode = code.trim().toUpperCase();
        const maskedCode = normalizedCode.substring(0, 4) + '***';
        
        return await this._executeWithRetry(async () => {
            systemLogger.info('Previewing redemption code', { code: maskedCode });

            const response = await enhancedApiClient.post('/api/redemption/preview', {
                code: normalizedCode
            });

            if (response.data.status === 'success') {
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || 'Preview failed');
            }
        }, { operation: 'previewRedemption', code: maskedCode });
    }

    /**
     * Redeem a code with confirmation
     * @param {string} code - Redemption code to redeem
     * @param {boolean} confirmed - Whether user has confirmed the redemption
     * @returns {Promise<Object>} Redemption response
     */
    async redeemCode(code, confirmed = false) {
        const normalizedCode = code.trim().toUpperCase();
        const maskedCode = normalizedCode.substring(0, 4) + '***';
        
        return await this._executeWithRetry(async () => {
            systemLogger.info('Redeeming code', { 
                code: maskedCode,
                confirmed 
            });

            const response = await enhancedApiClient.post('/api/redemption/redeem', {
                code: normalizedCode,
                confirmed
            });

            if (response.data.status === 'success') {
                // Clear relevant caches after successful redemption
                this.clearCacheType('redemptionHistory');
                this.clearCacheType('activePromotions');
                this.clearCacheType('codeValidation');
                
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || 'Redemption failed');
            }
        }, { operation: 'redeemCode', code: maskedCode, confirmed });
    }

    /**
     * Validate a redemption code with caching
     * @param {string} code - Code to validate
     * @param {boolean} forceRefresh - Skip cache and validate fresh
     * @returns {Promise<Object>} Validation response
     */
    async validateCode(code, forceRefresh = false) {
        const normalizedCode = code.trim().toUpperCase();
        const cacheKey = this._createCacheKey('codeValidation', { code: normalizedCode });
        
        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cachedData = this._getCachedData(cacheKey);
            if (cachedData) {
                systemLogger.info('Returning cached code validation', { code: normalizedCode.substring(0, 4) + '***' });
                return {
                    success: true,
                    data: cachedData,
                    fromCache: true
                };
            }
        }

        // Deduplicate concurrent requests
        return await this._deduplicateRequest(cacheKey, async () => {
            return await this._executeWithRetry(async () => {
                const response = await enhancedApiClient.get(`/api/redemption/validate/${encodeURIComponent(normalizedCode)}`);

                if (response.data.status === 'success') {
                    // Cache the successful response
                    this._setCachedData(cacheKey, response.data.data, this.cacheConfig.codeValidation.ttl);
                    
                    return {
                        success: true,
                        data: response.data.data
                    };
                } else {
                    throw new Error(response.data.message || 'Validation failed');
                }
            }, { operation: 'validateCode', code: normalizedCode.substring(0, 4) + '***' });
        });
    }

    /**
     * Get user's redemption history with caching
     * @param {Object} filters - Filtering options
     * @param {boolean} forceRefresh - Skip cache and fetch fresh data
     * @returns {Promise<Object>} History response
     */
    async getRedemptionHistory(filters = {}, forceRefresh = false) {
        const cacheKey = this._createCacheKey('redemptionHistory', filters);
        
        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cachedData = this._getCachedData(cacheKey);
            if (cachedData) {
                systemLogger.info('Returning cached redemption history', { filters });
                return {
                    success: true,
                    data: cachedData,
                    fromCache: true
                };
            }
        }

        // Deduplicate concurrent requests
        return await this._deduplicateRequest(cacheKey, async () => {
            return await this._executeWithRetry(async () => {
                const params = new URLSearchParams();
                
                if (filters.page) params.append('page', filters.page);
                if (filters.limit) params.append('limit', filters.limit);
                if (filters.status) params.append('status', filters.status);
                if (filters.type) params.append('type', filters.type);
                if (filters.startDate) params.append('startDate', filters.startDate);
                if (filters.endDate) params.append('endDate', filters.endDate);

                const response = await enhancedApiClient.get(`/api/redemption/history?${params.toString()}`);

                if (response.data.status === 'success') {
                    // Cache the successful response
                    this._setCachedData(cacheKey, response.data.data, this.cacheConfig.redemptionHistory.ttl);
                    
                    return {
                        success: true,
                        data: response.data.data
                    };
                } else {
                    throw new Error(response.data.message || 'Failed to get history');
                }
            }, { operation: 'getRedemptionHistory', filters });
        });
    }

    /**
     * Get user's active promotions with caching
     * @param {boolean} forceRefresh - Skip cache and fetch fresh data
     * @returns {Promise<Object>} Active promotions response
     */
    async getActivePromotions(forceRefresh = false) {
        const cacheKey = this._createCacheKey('activePromotions');
        
        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cachedData = this._getCachedData(cacheKey);
            if (cachedData) {
                systemLogger.info('Returning cached active promotions');
                return {
                    success: true,
                    data: cachedData,
                    fromCache: true
                };
            }
        }

        // Deduplicate concurrent requests
        return await this._deduplicateRequest(cacheKey, async () => {
            return await this._executeWithRetry(async () => {
                const response = await enhancedApiClient.get('/api/redemption/active-promotions');

                if (response.data.status === 'success') {
                    // Cache the successful response
                    this._setCachedData(cacheKey, response.data.data, this.cacheConfig.activePromotions.ttl);
                    
                    return {
                        success: true,
                        data: response.data.data
                    };
                } else {
                    throw new Error(response.data.message || 'Failed to get active promotions');
                }
            }, { operation: 'getActivePromotions' });
        });
    }

    /**
     * Cancel a pending redemption
     * @param {string} redemptionId - ID of redemption to cancel
     * @returns {Promise<Object>} Cancellation response
     */
    async cancelPendingRedemption(redemptionId) {
        return await this._executeWithRetry(async () => {
            const response = await enhancedApiClient.post('/api/redemption/cancel', {
                redemptionId
            });

            if (response.data.status === 'success') {
                // Clear relevant caches after cancellation
                this.clearCacheType('redemptionHistory');
                this.clearCacheType('activePromotions');
                
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || 'Cancellation failed');
            }
        }, { operation: 'cancelPendingRedemption', redemptionId });
    }

    /**
     * Format error message for display
     * @param {Object} error - Error object from API response
     * @param {Function} t - Translation function
     * @returns {string} Formatted error message
     */
    formatErrorMessage(error, t) {
        if (!error) return t('redemption.errors.unknown');

        const errorCode = error.errorCode || 'UNKNOWN';
        const translationKey = `redemption.errors.${errorCode.toLowerCase()}`;
        
        // Try to get translated message, fallback to error message
        const translatedMessage = t(translationKey);
        if (translationKey !== translatedMessage) {
            return translatedMessage;
        }

        // Fallback to error message or generic message
        return error.error || t('redemption.errors.unknown');
    }

    /**
     * Check if error requires specific action
     * @param {Object} error - Error object from API response
     * @returns {Object} Action requirements
     */
    getErrorActionRequirements(error) {
        if (!error) return {};

        const requirements = {};

        switch (error.errorCode) {
            case 'PAYMENT_METHOD_REQUIRED':
                requirements.requiresPaymentMethod = true;
                break;
            case 'CONFIRMATION_REQUIRED':
                requirements.requiresConfirmation = true;
                break;
            case 'ELIGIBILITY_FAILED':
                requirements.showEligibilityInfo = true;
                break;
            case 'STACKING_VIOLATION':
                requirements.showActivePromotions = true;
                break;
            default:
                break;
        }

        return requirements;
    }

    /**
     * Check if an error is retryable
     * @param {Object} error - Error object
     * @returns {boolean} Whether the error is retryable
     */
    isRetryableError(error) {
        if (!error.response) return true; // Network errors are retryable
        
        const status = error.response.status;
        
        // Retry on server errors and specific client errors
        return status >= 500 || status === 429 || status === 408;
    }

    /**
     * Get retry delay based on error type
     * @param {Object} error - Error object
     * @param {number} attempt - Current attempt number
     * @returns {number} Delay in milliseconds
     */
    getRetryDelay(error, attempt) {
        // Use Retry-After header if available (for 429 responses)
        if (error.response?.headers?.['retry-after']) {
            const retryAfter = parseInt(error.response.headers['retry-after']);
            return retryAfter * 1000; // Convert to milliseconds
        }
        
        // Exponential backoff with jitter
        const baseDelay = this.retryDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.1 * baseDelay; // 10% jitter
        return Math.min(baseDelay + jitter, 30000); // Max 30 seconds
    }

    /**
     * Cleanup resources and intervals
     */
    destroy() {
        if (this.cacheCleanupInterval) {
            clearInterval(this.cacheCleanupInterval);
            this.cacheCleanupInterval = null;
        }
        
        this.clearCache();
        this.pendingRequests.clear();
        
        systemLogger.info('RedemptionService destroyed');
    }
}

// Export singleton instance
const redemptionService = new RedemptionService();
export default redemptionService;