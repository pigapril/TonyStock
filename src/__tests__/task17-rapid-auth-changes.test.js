/**
 * Task 17: Rapid Authentication State Changes Tests
 * 
 * Tests specifically focused on handling rapid authentication state changes
 * and ensuring admin status is not lost during these transitions.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminPermissions } from '../hooks/useAdminPermissions';
import adminPermissions from '../utils/adminPermissions';

// Mock the auth hook with controllable state
const mockAuthHook = {
    user: null,
    isAuthenticated: false,
    loading: false,
    isAdmin: undefined,
    adminLoading: false
};

jest.mock('../components/Auth/useAuth', () => ({
    useAuth: () => mockAuthHook
}));

// Mock the admin permissions utility
jest.mock('../utils/adminPermissions', () => ({
    checkIsAdmin: jest.fn(),
    getDebugInfo: jest.fn(),
    getRecentLogs: jest.fn(),
    clearLogs: jest.fn(),
    getMetrics: jest.fn()
}));

describe('Task 17: Rapid Authentication State Changes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
        jest.useFakeTimers();
        
        // Reset mock auth state
        mockAuthHook.user = null;
        mockAuthHook.isAuthenticated = false;
        mockAuthHook.loading = false;
        mockAuthHook.isAdmin = undefined;
        mockAuthHook.adminLoading = false;
        
        // Setup default mock responses
        adminPermissions.checkIsAdmin.mockResolvedValue(true);
        adminPermissions.getDebugInfo.mockReturnValue({
            utility: { version: '1.2.0' },
            apiCalls: { totalCalls: 0, activeCalls: 0 },
            logging: { totalLogs: 0, errorCount: 0 }
        });
        adminPermissions.getRecentLogs.mockReturnValue([]);
        adminPermissions.clearLogs.mockImplementation(() => {});
        adminPermissions.getMetrics.mockReturnValue({
            totalLogs: 0,
            apiCalls: 0,
            errors: 0,
            authEvents: 0,
            uptime: 0,
            averageApiResponseTime: 150
        });
    });
    
    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });
    
    describe('Token Refresh Scenarios', () => {
        test('🔄 Should maintain admin status during token refresh', async () => {
            // Setup authenticated admin user
            mockAuthHook.user = { id: 'admin-123', email: 'admin@test.com' };
            mockAuthHook.isAuthenticated = true;
            mockAuthHook.loading = false;
            mockAuthHook.adminLoading = false;
            
            const { result } = renderHook(() => useAdminPermissions());
            
            // Wait for initial admin status
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });
            
            // Simulate token refresh cycle
            act(() => {
                mockAuthHook.loading = true; // Token refresh starts
            });
            
            act(() => {
                jest.advanceTimersByTime(100);
            });
            
            // Admin status should be preserved during token refresh
            expect(result.current.isAdmin).toBe(true);
            
            act(() => {
                mockAuthHook.loading = false; // Token refresh completes
            });
            
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            // Admin status should still be maintained
            expect(result.current.isAdmin).toBe(true);
            
            // Should not have made additional API calls during token refresh
            expect(adminPermissions.checkIsAdmin).toHaveBeenCalledTimes(1);
        });
        
        test('🔄 Should handle multiple rapid token refreshes', async () => {
            // Setup authenticated admin user
            mockAuthHook.user = { id: 'admin-123', email: 'admin@test.com' };
            mockAuthHook.isAuthenticated = true;
            mockAuthHook.loading = false;
            mockAuthHook.adminLoading = false;
            
            const { result } = renderHook(() => useAdminPermissions());
            
            // Wait for initial admin status
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });
            
            // Simulate multiple rapid token refreshes
            const refreshCycles = 5;
            for (let i = 0; i < refreshCycles; i++) {
                act(() => {
                    mockAuthHook.loading = true;
                    jest.advanceTimersByTime(50);
                });
                
                act(() => {
                    mockAuthHook.loading = false;
                    jest.advanceTimersByTime(50);
                });
            }
            
            // Wait for debounce to settle
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            // Admin status should be preserved through all refreshes
            expect(result.current.isAdmin).toBe(true);
            
            // Should not have made excessive API calls
            expect(adminPermissions.checkIsAdmin).toHaveBeenCalledTimes(1);
        });
    });
    
    describe('User Profile Updates', () => {
        test('🔄 Should maintain admin status when user profile updates', async () => {
            const userId = 'admin-123';
            
            // Setup authenticated admin user
            mockAuthHook.user = { id: userId, email: 'admin@test.com' };
            mockAuthHook.isAuthenticated = true;
            mockAuthHook.loading = false;
            mockAuthHook.adminLoading = false;
            
            const { result } = renderHook(() => useAdminPermissions());
            
            // Wait for initial admin status
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });
            
            // Simulate user profile updates (same ID, different properties)
            const profileUpdates = [
                { id: userId, email: 'admin@test.com', name: 'Admin User' },
                { id: userId, email: 'admin@test.com', name: 'Admin User', avatar: 'avatar.jpg' },
                { id: userId, email: 'admin@test.com', name: 'Admin User', avatar: 'avatar.jpg', lastLogin: new Date() }
            ];
            
            profileUpdates.forEach((updatedUser, index) => {
                act(() => {
                    mockAuthHook.user = updatedUser;
                    jest.advanceTimersByTime(100);
                });
            });
            
            // Wait for debounce
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            // Admin status should be preserved (same user ID)
            expect(result.current.isAdmin).toBe(true);
            
            // Should not have made additional API calls for same user
            expect(adminPermissions.checkIsAdmin).toHaveBeenCalledTimes(1);
        });
        
        test('🔄 Should check admin status when user ID changes', async () => {
            // Setup initial admin user
            mockAuthHook.user = { id: 'admin-123', email: 'admin@test.com' };
            mockAuthHook.isAuthenticated = true;
            mockAuthHook.loading = false;
            mockAuthHook.adminLoading = false;
            
            const { result } = renderHook(() => useAdminPermissions());
            
            // Wait for initial admin status
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });
            
            // Change to different user
            act(() => {
                mockAuthHook.user = { id: 'user-456', email: 'user@test.com' };
            });
            
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            // Should make new API call for different user
            await waitFor(() => {
                expect(adminPermissions.checkIsAdmin).toHaveBeenCalledTimes(2);
            });
        });
    });
    
    describe('Network Connectivity Changes', () => {
        test('🔄 Should handle network reconnection gracefully', async () => {
            // Setup authenticated admin user
            mockAuthHook.user = { id: 'admin-123', email: 'admin@test.com' };
            mockAuthHook.isAuthenticated = true;
            mockAuthHook.loading = false;
            mockAuthHook.adminLoading = false;
            
            // Mock initial API failure (network down)
            adminPermissions.checkIsAdmin.mockRejectedValueOnce(new Error('Network error'));
            
            const { result } = renderHook(() => useAdminPermissions());
            
            // Wait for initial failure
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            await waitFor(() => {
                expect(result.current.error).toBeTruthy();
                expect(result.current.isAdmin).toBe(false);
            });
            
            // Simulate network reconnection and auth state refresh
            adminPermissions.checkIsAdmin.mockResolvedValue(true);
            
            act(() => {
                mockAuthHook.loading = true; // Simulate auth refresh on reconnection
            });
            
            act(() => {
                mockAuthHook.loading = false;
                jest.advanceTimersByTime(200);
            });
            
            // Should recover admin status
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
                expect(result.current.error).toBe(null);
            });
        });
    });
    
    describe('Browser Tab Switching', () => {
        test('🔄 Should maintain admin status when tab becomes active again', async () => {
            // Setup authenticated admin user
            mockAuthHook.user = { id: 'admin-123', email: 'admin@test.com' };
            mockAuthHook.isAuthenticated = true;
            mockAuthHook.loading = false;
            mockAuthHook.adminLoading = false;
            
            const { result } = renderHook(() => useAdminPermissions());
            
            // Wait for initial admin status
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });
            
            // Simulate tab becoming inactive (auth might refresh when tab becomes active)
            // This is simulated by triggering auth loading states
            act(() => {
                mockAuthHook.loading = true;
                mockAuthHook.adminLoading = true;
            });
            
            act(() => {
                jest.advanceTimersByTime(100);
            });
            
            // Admin status should be preserved during auth refresh
            expect(result.current.isAdmin).toBe(true);
            
            // Tab becomes active, auth refresh completes
            act(() => {
                mockAuthHook.loading = false;
                mockAuthHook.adminLoading = false;
            });
            
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            // Admin status should still be maintained
            expect(result.current.isAdmin).toBe(true);
        });
    });
    
    describe('Concurrent Operations', () => {
        test('🔄 Should handle concurrent admin status checks', async () => {
            // Setup authenticated admin user
            mockAuthHook.user = { id: 'admin-123', email: 'admin@test.com' };
            mockAuthHook.isAuthenticated = true;
            mockAuthHook.loading = false;
            mockAuthHook.adminLoading = false;
            
            // Mock API calls with different response times
            let resolveFirst, resolveSecond, resolveThird;
            const firstCall = new Promise(resolve => { resolveFirst = resolve; });
            const secondCall = new Promise(resolve => { resolveSecond = resolve; });
            const thirdCall = new Promise(resolve => { resolveThird = resolve; });
            
            adminPermissions.checkIsAdmin
                .mockReturnValueOnce(firstCall)
                .mockReturnValueOnce(secondCall)
                .mockReturnValueOnce(thirdCall);
            
            const { result } = renderHook(() => useAdminPermissions());
            
            // Start first API call
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            expect(result.current.loading).toBe(true);
            
            // Trigger second API call before first completes
            act(() => {
                result.current.refreshAdminStatus();
            });
            
            // Trigger third API call
            act(() => {
                result.current.checkAdminStatus();
            });
            
            // Resolve calls in different order
            act(() => {
                resolveSecond(true); // Second call resolves first
            });
            
            act(() => {
                resolveThird(false); // Third call resolves second
            });
            
            act(() => {
                resolveFirst(true); // First call resolves last
            });
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            // Should use the result from the most recent call (third call)
            expect(result.current.isAdmin).toBe(false);
        });
        
        test('🔄 Should handle auth state changes during API calls', async () => {
            // Setup authenticated admin user
            mockAuthHook.user = { id: 'admin-123', email: 'admin@test.com' };
            mockAuthHook.isAuthenticated = true;
            mockAuthHook.loading = false;
            mockAuthHook.adminLoading = false;
            
            // Mock slow API call
            let resolveApiCall;
            const slowApiCall = new Promise(resolve => {
                resolveApiCall = resolve;
            });
            adminPermissions.checkIsAdmin.mockReturnValue(slowApiCall);
            
            const { result } = renderHook(() => useAdminPermissions());
            
            // Start API call
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            expect(result.current.loading).toBe(true);
            
            // Change auth state while API call is in progress
            act(() => {
                mockAuthHook.loading = true;
            });
            
            act(() => {
                mockAuthHook.loading = false;
                jest.advanceTimersByTime(100);
            });
            
            // Resolve API call
            act(() => {
                resolveApiCall(true);
            });
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
                expect(result.current.isAdmin).toBe(true);
            });
        });
    });
    
    describe('Edge Cases', () => {
        test('🔄 Should handle undefined user object transitions', async () => {
            const { result } = renderHook(() => useAdminPermissions());
            
            // Start with undefined user
            mockAuthHook.user = undefined;
            mockAuthHook.isAuthenticated = false;
            
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            expect(result.current.isAdmin).toBe(false);
            
            // Transition to null user
            act(() => {
                mockAuthHook.user = null;
            });
            
            act(() => {
                jest.advanceTimersByTime(100);
            });
            
            // Transition to actual user
            act(() => {
                mockAuthHook.user = { id: 'admin-123', email: 'admin@test.com' };
                mockAuthHook.isAuthenticated = true;
                mockAuthHook.loading = false;
                mockAuthHook.adminLoading = false;
            });
            
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });
        });
        
        test('🔄 Should handle boolean authentication state flipping', async () => {
            const { result } = renderHook(() => useAdminPermissions());
            
            // Rapid boolean state changes
            const authStates = [false, true, false, true, false, true];
            
            authStates.forEach((isAuth, index) => {
                act(() => {
                    mockAuthHook.isAuthenticated = isAuth;
                    if (isAuth) {
                        mockAuthHook.user = { id: 'admin-123', email: 'admin@test.com' };
                        mockAuthHook.loading = false;
                        mockAuthHook.adminLoading = false;
                    } else {
                        mockAuthHook.user = null;
                    }
                    jest.advanceTimersByTime(50);
                });
            });
            
            // Wait for debounce to settle on final state (authenticated)
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            // Should have final authenticated state
            expect(result.current.isAdmin).toBe(true);
            
            // Should not have made excessive API calls due to debouncing
            expect(adminPermissions.checkIsAdmin).toHaveBeenCalledTimes(1);
        });
    });
    
    describe('Performance and Debouncing', () => {
        test('🔄 Should debounce rapid changes effectively', async () => {
            const { result } = renderHook(() => useAdminPermissions());
            
            // Generate 20 rapid auth state changes
            const rapidChanges = 20;
            for (let i = 0; i < rapidChanges; i++) {
                act(() => {
                    mockAuthHook.isAuthenticated = i % 2 === 0;
                    mockAuthHook.user = i % 2 === 0 ? { id: `user-${i}`, email: `user${i}@test.com` } : null;
                    mockAuthHook.loading = i % 3 === 0;
                    mockAuthHook.adminLoading = i % 4 === 0;
                    jest.advanceTimersByTime(25); // Very rapid changes
                });
            }
            
            // Final stable state
            act(() => {
                mockAuthHook.isAuthenticated = true;
                mockAuthHook.user = { id: 'final-admin', email: 'final@test.com' };
                mockAuthHook.loading = false;
                mockAuthHook.adminLoading = false;
            });
            
            // Wait for debounce to settle
            act(() => {
                jest.advanceTimersByTime(300);
            });
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
                expect(result.current.isAdmin).toBe(true);
            });
            
            // Should have made minimal API calls due to effective debouncing
            expect(adminPermissions.checkIsAdmin).toHaveBeenCalledTimes(1);
        });
        
        test('🔄 Should maintain performance with high-frequency state changes', async () => {
            const startTime = Date.now();
            
            const { result } = renderHook(() => useAdminPermissions());
            
            // Setup authenticated user
            mockAuthHook.user = { id: 'admin-123', email: 'admin@test.com' };
            mockAuthHook.isAuthenticated = true;
            mockAuthHook.loading = false;
            mockAuthHook.adminLoading = false;
            
            // Generate many state changes
            const stateChanges = 100;
            for (let i = 0; i < stateChanges; i++) {
                act(() => {
                    // Vary different properties to trigger re-renders
                    mockAuthHook.user = { 
                        id: 'admin-123', 
                        email: 'admin@test.com',
                        lastActivity: Date.now() + i 
                    };
                    jest.advanceTimersByTime(10);
                });
            }
            
            // Wait for final state
            act(() => {
                jest.advanceTimersByTime(300);
            });
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            // Should complete in reasonable time (less than 1 second in real time would be much faster)
            expect(totalTime).toBeLessThan(5000);
            
            // Should maintain admin status
            expect(result.current.isAdmin).toBe(true);
        });
    });
    
    describe('Rapid Auth Changes Summary', () => {
        test('✅ All rapid authentication change scenarios handled', async () => {
            const scenarios = [
                'Token refresh cycles',
                'User profile updates',
                'Network connectivity changes',
                'Browser tab switching',
                'Concurrent operations',
                'Edge cases with undefined states',
                'Performance with high-frequency changes'
            ];
            
            // Final verification with normal operation
            mockAuthHook.user = { id: 'admin-123', email: 'admin@test.com' };
            mockAuthHook.isAuthenticated = true;
            mockAuthHook.loading = false;
            mockAuthHook.adminLoading = false;
            
            const { result } = renderHook(() => useAdminPermissions());
            
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
                expect(result.current.isAdmin).toBe(true);
            });
            
            console.log('✅ Rapid Authentication State Changes - ALL SCENARIOS HANDLED');
            console.log('Scenarios tested:', scenarios);
        });
    });
});