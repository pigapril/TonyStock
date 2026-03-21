/**
 * Admin Permissions Flow Integration Tests
 * 
 * Tests the complete admin permissions flow without cache including:
 * - useAdminPermissions hook integration
 * - AdminPermissions utility integration
 * - Authentication event handling
 * - Error scenarios and recovery
 * 
 * Requirements: 1.1, 1.2, 5.1, 5.2
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';

// Mock dependencies
jest.mock('../../api/apiClient', () => ({
    get: jest.fn()
}));

jest.mock('../../components/Auth/useAuth', () => ({
    useAuth: jest.fn()
}));

describe('Admin Permissions Flow Integration Tests', () => {
    const mockAdminUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Admin User'
    };

    const mockRegularUser = {
        id: 'user-456',
        email: 'user@example.com',
        name: 'Regular User'
    };

    // Get mocked modules
    const mockApiClient = require('../../api/apiClient');
    const { useAuth } = require('../../components/Auth/useAuth');

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock console methods
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Requirement 1.1: Real-time permission checks without cache', () => {
        it('should make direct API calls for each permission check', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            // Act
            const { result } = renderHook(() => useAdminPermissions());

            // Wait for initial check
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });

            // Make another check
            await act(async () => {
                await result.current.checkAdminStatus();
            });

            // Assert - Should make multiple API calls (no caching)
            expect(mockApiClient.get).toHaveBeenCalledTimes(2);
            expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/admin-status');
        });

        it('should use backend response immediately without storing in cache', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            // First call returns admin
            mockApiClient.get.mockResolvedValueOnce({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            // Second call returns non-admin (simulating permission change)
            mockApiClient.get.mockResolvedValueOnce({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: false
                    }
                }
            });

            const { result } = renderHook(() => useAdminPermissions());

            // Wait for first check
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });

            // Act - Make second check
            await act(async () => {
                await result.current.checkAdminStatus();
            });

            // Assert - Should immediately reflect new status (no cache)
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(false);
            });
        });

        it('should perform independent permission checks for multiple components', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            // Act - Render multiple hook instances
            const { result: result1 } = renderHook(() => useAdminPermissions());
            const { result: result2 } = renderHook(() => useAdminPermissions());

            // Wait for both to complete
            await waitFor(() => {
                expect(result1.current.isAdmin).toBe(true);
                expect(result2.current.isAdmin).toBe(true);
            });

            // Assert - Each hook should make its own API call
            expect(mockApiClient.get).toHaveBeenCalledTimes(2);
        });
    });

    describe('Requirement 1.2: Immediate reflection of permission changes', () => {
        it('should immediately reflect authentication state changes', async () => {
            // Arrange - Start with unauthenticated
            useAuth.mockReturnValue({
                user: null,
                isAuthenticated: false,
                loading: false
            });

            const { result, rerender } = renderHook(() => useAdminPermissions());

            // Should start with no admin access
            expect(result.current.isAdmin).toBe(false);
            expect(result.current.shouldShowAdminFeatures).toBe(false);

            // Act - Change to authenticated admin
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            rerender();

            // Assert - Should immediately start checking and update status
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
                expect(result.current.shouldShowAdminFeatures).toBe(true);
            });
        });

        it('should handle login events immediately without cache delays', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            const { result } = renderHook(() => useAdminPermissions());

            // Wait for initial state
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });

            // Clear previous calls
            mockApiClient.get.mockClear();

            // Act - Trigger login event
            act(() => {
                window.dispatchEvent(new Event('loginSuccess'));
            });

            // Assert - Should immediately check admin status
            await waitFor(() => {
                expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/admin-status');
            });
        });

        it('should handle logout events immediately', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            const { result } = renderHook(() => useAdminPermissions());

            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });

            // Act - Trigger logout event
            act(() => {
                window.dispatchEvent(new Event('logoutSuccess'));
            });

            // Assert - Should immediately clear admin status
            expect(result.current.isAdmin).toBe(false);
            expect(result.current.error).toBe(null);
        });
    });

    describe('Requirement 5.1: Reliable permission checking without cache-related errors', () => {
        it('should not fail due to cache-related timeouts', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            // Mock slow API response
            mockApiClient.get.mockImplementation(() => 
                new Promise(resolve => 
                    setTimeout(() => resolve({
                        data: {
                            data: {
                                isAuthenticated: true,
                                isAdmin: true
                            }
                        }
                    }), 1500)
                )
            );

            // Act
            const { result } = renderHook(() => useAdminPermissions());

            // Assert - Should handle slow response without cache timeout errors
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            }, { timeout: 3000 });

            expect(result.current.error).toBe(null);
        });

        it('should provide consistent behavior without cache state dependencies', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            // Act - Multiple hook instances should behave consistently
            const { result: result1 } = renderHook(() => useAdminPermissions());
            const { result: result2 } = renderHook(() => useAdminPermissions());
            const { result: result3 } = renderHook(() => useAdminPermissions());

            // Assert - All should reach the same state independently
            await waitFor(() => {
                expect(result1.current.isAdmin).toBe(true);
                expect(result2.current.isAdmin).toBe(true);
                expect(result3.current.isAdmin).toBe(true);
            });

            expect(result1.current.shouldShowAdminFeatures).toBe(true);
            expect(result2.current.shouldShowAdminFeatures).toBe(true);
            expect(result3.current.shouldShowAdminFeatures).toBe(true);
        });
    });

    describe('Requirement 5.2: Graceful error handling without cache fallback confusion', () => {
        it('should handle network errors gracefully without cache fallback', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            const networkError = new Error('Network Error');
            networkError.code = 'ERR_NETWORK';
            mockApiClient.get.mockRejectedValue(networkError);

            // Act
            const { result } = renderHook(() => useAdminPermissions());

            // Assert - Should handle error gracefully
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(false); // Secure default
            });

            // Error might be set or not, but admin should be false for security
            expect(result.current.shouldShowAdminFeatures).toBe(false);
        });

        it('should handle API errors without cache state preservation', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            // First call succeeds
            mockApiClient.get.mockResolvedValueOnce({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            const { result } = renderHook(() => useAdminPermissions());

            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });

            // Second call fails
            const serverError = new Error('Server Error');
            serverError.response = { status: 500 };
            mockApiClient.get.mockRejectedValue(serverError);

            // Act - Make another check
            await act(async () => {
                await result.current.checkAdminStatus();
            });

            // Assert - Should not preserve previous state, should handle error
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(false);
            });
        });

        it('should handle authentication errors (401/403) without cache confusion', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            const authError = new Error('Unauthorized');
            authError.response = { status: 401 };
            mockApiClient.get.mockRejectedValue(authError);

            // Act
            const { result } = renderHook(() => useAdminPermissions());

            // Assert - Should handle auth error gracefully
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(false);
            });

            expect(result.current.shouldShowAdminFeatures).toBe(false);
        });

        it('should recover from errors with fresh API calls', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            // First call fails
            const networkError = new Error('Network Error');
            mockApiClient.get.mockRejectedValueOnce(networkError);

            const { result } = renderHook(() => useAdminPermissions());

            await waitFor(() => {
                expect(result.current.isAdmin).toBe(false);
            });

            // Second call succeeds
            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            // Act - Retry
            await act(async () => {
                await result.current.refreshAdminStatus();
            });

            // Assert - Should recover with fresh API call
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });
            
            // Error should be cleared on successful recovery
            expect(result.current.error).toBe(null);
        });
    });

    describe('Loading state management', () => {
        it('should manage loading states correctly during API calls', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            let resolveApiCall;
            mockApiClient.get.mockImplementation(() => 
                new Promise(resolve => {
                    resolveApiCall = resolve;
                })
            );

            // Act
            const { result } = renderHook(() => useAdminPermissions());

            // Assert - Should be loading initially
            expect(result.current.loading).toBe(true);

            // Resolve API call
            act(() => {
                resolveApiCall({
                    data: {
                        data: {
                            isAuthenticated: true,
                            isAdmin: true
                        }
                    }
                });
            });

            // Assert - Loading should be false after API call
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
                expect(result.current.isAdmin).toBe(true);
            });
        });

        it('should handle loading states during manual refresh', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            const { result } = renderHook(() => useAdminPermissions());

            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
                expect(result.current.loading).toBe(false);
            });

            // Mock slow refresh
            let resolveRefresh;
            mockApiClient.get.mockImplementation(() => 
                new Promise(resolve => {
                    resolveRefresh = resolve;
                })
            );

            // Act - Manual refresh
            act(() => {
                result.current.refreshAdminStatus();
            });

            // Assert - Should be loading during refresh
            expect(result.current.loading).toBe(true);

            // Resolve refresh
            act(() => {
                resolveRefresh({
                    data: {
                        data: {
                            isAuthenticated: true,
                            isAdmin: true
                        }
                    }
                });
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
        });
    });
});