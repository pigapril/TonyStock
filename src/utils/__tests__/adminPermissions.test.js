/**
 * Admin Permissions Utility Tests
 * 
 * Tests for the frontend admin permissions utility class.
 * Covers API integration, caching, error handling, and session management.
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

describe('AdminPermissions', () => {
    let adminPermissions;
    
    beforeEach(() => {
        adminPermissions = new AdminPermissions();
        jest.clearAllMocks();
        
        // Reset instance state
        adminPermissions.adminStatus = null;
        adminPermissions.loading = false;
        adminPermissions.lastCheck = null;
        adminPermissions.listeners.clear();
        
        // Reset new properties
        adminPermissions.pendingPromise = null;
        adminPermissions.lastKnownStatus = null;
        adminPermissions.gracePeriodEnd = null;
        adminPermissions.promiseQueue = [];
        adminPermissions.apiCallStats = {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            lastCallDuration: 0
        };
        
        // Mock console methods to reduce test noise
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    
    afterEach(() => {
        jest.restoreAllMocks();
    });
    
    describe('checkIsAdmin', () => {
        it('should return true when user is admin', async () => {
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
            const result = await adminPermissions.checkIsAdmin();
            
            // Assert
            expect(result).toBe(true);
            expect(adminPermissions.adminStatus).toBe(true);
            expect(adminPermissions.lastCheck).toBeTruthy();
            expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/admin-status');
        });
        
        it('should return false when user is not admin', async () => {
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
            const result = await adminPermissions.checkIsAdmin();
            
            // Assert
            expect(result).toBe(false);
            expect(adminPermissions.adminStatus).toBe(false);
        });
        
        it('should use cached result when cache is valid', async () => {
            // Arrange
            adminPermissions.adminStatus = true;
            adminPermissions.lastCheck = Date.now();
            
            // Act
            const result = await adminPermissions.checkIsAdmin();
            
            // Assert
            expect(result).toBe(true);
            expect(mockApiClient.get).not.toHaveBeenCalled();
        });
        
        it('should handle network errors gracefully', async () => {
            // Arrange
            const networkError = new Error('Network Error');
            networkError.code = 'ERR_NETWORK';
            mockApiClient.get.mockRejectedValue(networkError);
            mockHandleApiError.mockReturnValue(networkError);
            
            // Set existing status to test fallback
            adminPermissions.lastKnownStatus = true;
            adminPermissions.lastCheck = Date.now() - (6 * 60 * 1000);
            
            // Mock the delay calculation to return a small delay to speed up test
            const originalCalculateDelay = adminPermissions._calculateRetryDelay;
            adminPermissions._calculateRetryDelay = jest.fn(() => 1);
            
            // Act
            const result = await adminPermissions.checkIsAdmin();
            
            // Assert
            expect(result).toBe(true); // Should maintain last known status
            
            // Restore
            adminPermissions._calculateRetryDelay = originalCalculateDelay;
        }, 10000);
    });
    
    describe('isCurrentUserAdmin', () => {
        it('should return cached admin status when valid', () => {
            // Arrange
            adminPermissions.adminStatus = true;
            adminPermissions.lastCheck = Date.now();
            
            // Act
            const result = adminPermissions.isCurrentUserAdmin();
            
            // Assert
            expect(result).toBe(true);
        });
        
        it('should return false when no cached status', () => {
            // Act
            const result = adminPermissions.isCurrentUserAdmin();
            
            // Assert
            expect(result).toBe(false);
        });
    });
    
    describe('shouldShowAdminFeatures', () => {
        it('should return true when user is admin', () => {
            // Arrange
            adminPermissions.adminStatus = true;
            adminPermissions.lastCheck = Date.now();
            
            // Act
            const result = adminPermissions.shouldShowAdminFeatures();
            
            // Assert
            expect(result).toBe(true);
        });
        
        it('should return false when user is not admin', () => {
            // Arrange
            adminPermissions.adminStatus = false;
            adminPermissions.lastCheck = Date.now();
            
            // Act
            const result = adminPermissions.shouldShowAdminFeatures();
            
            // Assert
            expect(result).toBe(false);
        });
    });
    
    describe('cache management', () => {
        it('should clear cache correctly', () => {
            // Arrange
            adminPermissions.adminStatus = true;
            adminPermissions.lastCheck = Date.now();
            adminPermissions.loading = true;
            adminPermissions.lastKnownStatus = true;
            adminPermissions.gracePeriodEnd = Date.now() + 30000;
            adminPermissions.pendingPromise = Promise.resolve(true);
            
            const listener = jest.fn();
            adminPermissions.addListener(listener);
            
            // Act
            adminPermissions.clearCache();
            
            // Assert
            expect(adminPermissions.adminStatus).toBe(null);
            expect(adminPermissions.lastCheck).toBe(null);
            expect(adminPermissions.loading).toBe(false);
            expect(adminPermissions.lastKnownStatus).toBe(null);
            expect(adminPermissions.gracePeriodEnd).toBe(null);
            expect(adminPermissions.pendingPromise).toBe(null);
            expect(adminPermissions.promiseQueue).toEqual([]);
            expect(listener).toHaveBeenCalledWith(null);
        });
        
        it('should validate cache correctly', () => {
            // Test valid cache
            adminPermissions.adminStatus = true;
            adminPermissions.lastCheck = Date.now();
            expect(adminPermissions.isCacheValid()).toBe(true);
            
            // Test expired cache
            adminPermissions.lastCheck = Date.now() - (6 * 60 * 1000);
            expect(adminPermissions.isCacheValid()).toBe(false);
            
            // Test no cache
            adminPermissions.adminStatus = null;
            adminPermissions.lastCheck = null;
            expect(adminPermissions.isCacheValid()).toBe(false);
        });
    });
    
    describe('listener management', () => {
        it('should add and remove listeners correctly', () => {
            // Arrange
            const listener1 = jest.fn();
            const listener2 = jest.fn();
            
            // Act
            adminPermissions.addListener(listener1);
            adminPermissions.addListener(listener2);
            
            // Assert
            expect(adminPermissions.listeners.size).toBe(2);
            
            // Act
            adminPermissions.removeListener(listener1);
            
            // Assert
            expect(adminPermissions.listeners.size).toBe(1);
            expect(adminPermissions.listeners.has(listener2)).toBe(true);
        });
    });
    
    describe('debug functionality', () => {
        it('should return correct debug information', () => {
            // Arrange
            adminPermissions.adminStatus = true;
            adminPermissions.loading = false;
            adminPermissions.lastCheck = Date.now();
            adminPermissions.addListener(() => {});
            
            // Act
            const debugInfo = adminPermissions.getDebugInfo();
            
            // Assert
            expect(debugInfo).toEqual({
                cacheState: {
                    adminStatus: true,
                    lastKnownStatus: null,
                    loading: false,
                    lastCheck: expect.any(Number),
                    cacheValid: true,
                    inGracePeriod: false,
                    hasPendingPromise: false,
                    gracePeriodEnd: null
                },
                promiseManagement: {
                    hasPendingPromise: false,
                    promiseQueueSize: 0,
                    hasPendingOperations: false,
                    totalPendingOperations: 0,
                    hasScheduledRefresh: expect.any(Boolean)
                },
                timings: {
                    cacheAge: expect.any(Number),
                    gracePeriodRemaining: null,
                    nextRefreshIn: expect.any(Number)
                },
                apiCalls: {
                    totalCalls: 0,
                    successfulCalls: 0,
                    failedCalls: 0,
                    lastCallDuration: 0,
                    successRate: 'N/A'
                },
                errorHandling: {
                    currentRetryCount: 0,
                    consecutiveFailures: 0,
                    lastErrorType: null,
                    errorHistorySize: 0,
                    retryConfig: expect.any(Object),
                    recentErrors: []
                },
                stateValidation: {
                    validationActive: expect.any(Boolean),
                    validationInterval: 60000,
                    lastValidation: 'N/A'
                },
                listenersCount: 1
            });
        });
        
        it('should show promise management details when operations are pending', () => {
            // Arrange
            adminPermissions.pendingPromise = Promise.resolve(true);
            adminPermissions.promiseQueue = [Promise.resolve(true), Promise.resolve(true)];
            adminPermissions.backgroundRefreshTimer = setTimeout(() => {}, 1000);
            
            // Act
            const debugInfo = adminPermissions.getDebugInfo();
            
            // Assert
            expect(debugInfo.promiseManagement).toEqual({
                hasPendingPromise: true,
                promiseQueueSize: 2,
                hasPendingOperations: true,
                totalPendingOperations: 3,
                hasScheduledRefresh: true
            });
            
            // Cleanup
            clearTimeout(adminPermissions.backgroundRefreshTimer);
        });
    });
    
    describe('enhanced caching logic', () => {
        describe('isCurrentUserAdmin with pending API calls', () => {
            it('should return last known status when API call is in progress', () => {
                // Arrange
                adminPermissions.loading = true;
                adminPermissions.lastKnownStatus = true;
                adminPermissions.adminStatus = null; // No valid cache
                
                // Act
                const result = adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(result).toBe(true);
            });
            
            it('should return false when no last known status and API call in progress', () => {
                // Arrange
                adminPermissions.loading = true;
                adminPermissions.lastKnownStatus = null;
                adminPermissions.adminStatus = null;
                
                // Act
                const result = adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(result).toBe(false);
            });
        });
        
        describe('grace period functionality', () => {
            it('should return last known status during grace period', () => {
                // Arrange
                adminPermissions.lastKnownStatus = true;
                adminPermissions.gracePeriodEnd = Date.now() + 15000; // 15 seconds from now
                adminPermissions.adminStatus = null; // No valid cache
                
                // Act
                const result = adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(result).toBe(true);
                expect(adminPermissions.isInGracePeriod()).toBe(true);
            });
            
            it('should not use grace period when it has expired', () => {
                // Arrange
                adminPermissions.lastKnownStatus = true;
                adminPermissions.gracePeriodEnd = Date.now() - 1000; // 1 second ago
                adminPermissions.adminStatus = null; // No valid cache
                
                // Act
                const result = adminPermissions.isCurrentUserAdmin();
                
                // Assert
                expect(adminPermissions.isInGracePeriod()).toBe(false);
                // Should still return last known status as fallback
                expect(result).toBe(true);
            });
        });
        
        describe('Promise queue management', () => {
            it('should reuse pending promise for multiple simultaneous calls', async () => {
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
                
                const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);
                
                // Assert
                expect(result1).toBe(true);
                expect(result2).toBe(true);
                expect(result3).toBe(true);
                expect(mockApiClient.get).toHaveBeenCalledTimes(1); // Only one API call
            });
            
            it('should properly manage promise queue size', async () => {
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
                
                // Check queue size during pending calls
                expect(adminPermissions.getPromiseQueueSize()).toBe(2); // 2 queued, 1 main
                expect(adminPermissions.hasPendingOperations()).toBe(true);
                
                // Resolve the promise
                resolvePromise({
                    data: {
                        data: {
                            isAuthenticated: true,
                            isAdmin: true
                        }
                    }
                });
                
                await Promise.all([promise1, promise2, promise3]);
                
                // Assert queue is cleaned up
                expect(adminPermissions.getPromiseQueueSize()).toBe(0);
                expect(adminPermissions.hasPendingOperations()).toBe(false);
            });
            
            it('should clean up promise queue on error', async () => {
                // Arrange
                const error = new Error('Test error');
                mockApiClient.get.mockRejectedValue(error);
                mockHandleApiError.mockReturnValue(error);
                
                // Act - start multiple calls that will fail
                const promise1 = adminPermissions.checkIsAdmin().catch(() => false);
                const promise2 = adminPermissions.checkIsAdmin().catch(() => false);
                
                await Promise.all([promise1, promise2]);
                
                // Assert queue is cleaned up even after error
                expect(adminPermissions.getPromiseQueueSize()).toBe(0);
                expect(adminPermissions.hasPendingOperations()).toBe(false);
            });
        });
        
        describe('background refresh', () => {
            it('should trigger background refresh when no pending promise', () => {
                // Arrange
                adminPermissions.loading = false;
                adminPermissions.pendingPromise = null;
                adminPermissions.lastKnownStatus = true;
                
                const checkIsAdminSpy = jest.spyOn(adminPermissions, 'checkIsAdmin').mockResolvedValue(true);
                
                // Act
                adminPermissions.backgroundRefresh();
                
                // Assert
                expect(checkIsAdminSpy).toHaveBeenCalled();
                
                checkIsAdminSpy.mockRestore();
            });
            
            it('should not trigger background refresh when already loading', () => {
                // Arrange
                adminPermissions.loading = true;
                
                const checkIsAdminSpy = jest.spyOn(adminPermissions, 'checkIsAdmin');
                
                // Act
                adminPermissions.backgroundRefresh();
                
                // Assert
                expect(checkIsAdminSpy).not.toHaveBeenCalled();
                
                checkIsAdminSpy.mockRestore();
            });
            
            it('should extend grace period on background refresh failure', async () => {
                // Arrange
                adminPermissions.loading = false;
                adminPermissions.pendingPromise = null;
                adminPermissions.lastKnownStatus = true;
                adminPermissions.gracePeriodEnd = null;
                
                const error = new Error('Background refresh failed');
                const checkIsAdminSpy = jest.spyOn(adminPermissions, 'checkIsAdmin').mockRejectedValue(error);
                
                // Act
                adminPermissions.backgroundRefresh();
                
                // Wait for the promise to reject
                await new Promise(resolve => setTimeout(resolve, 10));
                
                // Assert
                expect(adminPermissions.gracePeriodEnd).toBeTruthy();
                expect(adminPermissions.gracePeriodEnd).toBeGreaterThan(Date.now());
                
                checkIsAdminSpy.mockRestore();
            });
        });
        
        describe('scheduled background refresh', () => {
            beforeEach(() => {
                jest.useFakeTimers();
            });
            
            afterEach(() => {
                jest.useRealTimers();
            });
            
            it('should schedule background refresh after successful API call', async () => {
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
                await adminPermissions.checkIsAdmin();
                
                // Assert
                const debugInfo = adminPermissions.getDebugInfo();
                expect(debugInfo.promiseManagement.hasScheduledRefresh).toBe(true);
            });
            
            it('should cancel scheduled refresh when cache is cleared', async () => {
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
                
                await adminPermissions.checkIsAdmin();
                
                // Verify refresh is scheduled
                let debugInfo = adminPermissions.getDebugInfo();
                expect(debugInfo.promiseManagement.hasScheduledRefresh).toBe(true);
                
                // Act
                adminPermissions.clearCache();
                
                // Assert
                debugInfo = adminPermissions.getDebugInfo();
                expect(debugInfo.promiseManagement.hasScheduledRefresh).toBe(false);
            });
        });
    });
});