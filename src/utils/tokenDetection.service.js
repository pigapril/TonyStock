/**
 * Unified Token Detection Service
 * 
 * Provides comprehensive token detection across multiple sources to solve
 * HttpOnly cookie detection issues in admin permissions system.
 * 
 * Features:
 * - Multiple token source support (cookies, localStorage, sessionStorage, authService)
 * - Comprehensive debug logging
 * - Fallback mechanisms for HttpOnly cookies
 * - Integration with existing authentication systems
 * 
 * @author SentimentInsideOut Team
 * @version 1.0.0
 */

/**
 * Base class for token sources
 * Defines the interface that all token sources must implement
 */
class TokenSource {
    constructor(name) {
        this.name = name;
    }

    /**
     * Get tokens from this source
     * @returns {object} Object containing accessToken, refreshToken, and userData
     */
    getTokens() {
        throw new Error('getTokens must be implemented by subclass');
    }

    /**
     * Check if this source is available/accessible
     * @returns {boolean} True if source is available
     */
    isAvailable() {
        return true;
    }
}

/**
 * Cookie-based token source
 * Attempts to read tokens from document.cookie (won't work for HttpOnly cookies)
 */
class CookieTokenSource extends TokenSource {
    constructor() {
        super('cookies');
    }

    getTokens() {
        try {
            const result = {
                accessToken: this.getCookie('accessToken'),
                refreshToken: this.getCookie('refreshToken'),
                userData: this.getCookie('userData') || this.getCookie('user')
            };

            console.log('CookieTokenSource: Detection result:', {
                hasAccessToken: !!result.accessToken,
                hasRefreshToken: !!result.refreshToken,
                hasUserData: !!result.userData,
                cookieString: document.cookie ? `${document.cookie.length} chars` : 'empty',
                allCookies: this.getAllCookieNames()
            });

            return result;
        } catch (error) {
            console.error('CookieTokenSource: Error reading cookies:', error);
            return {};
        }
    }

    getCookie(name) {
        try {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) {
                const cookieValue = parts.pop().split(';').shift();
                console.log(`CookieTokenSource: Found cookie ${name}:`, cookieValue ? 'present' : 'empty');
                return cookieValue || null;
            }
            return null;
        } catch (error) {
            console.error(`CookieTokenSource: Error reading cookie ${name}:`, error);
            return null;
        }
    }

    getAllCookieNames() {
        try {
            if (!document.cookie) return [];
            return document.cookie
                .split(';')
                .map(cookie => cookie.trim().split('=')[0])
                .filter(name => name);
        } catch (error) {
            console.error('CookieTokenSource: Error getting cookie names:', error);
            return [];
        }
    }

    isAvailable() {
        return typeof document !== 'undefined' && typeof document.cookie === 'string';
    }
}

/**
 * LocalStorage-based token source
 * Reads tokens from localStorage
 */
class LocalStorageTokenSource extends TokenSource {
    constructor() {
        super('localStorage');
    }

    getTokens() {
        try {
            const result = {
                accessToken: this.getItem('accessToken') || this.getItem('token'),
                refreshToken: this.getItem('refreshToken'),
                userData: this.getItem('userData') || this.getItem('user')
            };

            // Try to parse userData if it's a JSON string
            if (result.userData && typeof result.userData === 'string') {
                try {
                    result.userData = JSON.parse(result.userData);
                } catch (e) {
                    // Keep as string if not valid JSON
                }
            }

            console.log('LocalStorageTokenSource: Detection result:', {
                hasAccessToken: !!result.accessToken,
                hasRefreshToken: !!result.refreshToken,
                hasUserData: !!result.userData,
                storageKeys: this.getAllKeys()
            });

            return result;
        } catch (error) {
            console.error('LocalStorageTokenSource: Error reading localStorage:', error);
            return {};
        }
    }

    getItem(key) {
        try {
            const value = localStorage.getItem(key);
            if (value) {
                console.log(`LocalStorageTokenSource: Found ${key}:`, value ? 'present' : 'empty');
            }
            return value;
        } catch (error) {
            console.error(`LocalStorageTokenSource: Error reading ${key}:`, error);
            return null;
        }
    }

    getAllKeys() {
        try {
            return Object.keys(localStorage);
        } catch (error) {
            console.error('LocalStorageTokenSource: Error getting keys:', error);
            return [];
        }
    }

    isAvailable() {
        try {
            return typeof localStorage !== 'undefined' && localStorage !== null;
        } catch (error) {
            return false;
        }
    }
}

/**
 * SessionStorage-based token source
 * Reads tokens from sessionStorage
 */
class SessionStorageTokenSource extends TokenSource {
    constructor() {
        super('sessionStorage');
    }

    getTokens() {
        try {
            const result = {
                accessToken: this.getItem('accessToken') || this.getItem('token'),
                refreshToken: this.getItem('refreshToken'),
                userData: this.getItem('userData') || this.getItem('user')
            };

            // Try to parse userData if it's a JSON string
            if (result.userData && typeof result.userData === 'string') {
                try {
                    result.userData = JSON.parse(result.userData);
                } catch (e) {
                    // Keep as string if not valid JSON
                }
            }

            console.log('SessionStorageTokenSource: Detection result:', {
                hasAccessToken: !!result.accessToken,
                hasRefreshToken: !!result.refreshToken,
                hasUserData: !!result.userData,
                storageKeys: this.getAllKeys()
            });

            return result;
        } catch (error) {
            console.error('SessionStorageTokenSource: Error reading sessionStorage:', error);
            return {};
        }
    }

    getItem(key) {
        try {
            const value = sessionStorage.getItem(key);
            if (value) {
                console.log(`SessionStorageTokenSource: Found ${key}:`, value ? 'present' : 'empty');
            }
            return value;
        } catch (error) {
            console.error(`SessionStorageTokenSource: Error reading ${key}:`, error);
            return null;
        }
    }

    getAllKeys() {
        try {
            return Object.keys(sessionStorage);
        } catch (error) {
            console.error('SessionStorageTokenSource: Error getting keys:', error);
            return [];
        }
    }

    isAvailable() {
        try {
            return typeof sessionStorage !== 'undefined' && sessionStorage !== null;
        } catch (error) {
            return false;
        }
    }
}

/**
 * AuthService-based token source
 * Integrates with existing auth service to get tokens
 */
class AuthServiceTokenSource extends TokenSource {
    constructor() {
        super('authService');
        this.authService = null;
        this.initializeAuthService();
    }

    async initializeAuthService() {
        try {
            // Try to import the auth service dynamically
            const authServiceModule = await import('../components/Auth/auth.service.js');
            this.authService = authServiceModule.default;
            console.log('AuthServiceTokenSource: Successfully initialized auth service');
        } catch (error) {
            console.warn('AuthServiceTokenSource: Failed to initialize auth service:', error);
        }
    }

    getTokens() {
        try {
            // Try multiple ways to get the auth service instance
            const authService = this.getAuthServiceInstance();
            
            if (!authService) {
                console.log('AuthServiceTokenSource: No auth service available');
                return {};
            }

            const result = {
                accessToken: this.getTokenFromService(authService, 'getAccessToken'),
                refreshToken: this.getTokenFromService(authService, 'getRefreshToken'),
                userData: this.getTokenFromService(authService, 'getCurrentUser')
            };

            console.log('AuthServiceTokenSource: Detection result:', {
                hasAccessToken: !!result.accessToken,
                hasRefreshToken: !!result.refreshToken,
                hasUserData: !!result.userData,
                authServiceAvailable: !!authService,
                authServiceMethods: this.getAvailableMethods(authService)
            });

            return result;
        } catch (error) {
            console.error('AuthServiceTokenSource: Error getting tokens from auth service:', error);
            return {};
        }
    }

    getAuthServiceInstance() {
        // Try multiple ways to get auth service
        if (this.authService) {
            return this.authService;
        }

        // Try global window object
        if (typeof window !== 'undefined' && window.authService) {
            return window.authService;
        }

        // Try to find it in common locations
        if (typeof window !== 'undefined' && window.app && window.app.authService) {
            return window.app.authService;
        }

        return null;
    }

    getTokenFromService(authService, methodName) {
        try {
            if (typeof authService[methodName] === 'function') {
                const result = authService[methodName]();
                console.log(`AuthServiceTokenSource: ${methodName} returned:`, result ? 'present' : 'empty');
                return result;
            } else {
                console.log(`AuthServiceTokenSource: Method ${methodName} not available`);
                return null;
            }
        } catch (error) {
            console.error(`AuthServiceTokenSource: Error calling ${methodName}:`, error);
            return null;
        }
    }

    getAvailableMethods(authService) {
        if (!authService) return [];
        
        const methods = [];
        const checkMethods = ['getAccessToken', 'getRefreshToken', 'getCurrentUser', 'checkStatus'];
        
        checkMethods.forEach(method => {
            if (typeof authService[method] === 'function') {
                methods.push(method);
            }
        });
        
        return methods;
    }

    isAvailable() {
        return !!this.getAuthServiceInstance();
    }
}

/**
 * API-based token source for HttpOnly cookie detection
 * Calls backend session-status endpoint to detect HttpOnly cookies
 */
class ApiTokenSource extends TokenSource {
    constructor() {
        super('api');
        this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        this.endpoint = '/api/auth/session-status';
        this.timeout = 5000; // 5 second timeout
        this.retryAttempts = 2;
        this.retryDelay = 1000; // 1 second
    }

    async getTokens() {
        try {
            console.log('ApiTokenSource: Starting HttpOnly cookie detection via API');
            
            const result = await this.callSessionStatusWithRetry();
            
            if (result.success && result.data) {
                const tokens = {
                    accessToken: result.data.hasAccessToken ? 'detected-via-api' : null,
                    refreshToken: result.data.hasRefreshToken ? 'detected-via-api' : null,
                    userData: result.data.hasUserData ? { 
                        isAuthenticated: result.data.isAuthenticated,
                        isAdmin: result.data.isAdmin 
                    } : null
                };

                console.log('ApiTokenSource: HttpOnly cookie detection result:', {
                    hasAccessToken: !!tokens.accessToken,
                    hasRefreshToken: !!tokens.refreshToken,
                    hasUserData: !!tokens.userData,
                    isAuthenticated: result.data.isAuthenticated,
                    isAdmin: result.data.isAdmin,
                    sessionValid: result.data.sessionValid,
                    checkDuration: result.data.checkDuration
                });

                return tokens;
            } else {
                console.log('ApiTokenSource: Session status API returned no valid session');
                return {};
            }
        } catch (error) {
            console.error('ApiTokenSource: Error detecting HttpOnly cookies via API:', error);
            return {};
        }
    }

    async callSessionStatusWithRetry() {
        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                console.log(`ApiTokenSource: Attempt ${attempt}/${this.retryAttempts} to call session-status API`);
                
                const result = await this.callSessionStatus();
                
                if (result.success) {
                    console.log(`ApiTokenSource: Session status API call successful on attempt ${attempt}`);
                    return result;
                }
                
                lastError = new Error(`API call failed: ${result.error}`);
                
            } catch (error) {
                lastError = error;
                console.warn(`ApiTokenSource: Attempt ${attempt} failed:`, error.message);
                
                // Wait before retry (except for last attempt)
                if (attempt < this.retryAttempts) {
                    await this.delay(this.retryDelay * attempt); // Exponential backoff
                }
            }
        }
        
        throw lastError;
    }

    async callSessionStatus() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(`${this.baseUrl}${this.endpoint}`, {
                method: 'GET',
                credentials: 'include', // Important: Include HttpOnly cookies
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.status === 'success') {
                return {
                    success: true,
                    data: data.data
                };
            } else {
                return {
                    success: false,
                    error: data.message || 'API returned error status'
                };
            }
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error(`API call timeout after ${this.timeout}ms`);
            }
            
            throw error;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isAvailable() {
        // API source is available if we have fetch and are in a browser environment
        return typeof fetch !== 'undefined' && typeof window !== 'undefined';
    }
}

/**
 * Session result cache for avoiding excessive API calls
 */
class SessionCache {
    constructor(ttlSeconds = 60) {
        this.cache = new Map();
        this.ttl = ttlSeconds * 1000; // Convert to milliseconds
        this.debugMode = process.env.NODE_ENV === 'development';
        
        console.log(`SessionCache: Initialized with TTL of ${ttlSeconds} seconds`);
    }

    set(key, value) {
        const entry = {
            value,
            timestamp: Date.now(),
            expiresAt: Date.now() + this.ttl
        };
        
        this.cache.set(key, entry);
        
        if (this.debugMode) {
            console.log(`SessionCache: Cached result for key "${key}"`, {
                expiresAt: new Date(entry.expiresAt).toISOString(),
                ttlSeconds: this.ttl / 1000
            });
        }
    }

    get(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            if (this.debugMode) {
                console.log(`SessionCache: Cache miss for key "${key}"`);
            }
            return null;
        }

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            if (this.debugMode) {
                console.log(`SessionCache: Cache expired for key "${key}"`);
            }
            return null;
        }

        if (this.debugMode) {
            const remainingTtl = Math.round((entry.expiresAt - Date.now()) / 1000);
            console.log(`SessionCache: Cache hit for key "${key}"`, {
                remainingTtlSeconds: remainingTtl
            });
        }

        return entry.value;
    }

    invalidate(key) {
        const deleted = this.cache.delete(key);
        if (this.debugMode) {
            console.log(`SessionCache: Invalidated key "${key}"`, { found: deleted });
        }
        return deleted;
    }

    clear() {
        const size = this.cache.size;
        this.cache.clear();
        if (this.debugMode) {
            console.log(`SessionCache: Cleared all cache entries`, { clearedCount: size });
        }
    }

    getStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                expiredEntries++;
            } else {
                validEntries++;
            }
        }

        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries,
            ttlMs: this.ttl
        };
    }

    cleanup() {
        const now = Date.now();
        const keysToDelete = [];

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));

        if (this.debugMode && keysToDelete.length > 0) {
            console.log(`SessionCache: Cleaned up ${keysToDelete.length} expired entries`);
        }

        return keysToDelete.length;
    }
}

/**
 * Main Token Detection Service
 * Coordinates multiple token sources to provide unified token detection
 */
class TokenDetectionService {
    constructor() {
        // Initialize API source first for HttpOnly cookie detection
        this.apiSource = new ApiTokenSource();
        
        this.tokenSources = [
            this.apiSource, // API source first for HttpOnly cookies
            new CookieTokenSource(),
            new LocalStorageTokenSource(),
            new SessionStorageTokenSource(),
            new AuthServiceTokenSource()
        ];
        
        // Initialize session cache
        this.sessionCache = new SessionCache(60); // 60 seconds TTL
        
        // Debug configuration
        this.debugMode = process.env.NODE_ENV === 'development';
        this.detectionHistory = [];
        this.maxHistorySize = 10;
        
        // Cache cleanup interval (every 5 minutes)
        this.cleanupInterval = setInterval(() => {
            this.sessionCache.cleanup();
        }, 5 * 60 * 1000);
        
        console.log('TokenDetectionService: Initialized with sources:', 
            this.tokenSources.map(source => source.name));
        console.log('TokenDetectionService: Session cache enabled with 60s TTL');
    }

    /**
     * Detect tokens from all available sources with caching support
     * @param {boolean} useCache - Whether to use cached results (default: true)
     * @returns {object} Comprehensive token detection result
     */
    async detectTokens(useCache = true) {
        const startTime = Date.now();
        const cacheKey = 'token-detection-result';
        
        // Check cache first if enabled
        if (useCache) {
            const cachedResult = this.sessionCache.get(cacheKey);
            if (cachedResult) {
                console.log('TokenDetectionService: Returning cached result');
                return {
                    ...cachedResult,
                    fromCache: true,
                    cacheHit: true
                };
            }
        }
        
        const result = {
            hasAccessToken: false,
            hasRefreshToken: false,
            hasUserData: false,
            tokenSources: {},
            debugInfo: {},
            detectionTimestamp: new Date().toISOString(),
            detectionDuration: 0,
            fromCache: false,
            cacheHit: false
        };

        console.log('TokenDetectionService: Starting fresh token detection across all sources');

        // Try API source first for HttpOnly cookie detection
        await this.tryApiSource(result);
        
        // If API source didn't provide all tokens, try other sources
        if (!this.hasAllTokens(result)) {
            await this.tryFallbackSources(result);
        }

        result.detectionDuration = Date.now() - startTime;
        result.isValid = result.hasAccessToken && result.hasRefreshToken && result.hasUserData;

        // Cache the result if it's valid or if we have some tokens
        if (result.isValid || result.hasAccessToken || result.hasRefreshToken) {
            this.sessionCache.set(cacheKey, result);
        }

        // Add to detection history
        this.addToHistory(result);

        console.log('TokenDetectionService: Detection complete:', {
            hasAccessToken: result.hasAccessToken,
            hasRefreshToken: result.hasRefreshToken,
            hasUserData: result.hasUserData,
            isValid: result.isValid,
            sources: result.tokenSources,
            duration: result.detectionDuration + 'ms',
            fromCache: result.fromCache
        });

        return result;
    }

    /**
     * Try API source for HttpOnly cookie detection
     * @param {object} result - Detection result object to update
     */
    async tryApiSource(result) {
        try {
            if (!this.apiSource.isAvailable()) {
                console.log('TokenDetectionService: API source not available');
                result.debugInfo.api = { available: false, error: 'API source not available' };
                return;
            }

            console.log('TokenDetectionService: Trying API source for HttpOnly cookie detection');
            const tokens = await this.apiSource.getTokens();
            
            result.debugInfo.api = {
                available: true,
                tokens: {
                    hasAccessToken: !!tokens.accessToken,
                    hasRefreshToken: !!tokens.refreshToken,
                    hasUserData: !!tokens.userData
                },
                rawTokens: this.debugMode ? tokens : undefined
            };

            // Update main result if tokens are found
            if (tokens.accessToken && !result.hasAccessToken) {
                result.hasAccessToken = true;
                result.tokenSources.accessToken = 'api';
            }
            
            if (tokens.refreshToken && !result.hasRefreshToken) {
                result.hasRefreshToken = true;
                result.tokenSources.refreshToken = 'api';
            }
            
            if (tokens.userData && !result.hasUserData) {
                result.hasUserData = true;
                result.tokenSources.userData = 'api';
            }

        } catch (error) {
            console.error('TokenDetectionService: Error with API source:', error);
            result.debugInfo.api = {
                available: false,
                error: error.message
            };
        }
    }

    /**
     * Try fallback sources for token detection
     * @param {object} result - Detection result object to update
     */
    async tryFallbackSources(result) {
        console.log('TokenDetectionService: Trying fallback sources for missing tokens');
        
        // Skip API source since we already tried it
        const fallbackSources = this.tokenSources.filter(source => source.name !== 'api');
        
        for (const source of fallbackSources) {
            try {
                if (!source.isAvailable()) {
                    console.log(`TokenDetectionService: Source ${source.name} is not available`);
                    result.debugInfo[source.name] = { available: false, error: 'Source not available' };
                    continue;
                }

                const tokens = source.getTokens();
                result.debugInfo[source.name] = {
                    available: true,
                    tokens: {
                        hasAccessToken: !!tokens.accessToken,
                        hasRefreshToken: !!tokens.refreshToken,
                        hasUserData: !!tokens.userData
                    },
                    rawTokens: this.debugMode ? tokens : undefined
                };

                // Update main result if tokens are found and not already set
                if (tokens.accessToken && !result.hasAccessToken) {
                    result.hasAccessToken = true;
                    result.tokenSources.accessToken = source.name;
                }
                
                if (tokens.refreshToken && !result.hasRefreshToken) {
                    result.hasRefreshToken = true;
                    result.tokenSources.refreshToken = source.name;
                }
                
                if (tokens.userData && !result.hasUserData) {
                    result.hasUserData = true;
                    result.tokenSources.userData = source.name;
                }

                // Break early if we have all tokens
                if (this.hasAllTokens(result)) {
                    console.log(`TokenDetectionService: All tokens found, stopping at source ${source.name}`);
                    break;
                }

            } catch (error) {
                console.error(`TokenDetectionService: Error with source ${source.name}:`, error);
                result.debugInfo[source.name] = {
                    available: false,
                    error: error.message
                };
            }
        }
    }

    /**
     * Check if result has all required tokens
     * @param {object} result - Detection result to check
     * @returns {boolean} True if all tokens are present
     */
    hasAllTokens(result) {
        return result.hasAccessToken && result.hasRefreshToken && result.hasUserData;
    }

    /**
     * Invalidate session cache on authentication state changes
     * @param {string} reason - Reason for cache invalidation
     */
    invalidateCache(reason = 'manual') {
        console.log(`TokenDetectionService: Invalidating cache - ${reason}`);
        this.sessionCache.clear();
        
        // Also clear detection history to force fresh detection
        this.clearHistory();
    }

    /**
     * Get cache statistics and debugging information
     * @returns {object} Cache statistics
     */
    getCacheStats() {
        return {
            ...this.sessionCache.getStats(),
            detectionHistory: this.detectionHistory.length,
            maxHistorySize: this.maxHistorySize
        };
    }

    /**
     * Get detailed debug information about token detection
     * @returns {object} Comprehensive debug information
     */
    getDebugInfo() {
        return {
            sources: this.tokenSources.map(source => ({
                name: source.name,
                available: source.isAvailable(),
                type: source.constructor.name
            })),
            cache: this.getCacheStats(),
            history: this.detectionHistory,
            environment: {
                nodeEnv: process.env.NODE_ENV,
                debugMode: this.debugMode,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
                url: typeof window !== 'undefined' ? window.location.href : 'unknown'
            }
        };
    }

    /**
     * Add detection result to history for debugging
     * @param {object} result - Detection result to add to history
     */
    addToHistory(result) {
        // Create a simplified version for history
        const historyEntry = {
            timestamp: result.detectionTimestamp,
            hasAccessToken: result.hasAccessToken,
            hasRefreshToken: result.hasRefreshToken,
            hasUserData: result.hasUserData,
            isValid: result.isValid,
            sources: result.tokenSources,
            duration: result.detectionDuration
        };

        this.detectionHistory.unshift(historyEntry);
        
        // Keep only the most recent entries
        if (this.detectionHistory.length > this.maxHistorySize) {
            this.detectionHistory = this.detectionHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * Clear detection history
     */
    clearHistory() {
        this.detectionHistory = [];
        console.log('TokenDetectionService: Detection history cleared');
    }

    /**
     * Get the most recent detection result from history
     * @returns {object|null} Most recent detection result or null if no history
     */
    getLastDetectionResult() {
        return this.detectionHistory.length > 0 ? this.detectionHistory[0] : null;
    }

    /**
     * Check if tokens were detected in the last detection
     * @returns {boolean} True if last detection found valid tokens
     */
    hasValidTokensFromLastDetection() {
        const lastResult = this.getLastDetectionResult();
        return lastResult ? lastResult.isValid : false;
    }

    /**
     * Get statistics about token detection performance
     * @returns {object} Detection statistics
     */
    getDetectionStats() {
        if (this.detectionHistory.length === 0) {
            return {
                totalDetections: 0,
                averageDuration: 0,
                successRate: 0,
                mostRecentDuration: 0,
                cacheHitRate: 0
            };
        }

        const totalDetections = this.detectionHistory.length;
        const successfulDetections = this.detectionHistory.filter(entry => entry.isValid).length;
        const cachedDetections = this.detectionHistory.filter(entry => entry.fromCache).length;
        const totalDuration = this.detectionHistory.reduce((sum, entry) => sum + entry.duration, 0);
        
        return {
            totalDetections,
            successfulDetections,
            cachedDetections,
            successRate: (successfulDetections / totalDetections) * 100,
            cacheHitRate: (cachedDetections / totalDetections) * 100,
            averageDuration: totalDuration / totalDetections,
            mostRecentDuration: this.detectionHistory[0].duration
        };
    }

    /**
     * Cleanup resources and intervals
     */
    cleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        this.sessionCache.clear();
        this.clearHistory();
        
        console.log('TokenDetectionService: Cleanup completed');
    }
}

// Export the service and token source classes
export default TokenDetectionService;
export {
    TokenSource,
    CookieTokenSource,
    LocalStorageTokenSource,
    SessionStorageTokenSource,
    AuthServiceTokenSource,
    ApiTokenSource,
    SessionCache
};