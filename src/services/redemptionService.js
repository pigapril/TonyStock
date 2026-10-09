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
import { formatDate } from '../utils/redemptionFormatting';

class RedemptionService {
    constructor() {
        this.retryAttempts = 1; // 進一步減少重試次數，避免過多請求觸發詐欺檢測
        this.retryDelay = 1000;
        
        // 請求節流控制
        this.requestThrottle = new Map(); // 記錄最近的請求時間
        
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
     * Check if request should be throttled
     * @private
     */
    _shouldThrottleRequest(context) {
        const key = `${context.operation || 'unknown'}-${context.code || 'no-code'}`;
        const lastRequestTime = this.requestThrottle.get(key);
        const now = Date.now();
        
        if (lastRequestTime && (now - lastRequestTime) < 500) { // 500ms 節流
            return true;
        }
        
        this.requestThrottle.set(key, now);
        return false;
    }

    /**
     * Execute request with retry logic
     * @private
     */
    async _executeWithRetry(requestFn, context = {}) {
        // 檢查請求節流
        if (this._shouldThrottleRequest(context)) {
            systemLogger.warn('Request throttled', { context });
            return {
                success: false,
                error: '請求過於頻繁，請稍後再試',
                errorCode: 'REQUEST_THROTTLED'
            };
        }
        
        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx) except for specific cases
                if (error.response?.status >= 400 && error.response?.status < 500) {
                    // Don't retry on 429 (rate limited) to avoid making the problem worse
                    // Only retry on 408 (timeout)
                    if (error.response.status !== 408) {
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
                        error: error.message,
                        httpStatus: error.response?.status,
                        userId: context.userId || 'unknown'
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
        console.log('🏪 redemptionService.previewRedemption called with:', code);
        const normalizedCode = code.trim().toUpperCase();
        const maskedCode = normalizedCode.substring(0, 4) + '***';
        
        return await this._executeWithRetry(async () => {
            console.log('📡 About to make POST request to /api/redemption/preview');
            systemLogger.info('Previewing redemption code', { code: maskedCode });

            const response = await enhancedApiClient.post('/api/redemption/preview', {
                code: normalizedCode
            });

            // 🔍 調試：記錄完整的響應數據
            console.log('🔍 Preview response received:', {
                status: response.status,
                statusText: response.statusText,
                dataStatus: response.data?.status,
                dataKeys: response.data ? Object.keys(response.data) : 'no data',
                fullData: response.data
            });

            if (response.data.status === 'success') {
                console.log('✅ Response status is success, returning data:', response.data.data);
                return {
                    success: true,
                    data: {
                        ...response.data.data,
                        code: normalizedCode  // 添加原始代碼到返回數據中
                    }
                };
            } else {
                console.log('❌ Response status is not success:', response.data.status);
                console.log('🔍 Full response data:', response.data);
                throw new Error(response.data.message || 'Preview failed');
            }
        }, { operation: 'previewRedemption', code: maskedCode, userId: 'current' });
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
        }, { operation: 'redeemCode', code: maskedCode, confirmed, userId: 'current' });
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
                
                // Check if cached data indicates invalid code
                if (!cachedData.isValid) {
                    return {
                        success: false,
                        error: cachedData.summary || 'Code is invalid',
                        errorCode: 'INVALID_CODE',
                        data: cachedData,
                        fromCache: true
                    };
                }
                
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
                console.log('🔍 API response:', response.data);

                if (response.data.status === 'success') {
                    const validationData = response.data.data;
                    console.log('📊 Validation data:', validationData);
                    
                    // Cache the response regardless of validity
                    this._setCachedData(cacheKey, validationData, this.cacheConfig.codeValidation.ttl);
                    
                    // Check if the code is actually valid
                    if (!validationData.isValid) {
                        console.log('❌ Code is invalid, returning error');
                        
                        // 提取具體的錯誤類型
                        const primaryError = validationData.errors && validationData.errors[0];
                        const errorCode = primaryError?.type || 'INVALID_CODE';
                        
                        console.log('🔍 Primary error:', primaryError);
                        console.log('🔍 Error code:', errorCode);
                        
                        return {
                            success: false,
                            error: validationData.summary || response.data.message || 'Code is invalid',
                            errorCode: errorCode,
                            data: validationData
                        };
                    }
                    
                    console.log('✅ Code is valid, returning success');
                    return {
                        success: true,
                        data: {
                            ...validationData,
                            code: normalizedCode  // 添加原始代碼到返回數據中
                        }
                    };
                } else {
                    console.log('❌ API response status not success:', response.data.status);
                    throw new Error(response.data.message || 'Validation failed');
                }
            }, { operation: 'validateCode', code: normalizedCode.substring(0, 4) + '***', userId: 'current' });
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
        
        // 獲取當前語言 - 使用更可靠的方法
        const getCurrentLanguage = () => {
            // 嘗試從 i18next 實例獲取
            if (typeof window !== 'undefined' && window.i18n?.language) {
                const lang = window.i18n.language;
                return (lang === 'zh-TW' || lang === 'zh') ? 'zh-TW' : 'en';
            }
            
            // 嘗試從 localStorage 獲取
            if (typeof localStorage !== 'undefined') {
                const lang = localStorage.getItem('i18nextLng');
                if (lang) {
                    return (lang === 'zh-TW' || lang === 'zh') ? 'zh-TW' : 'en';
                }
            }
            
            // 嘗試從 URL 路徑檢測
            if (typeof window !== 'undefined' && window.location) {
                const pathLang = window.location.pathname.split('/')[1];
                if (pathLang === 'zh-TW' || pathLang === 'zh') {
                    return 'zh-TW';
                } else if (pathLang === 'en') {
                    return 'en';
                }
            }
            
            // 默認返回英文
            return 'en';
        };
        
        // 處理特殊的錯誤類型，需要參數替換
        if (error.data) {
            // 檢查錯誤詳細信息的多個可能位置
            const details = error.data.details || error.data;
            const errors = error.data.errors || [];
            const primaryError = errors[0];
            
            // 從 primaryError 中提取具體的錯誤詳情
            let errorDetails = null;
            if (primaryError) {
                errorDetails = primaryError;
            } else if (details) {
                errorDetails = details;
            }
            
            switch (errorCode) {
                case 'PLAN_NOT_ELIGIBLE':
                    // 嘗試從多個位置獲取方案名稱
                    let eligiblePlanNames = null;
                    
                    const eligiblePlans = primaryError?.details?.eligiblePlans || details.eligiblePlans;
                    if (Array.isArray(eligiblePlans) && eligiblePlans.length) {
                        const planNames = { free: t('subscription.plans.free'), pro: t('subscription.plans.pro'), ultra: 'Ultra' };
                        eligiblePlanNames = eligiblePlans.map(plan => planNames[plan] || plan).join(', ');
                    } else if (primaryError?.details?.eligiblePlanNames) {
                        eligiblePlanNames = primaryError.details.eligiblePlanNames;
                    } else if (details.eligiblePlanNames) {
                        eligiblePlanNames = details.eligiblePlanNames;
                    }
                    
                    if (eligiblePlanNames) {
                        return t('redemption.errors.plan_not_eligible', { 
                            eligiblePlans: eligiblePlanNames 
                        });
                    }
                    return t('redemption.errors.plan_not_eligible_generic');
                    
                case 'CODE_EXPIRED':
                    // 檢查多個可能的位置
                    const expiryDate = errorDetails?.expiresAt || errorDetails?.expiryDate || details.expiresAt;
                    if (expiryDate) {
                        const locale = getCurrentLanguage();
                        const formattedDate = formatDate(expiryDate, 'PPP', locale);
                        return t('redemption.errors.code_expired', { 
                            expiryDate: formattedDate 
                        });
                    }
                    break;
                    
                case 'CODE_NOT_ACTIVE':
                    // 檢查多個可能的位置
                    const activationDate = errorDetails?.activationDate || errorDetails?.activatesAt || details.activationDate;
                    if (activationDate) {
                        const locale = getCurrentLanguage();
                        const formattedDate = formatDate(activationDate, 'PPP', locale);
                        return t('redemption.errors.code_not_active', { 
                            activationDate: formattedDate 
                        });
                    }
                    break;
                    
                case 'RATE_LIMITED':
                    const retryAfter = errorDetails?.retryAfter || details.retryAfter;
                    if (retryAfter) {
                        return t('redemption.errors.rate_limited', { 
                            retryAfter: retryAfter 
                        });
                    }
                    break;
            }
        }
        
        // 嘗試獲取翻譯信息
        const translationKey = `redemption.errors.${errorCode.toLowerCase()}`;
        const translatedMessage = t(translationKey);
        
        // 如果找到翻譯，使用翻譯
        if (translationKey !== translatedMessage) {
            return translatedMessage;
        }
        
        // 最後的備用信息
        return t('redemption.errors.unknown');
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
            // PAYMENT_METHOD_REQUIRED is no longer treated as an error
            // Payment method requirement is handled during checkout flow
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
        
        // Retry on server errors and timeout, but NOT on rate limiting
        // 429 (rate limited) should not be retried as it makes the problem worse
        return status >= 500 || status === 408;
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
