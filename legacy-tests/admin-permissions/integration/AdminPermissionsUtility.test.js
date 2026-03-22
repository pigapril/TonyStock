/**
 * Admin Permissions Utility Integration Tests
 * 
 * Tests the AdminPermissions utility class without cache functionality:
 * - Direct API calls without caching
 * - Error handling without cache fallback
 * - Authentication event handling
 * - Consistent behavior across multiple calls
 * 
 * Requirements: 1.1, 1.2, 5.1, 5.2
 */

import { AdminPermissions } from '../../utils/adminPermissions';

// Mock dependencies
jest.mock('../../api/apiClient', () => ({
    get: jest.fn()
}));

describe('Admin Permissions Utility Integration Tests', () => {
    let adminPermissions;
    
    // Get mocked module
    const mockApiClient = require('../../api/apiClient');

    beforeEach(() => {
        adminPermissions = new AdminPermissions();
        jest.clearAllMocks();
        
        // Mock console methods
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Requirement 1.1: Direct API calls without caching', () => {
        it('should always make API calls for admin status checks', async () => {
            // Arrange
            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            // Act - Make multiple calls
            const result1 = await adminPermissions.checkIsAdmin();
            const result2 = await adminPermissions.checkIsAdmin();
            const result3 = await adminPermissions.checkIsAdmin();

            // Assert - Each call should make an API request
            expect(mockApiClient.get).toHaveBeenCalledTimes(3);
            expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/admin-status');
            expect(result1).toBe(true);
            expect(result2).toBe(true);
            expect(result3).toBe(true);
        });

        it('should return boolean result directly from API response', async () => {
            // Arrange - Test admin user
            mockApiClient.get.mockResolvedValueOnce({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            // Act
            const adminResult = await adminPermissions.checkIsAdmin();

            // Assert
            expect(adminResult).toBe(true);

            // Arrange - Test non-admin user
            mockApiClient.get.mockResolvedValueOnce({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: false
                    }
                }
            });

            // Act
            const nonAdminResult = await adminPermissions.checkIsAdmin();

            // Assert
            expect(nonAdminResult).toBe(false);
        });

        it('should handle malformed API responses gracefully', async () => {
            // Arrange - Test various malformed responses
            const malformedResponses = [
                { data: null },
                { data: {} },
                { data: { data: null } },
                { data: { data: {} } },
                { data: { data: { isAuthenticated: true } } }, // Missing isAdmin
                null,
                undefined
            ];

            for (const response of malformedResponses) {
                mockApiClient.get.mockResolvedValueOnce(response);
                
                // Act
                const result = await adminPermissions.checkIsAdmin();
                
                // Assert - Should default to false for security
                expect(result).toBe(false);
            }

            expect(mockApiClient.get).toHaveBeenCalledTimes(malformedResponses.length);
        });
    });

    describe('Requirement 1.2: Immediate reflection of backend state', () => {
        it('should immediately reflect permission changes from backend', async () => {
            // Arrange - First call returns admin
            mockApiClient.get.mockResolvedValueOnce({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            // Act
            const firstResult = await adminPermissions.checkIsAdmin();
            expect(firstResult).toBe(true);

            // Arrange - Second call returns non-admin (permission revoked)
            mockApiClient.get.mockResolvedValueOnce({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: false
                    }
                }
            });

            // Act
            const secondResult = await adminPermissions.checkIsAdmin();

            // Assert - Should immediately reflect the change
            expect(secondResult).toBe(false);
            expect(mockApiClient.get).toHaveBeenCalledTimes(2);
        });

        it('should provide consistent results across different methods', async () => {
            // Arrange
            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            // Act - Call different methods
            const checkResult = await adminPermissions.checkIsAdmin();
            const currentUserResult = await adminPermissions.isCurrentUserAdmin();
            const showFeaturesResult = await adminPermissions.shouldShowAdminFeatures();
            const refreshResult = await adminPermissions.refreshAdminStatus();

            // Assert - All methods should return consistent results
            expect(checkResult).toBe(true);
            expect(currentUserResult).toBe(true);
            expect(showFeaturesResult).toBe(true);
            expect(refreshResult).toBe(true);

            // Each method should make its own API call
            expect(mockApiClient.get).toHaveBeenCalledTimes(4);
        });
    });

    describe('Requirement 5.1: Reliable behavior without cache dependencies', () => {
        it('should provide consistent behavior across multiple instances', async () => {
            // Arrange
            const instance1 = new AdminPermissions();
            const instance2 = new AdminPermissions();
            const instance3 = new AdminPermissions();

            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            // Act - Call from different instances
            const result1 = await instance1.checkIsAdmin();
            const result2 = await instance2.checkIsAdmin();
            const result3 = await instance3.checkIsAdmin();

            // Assert - All instances should behave consistently
            expect(result1).toBe(true);
            expect(result2).toBe(true);
            expect(result3).toBe(true);
            expect(mockApiClient.get).toHaveBeenCalledTimes(3);
        });

        it('should handle concurrent API calls correctly', async () => {
            // Arrange
            mockApiClient.get.mockImplementation(() => 
                new Promise(resolve => 
                    setTimeout(() => resolve({
                        data: {
                            data: {
                                isAuthenticated: true,
                                isAdmin: true
                            }
                        }
                    }), 100)
                )
            );

            // Act - Make concurrent calls
            const promises = [
                adminPermissions.checkIsAdmin(),
                adminPermissions.isCurrentUserAdmin(),
                adminPermissions.shouldShowAdminFeatures(),
                adminPermissions.refreshAdminStatus()
            ];

            const results = await Promise.all(promises);

            // Assert - All calls should succeed independently
            expect(results).toEqual([true, true, true, true]);
            expect(mockApiClient.get).toHaveBeenCalledTimes(4);
        });

        it('should not have race conditions between calls', async () => {
            // Arrange - Simulate varying response times
            let callCount = 0;
            mockApiClient.get.mockImplementation(() => {
                callCount++;
                const delay = callCount % 2 === 0 ? 50 : 150; // Alternate delays
                const isAdmin = callCount % 2 === 1; // Alternate results
                
                return new Promise(resolve => 
                    setTimeout(() => resolve({
                        data: {
                            data: {
                                isAuthenticated: true,
                                isAdmin
                            }
                        }
                    }), delay)
                );
            });

            // Act - Make rapid successive calls
            const promise1 = adminPermissions.checkIsAdmin();
            const promise2 = adminPermissions.checkIsAdmin();
            const promise3 = adminPermissions.checkIsAdmin();
            const promise4 = adminPermissions.checkIsAdmin();

            const results = await Promise.all([promise1, promise2, promise3, promise4]);

            // Assert - Each call should get its own result
            expect(results).toEqual([true, false, true, false]);
            expect(mockApiClient.get).toHaveBeenCalledTimes(4);
        });
    });

    describe('Requirement 5.2: Graceful error handling without cache fallback', () => {
        it('should handle network errors gracefully', async () => {
            // Arrange
            const networkError = new Error('Network Error');
            networkError.code = 'ERR_NETWORK';
            mockApiClient.get.mockRejectedValue(networkError);

            // Act
            const result = await adminPermissions.checkIsAdmin();

            // Assert - Should return false for security (no cache fallback)
            expect(result).toBe(false);
            expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/admin-status');
        });

        it('should handle server errors (5xx) gracefully', async () => {
            // Arrange
            const serverError = new Error('Internal Server Error');
            serverError.response = { status: 500 };
            mockApiClient.get.mockRejectedValue(serverError);

            // Act
            const result = await adminPermissions.checkIsAdmin();

            // Assert - Should return false for security
            expect(result).toBe(false);
        });

        it('should handle authentication errors (401/403) gracefully', async () => {
            // Arrange
            const authError = new Error('Unauthorized');
            authError.response = { status: 401 };
            mockApiClient.get.mockRejectedValue(authError);

            // Act
            const result = await adminPermissions.checkIsAdmin();

            // Assert - Should return false for security
            expect(result).toBe(false);
        });

        it('should handle timeout errors gracefully', async () => {
            // Arrange
            const timeoutError = new Error('Request Timeout');
            timeoutError.code = 'ECONNABORTED';
            mockApiClient.get.mockRejectedValue(timeoutError);

            // Act
            const result = await adminPermissions.checkIsAdmin();

            // Assert - Should return false for security
            expect(result).toBe(false);
        });

        it('should recover from errors with fresh API calls', async () => {
            // Arrange - First call fails
            const networkError = new Error('Network Error');
            mockApiClient.get.mockRejectedValueOnce(networkError);

            // Act - First call
            const firstResult = await adminPermissions.checkIsAdmin();
            expect(firstResult).toBe(false);

            // Arrange - Second call succeeds
            mockApiClient.get.mockResolvedValueOnce({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            // Act - Second call
            const secondResult = await adminPermissions.checkIsAdmin();

            // Assert - Should recover with fresh API call
            expect(secondResult).toBe(true);
            expect(mockApiClient.get).toHaveBeenCalledTimes(2);
        });

        it('should handle mixed success/error scenarios correctly', async () => {
            // Arrange - Alternate between success and error
            mockApiClient.get
                .mockResolvedValueOnce({
                    data: {
                        data: {
                            isAuthenticated: true,
                            isAdmin: true
                        }
                    }
                })
                .mockRejectedValueOnce(new Error('Network Error'))
                .mockResolvedValueOnce({
                    data: {
                        data: {
                            isAuthenticated: true,
                            isAdmin: false
                        }
                    }
                })
                .mockRejectedValueOnce(new Error('Server Error'));

            // Act - Make multiple calls
            const results = [];
            results.push(await adminPermissions.checkIsAdmin()); // Success: true
            results.push(await adminPermissions.checkIsAdmin()); // Error: false
            results.push(await adminPermissions.checkIsAdmin()); // Success: false
            results.push(await adminPermissions.checkIsAdmin()); // Error: false

            // Assert - Each call should be independent
            expect(results).toEqual([true, false, false, false]);
            expect(mockApiClient.get).toHaveBeenCalledTimes(4);
        });
    });

    describe('Authentication event handling', () => {
        it('should setup authentication event listeners', () => {
            // Arrange
            const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

            // Act
            new AdminPermissions();

            // Assert - Should setup event listeners
            expect(addEventListenerSpy).toHaveBeenCalledWith('loginSuccess', expect.any(Function));
            expect(addEventListenerSpy).toHaveBeenCalledWith('logoutSuccess', expect.any(Function));
        });

        it('should log authentication events for debugging', () => {
            // Arrange
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            new AdminPermissions();

            // Act - Trigger events
            window.dispatchEvent(new Event('loginSuccess'));
            window.dispatchEvent(new Event('logoutSuccess'));

            // Assert - Should log events
            expect(consoleSpy).toHaveBeenCalledWith('AdminPermissions: Login detected');
            expect(consoleSpy).toHaveBeenCalledWith('AdminPermissions: Logout detected');
        });
    });

    describe('Debug functionality', () => {
        it('should provide debug information without cache details', () => {
            // Act
            const debugInfo = adminPermissions.getDebugInfo();

            // Assert - Should provide simplified debug info
            expect(debugInfo).toEqual({
                message: 'AdminPermissions utility - cache removed, using direct API calls',
                timestamp: expect.any(String)
            });

            // Should not contain cache-related information
            expect(debugInfo).not.toHaveProperty('adminStatus');
            expect(debugInfo).not.toHaveProperty('lastCheck');
            expect(debugInfo).not.toHaveProperty('cacheValid');
        });
    });
});