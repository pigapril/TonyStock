/**
 * Unit Tests for Token Detection Service
 * 
 * Tests all token sources and the main service functionality
 * Verifies comprehensive debug logging and error handling
 */

import TokenDetectionService, {
    TokenSource,
    CookieTokenSource,
    LocalStorageTokenSource,
    SessionStorageTokenSource,
    AuthServiceTokenSource,
    ApiTokenSource,
    SessionCache
} from '../tokenDetection.service.js';

// Mock console methods to capture debug logs
const mockConsole = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Store original console methods
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn
};

describe('TokenDetectionService', () => {
    let tokenDetectionService;

    beforeEach(() => {
        // Replace console methods with mocks
        console.log = mockConsole.log;
        console.error = mockConsole.error;
        console.warn = mockConsole.warn;

        // Clear all mocks
        jest.clearAllMocks();
        
        // Clear localStorage and sessionStorage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear cookies safely
        try {
            const cookies = document.cookie.split(";");
            cookies.forEach(function(c) { 
                const eqPos = c.indexOf("=");
                const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
                if (name) {
                    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
                }
            });
        } catch (error) {
            // Ignore cookie clearing errors in test environment
        }

        // Mock fetch for API tests
        global.fetch = jest.fn();

        tokenDetectionService = new TokenDetectionService();
    });

    afterAll(() => {
        // Cleanup service resources
        if (tokenDetectionService) {
            tokenDetectionService.cleanup();
        }
    });

    afterEach(() => {
        // Restore original console methods
        console.log = originalConsole.log;
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;
    });

    describe('TokenSource Base Class', () => {
        test('should throw error when getTokens is not implemented', () => {
            const tokenSource = new TokenSource('test');
            expect(() => tokenSource.getTokens()).toThrow('getTokens must be implemented by subclass');
        });

        test('should have correct name and default availability', () => {
            const tokenSource = new TokenSource('test');
            expect(tokenSource.name).toBe('test');
            expect(tokenSource.isAvailable()).toBe(true);
        });
    });

    describe('CookieTokenSource', () => {
        let cookieSource;

        beforeEach(() => {
            cookieSource = new CookieTokenSource();
        });

        test('should be available when document.cookie exists', () => {
            expect(cookieSource.isAvailable()).toBe(true);
        });

        test('should detect tokens from cookies', () => {
            // Set test cookies
            document.cookie = 'accessToken=test-access-token';
            document.cookie = 'refreshToken=test-refresh-token';
            document.cookie = 'userData=test-user-data';

            const tokens = cookieSource.getTokens();

            expect(tokens.accessToken).toBe('test-access-token');
            expect(tokens.refreshToken).toBe('test-refresh-token');
            expect(tokens.userData).toBe('test-user-data');
        });

        test('should return null for non-existent cookies', () => {
            const tokens = cookieSource.getTokens();

            expect(tokens.accessToken).toBeNull();
            expect(tokens.refreshToken).toBeNull();
            expect(tokens.userData).toBeNull();
        });

        test('should handle cookie parsing errors gracefully', () => {
            // Mock document.cookie to throw an error
            Object.defineProperty(document, 'cookie', {
                get: () => {
                    throw new Error('Cookie access denied');
                },
                configurable: true
            });

            const tokens = cookieSource.getTokens();

            expect(tokens).toEqual({});
            expect(mockConsole.error).toHaveBeenCalledWith(
                'CookieTokenSource: Error reading cookies:',
                expect.any(Error)
            );
        });

        test('should log comprehensive debug information', () => {
            document.cookie = 'accessToken=test-token';
            
            cookieSource.getTokens();

            expect(mockConsole.log).toHaveBeenCalledWith(
                'CookieTokenSource: Detection result:',
                expect.objectContaining({
                    hasAccessToken: true,
                    hasRefreshToken: false,
                    hasUserData: false
                })
            );
        });

        test('should get all cookie names for debugging', () => {
            document.cookie = 'accessToken=test1';
            document.cookie = 'refreshToken=test2';
            document.cookie = 'otherCookie=test3';

            const cookieNames = cookieSource.getAllCookieNames();

            expect(cookieNames).toContain('accessToken');
            expect(cookieNames).toContain('refreshToken');
            expect(cookieNames).toContain('otherCookie');
        });
    });

    describe('LocalStorageTokenSource', () => {
        let localStorageSource;

        beforeEach(() => {
            localStorageSource = new LocalStorageTokenSource();
        });

        test('should be available when localStorage exists', () => {
            expect(localStorageSource.isAvailable()).toBe(true);
        });

        test('should detect tokens from localStorage', () => {
            localStorage.setItem('accessToken', 'test-access-token');
            localStorage.setItem('refreshToken', 'test-refresh-token');
            localStorage.setItem('userData', JSON.stringify({ id: 1, name: 'Test User' }));

            const tokens = localStorageSource.getTokens();

            expect(tokens.accessToken).toBe('test-access-token');
            expect(tokens.refreshToken).toBe('test-refresh-token');
            expect(tokens.userData).toEqual({ id: 1, name: 'Test User' });
        });

        test('should handle alternative token key names', () => {
            localStorage.setItem('token', 'test-token');
            localStorage.setItem('user', 'test-user');

            const tokens = localStorageSource.getTokens();

            expect(tokens.accessToken).toBe('test-token');
            expect(tokens.userData).toBe('test-user');
        });

        test('should handle JSON parsing errors gracefully', () => {
            localStorage.setItem('userData', 'invalid-json{');

            const tokens = localStorageSource.getTokens();

            expect(tokens.userData).toBe('invalid-json{'); // Should keep as string
        });

        test('should handle localStorage access errors', () => {
            // Mock localStorage to throw an error
            const mockGetItem = jest.fn(() => {
                throw new Error('localStorage access denied');
            });
            
            Object.defineProperty(window, 'localStorage', {
                value: { getItem: mockGetItem },
                configurable: true
            });

            const tokens = localStorageSource.getTokens();

            expect(tokens).toEqual({});
            expect(mockConsole.error).toHaveBeenCalledWith(
                'LocalStorageTokenSource: Error reading localStorage:',
                expect.any(Error)
            );
        });

        test('should log comprehensive debug information', () => {
            localStorage.setItem('accessToken', 'test-token');
            
            localStorageSource.getTokens();

            expect(mockConsole.log).toHaveBeenCalledWith(
                'LocalStorageTokenSource: Detection result:',
                expect.objectContaining({
                    hasAccessToken: true,
                    hasRefreshToken: false,
                    hasUserData: false
                })
            );
        });
    });

    describe('SessionStorageTokenSource', () => {
        let sessionStorageSource;

        beforeEach(() => {
            sessionStorageSource = new SessionStorageTokenSource();
        });

        test('should be available when sessionStorage exists', () => {
            expect(sessionStorageSource.isAvailable()).toBe(true);
        });

        test('should detect tokens from sessionStorage', () => {
            sessionStorage.setItem('accessToken', 'test-access-token');
            sessionStorage.setItem('refreshToken', 'test-refresh-token');
            sessionStorage.setItem('userData', JSON.stringify({ id: 1, name: 'Test User' }));

            const tokens = sessionStorageSource.getTokens();

            expect(tokens.accessToken).toBe('test-access-token');
            expect(tokens.refreshToken).toBe('test-refresh-token');
            expect(tokens.userData).toEqual({ id: 1, name: 'Test User' });
        });

        test('should handle alternative token key names', () => {
            sessionStorage.setItem('token', 'test-token');
            sessionStorage.setItem('user', 'test-user');

            const tokens = sessionStorageSource.getTokens();

            expect(tokens.accessToken).toBe('test-token');
            expect(tokens.userData).toBe('test-user');
        });

        test('should handle sessionStorage access errors', () => {
            // Mock sessionStorage to throw an error
            const mockGetItem = jest.fn(() => {
                throw new Error('sessionStorage access denied');
            });
            
            Object.defineProperty(window, 'sessionStorage', {
                value: { getItem: mockGetItem },
                configurable: true
            });

            const tokens = sessionStorageSource.getTokens();

            expect(tokens).toEqual({});
            expect(mockConsole.error).toHaveBeenCalledWith(
                'SessionStorageTokenSource: Error reading sessionStorage:',
                expect.any(Error)
            );
        });
    });

    describe('AuthServiceTokenSource', () => {
        let authServiceSource;

        beforeEach(() => {
            authServiceSource = new AuthServiceTokenSource();
        });

        test('should handle missing auth service gracefully', () => {
            const tokens = authServiceSource.getTokens();

            expect(tokens).toEqual({});
            expect(mockConsole.log).toHaveBeenCalledWith(
                'AuthServiceTokenSource: No auth service available'
            );
        });

        test('should detect tokens from window.authService', () => {
            // Mock auth service on window
            window.authService = {
                getAccessToken: () => 'test-access-token',
                getRefreshToken: () => 'test-refresh-token',
                getCurrentUser: () => ({ id: 1, name: 'Test User' })
            };

            const tokens = authServiceSource.getTokens();

            expect(tokens.accessToken).toBe('test-access-token');
            expect(tokens.refreshToken).toBe('test-refresh-token');
            expect(tokens.userData).toEqual({ id: 1, name: 'Test User' });

            // Clean up
            delete window.authService;
        });

        test('should handle auth service method errors', () => {
            // Mock auth service with failing methods
            window.authService = {
                getAccessToken: () => {
                    throw new Error('Token access failed');
                },
                getRefreshToken: () => null,
                getCurrentUser: () => null
            };

            const tokens = authServiceSource.getTokens();

            expect(tokens.accessToken).toBeNull();
            expect(mockConsole.error).toHaveBeenCalledWith(
                'AuthServiceTokenSource: Error calling getAccessToken:',
                expect.any(Error)
            );

            // Clean up
            delete window.authService;
        });

        test('should check availability correctly', () => {
            expect(authServiceSource.isAvailable()).toBe(false);

            window.authService = {};
            expect(authServiceSource.isAvailable()).toBe(true);

            delete window.authService;
        });
    });

    describe('ApiTokenSource', () => {
        let apiSource;

        beforeEach(() => {
            apiSource = new ApiTokenSource();
            global.fetch = jest.fn();
        });

        test('should be available when fetch exists', () => {
            expect(apiSource.isAvailable()).toBe(true);
        });

        test('should detect tokens via API call', async () => {
            const mockResponse = {
                status: 'success',
                data: {
                    hasAccessToken: true,
                    hasRefreshToken: true,
                    hasUserData: true,
                    isAuthenticated: true,
                    isAdmin: false,
                    sessionValid: true
                }
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const tokens = await apiSource.getTokens();

            expect(tokens.accessToken).toBe('detected-via-api');
            expect(tokens.refreshToken).toBe('detected-via-api');
            expect(tokens.userData).toEqual({
                isAuthenticated: true,
                isAdmin: false
            });

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/auth/session-status',
                expect.objectContaining({
                    method: 'GET',
                    credentials: 'include'
                })
            );
        });

        test('should handle API errors gracefully', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const tokens = await apiSource.getTokens();

            expect(tokens).toEqual({});
            expect(mockConsole.error).toHaveBeenCalledWith(
                'ApiTokenSource: Error detecting HttpOnly cookies via API:',
                expect.any(Error)
            );
        });

        test('should retry on failure', async () => {
            global.fetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: { hasAccessToken: true, hasRefreshToken: false, hasUserData: false }
                    })
                });

            const tokens = await apiSource.getTokens();

            expect(tokens.accessToken).toBe('detected-via-api');
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        test('should handle timeout', async () => {
            // Mock a slow response
            global.fetch.mockImplementationOnce(() => 
                new Promise(resolve => setTimeout(resolve, 10000))
            );

            const tokens = await apiSource.getTokens();

            expect(tokens).toEqual({});
        });
    });

    describe('SessionCache', () => {
        let cache;

        beforeEach(() => {
            cache = new SessionCache(1); // 1 second TTL for testing
        });

        test('should store and retrieve values', () => {
            const testValue = { test: 'data' };
            cache.set('test-key', testValue);

            const retrieved = cache.get('test-key');
            expect(retrieved).toEqual(testValue);
        });

        test('should return null for non-existent keys', () => {
            const result = cache.get('non-existent');
            expect(result).toBeNull();
        });

        test('should expire values after TTL', async () => {
            cache.set('test-key', { test: 'data' });
            
            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            const result = cache.get('test-key');
            expect(result).toBeNull();
        });

        test('should invalidate specific keys', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            const deleted = cache.invalidate('key1');
            expect(deleted).toBe(true);
            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBe('value2');
        });

        test('should clear all entries', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            cache.clear();
            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBeNull();
        });

        test('should provide cache statistics', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            const stats = cache.getStats();
            expect(stats.totalEntries).toBe(2);
            expect(stats.validEntries).toBe(2);
            expect(stats.expiredEntries).toBe(0);
        });

        test('should cleanup expired entries', async () => {
            cache.set('key1', 'value1');
            
            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            const cleanedCount = cache.cleanup();
            expect(cleanedCount).toBe(1);
        });
    });

    describe('TokenDetectionService Main Functionality', () => {
        test('should initialize with all token sources including API', () => {
            expect(tokenDetectionService.tokenSources).toHaveLength(5);
            expect(tokenDetectionService.tokenSources[0]).toBeInstanceOf(ApiTokenSource);
            expect(tokenDetectionService.tokenSources[1]).toBeInstanceOf(CookieTokenSource);
            expect(tokenDetectionService.tokenSources[2]).toBeInstanceOf(LocalStorageTokenSource);
            expect(tokenDetectionService.tokenSources[3]).toBeInstanceOf(SessionStorageTokenSource);
            expect(tokenDetectionService.tokenSources[4]).toBeInstanceOf(AuthServiceTokenSource);
        });

        test('should detect tokens from multiple sources', async () => {
            // Mock API to return no tokens
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { hasAccessToken: false, hasRefreshToken: false, hasUserData: false }
                })
            });

            // Set tokens in different sources
            document.cookie = 'accessToken=cookie-access-token';
            localStorage.setItem('refreshToken', 'localStorage-refresh-token');
            sessionStorage.setItem('userData', JSON.stringify({ id: 1, name: 'Test User' }));

            const result = await tokenDetectionService.detectTokens();

            expect(result.hasAccessToken).toBe(true);
            expect(result.hasRefreshToken).toBe(true);
            expect(result.hasUserData).toBe(true);
            expect(result.isValid).toBe(true);
            expect(result.tokenSources.accessToken).toBe('cookies');
            expect(result.tokenSources.refreshToken).toBe('localStorage');
            expect(result.tokenSources.userData).toBe('sessionStorage');
        });

        test('should prioritize API source for HttpOnly cookie detection', async () => {
            // Mock API to return tokens (simulating HttpOnly cookies)
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { hasAccessToken: true, hasRefreshToken: true, hasUserData: true }
                })
            });

            // Set same token in other sources
            document.cookie = 'accessToken=cookie-token';
            localStorage.setItem('accessToken', 'localStorage-token');

            const result = await tokenDetectionService.detectTokens();

            expect(result.hasAccessToken).toBe(true);
            expect(result.tokenSources.accessToken).toBe('api'); // API source wins
        });

        test('should provide comprehensive debug information', async () => {
            // Mock API response
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { hasAccessToken: false, hasRefreshToken: false, hasUserData: false }
                })
            });

            const result = await tokenDetectionService.detectTokens();

            expect(result.debugInfo).toHaveProperty('api');
            expect(result.debugInfo).toHaveProperty('cookies');
            expect(result.debugInfo).toHaveProperty('localStorage');
            expect(result.debugInfo).toHaveProperty('sessionStorage');
            expect(result.debugInfo).toHaveProperty('authService');
            expect(result.detectionTimestamp).toBeDefined();
            expect(result.detectionDuration).toBeGreaterThanOrEqual(0);
            expect(result.fromCache).toBe(false);
        });

        test('should handle source errors gracefully', () => {
            // Mock a source to throw an error
            const originalGetTokens = tokenDetectionService.tokenSources[0].getTokens;
            tokenDetectionService.tokenSources[0].getTokens = () => {
                throw new Error('Source error');
            };

            const result = tokenDetectionService.detectTokens();

            expect(result.debugInfo.cookies).toHaveProperty('error', 'Source error');
            expect(result.debugInfo.cookies.available).toBe(false);

            // Restore original method
            tokenDetectionService.tokenSources[0].getTokens = originalGetTokens;
        });

        test('should use cache for subsequent calls', async () => {
            // Mock API response
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { hasAccessToken: true, hasRefreshToken: true, hasUserData: true }
                })
            });

            // First call should hit API
            const result1 = await tokenDetectionService.detectTokens();
            expect(result1.fromCache).toBe(false);
            expect(global.fetch).toHaveBeenCalledTimes(1);

            // Second call should use cache
            const result2 = await tokenDetectionService.detectTokens();
            expect(result2.fromCache).toBe(true);
            expect(result2.cacheHit).toBe(true);
            expect(global.fetch).toHaveBeenCalledTimes(1); // No additional API call
        });

        test('should invalidate cache when requested', async () => {
            // Mock API response
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { hasAccessToken: true, hasRefreshToken: true, hasUserData: true }
                })
            });

            // First call
            await tokenDetectionService.detectTokens();
            expect(global.fetch).toHaveBeenCalledTimes(1);

            // Invalidate cache
            tokenDetectionService.invalidateCache('test');

            // Next call should hit API again
            await tokenDetectionService.detectTokens();
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        test('should maintain detection history', async () => {
            // Mock API responses
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { hasAccessToken: false, hasRefreshToken: false, hasUserData: false }
                })
            });

            await tokenDetectionService.detectTokens(false); // Skip cache
            await tokenDetectionService.detectTokens(false); // Skip cache

            const history = tokenDetectionService.detectionHistory;
            expect(history).toHaveLength(2);
            expect(history[0]).toHaveProperty('timestamp');
            expect(history[0]).toHaveProperty('hasAccessToken');
            expect(history[0]).toHaveProperty('duration');
        });

        test('should limit history size', () => {
            // Generate more detections than max history size
            for (let i = 0; i < 15; i++) {
                tokenDetectionService.detectTokens();
            }

            expect(tokenDetectionService.detectionHistory.length).toBeLessThanOrEqual(10);
        });

        test('should provide detection statistics including cache metrics', async () => {
            // Mock API responses
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { hasAccessToken: true, hasRefreshToken: true, hasUserData: true }
                })
            });

            // First call (fresh)
            await tokenDetectionService.detectTokens();
            // Second call (cached)
            await tokenDetectionService.detectTokens();
            // Third call (skip cache, fresh)
            await tokenDetectionService.detectTokens(false);

            const stats = tokenDetectionService.getDetectionStats();
            expect(stats.totalDetections).toBe(3);
            expect(stats.successfulDetections).toBe(3);
            expect(stats.cachedDetections).toBe(1);
            expect(stats.successRate).toBe(100);
            expect(stats.cacheHitRate).toBeCloseTo(33.33, 1);
            expect(stats.averageDuration).toBeGreaterThan(0);
        });

        test('should clear history when requested', () => {
            tokenDetectionService.detectTokens();
            expect(tokenDetectionService.detectionHistory.length).toBe(1);

            tokenDetectionService.clearHistory();
            expect(tokenDetectionService.detectionHistory.length).toBe(0);
        });

        test('should provide comprehensive debug info including cache stats', () => {
            const debugInfo = tokenDetectionService.getDebugInfo();

            expect(debugInfo).toHaveProperty('sources');
            expect(debugInfo).toHaveProperty('cache');
            expect(debugInfo).toHaveProperty('history');
            expect(debugInfo).toHaveProperty('environment');
            expect(debugInfo.sources).toHaveLength(5); // Including API source
            expect(debugInfo.environment).toHaveProperty('nodeEnv');
            expect(debugInfo.environment).toHaveProperty('debugMode');
            expect(debugInfo.cache).toHaveProperty('totalEntries');
        });

        test('should log comprehensive debug information during detection', async () => {
            // Mock API response
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { hasAccessToken: false, hasRefreshToken: false, hasUserData: false }
                })
            });

            await tokenDetectionService.detectTokens();

            expect(mockConsole.log).toHaveBeenCalledWith(
                'TokenDetectionService: Initialized with sources:',
                ['api', 'cookies', 'localStorage', 'sessionStorage', 'authService']
            );

            expect(mockConsole.log).toHaveBeenCalledWith(
                'TokenDetectionService: Starting fresh token detection across all sources'
            );

            expect(mockConsole.log).toHaveBeenCalledWith(
                'TokenDetectionService: Detection complete:',
                expect.objectContaining({
                    hasAccessToken: expect.any(Boolean),
                    hasRefreshToken: expect.any(Boolean),
                    hasUserData: expect.any(Boolean),
                    isValid: expect.any(Boolean),
                    fromCache: expect.any(Boolean)
                })
            );
        });
    });

    describe('Integration Requirements Verification', () => {
        test('should satisfy requirement 1.1 - detect HttpOnly cookie alternatives', () => {
            // Even when cookies are not readable (simulating HttpOnly), 
            // other sources should still work
            localStorage.setItem('accessToken', 'localStorage-token');
            sessionStorage.setItem('refreshToken', 'sessionStorage-token');

            const result = tokenDetectionService.detectTokens();

            expect(result.hasAccessToken).toBe(true);
            expect(result.hasRefreshToken).toBe(true);
            expect(result.tokenSources.accessToken).toBe('localStorage');
            expect(result.tokenSources.refreshToken).toBe('sessionStorage');
        });

        test('should satisfy requirement 1.2 - multiple token source support', () => {
            expect(tokenDetectionService.tokenSources.map(s => s.name)).toEqual([
                'cookies', 'localStorage', 'sessionStorage', 'authService'
            ]);
        });

        test('should satisfy requirement 3.1 - comprehensive debug logging', () => {
            tokenDetectionService.detectTokens();

            // Verify debug logs were generated
            expect(mockConsole.log).toHaveBeenCalledWith(
                expect.stringContaining('TokenDetectionService:'),
                expect.anything()
            );
        });

        test('should satisfy requirement 3.2 - debug information collection', () => {
            const result = tokenDetectionService.detectTokens();

            expect(result.debugInfo).toBeDefined();
            expect(result.detectionTimestamp).toBeDefined();
            expect(result.detectionDuration).toBeDefined();
            
            const debugInfo = tokenDetectionService.getDebugInfo();
            expect(debugInfo.environment).toBeDefined();
            expect(debugInfo.sources).toBeDefined();
            expect(debugInfo.history).toBeDefined();
        });
    });
});