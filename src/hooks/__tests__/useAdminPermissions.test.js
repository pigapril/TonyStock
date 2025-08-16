/**
 * useAdminPermissions Hook Tests
 * 
 * Tests for the useAdminPermissions React hook.
 * Covers integration with auth context, state management, and event handling.
 */

import { renderHook, act, waitFor } from '@testing-library/react';

// Mock dependencies first
const mockUseAuth = jest.fn();
const mockAdminPermissions = {
    checkIsAdmin: jest.fn(),
    isCurrentUserAdmin: jest.fn(),
    clearCache: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    getDebugInfo: jest.fn(() => ({
        cacheState: {
            adminStatus: null,
            lastKnownStatus: null,
            loading: false,
            lastCheck: null
        },
        promiseManagement: {
            hasPendingOperations: false
        }
    }))
};

jest.mock('../../components/Auth/useAuth', () => ({
    useAuth: mockUseAuth
}));

jest.mock('../../utils/adminPermissions', () => mockAdminPermissions);

// Import after mocking
const { useAdminPermissions } = require('../useAdminPermissions');

describe('useAdminPermissions', () => {
    const mockAuthState = {
        user: null,
        isAuthenticated: false,
        loading: false
    };
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseAuth.mockReturnValue(mockAuthState);
        
        // Mock console methods
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    
    afterEach(() => {
        jest.restoreAllMocks();
    });
    
    describe('initial state', () => {
        it('should initialize with correct default values', () => {
            // Act
            const { result } = renderHook(() => useAdminPermissions());
            
            // Assert
            expect(result.current.isAdmin).toBe(false);
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBe(null);
            expect(result.current.lastChecked).toBe(null);
            expect(result.current.lastKnownStatus).toBe(null); // New: Test lastKnownStatus
            expect(result.current.shouldShowAdminFeatures).toBe(false);
        });
    });
    
    describe('authentication integration', () => {
        it('should check admin status when user is authenticated', async () => {
            // Arrange
            const mockUser = { id: '123', email: 'admin@example.com' };
            mockUseAuth.mockReturnValue({
                ...mockAuthState,
                user: mockUser,
                isAuthenticated: true,
                loading: false
            });
            
            mockAdminPermissions.checkIsAdmin.mockResolvedValue(true);
            
            // Act
            const { result } = renderHook(() => useAdminPermissions());
            
            // Assert
            await waitFor(() => {
                expect(mockAdminPermissions.checkIsAdmin).toHaveBeenCalled();
            });
        });
        
        it('should not check admin status while auth is loading', () => {
            // Arrange
            mockUseAuth.mockReturnValue({
                ...mockAuthState,
                user: null,
                isAuthenticated: false,
                loading: true
            });
            
            // Act
            renderHook(() => useAdminPermissions());
            
            // Assert
            expect(mockAdminPermissions.checkIsAdmin).not.toHaveBeenCalled();
        });
    });
    
    describe('admin status checking', () => {
        it('should update admin status when check succeeds', async () => {
            // Arrange
            const mockUser = { id: '123', email: 'admin@example.com' };
            mockUseAuth.mockReturnValue({
                ...mockAuthState,
                user: mockUser,
                isAuthenticated: true,
                loading: false
            });
            
            mockAdminPermissions.checkIsAdmin.mockResolvedValue(true);
            
            // Act
            const { result } = renderHook(() => useAdminPermissions());
            
            // Assert
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
                expect(result.current.lastChecked).toBeTruthy();
            });
        });
        
        it('should handle admin status check errors', async () => {
            // Arrange
            const mockUser = { id: '123', email: 'user@example.com' };
            mockUseAuth.mockReturnValue({
                ...mockAuthState,
                user: mockUser,
                isAuthenticated: true,
                loading: false
            });
            
            const mockError = new Error('API Error');
            mockAdminPermissions.checkIsAdmin.mockRejectedValue(mockError);
            mockAdminPermissions.isCurrentUserAdmin.mockReturnValue(false);
            
            // Act
            const { result } = renderHook(() => useAdminPermissions());
            
            // Assert
            await waitFor(() => {
                expect(result.current.error).toBe(mockError);
                expect(result.current.isAdmin).toBe(false);
            });
        });
    });
    
    describe('methods', () => {
        it('should provide checkAdminStatus method', async () => {
            // Arrange
            const mockUser = { id: '123', email: 'admin@example.com' };
            mockUseAuth.mockReturnValue({
                ...mockAuthState,
                user: mockUser,
                isAuthenticated: true,
                loading: false
            });
            
            mockAdminPermissions.checkIsAdmin.mockResolvedValue(true);
            
            const { result } = renderHook(() => useAdminPermissions());
            
            // Act
            const adminStatus = await act(async () => {
                return await result.current.checkAdminStatus();
            });
            
            // Assert
            expect(adminStatus).toBe(true);
            expect(mockAdminPermissions.checkIsAdmin).toHaveBeenCalled();
        });
        
        it('should provide isCurrentUserAdmin method', () => {
            // Arrange
            mockAdminPermissions.isCurrentUserAdmin.mockReturnValue(true);
            
            const { result } = renderHook(() => useAdminPermissions());
            
            // Act
            const isAdmin = result.current.isCurrentUserAdmin();
            
            // Assert
            expect(isAdmin).toBe(true);
            expect(mockAdminPermissions.isCurrentUserAdmin).toHaveBeenCalled();
        });
    });
    
    describe('computed values', () => {
        it('should calculate shouldShowAdminFeatures correctly', async () => {
            // Arrange
            const mockUser = { id: '123', email: 'admin@example.com' };
            mockUseAuth.mockReturnValue({
                ...mockAuthState,
                user: mockUser,
                isAuthenticated: true,
                loading: false
            });
            
            mockAdminPermissions.checkIsAdmin.mockResolvedValue(true);
            
            // Act
            const { result } = renderHook(() => useAdminPermissions());
            
            // Assert
            await waitFor(() => {
                expect(result.current.shouldShowAdminFeatures).toBe(true);
            });
        });
    });
    
    describe('listener management', () => {
        it('should add and remove admin permissions listeners', () => {
            // Act
            const { unmount } = renderHook(() => useAdminPermissions());
            
            // Assert listener was added
            expect(mockAdminPermissions.addListener).toHaveBeenCalled();
            
            // Act
            unmount();
            
            // Assert listener was removed
            expect(mockAdminPermissions.removeListener).toHaveBeenCalled();
        });
    });
    
    describe('lastKnownStatus tracking', () => {
        it('should track lastKnownStatus when admin status is updated', async () => {
            // Arrange
            const mockUser = { id: '123', email: 'admin@example.com' };
            mockUseAuth.mockReturnValue({
                ...mockAuthState,
                user: mockUser,
                isAuthenticated: true,
                loading: false
            });
            
            mockAdminPermissions.checkIsAdmin.mockResolvedValue(true);
            
            // Act
            const { result } = renderHook(() => useAdminPermissions());
            
            // Assert
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
                expect(result.current.lastKnownStatus).toBe(true);
            });
        });
        
        it('should clear lastKnownStatus when admin status is cleared', () => {
            // Arrange
            const { result } = renderHook(() => useAdminPermissions());
            
            // Act
            act(() => {
                result.current.clearAdminStatus();
            });
            
            // Assert
            expect(result.current.lastKnownStatus).toBe(null);
            expect(mockAdminPermissions.clearCache).toHaveBeenCalled();
        });
    });
});