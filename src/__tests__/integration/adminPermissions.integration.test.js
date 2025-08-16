/**
 * Admin Permissions Integration Tests
 * 
 * Integration tests for React Hook and component behavior.
 * Tests state synchronization between useAdminPermissions hook, AdminOnly component,
 * and the adminPermissions utility class.
 * 
 * Test Coverage:
 * - useAdminPermissions Hook state synchronization
 * - AdminOnly component rendering with different permission states
 * - State consistency between Hook and utility class
 * 
 * @author SentimentInsideOut Team
 * @version 1.0.0 - Task 8 Implementation
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

// Mock dependencies first
const mockUseAuth = jest.fn();
const mockApiClient = {
    get: jest.fn()
};

// Create a real-like adminPermissions mock that maintains state
class MockAdminPermissions {
    constructor() {
        this.adminStatus = null;
        this.loading = false;
        this.lastCheck = null;
        this.lastKnownStatus = null;
        this.listeners = new Set();
        this.pendingPromise = null;
        this.gracePeriodEnd = null;
        this.gracePeriod = 30000;
        this.cacheTimeout = 5 * 60 * 1000;
        
        // Bind methods
        this.checkIsAdmin = this.checkIsAdmin.bind(this);
        this.isCurrentUserAdmin = this.isCurrentUserAdmin.bind(this);
        this.clearCache = this.clearCache.bind(this);
        this.addListener = this.addListener.bind(this);
        this.removeListener = this.removeListener.bind(this);
        this.notifyListeners = this.notifyListeners.bind(this);
        this.getDebugInfo = this.getDebugInfo.bind(this);
    }
    
    async checkIsAdmin() {
        if (this.pendingPromise) {
            return this.pendingPromise;
        }
        
        this.loading = true;
        this.pendingPromise = this._performCheck();
        
        try {
            const result = await this.pendingPromise;
            return result;
        } finally {
            this.loading = false;
            this.pendingPromise = null;
        }
    }
    
    async _performCheck() {
        // Simulate API call
        const response = await mockApiClient.get('/api/auth/admin-status');
        const isAdmin = response.data?.data?.isAdmin || false;
        
        this.adminStatus = isAdmin;
        this.lastKnownStatus = isAdmin;
        this.lastCheck = Date.now();
        this.gracePeriodEnd = null;
        
        this.notifyListeners(isAdmin);
        return isAdmin;
    }
    
    isCurrentUserAdmin() {
        if (this.isCacheValid()) {
            return this.adminStatus;
        }
        
        if (this.loading && this.lastKnownStatus !== null) {
            return this.lastKnownStatus;
        }
        
        if (this.isInGracePeriod()) {
            return this.lastKnownStatus || false;
        }
        
        return this.lastKnownStatus || false;
    }
    
    isCacheValid() {
        return this.adminStatus !== null && this.lastCheck && 
               (Date.now() - this.lastCheck) < this.cacheTimeout;
    }
    
    isInGracePeriod() {
        return this.gracePeriodEnd !== null && Date.now() < this.gracePeriodEnd;
    }
    
    clearCache() {
        this.adminStatus = null;
        this.lastCheck = null;
        this.loading = false;
        this.pendingPromise = null;
        this.lastKnownStatus = null;
        this.gracePeriodEnd = null;
        this.notifyListeners(null);
    }
    
    addListener(listener) {
        if (typeof listener === 'function') {
            this.listeners.add(listener);
        }
    }
    
    removeListener(listener) {
        this.listeners.delete(listener);
    }
    
    notifyListeners(status) {
        this.listeners.forEach(listener => {
            try {
                listener(status);
            } catch (error) {
                console.error('Listener error:', error);
            }
        });
    }
    
    getDebugInfo() {
        return {
            cacheState: {
                adminStatus: this.adminStatus,
                lastKnownStatus: this.lastKnownStatus,
                loading: this.loading,
                lastCheck: this.lastCheck
            },
            promiseManagement: {
                hasPendingOperations: this.pendingPromise !== null
            }
        };
    }
    
    // Test helper methods
    _setAdminStatus(status) {
        this.adminStatus = status;
        this.lastKnownStatus = status;
        this.lastCheck = Date.now();
        this.notifyListeners(status);
    }
    
    _setLoading(loading) {
        this.loading = loading;
    }
    
    _setLastKnownStatus(status) {
        this.lastKnownStatus = status;
    }
    
    _startGracePeriod() {
        this.gracePeriodEnd = Date.now() + this.gracePeriod;
    }
}

const mockAdminPermissions = new MockAdminPermissions();

jest.mock('../../components/Auth/useAuth', () => ({
    useAuth: mockUseAuth
}));

jest.mock('../../api/apiClient', () => mockApiClient);

jest.mock('../../utils/adminPermissions', () => mockAdminPermissions);

// Import after mocking
const { useAdminPermissions } = require('../../hooks/useAdminPermissions');
const AdminOnly = require('../../components/AdminOnly/AdminOnly').default;

describe('Admin Permissions Integration Tests', () => {
    const mockAuthState = {
        user: { id: '123', email: 'test@example.com' },
        isAuthenticated: true,
        loading: false
    };
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseAuth.mockReturnValue(mockAuthState);
        mockAdminPermissions.clearCache();
        
        // Mock console methods to suppress warnings and logs during tests
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        
        // Suppress React act() warnings in test environment
        const originalError = console.error;
        console.error = (...args) => {
            if (typeof args[0] === 'string' && args[0].includes('Warning: An update to')) {
                return;
            }
            originalError.call(console, ...args);
        };
    });
    
    afterEach(() => {
        jest.restoreAllMocks();
        mockAdminPermissions.clearCache();
    });
    
    describe('Hook and Utility Class State Synchronization', () => {
        it('should synchronize hook state with utility class when admin status changes', async () => {
            // Arrange
            mockApiClient.get.mockResolvedValue({
                data: { data: { isAdmin: true, isAuthenticated: true } }
            });
            
            // Act
            const { result } = renderHook(() => useAdminPermissions());
            
            // Wait for initial check
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });
            
            // Assert hook state matches utility class
            expect(result.current.isAdmin).toBe(mockAdminPermissions.isCurrentUserAdmin());
            expect(result.current.lastKnownStatus).toBe(mockAdminPermissions.getDebugInfo().cacheState.lastKnownStatus);
        });
        
        it('should update hook state when utility class notifies listeners', async () => {
            // Arrange
            const { result } = renderHook(() => useAdminPermissions());
            
            // Act - directly update utility class state and notify listeners
            await act(async () => {
                mockAdminPermissions._setAdminStatus(true);
            });
            
            // Assert
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
                expect(result.current.lastKnownStatus).toBe(true);
            });
        });
        
        it('should maintain state consistency during loading states', async () => {
            // Arrange
            mockApiClient.get.mockImplementation(() => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve({ data: { data: { isAdmin: true, isAuthenticated: true } } });
                    }, 100);
                });
            });
            
            // Set initial last known status
            mockAdminPermissions._setLastKnownStatus(true);
            
            const { result } = renderHook(() => useAdminPermissions());
            
            // Act - trigger admin check
            act(() => {
                result.current.checkAdminStatus();
            });
            
            // Assert loading state consistency
            await waitFor(() => {
                expect(result.current.loading).toBe(true);
            });
            
            // Assert final state consistency
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
                expect(result.current.isAdmin).toBe(true);
                expect(result.current.isAdmin).toBe(mockAdminPermissions.isCurrentUserAdmin());
            });
        });
        
        it('should synchronize lastKnownStatus between hook and utility class', async () => {
            // Arrange
            const { result } = renderHook(() => useAdminPermissions());
            
            // Act - set last known status in utility class
            await act(async () => {
                mockAdminPermissions._setLastKnownStatus(true);
                mockAdminPermissions.notifyListeners(true);
            });
            
            // Assert
            await waitFor(() => {
                expect(result.current.lastKnownStatus).toBe(true);
                expect(result.current.lastKnownStatus).toBe(
                    mockAdminPermissions.getDebugInfo().cacheState.lastKnownStatus
                );
            });
        });
        
        it('should handle cache clear synchronization', async () => {
            // Arrange
            const { result } = renderHook(() => useAdminPermissions());
            
            // Set initial state
            await act(async () => {
                mockAdminPermissions._setAdminStatus(true);
            });
            
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(true);
            });
            
            // Act - clear cache
            await act(async () => {
                mockAdminPermissions.clearCache();
            });
            
            // Assert
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(false);
                expect(result.current.lastKnownStatus).toBe(null);
                expect(mockAdminPermissions.isCurrentUserAdmin()).toBe(false);
            });
        });
    });
    
    describe('AdminOnly Component Integration with Hook', () => {
        const TestWrapper = ({ hookProps = {}, componentProps = {} }) => {
            const adminPermissions = useAdminPermissions(hookProps);
            
            return (
                <div data-testid="test-wrapper">
                    <div data-testid="hook-state">
                        {JSON.stringify({
                            isAdmin: adminPermissions.isAdmin,
                            loading: adminPermissions.loading,
                            lastKnownStatus: adminPermissions.lastKnownStatus
                        })}
                    </div>
                    <AdminOnly {...componentProps}>
                        <div data-testid="admin-content">Admin Content</div>
                    </AdminOnly>
                </div>
            );
        };
        
        it('should render admin content when hook reports admin status', async () => {
            // Arrange
            mockApiClient.get.mockResolvedValue({
                data: { data: { isAdmin: true, isAuthenticated: true } }
            });
            
            // Act
            render(<TestWrapper />);
            
            // Assert
            await waitFor(() => {
                expect(screen.getByTestId('admin-content')).toBeInTheDocument();
            });
            
            // Verify hook state matches component behavior
            const hookState = JSON.parse(screen.getByTestId('hook-state').textContent);
            expect(hookState.isAdmin).toBe(true);
        });
        
        it('should not render admin content when hook reports non-admin status', async () => {
            // Arrange
            mockApiClient.get.mockResolvedValue({
                data: { data: { isAdmin: false, isAuthenticated: true } }
            });
            
            // Act
            render(<TestWrapper />);
            
            // Assert
            await waitFor(() => {
                const hookState = JSON.parse(screen.getByTestId('hook-state').textContent);
                expect(hookState.isAdmin).toBe(false);
            });
            
            expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
        });
        
        it('should show graceful degradation when loading with lastKnownStatus true', async () => {
            // Arrange
            mockAdminPermissions._setLastKnownStatus(true);
            mockAdminPermissions._setLoading(true);
            
            // Act
            render(
                <TestWrapper 
                    componentProps={{ showGracefulDegradation: true }}
                />
            );
            
            // Assert
            await waitFor(() => {
                expect(screen.getByTestId('admin-content')).toBeInTheDocument();
                expect(screen.getByText('Verifying permissions...')).toBeInTheDocument();
            });
            
            // Verify hook state
            const hookState = JSON.parse(screen.getByTestId('hook-state').textContent);
            expect(hookState.loading).toBe(true);
            expect(hookState.lastKnownStatus).toBe(true);
        });
        
        it('should not show graceful degradation when loading with lastKnownStatus false', async () => {
            // Arrange
            mockAdminPermissions._setLastKnownStatus(false);
            mockAdminPermissions._setLoading(true);
            
            // Act
            render(
                <TestWrapper 
                    componentProps={{ showGracefulDegradation: true }}
                />
            );
            
            // Assert
            await waitFor(() => {
                const hookState = JSON.parse(screen.getByTestId('hook-state').textContent);
                expect(hookState.loading).toBe(true);
                expect(hookState.lastKnownStatus).toBe(false);
            });
            
            expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
            expect(screen.queryByText('Verifying permissions...')).not.toBeInTheDocument();
        });
        
        it('should update component rendering when hook state changes', async () => {
            // Arrange
            const { rerender } = render(<TestWrapper />);
            
            // Initially not admin
            expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
            
            // Act - change to admin
            await act(async () => {
                mockAdminPermissions._setAdminStatus(true);
            });
            
            // Force re-render to trigger hook update
            rerender(<TestWrapper />);
            
            // Assert
            await waitFor(() => {
                expect(screen.getByTestId('admin-content')).toBeInTheDocument();
            });
            
            // Verify hook state
            const hookState = JSON.parse(screen.getByTestId('hook-state').textContent);
            expect(hookState.isAdmin).toBe(true);
        });
    });
    
    describe('State Consistency During Error Scenarios', () => {
        it('should maintain state consistency when API calls fail', async () => {
            // Arrange
            mockAdminPermissions._setLastKnownStatus(true);
            mockApiClient.get.mockRejectedValue(new Error('Network error'));
            
            const { result } = renderHook(() => useAdminPermissions());
            
            // Act
            await act(async () => {
                try {
                    await result.current.checkAdminStatus();
                } catch (error) {
                    // Expected to fail
                }
            });
            
            // Assert hook maintains last known status
            expect(result.current.lastKnownStatus).toBe(true);
            expect(result.current.error).toBeTruthy();
            
            // Assert utility class state consistency
            const debugInfo = mockAdminPermissions.getDebugInfo();
            expect(debugInfo.cacheState.lastKnownStatus).toBe(true);
        });
        
        it('should synchronize error states between hook and utility class', async () => {
            // Arrange
            const networkError = new Error('Network error');
            mockApiClient.get.mockRejectedValue(networkError);
            
            const { result } = renderHook(() => useAdminPermissions());
            
            // Act
            await act(async () => {
                try {
                    await result.current.checkAdminStatus();
                } catch (error) {
                    // Expected to fail
                }
            });
            
            // Assert
            expect(result.current.error).toBe(networkError);
            expect(result.current.loading).toBe(false);
            
            // Verify utility class is not loading
            const debugInfo = mockAdminPermissions.getDebugInfo();
            expect(debugInfo.cacheState.loading).toBe(false);
        });
    });
    
    describe('Multiple Component Integration', () => {
        const MultiComponentTest = () => {
            const adminPermissions1 = useAdminPermissions();
            const adminPermissions2 = useAdminPermissions();
            
            return (
                <div>
                    <div data-testid="hook1-state">
                        {JSON.stringify({
                            isAdmin: adminPermissions1.isAdmin,
                            lastKnownStatus: adminPermissions1.lastKnownStatus
                        })}
                    </div>
                    <div data-testid="hook2-state">
                        {JSON.stringify({
                            isAdmin: adminPermissions2.isAdmin,
                            lastKnownStatus: adminPermissions2.lastKnownStatus
                        })}
                    </div>
                    <AdminOnly>
                        <div data-testid="admin-content-1">Admin Content 1</div>
                    </AdminOnly>
                    <AdminOnly>
                        <div data-testid="admin-content-2">Admin Content 2</div>
                    </AdminOnly>
                </div>
            );
        };
        
        it('should synchronize state across multiple hook instances', async () => {
            // Arrange
            render(<MultiComponentTest />);
            
            // Act - update admin status
            await act(async () => {
                mockAdminPermissions._setAdminStatus(true);
            });
            
            // Assert both hooks have same state
            await waitFor(() => {
                const hook1State = JSON.parse(screen.getByTestId('hook1-state').textContent);
                const hook2State = JSON.parse(screen.getByTestId('hook2-state').textContent);
                
                expect(hook1State.isAdmin).toBe(true);
                expect(hook2State.isAdmin).toBe(true);
                expect(hook1State.lastKnownStatus).toBe(hook2State.lastKnownStatus);
            });
            
            // Assert both components render admin content
            expect(screen.getByTestId('admin-content-1')).toBeInTheDocument();
            expect(screen.getByTestId('admin-content-2')).toBeInTheDocument();
        });
        
        it('should handle simultaneous state changes across multiple instances', async () => {
            // Arrange
            render(<MultiComponentTest />);
            
            // Set initial admin state
            await act(async () => {
                mockAdminPermissions._setAdminStatus(true);
            });
            
            await waitFor(() => {
                expect(screen.getByTestId('admin-content-1')).toBeInTheDocument();
                expect(screen.getByTestId('admin-content-2')).toBeInTheDocument();
            });
            
            // Act - clear admin status
            await act(async () => {
                mockAdminPermissions.clearCache();
            });
            
            // Assert both hooks and components update
            await waitFor(() => {
                const hook1State = JSON.parse(screen.getByTestId('hook1-state').textContent);
                const hook2State = JSON.parse(screen.getByTestId('hook2-state').textContent);
                
                expect(hook1State.isAdmin).toBe(false);
                expect(hook2State.isAdmin).toBe(false);
                expect(hook1State.lastKnownStatus).toBe(null);
                expect(hook2State.lastKnownStatus).toBe(null);
            });
            
            expect(screen.queryByTestId('admin-content-1')).not.toBeInTheDocument();
            expect(screen.queryByTestId('admin-content-2')).not.toBeInTheDocument();
        });
    });
    
    describe('Performance and Memory Management', () => {
        it('should properly cleanup listeners when components unmount', async () => {
            // Arrange - get initial listener count
            const initialListenerCount = mockAdminPermissions.listeners.size;
            
            // Render hook
            const { unmount } = renderHook(() => useAdminPermissions());
            
            // Wait for hook to initialize
            await waitFor(() => {
                expect(mockAdminPermissions.listeners.size).toBeGreaterThan(initialListenerCount);
            }, { timeout: 1000 });
            
            const listenerCountAfterMount = mockAdminPermissions.listeners.size;
            
            // Act - unmount the hook
            unmount();
            
            // Wait a bit for cleanup to complete
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Assert - listener count should decrease (cleanup occurred)
            expect(mockAdminPermissions.listeners.size).toBeLessThan(listenerCountAfterMount);
        });
        
        it('should handle rapid state changes without memory leaks', async () => {
            // Arrange
            const { result } = renderHook(() => useAdminPermissions());
            
            // Act - rapid state changes
            await act(async () => {
                for (let i = 0; i < 10; i++) {
                    mockAdminPermissions._setAdminStatus(i % 2 === 0);
                }
            });
            
            // Assert final state is correct
            await waitFor(() => {
                expect(result.current.isAdmin).toBe(false); // Last iteration was odd (false)
            });
            
            // Verify no excessive listeners
            expect(mockAdminPermissions.listeners.size).toBeLessThanOrEqual(2);
        });
    });
});