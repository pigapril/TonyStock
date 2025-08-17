/**
 * Admin Permissions Authentication State Synchronization Tests
 * 
 * Tests to verify that the useAdminPermissions hook properly synchronizes
 * with the authentication context and prevents race conditions.
 * 
 * Requirements: 6.1, 6.2, 7.1
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';

// Mock the useAuth hook
jest.mock('../../components/Auth/useAuth', () => ({
    useAuth: jest.fn()
}));

// Mock adminPermissions utility
jest.mock('../../utils/adminPermissions', () => ({
    checkIsAdmin: jest.fn()
}));

describe('Admin Permissions Authentication State Synchronization', () => {
    const mockUseAuth = require('../../components/Auth/useAuth').useAuth;
    const mockAdminPermissions = require('../../utils/adminPermissions');

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Authentication State Synchronization', () => {
        it('should use auth context admin status when available', async () => {
            // Arrange
            mockUseAuth.mockReturnValue({
                user: { id: 'user-123', email: 'user@example.com' },
                isAuthenticated: true,
                loading: false,
                isAdmin: true, // Auth context has admin status
                adminLoading: false
            });

            // Act
            const { result } = renderHook(() => useAdminPermissions());

            // Wait for state to stabilize
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Assert
            expect(result.current.isAdmin).toBe(true);
            expect(mockAdminPermissions.checkIsAdmin).not.toHaveBeenCalled(); // Should use auth context
        });

        it('should make direct API call when auth context admin status is not available', async () => {
            // Arrange
            mockUseAuth.mockReturnValue({
                user: { id: 'user-123', email: 'user@example.com' },
                isAuthenticated: true,
                loading: false,
                isAdmin: undefined, // Auth context doesn't have admin status
                adminLoading: false
            });

            mockAdminPermissions.checkIsAdmin.mockResolvedValue(true);

            // Act
            const { result } = renderHook(() => useAdminPermissions());

            // Wait for API call to complete
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Assert
            expect(result.current.isAdmin).toBe(true);
            expect(mockAdminPermissions.checkIsAdmin).toHaveBeenCalledTimes(1);
        });

        it('should wait for authentication state to stabilize before checking admin status', async () => {
            // Arrange - start with loading state
            mockUseAuth.mockReturnValue({
                user: null,
                isAuthenticated: false,
                loading: true, // Auth is still loading
                isAdmin: undefined,
                adminLoading: true
            });

            mockAdminPermissions.checkIsAdmin.mockResolvedValue(true);

            // Act
            const { result, rerender } = renderHook(() => useAdminPermissions());

            // Assert - should not make API call while loading
            expect(result.current.isAdmin).toBe(false);
            expect(mockAdminPermissions.checkIsAdmin).not.toHaveBeenCalled();

            // Update to stable authenticated state
            mockUseAuth.mockReturnValue({
                user: { id: 'user-123', email: 'user@example.com' },
                isAuthenticated: true,
                loading: false, // Auth loading complete
                isAdmin: undefined,
                adminLoading: false // Admin loading complete
            });

            rerender();

            // Wait for API call to complete
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Assert - should now make API call
            expect(mockAdminPermissions.checkIsAdmin).toHaveBeenCalledTimes(1);
            expect(result.current.isAdmin).toBe(true);
        });
    });

    describe('Race Condition Prevention', () => {
        it('should handle rapid authentication state changes without race conditions', async () => {
            // Arrange
            let resolveApiCall;
            const apiCallPromise = new Promise(resolve => {
                resolveApiCall = resolve;
            });
            
            mockAdminPermissions.checkIsAdmin.mockReturnValue(apiCallPromise);

            // Start with authenticated user
            mockUseAuth.mockReturnValue({
                user: { id: 'user-123', email: 'user@example.com' },
                isAuthenticated: true,
                loading: false,
                isAdmin: undefined,
                adminLoading: false
            });

            // Act
            const { result, rerender } = renderHook(() => useAdminPermissions());

            // Wait for API call to start
            await waitFor(() => {
                expect(result.current.loading).toBe(true);
            });

            // Simulate rapid auth state change (user logs out)
            mockUseAuth.mockReturnValue({
                user: null,
                isAuthenticated: false,
                loading: false,
                isAdmin: undefined,
                adminLoading: false
            });

            rerender();

            // Resolve the original API call (should be ignored)
            resolveApiCall(true);

            // Wait for state to stabilize
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Assert - should not use stale API response
            expect(result.current.isAdmin).toBe(false);
        });

        it('should prevent admin status from being cleared when API returns successful results', async () => {
            // Arrange
            mockUseAuth.mockReturnValue({
                user: { id: 'user-123', email: 'user@example.com' },
                isAuthenticated: true,
                loading: false,
                isAdmin: undefined,
                adminLoading: false
            });

            mockAdminPermissions.checkIsAdmin.mockResolvedValue(true);

            // Act
            const { result } = renderHook(() => useAdminPermissions());

            // Wait for API call to complete
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Assert - admin status should be set and maintained
            expect(result.current.isAdmin).toBe(true);

            // Simulate a minor auth context update that shouldn't clear admin status
            mockUseAuth.mockReturnValue({
                user: { id: 'user-123', email: 'user@example.com' },
                isAuthenticated: true,
                loading: false,
                isAdmin: true, // Auth context now has admin status
                adminLoading: false
            });

            const { rerender } = renderHook(() => useAdminPermissions());
            rerender();

            // Wait for any state updates
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
            });

            // Assert - admin status should still be true
            expect(result.current.isAdmin).toBe(true);
        });
    });

    describe('State Conflict Resolution', () => {
        it('should prioritize auth context admin status when available', async () => {
            // Arrange
            mockUseAuth.mockReturnValue({
                user: { id: 'user-123', email: 'user@example.com' },
                isAuthenticated: true,
                loading: false,
                isAdmin: true, // Auth context says admin
                adminLoading: false
            });

            mockAdminPermissions.checkIsAdmin.mockResolvedValue(false); // API would say not admin

            // Act
            const { result } = renderHook(() => useAdminPermissions());

            // Wait for state to stabilize
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Assert - should use auth context value, not make API call
            expect(result.current.isAdmin).toBe(true);
            expect(mockAdminPermissions.checkIsAdmin).not.toHaveBeenCalled();
        });

        it('should provide detailed debug information for state synchronization', async () => {
            // Arrange
            mockUseAuth.mockReturnValue({
                user: { id: 'user-123', email: 'user@example.com' },
                isAuthenticated: true,
                loading: false,
                isAdmin: true,
                adminLoading: false
            });

            // Act
            const { result } = renderHook(() => useAdminPermissions());

            // Wait for state to stabilize
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Assert
            const debugInfo = result.current.getDebugInfo();
            
            expect(debugInfo).toHaveProperty('hookState');
            expect(debugInfo).toHaveProperty('authContextState');
            expect(debugInfo).toHaveProperty('synchronizationState');
            
            expect(debugInfo.synchronizationState.usingAuthContext).toBe(true);
            expect(debugInfo.synchronizationState.hasConflict).toBe(false);
            expect(debugInfo.authContextState.isAuthenticated).toBe(true);
            expect(debugInfo.authContextState.authContextIsAdmin).toBe(true);
        });
    });

    describe('Error Handling with State Synchronization', () => {
        it('should handle API errors gracefully without affecting auth context state', async () => {
            // Arrange
            mockUseAuth.mockReturnValue({
                user: { id: 'user-123', email: 'user@example.com' },
                isAuthenticated: true,
                loading: false,
                isAdmin: undefined, // No auth context admin status
                adminLoading: false
            });

            const apiError = new Error('API Error');
            mockAdminPermissions.checkIsAdmin.mockRejectedValue(apiError);

            // Act
            const { result } = renderHook(() => useAdminPermissions());

            // Wait for API call to complete
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Assert
            expect(result.current.isAdmin).toBe(false);
            expect(result.current.error).toBe(apiError);
            expect(mockAdminPermissions.checkIsAdmin).toHaveBeenCalledTimes(1);
        });
    });
});