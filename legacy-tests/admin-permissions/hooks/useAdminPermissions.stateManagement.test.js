/**
 * Test suite for useAdminPermissions hook state management improvements
 * Tests debouncing, state synchronization, and conflict resolution
 */

import { renderHook, act, waitFor } from '@testing-library/react';

// Mock the entire modules to avoid import issues
jest.mock('../../components/Auth/useAuth', () => ({
    useAuth: jest.fn()
}));

jest.mock('../../utils/adminPermissions', () => ({
    checkIsAdmin: jest.fn()
}));

// Import after mocking
const { useAdminPermissions } = require('../../hooks/useAdminPermissions');
const { useAuth } = require('../../components/Auth/useAuth');
const adminPermissions = require('../../utils/adminPermissions');

describe('useAdminPermissions State Management', () => {
    let mockUseAuth;
    let mockCheckIsAdmin;
    
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        
        mockUseAuth = {
            user: { id: 'user123', email: 'test@example.com' },
            isAuthenticated: true,
            loading: false,
            isAdmin: undefined,
            adminLoading: false
        };
        
        mockCheckIsAdmin = jest.fn().mockResolvedValue(true);
        
        useAuth.mockReturnValue(mockUseAuth);
        adminPermissions.checkIsAdmin = mockCheckIsAdmin;
        
        // Mock console methods to reduce test noise
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });
    
    describe('Debouncing Authentication State Changes', () => {
        test('should debounce rapid authentication state changes', async () => {
            const { result, rerender } = renderHook(() => useAdminPermissions());
            
            // Simulate rapid auth state changes
            mockUseAuth.loading = true;
            rerender();
            
            mockUseAuth.loading = false;
            mockUseAuth.isAuthenticated = false;
            rerender();
            
            mockUseAuth.isAuthenticated = true;
            rerender();
            
            // Should not have called API yet due to debouncing
            expect(mockCheckIsAdmin).not.toHaveBeenCalled();
            
            // Fast-forward past debounce delay
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            await waitFor(() => {
                expect(mockCheckIsAdmin).toHaveBeenCalledTimes(1);
            });
        });
        
        test('should not override recent successful admin status', async () => {
            const { result, rerender } = renderHook(() => useAdminPermissions());
            
            // Initial successful admin check
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });
            
            // Simulate auth context change that might try to override
            mockUseAuth.isAdmin = false;
            rerender();
            
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            // Should preserve the recent successful status
            expect(result.current.isAdmin).toBe(true);
        });
    });
    
    describe('State Synchronization Logic', () => {
        test('should wait for authentication state to stabilize', async () => {
            mockUseAuth.loading = true;
            mockUseAuth.adminLoading = true;
            
            const { result } = renderHook(() => useAdminPermissions());
            
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            // Should not make API call while auth is loading
            expect(mockCheckIsAdmin).not.toHaveBeenCalled();
            expect(result.current.loading).toBe(true); // Should show loading from auth
            
            // Stabilize auth state
            mockUseAuth.loading = false;
            mockUseAuth.adminLoading = false;
            
            const { rerender } = renderHook(() => useAdminPermissions());
            rerender();
            
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            await waitFor(() => {
                expect(mockCheckIsAdmin).toHaveBeenCalledTimes(1);
            });
        });
        
        test('should prioritize auth context admin status when available', async () => {
            mockUseAuth.isAdmin = true;
            
            const { result } = renderHook(() => useAdminPermissions());
            
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });
            
            // Should not make API call when auth context provides admin status
            expect(mockCheckIsAdmin).not.toHaveBeenCalled();
        });
    });
    
    describe('Enhanced Logging and Debugging', () => {
        test('should provide comprehensive debug information', async () => {
            const { result } = renderHook(() => useAdminPermissions());
            
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });
            
            const debugInfo = result.current.getDebugInfo();
            
            expect(debugInfo).toHaveProperty('hookState');
            expect(debugInfo).toHaveProperty('authContextState');
            expect(debugInfo).toHaveProperty('debouncedAuthState');
            expect(debugInfo).toHaveProperty('synchronizationState');
            expect(debugInfo).toHaveProperty('stateTransitionLog');
            
            expect(debugInfo.synchronizationState).toHaveProperty('lastSuccessfulStatus');
            expect(debugInfo.synchronizationState).toHaveProperty('hasRecentSuccessfulStatus');
            expect(debugInfo.stateTransitionLog).toBeInstanceOf(Array);
        });
        
        test('should track state transitions in log', async () => {
            const { result } = renderHook(() => useAdminPermissions());
            
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });
            
            const debugInfo = result.current.getDebugInfo();
            const log = debugInfo.stateTransitionLog;
            
            expect(log.length).toBeGreaterThan(0);
            expect(log[0]).toHaveProperty('timestamp');
            expect(log[0]).toHaveProperty('event');
            expect(log[0]).toHaveProperty('details');
        });
    });
    
    describe('Race Condition Prevention', () => {
        test('should handle concurrent API calls correctly', async () => {
            const { result } = renderHook(() => useAdminPermissions());
            
            // Start multiple concurrent checks
            const promise1 = result.current.checkAdminStatus();
            const promise2 = result.current.checkAdminStatus();
            const promise3 = result.current.refreshAdminStatus();
            
            await Promise.all([promise1, promise2, promise3]);
            
            // Should only update state with the latest successful response
            expect(result.current.isAdmin).toBe(true);
            expect(mockCheckIsAdmin).toHaveBeenCalledTimes(3);
        });
        
        test('should cancel stale API responses', async () => {
            mockCheckIsAdmin
                .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve(false), 100)))
                .mockImplementationOnce(() => Promise.resolve(true));
            
            const { result } = renderHook(() => useAdminPermissions());
            
            // Start first API call
            const promise1 = result.current.checkAdminStatus();
            
            // Start second API call immediately
            const promise2 = result.current.checkAdminStatus();
            
            // Fast-forward to resolve both
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            await Promise.all([promise1, promise2]);
            
            // Should use result from latest API call
            expect(result.current.isAdmin).toBe(true);
        });
    });
    
    describe('Authentication Event Handling', () => {
        test('should handle login success event with proper delay', async () => {
            const { result } = renderHook(() => useAdminPermissions());
            
            // Simulate login success event
            act(() => {
                window.dispatchEvent(new Event('loginSuccess'));
            });
            
            // Should not call API immediately
            expect(mockCheckIsAdmin).not.toHaveBeenCalled();
            
            // Fast-forward past the delay
            act(() => {
                jest.advanceTimersByTime(250);
            });
            
            await waitFor(() => {
                expect(mockCheckIsAdmin).toHaveBeenCalledTimes(1);
            });
        });
        
        test('should clear admin status on logout success event', async () => {
            const { result } = renderHook(() => useAdminPermissions());
            
            // Set initial admin status
            act(() => {
                jest.advanceTimersByTime(200);
            });
            
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });
            
            // Simulate logout success event
            act(() => {
                window.dispatchEvent(new Event('logoutSuccess'));
            });
            
            expect(result.current.isAdmin).toBe(false);
            expect(result.current.error).toBe(null);
        });
    });
});