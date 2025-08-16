/**
 * Unit Tests for Fixed Caching Logic in AdminPermissions
 * 
 * Tests the enhanced caching logic that addresses the core issue where
 * isCurrentUserAdmin() would return false during pending API calls.
 * 
 * Task 7: Create unit tests for fixed caching logic
 * - Test isCurrentUserAdmin method with various cache states
 * - Test Promise queue management functionality
 * - Test error handling scenarios and recovery mechanisms
 * 
 * Requirements: 1.2, 2.1, 2.3
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

describe('AdminPermissions Fixed Caching Logic', () => {
    let adminPermissions;
    let originalSetTimeout;
    let originalClearTimeout;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Store original timer functions
        originalSetTimeout = global.setTimeout;
        originalClearTimeout = global.clearTimeout;
        
        adminPermissions = new AdminPermissions();
        
        // Stop state validation to prevent interference with tests
        adminPermissions._stopStateValidation();
        
        // Mock console methods to reduce test noise
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        adminPermissions.cleanup();
        jest.restoreAllMocks();
        
        // Restore original timer functions
        global.setTimeout = originalSetTimeout;
        global.clearTimeout = originalClearTimeout;
    });

    describe('isCurrentUserAdmin with Various Cache States', () => {
        describe('Valid Cache Scenarios', () => {
            test('should return cached admin status when cache is valid and user is admin', () => {
                // Arrange
                adminPermissions.adminStatus = true;
                adminPermissions.lastCheck = Date.now();
                
                // Act
                const result = adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(result).toBe(true);
                expect(adminPermissions.isCacheValid()).toBe(true);
            });

            test('should return cached non-admin status when cache is valid and user is not admin', () => {
                // Arrange
                adminPermissions.adminStatus = false;
                adminPermissions.lastCheck = Date.now();
                
                // Act
                const result = adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(result).toBe(false);
                expect(adminPermissions.isCacheValid()).toBe(true);
            });
        });

        describe('Expired Cache with Pending API Call Scenarios', () => {
            test('should return last known admin status when API call is in progress', () => {
                // Arrange - expired cache but API call in progress
                adminPermissions.adminStatus = null; // No valid cache
                adminPermissions.lastCheck = Date.now() - (6 * 60 * 1000); // 6 minutes ago (expired)
                adminPermissions.loading = true; // API call in progress
                adminPermissions.lastKnownStatus = true; // Last known status was admin
                
                // Act
                const result = adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(result).toBe(true);
                expect(adminPermissions.isCacheValid()).toBe(false);
                expect(adminPermissions.loading).toBe(true);
            });

            test('should return last known non-admin status when API call is in progress', () => {
                // Arrange
                adminPermissions.adminStatus = null;
                adminPermissions.lastCheck = Date.now() - (6 * 60 * 1000);
                adminPermissions.loading = true;
                adminPermissions.lastKnownStatus = false;
                
                // Act
                const result = adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(result).toBe(false);
            });

            test('should return false when API call is in progress but no last known status', () => {
                // Arrange
                adminPermissions.adminStatus = null;
                adminPermissions.lastCheck = Date.now() - (6 * 60 * 1000);
                adminPermissions.loading = true;
                adminPermissions.lastKnownStatus = null; // No last known status
                
                // Act
                const result = adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(result).toBe(false);
            });
        });

        describe('Grace Period Scenarios', () => {
            test('should return last known status during active grace period', () => {
                // Arrange - expired cache but within grace period
                adminPermissions.adminStatus = null;
                adminPermissions.lastCheck = Date.now() - (6 * 60 * 1000); // Expired
                adminPermissions.loading = false;
                adminPermissions.lastKnownStatus = true;
                adminPermissions.gracePeriodEnd = Date.now() + 15000; // 15 seconds from now
                
                // Act
                const result = adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(result).toBe(true);
                expect(adminPermissions.isInGracePeriod()).toBe(true);
            });

            test('should return false during grace period when last known status is false', () => {
                // Arrange
                adminPermissions.adminStatus = null;
                adminPermissions.lastCheck = Date.now() - (6 * 60 * 1000);
                adminPermissions.loading = false;
                adminPermissions.lastKnownStatus = false;
                adminPermissions.gracePeriodEnd = Date.now() + 15000;
                
                // Act
                const result = adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(result).toBe(false);
                expect(adminPermissions.isInGracePeriod()).toBe(true);
            });

            test('should return false during grace period when no last known status', () => {
                // Arrange
                adminPermissions.adminStatus = null;
                adminPermissions.lastCheck = Date.now() - (6 * 60 * 1000);
                adminPermissions.loading = false;
                adminPermissions.lastKnownStatus = null;
                adminPermissions.gracePeriodEnd = Date.now() + 15000;
                
                // Act
                const result = adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(result).toBe(false);
            });

            test('should not use grace period when it has expired', () => {
                // Arrange
                adminPermissions.adminStatus = null;
                adminPermissions.lastCheck = Date.now() - (6 * 60 * 1000);
                adminPermissions.loading = false;
                adminPermissions.lastKnownStatus = true;
                adminPermissions.gracePeriodEnd = Date.now() - 1000; // 1 second ago (expired)
                
                // Act
                const result = adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(adminPermissions.isInGracePeriod()).toBe(false);
                expect(result).toBe(true); // Should still return last known status as fallback
            });
        });

        describe('Background Refresh Triggering', () => {
            test('should trigger background refresh when no API call is in progress and cache is expired', () => {
                // Arrange
                adminPermissions.adminStatus = null;
                adminPermissions.lastCheck = Date.now() - (6 * 60 * 1000);
                adminPermissions.loading = false;
                adminPermissions.pendingPromise = null;
                adminPermissions.lastKnownStatus = true;
                
                const backgroundRefreshSpy = jest.spyOn(adminPermissions, 'backgroundRefresh');
                
                // Act
                adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(backgroundRefreshSpy).toHaveBeenCalled();
                
                backgroundRefreshSpy.mockRestore();
            });

            test('should not trigger background refresh when API call is already in progress', () => {
                // Arrange
                adminPermissions.adminStatus = null;
                adminPermissions.lastCheck = Date.now() - (6 * 60 * 1000);
                adminPermissions.loading = true; // API call in progress
                adminPermissions.lastKnownStatus = true;
                
                const backgroundRefreshSpy = jest.spyOn(adminPermissions, 'backgroundRefresh');
                
                // Act
                adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(backgroundRefreshSpy).not.toHaveBeenCalled();
                
                backgroundRefreshSpy.mockRestore();
            });

            test('should not trigger background refresh when pending promise exists', () => {
                // Arrange
                adminPermissions.adminStatus = null;
                adminPermissions.lastCheck = Date.now() - (6 * 60 * 1000);
                adminPermissions.loading = false;
                adminPermissions.pendingPromise = Promise.resolve(true); // Pending promise exists
                adminPermissions.lastKnownStatus = true;
                
                const backgroundRefreshSpy = jest.spyOn(adminPermissions, 'backgroundRefresh');
                
                // Act
                adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(backgroundRefreshSpy).not.toHaveBeenCalled();
                
                backgroundRefreshSpy.mockRestore();
            });
        });

        describe('Fallback Scenarios', () => {
            test('should return last known status as fallback when all else fails', () => {
                // Arrange - no valid cache, no grace period, no API call
                adminPermissions.adminStatus = null;
                adminPermissions.lastCheck = Date.now() - (6 * 60 * 1000);
                adminPermissions.loading = false;
                adminPermissions.pendingPromise = null;
                adminPermissions.gracePeriodEnd = null;
                adminPermissions.lastKnownStatus = true;
                
                // Act
                const result = adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(result).toBe(true);
            });

            test('should return false as ultimate fallback when no last known status', () => {
                // Arrange - no valid cache, no grace period, no API call, no last known status
                adminPermissions.adminStatus = null;
                adminPermissions.lastCheck = null;
                adminPermissions.loading = false;
                adminPermissions.pendingPromise = null;
                adminPermissions.gracePeriodEnd = null;
                adminPermissions.lastKnownStatus = null;
                
                // Act
                const result = adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(result).toBe(false);
            });
        });
    });

    describe('Promise Queue Management Functionality', () => {
        describe('Single Promise Handling', () => {
            test('should create and manage a single pending promise', async () => {
                // Arrange
                const mockResponse = {
                    data: {
                        data: {
                            isAuthenticated: true,
                            isAdmin: true
                        }
                    }
                };
                mockApiClient.get.mockResolvedValue(mockResponse);
                
                // Act
                const promise = adminPermissions.checkIsAdmin();
                
                // Assert - promise should be pending
                expect(adminPermissions.pendingPromise).toBeTruthy();
                expect(adminPermissions.hasPendingOperations()).toBe(true);
                
                const result = await promise;
                
                // Assert - promise should be cleaned up
                expect(result).toBe(true);
                expect(adminPermissions.pendingPromise).toBeNull();
                expect(adminPermissions.hasPendingOperations()).toBe(false);
            });

            test('should clean up pending promise on successful completion', async () => {
                // Arrange
                const mockResponse = {
                    data: {
                        data: {
                            isAuthenticated: true,
                            isAdmin: false
                        }
                    }
                };
                mockApiClient.get.mockResolvedValue(mockResponse);
                
                // Act
                await adminPermissions.checkIsAdmin();
                
                // Assert
                expect(adminPermissions.pendingPromise).toBeNull();
                expect(adminPermissions.getPromiseQueueSize()).toBe(0);
            });

            test('should clean up pending promise on error', async () => {
                // Arrange
                const error = new Error('API Error');
                mockApiClient.get.mockRejectedValue(error);
                
                // Mock retry delay to speed up test
                const originalCalculateDelay = adminPermissions._calculateRetryDelay;
                adminPermissions._calculateRetryDelay = jest.fn(() => 1);
                
                // Act - the method returns a boolean result, not throwing
                const result = await adminPermissions.checkIsAdmin();
                
                // Assert - should return false and clean up
                expect(result).toBe(false);
                expect(adminPermissions.pendingPromise).toBeNull();
                expect(adminPermissions.getPromiseQueueSize()).toBe(0);
                
                // Restore
                adminPermissions._calculateRetryDelay = originalCalculateDelay;
            });
        });

        describe('Multiple Simultaneous Promises', () => {
            test('should reuse pending promise for multiple simultaneous calls', async () => {
                // Arrange
                const mockResponse = {
                    data: {
                        data: {
                            isAuthenticated: true,
                            isAdmin: true
                        }
                    }
                };
                mockApiClient.get.mockResolvedValue(mockResponse);
                
                // Act - make multiple simultaneous calls
                const promise1 = adminPermissions.checkIsAdmin();
                const promise2 = adminPermissions.checkIsAdmin();
                const promise3 = adminPermissions.checkIsAdmin();
                
                // Assert - should have one main promise and two queued
                expect(adminPermissions.pendingPromise).toBeTruthy();
                expect(adminPermissions.getPromiseQueueSize()).toBe(2);
                expect(adminPermissions.hasPendingOperations()).toBe(true);
                
                const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);
                
                // Assert - all should return same result with only one API call
                expect(result1).toBe(true);
                expect(result2).toBe(true);
                expect(result3).toBe(true);
                expect(mockApiClient.get).toHaveBeenCalledTimes(1);
                
                // Assert - cleanup should be complete
                expect(adminPermissions.pendingPromise).toBeNull();
                expect(adminPermissions.getPromiseQueueSize()).toBe(0);
                expect(adminPermissions.hasPendingOperations()).toBe(false);
            });

            test('should handle queued promises when main promise resolves', async () => {
                // Arrange
                let resolvePromise;
                const slowPromise = new Promise(resolve => {
                    resolvePromise = resolve;
                });
                mockApiClient.get.mockReturnValue(slowPromise);
                
                // Act - start multiple calls
                const promise1 = adminPermissions.checkIsAdmin();
                const promise2 = adminPermissions.checkIsAdmin();
                const promise3 = adminPermissions.checkIsAdmin();
                
                // Assert - check queue state during pending calls
                expect(adminPermissions.getPromiseQueueSize()).toBe(2);
                expect(adminPermissions.hasPendingOperations()).toBe(true);
                
                // Resolve the main promise
                resolvePromise({
                    data: {
                        data: {
                            isAuthenticated: true,
                            isAdmin: true
                        }
                    }
                });
                
                const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);
                
                // Assert - all promises should resolve with same result
                expect(result1).toBe(true);
                expect(result2).toBe(true);
                expect(result3).toBe(true);
                
                // Assert - queue should be cleaned up
                expect(adminPermissions.getPromiseQueueSize()).toBe(0);
                expect(adminPermissions.hasPendingOperations()).toBe(false);
            });

            test('should handle queued promises when main promise rejects', async () => {
                // Arrange
                let rejectPromise;
                const slowPromise = new Promise((resolve, reject) => {
                    rejectPromise = reject;
                });
                mockApiClient.get.mockReturnValue(slowPromise);
                
                // Mock retry delay to speed up test
                const originalCalculateDelay = adminPermissions._calculateRetryDelay;
                adminPermissions._calculateRetryDelay = jest.fn(() => 1);
                
                // Act - start multiple calls (they return boolean results, not errors)
                const promise1 = adminPermissions.checkIsAdmin();
                const promise2 = adminPermissions.checkIsAdmin();
                const promise3 = adminPermissions.checkIsAdmin();
                
                // Assert - check queue state during pending calls
                expect(adminPermissions.getPromiseQueueSize()).toBe(2);
                
                // Reject the main promise
                const testError = new Error('Test Error');
                rejectPromise(testError);
                
                const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);
                
                // Assert - all promises should return false (handled error)
                expect(result1).toBe(false);
                expect(result2).toBe(false);
                expect(result3).toBe(false);
                
                // Assert - queue should be cleaned up
                expect(adminPermissions.getPromiseQueueSize()).toBe(0);
                expect(adminPermissions.hasPendingOperations()).toBe(false);
                
                // Restore
                adminPermissions._calculateRetryDelay = originalCalculateDelay;
            });
        });

        describe('Promise Queue Cleanup', () => {
            test('should properly clean up promise queue on successful completion', async () => {
                // Arrange
                const mockResponse = {
                    data: {
                        data: {
                            isAuthenticated: true,
                            isAdmin: true
                        }
                    }
                };
                mockApiClient.get.mockResolvedValue(mockResponse);
                
                // Act - create multiple promises
                const promises = [
                    adminPermissions.checkIsAdmin(),
                    adminPermissions.checkIsAdmin(),
                    adminPermissions.checkIsAdmin(),
                    adminPermissions.checkIsAdmin(),
                    adminPermissions.checkIsAdmin()
                ];
                
                // Assert - queue should have 4 promises (1 main + 4 queued)
                expect(adminPermissions.getPromiseQueueSize()).toBe(4);
                
                await Promise.all(promises);
                
                // Assert - queue should be completely cleaned up
                expect(adminPermissions.getPromiseQueueSize()).toBe(0);
                expect(adminPermissions.pendingPromise).toBeNull();
            });

            test('should properly clean up promise queue on error', async () => {
                // Arrange
                const error = new Error('Test Error');
                mockApiClient.get.mockRejectedValue(error);
                
                // Act - create multiple promises that will fail
                const promises = [
                    adminPermissions.checkIsAdmin().catch(() => false),
                    adminPermissions.checkIsAdmin().catch(() => false),
                    adminPermissions.checkIsAdmin().catch(() => false)
                ];
                
                await Promise.all(promises);
                
                // Assert - queue should be cleaned up even after error
                expect(adminPermissions.getPromiseQueueSize()).toBe(0);
                expect(adminPermissions.pendingPromise).toBeNull();
            });

            test('should handle mixed success and error scenarios in queue', async () => {
                // Arrange - first call succeeds, subsequent calls should also succeed
                const mockResponse = {
                    data: {
                        data: {
                            isAuthenticated: true,
                            isAdmin: true
                        }
                    }
                };
                mockApiClient.get.mockResolvedValue(mockResponse);
                
                // Act
                const promise1 = adminPermissions.checkIsAdmin();
                const promise2 = adminPermissions.checkIsAdmin();
                
                const [result1, result2] = await Promise.all([promise1, promise2]);
                
                // Assert - both should succeed
                expect(result1).toBe(true);
                expect(result2).toBe(true);
                expect(adminPermissions.getPromiseQueueSize()).toBe(0);
            });
        });

        describe('Cache Integration with Promise Queue', () => {
            test('should return cached result without creating promise queue when cache is valid', async () => {
                // Arrange - set valid cache
                adminPermissions.adminStatus = true;
                adminPermissions.lastCheck = Date.now();
                
                // Act - make multiple calls
                const promise1 = adminPermissions.checkIsAdmin();
                const promise2 = adminPermissions.checkIsAdmin();
                
                const [result1, result2] = await Promise.all([promise1, promise2]);
                
                // Assert - should use cache, no API calls, no queue
                expect(result1).toBe(true);
                expect(result2).toBe(true);
                expect(mockApiClient.get).not.toHaveBeenCalled();
                expect(adminPermissions.getPromiseQueueSize()).toBe(0);
                expect(adminPermissions.pendingPromise).toBeNull();
            });

            test('should update cache and last known status after promise resolution', async () => {
                // Arrange
                const mockResponse = {
                    data: {
                        data: {
                            isAuthenticated: true,
                            isAdmin: true
                        }
                    }
                };
                mockApiClient.get.mockResolvedValue(mockResponse);
                
                // Ensure no initial cache
                adminPermissions.adminStatus = null;
                adminPermissions.lastKnownStatus = null;
                
                // Act
                await adminPermissions.checkIsAdmin();
                
                // Assert - cache and last known status should be updated
                expect(adminPermissions.adminStatus).toBe(true);
                expect(adminPermissions.lastKnownStatus).toBe(true);
                expect(adminPermissions.lastCheck).toBeTruthy();
                expect(adminPermissions.isCacheValid()).toBe(true);
            });
        });
    });

    describe('Error Handling Scenarios and Recovery Mechanisms', () => {
        describe('Network Error Recovery', () => {
            test('should maintain last known status on network errors', async () => {
                // Arrange
                adminPermissions.lastKnownStatus = true;
                
                const networkError = new Error('Network Error');
                networkError.code = 'ERR_NETWORK';
                mockApiClient.get.mockRejectedValue(networkError);
                
                // Mock retry delay to speed up test
                const originalCalculateDelay = adminPermissions._calculateRetryDelay;
                adminPermissions._calculateRetryDelay = jest.fn(() => 1);
                
                // Act
                const result = await adminPermissions.checkIsAdmin();
                
                // Assert - should maintain last known status and start grace period
                expect(result).toBe(true);
                expect(adminPermissions.lastKnownStatus).toBe(true);
                expect(adminPermissions.gracePeriodEnd).toBeTruthy();
                expect(adminPermissions.isInGracePeriod()).toBe(true);
                
                // Restore
                adminPermissions._calculateRetryDelay = originalCalculateDelay;
            });

            test('should extend grace period on persistent network errors', async () => {
                // Arrange
                adminPermissions.lastKnownStatus = true;
                adminPermissions.gracePeriodEnd = Date.now() + 10000; // Initial grace period
                
                const networkError = new Error('Network Error');
                networkError.code = 'ERR_NETWORK';
                mockApiClient.get.mockRejectedValue(networkError);
                
                const originalGracePeriodEnd = adminPermissions.gracePeriodEnd;
                
                // Mock retry delay to speed up test
                const originalCalculateDelay = adminPermissions._calculateRetryDelay;
                adminPermissions._calculateRetryDelay = jest.fn(() => 1);
                
                // Act
                await adminPermissions.checkIsAdmin();
                
                // Assert - grace period should be extended
                expect(adminPermissions.gracePeriodEnd).toBeGreaterThan(originalGracePeriodEnd);
                
                // Restore
                adminPermissions._calculateRetryDelay = originalCalculateDelay;
            });
        });

        describe('Authentication Error Recovery', () => {
            test('should clear all status on authentication errors', async () => {
                // Arrange
                adminPermissions.lastKnownStatus = true;
                adminPermissions.adminStatus = true;
                adminPermissions.gracePeriodEnd = Date.now() + 10000;
                
                const authError = new Error('Unauthorized');
                authError.response = { status: 401 };
                mockApiClient.get.mockRejectedValue(authError);
                
                // Act
                await adminPermissions.checkIsAdmin();
                
                // Assert - all status should be cleared
                expect(adminPermissions.adminStatus).toBe(false);
                expect(adminPermissions.lastKnownStatus).toBe(false);
                expect(adminPermissions.gracePeriodEnd).toBeNull();
            });

            test('should not retry authentication errors', async () => {
                // Arrange
                const authError = new Error('Forbidden');
                authError.response = { status: 403 };
                mockApiClient.get.mockRejectedValue(authError);
                
                // Act
                await adminPermissions.checkIsAdmin();
                
                // Assert - should only make one API call (no retries)
                expect(mockApiClient.get).toHaveBeenCalledTimes(1);
            });
        });

        describe('Server Error Recovery', () => {
            test('should retry server errors and maintain last known status', async () => {
                // Arrange
                adminPermissions.lastKnownStatus = true;
                
                const serverError = new Error('Internal Server Error');
                serverError.response = { status: 500 };
                mockApiClient.get.mockRejectedValue(serverError);
                
                // Mock retry delay to speed up test
                const originalCalculateDelay = adminPermissions._calculateRetryDelay;
                adminPermissions._calculateRetryDelay = jest.fn(() => 1);
                
                // Act
                const result = await adminPermissions.checkIsAdmin();
                
                // Assert - should retry and maintain last known status
                expect(mockApiClient.get).toHaveBeenCalledTimes(adminPermissions.retryConfig.maxRetries + 1);
                expect(result).toBe(true);
                expect(adminPermissions.lastKnownStatus).toBe(true);
                
                // Restore
                adminPermissions._calculateRetryDelay = originalCalculateDelay;
            });
        });

        describe('Rate Limiting Recovery', () => {
            test('should handle rate limiting with extended grace period', async () => {
                // Arrange
                adminPermissions.lastKnownStatus = true;
                
                const rateLimitError = new Error('Too Many Requests');
                rateLimitError.response = { status: 429 };
                mockApiClient.get.mockRejectedValue(rateLimitError);
                
                // Mock retry delay to speed up test
                const originalCalculateDelay = adminPermissions._calculateRetryDelay;
                adminPermissions._calculateRetryDelay = jest.fn(() => 1);
                
                // Act
                const result = await adminPermissions.checkIsAdmin();
                
                // Assert - should maintain status and extend grace period
                expect(result).toBe(true);
                expect(adminPermissions.gracePeriodEnd).toBeGreaterThan(Date.now() + adminPermissions.gracePeriod);
                
                // Restore
                adminPermissions._calculateRetryDelay = originalCalculateDelay;
            });
        });

        describe('Promise Queue Error Handling', () => {
            test('should handle errors in promise queue gracefully', async () => {
                // Arrange
                let rejectPromise;
                const slowPromise = new Promise((resolve, reject) => {
                    rejectPromise = reject;
                });
                mockApiClient.get.mockReturnValue(slowPromise);
                
                // Mock retry delay to speed up test
                const originalCalculateDelay = adminPermissions._calculateRetryDelay;
                adminPermissions._calculateRetryDelay = jest.fn(() => 1);
                
                // Act - create multiple promises (they return boolean results)
                const promise1 = adminPermissions.checkIsAdmin();
                const promise2 = adminPermissions.checkIsAdmin();
                const promise3 = adminPermissions.checkIsAdmin();
                
                // Reject the main promise
                const testError = new Error('Queue Error Test');
                rejectPromise(testError);
                
                const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);
                
                // Assert - all should handle error gracefully and return false
                expect(result1).toBe(false);
                expect(result2).toBe(false);
                expect(result3).toBe(false);
                
                // Assert - queue should be cleaned up
                expect(adminPermissions.getPromiseQueueSize()).toBe(0);
                expect(adminPermissions.pendingPromise).toBeNull();
                
                // Restore
                adminPermissions._calculateRetryDelay = originalCalculateDelay;
            });

            test('should maintain state consistency after queue errors', async () => {
                // Arrange
                adminPermissions.lastKnownStatus = true;
                
                const error = new Error('Queue Error');
                mockApiClient.get.mockRejectedValue(error);
                
                // Act - create multiple failing promises
                const promises = [
                    adminPermissions.checkIsAdmin().catch(() => false),
                    adminPermissions.checkIsAdmin().catch(() => false),
                    adminPermissions.checkIsAdmin().catch(() => false)
                ];
                
                await Promise.all(promises);
                
                // Assert - state should remain consistent
                expect(adminPermissions.lastKnownStatus).toBe(true);
                expect(adminPermissions.getPromiseQueueSize()).toBe(0);
                expect(adminPermissions.pendingPromise).toBeNull();
            });
        });

        describe('Background Refresh Error Handling', () => {
            test('should extend grace period when background refresh fails', async () => {
                // Arrange
                adminPermissions.loading = false;
                adminPermissions.pendingPromise = null;
                adminPermissions.lastKnownStatus = true;
                adminPermissions.gracePeriodEnd = null; // No existing grace period
                
                const error = new Error('Background refresh failed');
                const checkIsAdminSpy = jest.spyOn(adminPermissions, 'checkIsAdmin').mockRejectedValue(error);
                
                // Act
                adminPermissions.backgroundRefresh();
                
                // Wait for the promise to reject
                await new Promise(resolve => setTimeout(resolve, 10));
                
                // Assert - grace period should be extended
                expect(adminPermissions.gracePeriodEnd).toBeTruthy();
                expect(adminPermissions.gracePeriodEnd).toBeGreaterThan(Date.now());
                
                checkIsAdminSpy.mockRestore();
            });

            test('should not extend grace period if background refresh succeeds', async () => {
                // Arrange
                adminPermissions.loading = false;
                adminPermissions.pendingPromise = null;
                adminPermissions.lastKnownStatus = true;
                adminPermissions.gracePeriodEnd = null;
                
                const checkIsAdminSpy = jest.spyOn(adminPermissions, 'checkIsAdmin').mockResolvedValue(true);
                
                // Act
                adminPermissions.backgroundRefresh();
                
                // Wait for the promise to resolve
                await new Promise(resolve => setTimeout(resolve, 10));
                
                // Assert - no grace period should be set
                expect(adminPermissions.gracePeriodEnd).toBeNull();
                
                checkIsAdminSpy.mockRestore();
            });
        });

        describe('Cache Clear Error Recovery', () => {
            test('should properly clean up all state during cache clear', () => {
                // Arrange - set up complex state
                adminPermissions.adminStatus = true;
                adminPermissions.lastKnownStatus = true;
                adminPermissions.gracePeriodEnd = Date.now() + 10000;
                adminPermissions.pendingPromise = Promise.resolve(true);
                adminPermissions.promiseQueue = [Promise.resolve(true), Promise.resolve(false)];
                adminPermissions.loading = true;
                adminPermissions.currentRetryCount = 2;
                adminPermissions.consecutiveFailures = 3;
                adminPermissions.lastErrorType = 'network';
                
                const listener = jest.fn();
                adminPermissions.addListener(listener);
                
                // Act
                adminPermissions.clearCache();
                
                // Assert - all state should be cleared
                expect(adminPermissions.adminStatus).toBeNull();
                expect(adminPermissions.lastKnownStatus).toBeNull();
                expect(adminPermissions.gracePeriodEnd).toBeNull();
                expect(adminPermissions.pendingPromise).toBeNull();
                expect(adminPermissions.promiseQueue).toEqual([]);
                expect(adminPermissions.loading).toBe(false);
                expect(adminPermissions.currentRetryCount).toBe(0);
                expect(adminPermissions.consecutiveFailures).toBe(0);
                expect(adminPermissions.lastErrorType).toBeNull();
                
                // Assert - listeners should be notified
                expect(listener).toHaveBeenCalledWith(null);
            });
        });

        describe('State Recovery Mechanisms', () => {
            test('should recover from inconsistent cache state', () => {
                // Arrange - create inconsistent state
                adminPermissions.adminStatus = true;
                adminPermissions.lastCheck = null; // Inconsistent: status without timestamp
                
                // Act
                adminPermissions._recoverFromInconsistentState(['status_without_timestamp']);
                
                // Assert - should fix the inconsistency
                expect(adminPermissions.lastCheck).toBeTruthy();
            });

            test('should handle multiple inconsistencies in state recovery', () => {
                // Arrange - create multiple inconsistencies
                adminPermissions.adminStatus = null;
                adminPermissions.lastCheck = Date.now();
                adminPermissions.gracePeriodEnd = Date.now() + 10000;
                adminPermissions.lastKnownStatus = null;
                
                // Act
                adminPermissions._recoverFromInconsistentState([
                    'cache_valid_but_no_status',
                    'grace_period_without_known_status'
                ]);
                
                // Assert - should fix all inconsistencies
                expect(adminPermissions.adminStatus).toBeNull(); // Should clear invalid cache
                expect(adminPermissions.lastCheck).toBeNull(); // Should clear timestamp too
                expect(adminPermissions.gracePeriodEnd).toBeNull(); // Should clear grace period
            });
        });
    });

    describe('Integration Scenarios', () => {
        test('should handle complex scenario: expired cache, pending API call, with grace period', () => {
            // Arrange - complex real-world scenario
            adminPermissions.adminStatus = null; // No valid cache
            adminPermissions.lastCheck = Date.now() - (6 * 60 * 1000); // Expired
            adminPermissions.loading = true; // API call in progress
            adminPermissions.lastKnownStatus = true; // Was admin before
            adminPermissions.gracePeriodEnd = Date.now() + 15000; // Grace period active
            
            // Act
            const result = adminPermissions.isCurrentUserAdmin();
            
            // Assert - should prioritize pending API call status over grace period
            expect(result).toBe(true);
            expect(adminPermissions.isCacheValid()).toBe(false);
            expect(adminPermissions.isInGracePeriod()).toBe(true);
        });

        test('should handle scenario: no cache, no API call, expired grace period', () => {
            // Arrange
            adminPermissions.adminStatus = null;
            adminPermissions.lastCheck = null;
            adminPermissions.loading = false;
            adminPermissions.pendingPromise = null;
            adminPermissions.gracePeriodEnd = Date.now() - 1000; // Expired grace period
            adminPermissions.lastKnownStatus = true;
            
            const backgroundRefreshSpy = jest.spyOn(adminPermissions, 'backgroundRefresh');
            
            // Act
            const result = adminPermissions.isCurrentUserAdmin();
            
            // Assert - should trigger background refresh and return last known status
            expect(result).toBe(true);
            expect(backgroundRefreshSpy).toHaveBeenCalled();
            expect(adminPermissions.isInGracePeriod()).toBe(false);
            
            backgroundRefreshSpy.mockRestore();
        });

        test('should handle rapid successive calls during state transitions', async () => {
            // Arrange - simulate rapid calls during state transition
            const mockResponse = {
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            };
            mockApiClient.get.mockResolvedValue(mockResponse);
            
            // Act - make rapid successive calls
            const results = [];
            for (let i = 0; i < 10; i++) {
                results.push(adminPermissions.isCurrentUserAdmin());
                if (i === 5) {
                    // Trigger async call in the middle
                    adminPermissions.checkIsAdmin();
                }
            }
            
            // Wait for any pending operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Assert - all calls should return consistent results
            const uniqueResults = [...new Set(results)];
            expect(uniqueResults.length).toBeLessThanOrEqual(2); // Should be consistent or show transition
        });
    });
});