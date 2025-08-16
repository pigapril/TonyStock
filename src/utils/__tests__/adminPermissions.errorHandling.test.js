/**
 * Enhanced Error Handling Tests for AdminPermissions
 * Tests the new error classification, retry mechanisms, and state consistency validation
 */

// Mock dependencies first
const mockApiClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
};

const mockHandleApiError = jest.fn();

jest.mock('../../api/apiClient', () => mockApiClient);
jest.mock('../errorHandler', () => ({
    handleApiError: mockHandleApiError
}));

// Import after mocking
const { AdminPermissions } = require('../adminPermissions');

describe('AdminPermissions Enhanced Error Handling', () => {
    let adminPermissions;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        
        adminPermissions = new AdminPermissions();
        
        // Stop state validation to prevent infinite loops in tests
        adminPermissions._stopStateValidation();
        
        // Mock console methods to reduce test noise
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        adminPermissions.cleanup();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe('Error Classification', () => {
        test('should classify network errors correctly', () => {
            const networkError = new Error('Network Error');
            networkError.code = 'ERR_NETWORK';
            
            const classification = adminPermissions._classifyError(networkError);
            
            expect(classification.type).toBe('network');
            expect(classification.retryable).toBe(true);
            expect(classification.severity).toBe('high');
        });

        test('should classify timeout errors correctly', () => {
            const timeoutError = new Error('Timeout');
            timeoutError.code = 'ECONNABORTED';
            
            const classification = adminPermissions._classifyError(timeoutError);
            
            expect(classification.type).toBe('timeout');
            expect(classification.retryable).toBe(true);
            expect(classification.severity).toBe('medium');
        });

        test('should classify server errors correctly', () => {
            const serverError = new Error('Server Error');
            serverError.response = { status: 500 };
            
            const classification = adminPermissions._classifyError(serverError);
            
            expect(classification.type).toBe('server');
            expect(classification.retryable).toBe(true);
            expect(classification.severity).toBe('high');
        });

        test('should classify authentication errors correctly', () => {
            const authError = new Error('Unauthorized');
            authError.response = { status: 401 };
            
            const classification = adminPermissions._classifyError(authError);
            
            expect(classification.type).toBe('auth');
            expect(classification.retryable).toBe(false);
            expect(classification.severity).toBe('low');
        });

        test('should classify rate limit errors correctly', () => {
            const rateLimitError = new Error('Too Many Requests');
            rateLimitError.response = { status: 429 };
            
            const classification = adminPermissions._classifyError(rateLimitError);
            
            expect(classification.type).toBe('rate_limit');
            expect(classification.retryable).toBe(true);
            expect(classification.severity).toBe('medium');
        });
    });

    describe('Retry Logic', () => {
        test('should retry retryable errors up to max retries', async () => {
            const networkError = new Error('Network Error');
            networkError.code = 'ERR_NETWORK';
            
            mockApiClient.get.mockRejectedValue(networkError);
            
            // Use real timers for this test to avoid infinite loop issues
            jest.useRealTimers();
            
            // Mock the delay calculation to return a small delay
            const originalCalculateDelay = adminPermissions._calculateRetryDelay;
            adminPermissions._calculateRetryDelay = jest.fn(() => 1);
            
            const result = await adminPermissions.checkIsAdmin();
            
            expect(result).toBe(false);
            expect(mockApiClient.get).toHaveBeenCalledTimes(adminPermissions.retryConfig.maxRetries + 1);
            
            // Restore
            adminPermissions._calculateRetryDelay = originalCalculateDelay;
            jest.useFakeTimers();
        });

        test('should not retry non-retryable errors', async () => {
            const authError = new Error('Unauthorized');
            authError.response = { status: 401 };
            
            mockApiClient.get.mockRejectedValue(authError);
            
            await adminPermissions.checkIsAdmin();
            
            expect(mockApiClient.get).toHaveBeenCalledTimes(1);
        });

        test('should calculate exponential backoff delays correctly', () => {
            const delay0 = adminPermissions._calculateRetryDelay(0);
            const delay1 = adminPermissions._calculateRetryDelay(1);
            const delay2 = adminPermissions._calculateRetryDelay(2);
            
            expect(delay0).toBeGreaterThanOrEqual(750); // Base delay with jitter
            expect(delay0).toBeLessThanOrEqual(1250);
            
            expect(delay1).toBeGreaterThanOrEqual(1500); // 2x base delay with jitter
            expect(delay1).toBeLessThanOrEqual(2500);
            
            expect(delay2).toBeGreaterThanOrEqual(3000); // 4x base delay with jitter
            expect(delay2).toBeLessThanOrEqual(5000);
        });

        test('should respect max delay limit', () => {
            const largeRetryCount = 10;
            
            // Mock Math.random to return 0 to avoid jitter affecting the test
            const originalRandom = Math.random;
            Math.random = jest.fn(() => 0);
            
            const delay = adminPermissions._calculateRetryDelay(largeRetryCount);
            
            expect(delay).toBeLessThanOrEqual(adminPermissions.retryConfig.maxDelay);
            
            // Restore Math.random
            Math.random = originalRandom;
        });

        test('should use longer delays for rate limiting', () => {
            adminPermissions.lastErrorType = 'rate_limit';
            const delay = adminPermissions._calculateRetryDelay(0);
            
            expect(delay).toBeGreaterThanOrEqual(5000); // Minimum 5 seconds for rate limiting
        });
    });

    describe('Error History Tracking', () => {
        test('should track error history', async () => {
            const networkError = new Error('Network Error');
            networkError.code = 'ERR_NETWORK';
            
            mockApiClient.get.mockRejectedValue(networkError);
            
            // Use real timers for this test to avoid infinite loop issues
            jest.useRealTimers();
            
            // Mock the delay calculation to return a small delay
            const originalCalculateDelay = adminPermissions._calculateRetryDelay;
            adminPermissions._calculateRetryDelay = jest.fn(() => 1);
            
            await adminPermissions.checkIsAdmin();
            
            const errorHistory = adminPermissions.getErrorHistory();
            expect(errorHistory).toHaveLength(adminPermissions.retryConfig.maxRetries + 1);
            
            errorHistory.forEach(entry => {
                expect(entry).toHaveProperty('timestamp');
                expect(entry).toHaveProperty('type', 'network');
                expect(entry).toHaveProperty('description');
                expect(entry).toHaveProperty('severity');
            });
            
            // Restore
            adminPermissions._calculateRetryDelay = originalCalculateDelay;
            jest.useFakeTimers();
        });

        test('should limit error history size', () => {
            // Add more errors than the max history size
            for (let i = 0; i < adminPermissions.maxErrorHistorySize + 10; i++) {
                const error = new Error('Test Error');
                const classification = { type: 'test', description: 'Test', severity: 'low' };
                adminPermissions._addToErrorHistory(error, classification, 0);
            }
            
            const errorHistory = adminPermissions.getErrorHistory();
            expect(errorHistory).toHaveLength(adminPermissions.maxErrorHistorySize);
        });

        test('should clear error history', () => {
            const error = new Error('Test Error');
            const classification = { type: 'test', description: 'Test', severity: 'low' };
            adminPermissions._addToErrorHistory(error, classification, 0);
            
            expect(adminPermissions.getErrorHistory()).toHaveLength(1);
            
            adminPermissions.clearErrorHistory();
            expect(adminPermissions.getErrorHistory()).toHaveLength(0);
        });
    });

    describe('State Consistency Validation', () => {
        test('should detect cache valid but no status inconsistency', () => {
            // Set up inconsistent state - cache appears valid but no status
            adminPermissions.lastCheck = Date.now();
            adminPermissions.adminStatus = null;
            
            // Mock isCacheValid to return true for this test
            const originalIsCacheValid = adminPermissions.isCacheValid;
            adminPermissions.isCacheValid = jest.fn(() => true);
            
            const spy = jest.spyOn(adminPermissions, '_recoverFromInconsistentState');
            adminPermissions._validateStateConsistency();
            
            expect(spy).toHaveBeenCalledWith(['cache_valid_but_no_status']);
            
            // Restore original method
            adminPermissions.isCacheValid = originalIsCacheValid;
        });

        test('should detect status without timestamp inconsistency', () => {
            adminPermissions.adminStatus = true;
            adminPermissions.lastCheck = null;
            
            const spy = jest.spyOn(adminPermissions, '_recoverFromInconsistentState');
            adminPermissions._validateStateConsistency();
            
            expect(spy).toHaveBeenCalledWith(['status_without_timestamp']);
        });

        test('should detect grace period without known status inconsistency', () => {
            adminPermissions.gracePeriodEnd = Date.now() + 10000;
            adminPermissions.lastKnownStatus = null;
            
            const spy = jest.spyOn(adminPermissions, '_recoverFromInconsistentState');
            adminPermissions._validateStateConsistency();
            
            expect(spy).toHaveBeenCalledWith(['grace_period_without_known_status']);
        });

        test('should recover from inconsistent state', () => {
            // Set up inconsistent state
            adminPermissions.adminStatus = true;
            adminPermissions.lastCheck = null;
            
            adminPermissions._recoverFromInconsistentState(['status_without_timestamp']);
            
            expect(adminPermissions.lastCheck).toBeTruthy();
        });

        test('should start and stop state validation', () => {
            // Start validation first since we stopped it in beforeEach
            adminPermissions._startStateValidation();
            expect(adminPermissions.stateValidationTimer).toBeTruthy();
            
            adminPermissions._stopStateValidation();
            expect(adminPermissions.stateValidationTimer).toBeNull();
            
            adminPermissions._startStateValidation();
            expect(adminPermissions.stateValidationTimer).toBeTruthy();
        });
    });

    describe('Final Error Handling', () => {
        test('should maintain last known status for infrastructure errors', () => {
            adminPermissions.lastKnownStatus = true;
            
            const networkError = new Error('Network Error');
            networkError.code = 'ERR_NETWORK';
            const classification = adminPermissions._classifyError(networkError);
            
            const result = adminPermissions._handleFinalError(networkError, classification);
            
            expect(result).toBe(true);
            expect(adminPermissions.gracePeriodEnd).toBeTruthy();
        });

        test('should clear status for authentication errors', () => {
            adminPermissions.lastKnownStatus = true;
            adminPermissions.adminStatus = true;
            
            const authError = new Error('Unauthorized');
            authError.response = { status: 401 };
            const classification = adminPermissions._classifyError(authError);
            
            const result = adminPermissions._handleFinalError(authError, classification);
            
            expect(result).toBe(false);
            expect(adminPermissions.adminStatus).toBe(false);
            expect(adminPermissions.lastKnownStatus).toBe(false);
        });

        test('should extend grace period for rate limiting', () => {
            adminPermissions.lastKnownStatus = true;
            
            const rateLimitError = new Error('Too Many Requests');
            rateLimitError.response = { status: 429 };
            const classification = adminPermissions._classifyError(rateLimitError);
            
            const result = adminPermissions._handleFinalError(rateLimitError, classification);
            
            expect(result).toBe(true);
            expect(adminPermissions.gracePeriodEnd).toBeGreaterThan(Date.now() + adminPermissions.gracePeriod);
        });
    });

    describe('Configuration Management', () => {
        test('should get retry configuration', () => {
            const config = adminPermissions.getRetryConfig();
            
            expect(config).toHaveProperty('maxRetries');
            expect(config).toHaveProperty('baseDelay');
            expect(config).toHaveProperty('maxDelay');
            expect(config).toHaveProperty('backoffMultiplier');
        });

        test('should update retry configuration', () => {
            const newConfig = { maxRetries: 5, baseDelay: 2000 };
            adminPermissions.updateRetryConfig(newConfig);
            
            const config = adminPermissions.getRetryConfig();
            expect(config.maxRetries).toBe(5);
            expect(config.baseDelay).toBe(2000);
        });
    });

    describe('Debug Information', () => {
        test('should include error handling information in debug info', () => {
            const debugInfo = adminPermissions.getDebugInfo();
            
            expect(debugInfo).toHaveProperty('errorHandling');
            expect(debugInfo.errorHandling).toHaveProperty('currentRetryCount');
            expect(debugInfo.errorHandling).toHaveProperty('consecutiveFailures');
            expect(debugInfo.errorHandling).toHaveProperty('lastErrorType');
            expect(debugInfo.errorHandling).toHaveProperty('errorHistorySize');
            expect(debugInfo.errorHandling).toHaveProperty('retryConfig');
            expect(debugInfo.errorHandling).toHaveProperty('recentErrors');
        });

        test('should include state validation information in debug info', () => {
            const debugInfo = adminPermissions.getDebugInfo();
            
            expect(debugInfo).toHaveProperty('stateValidation');
            expect(debugInfo.stateValidation).toHaveProperty('validationActive');
            expect(debugInfo.stateValidation).toHaveProperty('validationInterval');
        });
    });

    describe('Cleanup', () => {
        test('should properly cleanup all resources', () => {
            const stopValidationSpy = jest.spyOn(adminPermissions, '_stopStateValidation');
            const cancelRefreshSpy = jest.spyOn(adminPermissions, '_cancelScheduledRefresh');
            
            adminPermissions.cleanup();
            
            expect(stopValidationSpy).toHaveBeenCalled();
            expect(cancelRefreshSpy).toHaveBeenCalled();
            expect(adminPermissions.listeners.size).toBe(0);
        });
    });
});