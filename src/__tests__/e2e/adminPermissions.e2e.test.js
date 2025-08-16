/**
 * Admin Permissions End-to-End Tests
 * 
 * Comprehensive end-to-end testing for the complete admin permissions user flow.
 * Tests the full integration from login to admin feature access, including:
 * - Admin login and immediate permission recognition
 * - Page refresh and permission state recovery
 * - Network delay scenarios and graceful handling
 * 
 * These tests simulate real user scenarios and validate the complete system behavior.
 * 
 * @author SentimentInsideOut Team
 * @version 1.0.0 - Task 9 Implementation
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
const mockUseAuth = jest.fn();
const mockApiClient = {
    get: jest.fn(),
    post: jest.fn()
};

// Mock localStorage for session persistence testing
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

// Mock sessionStorage for session persistence testing
const mockSessionStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

// Mock window.location for page refresh simulation
const mockLocation = {
    reload: jest.fn(),
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: ''
};

// Enhanced mock for adminPermissions that closely mimics real behavior
class E2EMockAdminPermissions {
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
        this.apiCallStats = {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            lastCallDuration: 0
        };
        this.consecutiveFailures = 0;
        this.backgroundRefreshTimer = null;
        
        // Bind methods
        this.checkIsAdmin = this.checkIsAdmin.bind(this);
        this.isCurrentUserAdmin = this.isCurrentUserAdmin.bind(this);
        this.clearCache = this.clearCache.bind(this);
        this.addListener = this.addListener.bind(this);
        this.removeListener = this.removeListener.bind(this);
        this.notifyListeners = this.notifyListeners.bind(this);
        this.backgroundRefresh = this.backgroundRefresh.bind(this);
        this.refreshAdminStatus = this.refreshAdminStatus.bind(this);
        this.getDebugInfo = this.getDebugInfo.bind(this);
        this.cleanup = this.cleanup.bind(this);
        
        // E2E specific methods
        this._simulateNetworkDelay = this._simulateNetworkDelay.bind(this);
        this._simulateNetworkError = this._simulateNetworkError.bind(this);
        this._simulatePageRefresh = this._simulatePageRefresh.bind(this);
        this._restoreFromStorage = this._restoreFromStorage.bind(this);
        this._persistToStorage = this._persistToStorage.bind(this);
    }
    
    async checkIsAdmin() {
        if (this.isCacheValid()) {
            return this.adminStatus;
        }
        
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
        const startTime = Date.now();
        this.apiCallStats.totalCalls++;
        
        try {
            // Simulate network delay if configured
            if (this._networkDelay > 0) {
                await new Promise(resolve => setTimeout(resolve, this._networkDelay));
            }
            
            // Simulate network error if configured
            if (this._shouldSimulateError) {
                this._shouldSimulateError = false; // Reset after one error
                const error = new Error('Simulated network error');
                this.apiCallStats.failedCalls++;
                this.apiCallStats.lastCallDuration = Date.now() - startTime;
                this.consecutiveFailures++;
                
                // Handle error gracefully - maintain last known status and start grace period
                if (this.lastKnownStatus !== null) {
                    this.gracePeriodEnd = Date.now() + this.gracePeriod;
                    this.notifyListeners(this.lastKnownStatus);
                    return this.lastKnownStatus;
                }
                
                throw error;
            }
            
            const response = await mockApiClient.get('/api/auth/admin-status');
            const isAdmin = response.data?.data?.isAdmin || false;
            
            this.adminStatus = isAdmin;
            this.lastKnownStatus = isAdmin;
            this.lastCheck = Date.now();
            this.gracePeriodEnd = null;
            this.consecutiveFailures = 0;
            
            this.apiCallStats.successfulCalls++;
            this.apiCallStats.lastCallDuration = Date.now() - startTime;
            
            // Persist to storage for page refresh simulation
            this._persistToStorage();
            
            this.notifyListeners(isAdmin);
            return isAdmin;
            
        } catch (error) {
            this.apiCallStats.failedCalls++;
            this.apiCallStats.lastCallDuration = Date.now() - startTime;
            this.consecutiveFailures++;
            
            // Handle error gracefully - maintain last known status
            if (this.lastKnownStatus !== null) {
                this.gracePeriodEnd = Date.now() + this.gracePeriod;
                this.notifyListeners(this.lastKnownStatus);
                return this.lastKnownStatus;
            }
            
            // If no last known status, notify with false and throw
            this.notifyListeners(false);
            throw error;
        }
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
        
        if (!this.loading && !this.pendingPromise) {
            this.backgroundRefresh();
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
    
    backgroundRefresh() {
        if (!this.loading && !this.pendingPromise) {
            this.checkIsAdmin().catch(error => {
                console.error('Background refresh failed:', error);
                if (!this.isInGracePeriod() && this.lastKnownStatus !== null) {
                    this.gracePeriodEnd = Date.now() + (this.gracePeriod / 2);
                }
            });
        }
    }
    
    clearCache() {
        this.adminStatus = null;
        this.lastCheck = null;
        this.loading = false;
        this.pendingPromise = null;
        this.lastKnownStatus = null;
        this.gracePeriodEnd = null;
        this.consecutiveFailures = 0;
        
        if (this.backgroundRefreshTimer) {
            clearTimeout(this.backgroundRefreshTimer);
            this.backgroundRefreshTimer = null;
        }
        
        // Clear from storage
        mockLocalStorage.removeItem('adminPermissions');
        mockSessionStorage.removeItem('adminPermissions');
        
        this.notifyListeners(null);
    }
    
    async refreshAdminStatus() {
        this.clearCache();
        return await this.checkIsAdmin();
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
                lastCheck: this.lastCheck,
                gracePeriodEnd: this.gracePeriodEnd
            },
            apiCallStats: { ...this.apiCallStats },
            promiseManagement: {
                hasPendingOperations: this.pendingPromise !== null
            },
            errorHandling: {
                consecutiveFailures: this.consecutiveFailures,
                isInGracePeriod: this.isInGracePeriod()
            }
        };
    }
    
    cleanup() {
        this.clearCache();
        this.listeners.clear();
        if (this.backgroundRefreshTimer) {
            clearTimeout(this.backgroundRefreshTimer);
            this.backgroundRefreshTimer = null;
        }
    }
    
    // E2E specific methods for simulation
    _simulateNetworkDelay(delayMs) {
        this._networkDelay = delayMs;
    }
    
    _simulateNetworkError() {
        this._shouldSimulateError = true;
    }
    
    _simulatePageRefresh() {
        // Simulate page refresh by restoring state from storage
        this._restoreFromStorage();
    }
    
    _persistToStorage() {
        const state = {
            adminStatus: this.adminStatus,
            lastKnownStatus: this.lastKnownStatus,
            lastCheck: this.lastCheck,
            gracePeriodEnd: this.gracePeriodEnd
        };
        
        mockLocalStorage.setItem('adminPermissions', JSON.stringify(state));
        mockSessionStorage.setItem('adminPermissions', JSON.stringify(state));
    }
    
    _restoreFromStorage() {
        const storedState = mockLocalStorage.getItem('adminPermissions');
        if (storedState) {
            try {
                const state = JSON.parse(storedState);
                this.adminStatus = state.adminStatus;
                this.lastKnownStatus = state.lastKnownStatus;
                this.lastCheck = state.lastCheck;
                this.gracePeriodEnd = state.gracePeriodEnd;
                
                // Notify listeners of restored state
                this.notifyListeners(this.adminStatus);
            } catch (error) {
                console.error('Failed to restore admin permissions from storage:', error);
            }
        }
    }
    
    // Test helper methods
    _setNetworkDelay(delayMs) {
        this._networkDelay = delayMs;
    }
    
    _resetNetworkDelay() {
        this._networkDelay = 0;
    }
    
    _getApiCallStats() {
        return { ...this.apiCallStats };
    }
    
    _resetApiCallStats() {
        this.apiCallStats = {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            lastCallDuration: 0
        };
    }
}

const mockAdminPermissions = new E2EMockAdminPermissions();

// Mock all dependencies
jest.mock('../../components/Auth/useAuth', () => ({
    useAuth: mockUseAuth
}));

jest.mock('../../api/apiClient', () => mockApiClient);

jest.mock('../../utils/adminPermissions', () => mockAdminPermissions);

// Mock storage
Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage
});

Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage
});

Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true
});

// Import components after mocking
const { useAdminPermissions } = require('../../hooks/useAdminPermissions');
const AdminOnly = require('../../components/AdminOnly/AdminOnly').default;

// Test wrapper component that simulates a real application
const AdminDashboard = () => {
    const { isAdmin, loading, lastKnownStatus, checkAdminStatus } = useAdminPermissions();
    
    return (
        <div data-testid="admin-dashboard">
            <div data-testid="admin-status">
                {JSON.stringify({ isAdmin, loading, lastKnownStatus })}
            </div>
            <button 
                data-testid="refresh-permissions" 
                onClick={checkAdminStatus}
            >
                Refresh Permissions
            </button>
            <AdminOnly>
                <div data-testid="admin-panel">
                    <h2>Admin Panel</h2>
                    <button data-testid="admin-action">Admin Action</button>
                </div>
            </AdminOnly>
            <AdminOnly fallback={<div data-testid="access-denied">Access Denied</div>}>
                <div data-testid="admin-content">Admin Content</div>
            </AdminOnly>
            <AdminOnly showGracefulDegradation={true}>
                <div data-testid="graceful-admin-content">
                    Graceful Admin Content
                    {loading && <span data-testid="verifying-permissions">Verifying permissions...</span>}
                </div>
            </AdminOnly>
        </div>
    );
};

const LoginPage = ({ onLogin }) => {
    const handleLogin = async () => {
        // Simulate login process
        await mockApiClient.post('/api/auth/login', {
            email: 'admin@example.com',
            password: 'password'
        });
        
        // Trigger login success event
        window.dispatchEvent(new CustomEvent('loginSuccess'));
        
        if (onLogin) {
            onLogin();
        }
    };
    
    return (
        <div data-testid="login-page">
            <button data-testid="login-button" onClick={handleLogin}>
                Login as Admin
            </button>
        </div>
    );
};

const E2ETestApp = ({ initialRoute = '/' }) => {
    const [isLoggedIn, setIsLoggedIn] = React.useState(initialRoute !== '/');
    const [currentRoute, setCurrentRoute] = React.useState(initialRoute);
    
    const handleLogin = () => {
        setIsLoggedIn(true);
        setCurrentRoute('/admin');
    };
    
    const handleLogout = () => {
        setIsLoggedIn(false);
        setCurrentRoute('/');
        window.dispatchEvent(new CustomEvent('logoutSuccess'));
    };
    
    const simulatePageRefresh = () => {
        // Simulate page refresh by restoring admin permissions from storage
        mockAdminPermissions._simulatePageRefresh();
    };
    
    const handleNavigation = (route) => {
        setCurrentRoute(route);
        // If navigating to admin without being logged in, redirect to login
        if (route === '/admin' && !isLoggedIn) {
            setCurrentRoute('/');
        }
    };
    
    return (
        <BrowserRouter>
            <div data-testid="e2e-app">
                <nav data-testid="navigation">
                    <button 
                        data-testid="nav-home" 
                        onClick={() => handleNavigation('/')}
                    >
                        Home
                    </button>
                    <button 
                        data-testid="nav-admin" 
                        onClick={() => handleNavigation('/admin')}
                    >
                        Admin
                    </button>
                    {isLoggedIn && (
                        <button data-testid="logout-button" onClick={handleLogout}>
                            Logout
                        </button>
                    )}
                    <button data-testid="simulate-refresh" onClick={simulatePageRefresh}>
                        Simulate Page Refresh
                    </button>
                </nav>
                
                <main data-testid="main-content">
                    {currentRoute === '/' && !isLoggedIn && (
                        <LoginPage onLogin={handleLogin} />
                    )}
                    {currentRoute === '/' && isLoggedIn && (
                        <div data-testid="home-page">
                            <h1>Welcome, Admin!</h1>
                            <AdminOnly>
                                <div data-testid="home-admin-features">
                                    Admin features available
                                </div>
                            </AdminOnly>
                        </div>
                    )}
                    {currentRoute === '/admin' && isLoggedIn && (
                        <AdminDashboard />
                    )}
                    {currentRoute === '/admin' && !isLoggedIn && (
                        <LoginPage onLogin={handleLogin} />
                    )}
                </main>
            </div>
        </BrowserRouter>
    );
};

describe('Admin Permissions End-to-End Tests', () => {
    const mockAuthState = {
        user: { id: '123', email: 'admin@example.com' },
        isAuthenticated: true,
        loading: false
    };
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseAuth.mockReturnValue(mockAuthState);
        
        // Properly cleanup and reset mock admin permissions
        act(() => {
            mockAdminPermissions.cleanup();
        });
        mockAdminPermissions._resetApiCallStats();
        mockAdminPermissions._resetNetworkDelay();
        
        // Reset storage mocks
        mockLocalStorage.clear();
        mockSessionStorage.clear();
        
        // Mock console methods to suppress test noise
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    
    afterEach(() => {
        jest.restoreAllMocks();
        act(() => {
            mockAdminPermissions.cleanup();
        });
    });
    
    describe('Admin Login and Immediate Permission Recognition', () => {
        it('should immediately recognize admin permissions after successful login', async () => {
            // Arrange - Mock successful login and admin status API calls
            mockApiClient.post.mockResolvedValue({
                data: { success: true, token: 'mock-token' }
            });
            
            mockApiClient.get.mockResolvedValue({
                data: { data: { isAdmin: true, isAuthenticated: true } }
            });
            
            // Act - Render the app and perform login
            render(<E2ETestApp />);
            
            // Verify initial state - not logged in
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
            
            // Perform login
            const loginButton = screen.getByTestId('login-button');
            fireEvent.click(loginButton);
            
            // Assert - Should immediately show admin features after login
            await waitFor(() => {
                expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
            }, { timeout: 3000 });
            
            // Verify admin panel is accessible
            await waitFor(() => {
                expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
                expect(screen.getByTestId('admin-content')).toBeInTheDocument();
            }, { timeout: 2000 });
            
            // Verify admin status in hook
            const adminStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
            expect(adminStatus.isAdmin).toBe(true);
            expect(adminStatus.lastKnownStatus).toBe(true);
            
            // Verify API was called
            expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/admin-status');
            
            // Verify admin permissions utility state
            const debugInfo = mockAdminPermissions.getDebugInfo();
            expect(debugInfo.cacheState.adminStatus).toBe(true);
            expect(debugInfo.cacheState.lastKnownStatus).toBe(true);
        });
        
        it('should handle non-admin login correctly', async () => {
            // Arrange - Mock successful login but non-admin status
            mockApiClient.post.mockResolvedValue({
                data: { success: true, token: 'mock-token' }
            });
            
            mockApiClient.get.mockResolvedValue({
                data: { data: { isAdmin: false, isAuthenticated: true } }
            });
            
            // Act - Render the app and perform login
            render(<E2ETestApp />);
            
            const loginButton = screen.getByTestId('login-button');
            fireEvent.click(loginButton);
            
            // Assert - Should navigate to admin page but show access denied
            await waitFor(() => {
                expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
            });
            
            // Verify admin features are not accessible
            expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
            expect(screen.getByTestId('access-denied')).toBeInTheDocument();
            
            // Verify admin status in hook
            const adminStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
            expect(adminStatus.isAdmin).toBe(false);
            expect(adminStatus.lastKnownStatus).toBe(false);
        });
        
        it('should handle login with delayed admin status check', async () => {
            // Arrange - Mock login success but delayed admin status API
            mockApiClient.post.mockResolvedValue({
                data: { success: true, token: 'mock-token' }
            });
            
            // Add network delay to admin status check
            mockAdminPermissions._setNetworkDelay(1000);
            mockApiClient.get.mockImplementation(() => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve({
                            data: { data: { isAdmin: true, isAuthenticated: true } }
                        });
                    }, 1000);
                });
            });
            
            // Act - Render the app and perform login
            render(<E2ETestApp />);
            
            const loginButton = screen.getByTestId('login-button');
            fireEvent.click(loginButton);
            
            // Assert - Should show loading state initially
            await waitFor(() => {
                expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
            });
            
            // Verify loading state
            let adminStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
            expect(adminStatus.loading).toBe(true);
            
            // Wait for admin status to be resolved
            await waitFor(() => {
                const updatedStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
                expect(updatedStatus.isAdmin).toBe(true);
                expect(updatedStatus.loading).toBe(false);
            }, { timeout: 3000 });
            
            // Verify admin features are now accessible
            expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            expect(screen.getByTestId('admin-content')).toBeInTheDocument();
        });
        
        it('should handle multiple rapid permission checks during login', async () => {
            // Arrange - Mock successful admin login
            mockApiClient.post.mockResolvedValue({
                data: { success: true, token: 'mock-token' }
            });
            
            mockApiClient.get.mockResolvedValue({
                data: { data: { isAdmin: true, isAuthenticated: true } }
            });
            
            // Act - Render the app and perform login
            render(<E2ETestApp />);
            
            const loginButton = screen.getByTestId('login-button');
            fireEvent.click(loginButton);
            
            // Wait for admin dashboard to appear
            await waitFor(() => {
                expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
            });
            
            // Trigger multiple rapid permission checks
            const refreshButton = screen.getByTestId('refresh-permissions');
            
            await act(async () => {
                // Rapid fire multiple refresh requests
                fireEvent.click(refreshButton);
                fireEvent.click(refreshButton);
                fireEvent.click(refreshButton);
                
                // Wait a bit for all requests to process
                await new Promise(resolve => setTimeout(resolve, 100));
            });
            
            // Assert - Should handle multiple requests gracefully
            await waitFor(() => {
                const adminStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
                expect(adminStatus.isAdmin).toBe(true);
            });
            
            // Verify API wasn't called excessively (should use promise queue)
            const apiStats = mockAdminPermissions._getApiCallStats();
            expect(apiStats.totalCalls).toBeLessThanOrEqual(2); // Initial + one refresh
        });
    });
    
    describe('Page Refresh and Permission State Recovery', () => {
        it('should recover admin permissions after page refresh', async () => {
            // Arrange - Set up initial admin state
            mockApiClient.get.mockResolvedValue({
                data: { data: { isAdmin: true, isAuthenticated: true } }
            });
            
            // Simulate existing admin session in storage
            const adminState = {
                adminStatus: true,
                lastKnownStatus: true,
                lastCheck: Date.now() - 1000, // 1 second ago
                gracePeriodEnd: null
            };
            
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(adminState));
            mockSessionStorage.getItem.mockReturnValue(JSON.stringify(adminState));
            
            // Act - Render app and simulate page refresh
            render(<E2ETestApp initialRoute="/admin" />);
            
            // Simulate page refresh by restoring state
            act(() => {
                mockAdminPermissions._simulatePageRefresh();
            });
            
            // Assert - Should immediately show admin features from restored state
            await waitFor(() => {
                expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
                expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            });
            
            // Verify admin status is restored
            const adminStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
            expect(adminStatus.isAdmin).toBe(true);
            expect(adminStatus.lastKnownStatus).toBe(true);
            
            // Verify storage was accessed
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith('adminPermissions');
        });
        
        it('should handle page refresh with expired cache gracefully', async () => {
            // Arrange - Set up expired admin state
            const expiredAdminState = {
                adminStatus: true,
                lastKnownStatus: true,
                lastCheck: Date.now() - (10 * 60 * 1000), // 10 minutes ago (expired)
                gracePeriodEnd: null
            };
            
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(expiredAdminState));
            
            // Mock fresh API call after refresh
            mockApiClient.get.mockResolvedValue({
                data: { data: { isAdmin: true, isAuthenticated: true } }
            });
            
            // Act - Render app and simulate page refresh
            render(<E2ETestApp initialRoute="/admin" />);
            
            act(() => {
                mockAdminPermissions._simulatePageRefresh();
            });
            
            // Assert - Should show admin features using last known status initially
            await waitFor(() => {
                expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
            });
            
            // Should trigger background refresh due to expired cache
            await waitFor(() => {
                const adminStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
                expect(adminStatus.isAdmin).toBe(true);
                expect(adminStatus.lastKnownStatus).toBe(true);
            }, { timeout: 2000 });
            
            // Verify API was called to refresh expired cache
            expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/admin-status');
        });
        
        it('should handle page refresh with no stored state', async () => {
            // Arrange - No stored state (fresh session)
            mockLocalStorage.getItem.mockReturnValue(null);
            mockSessionStorage.getItem.mockReturnValue(null);
            
            mockApiClient.get.mockResolvedValue({
                data: { data: { isAdmin: true, isAuthenticated: true } }
            });
            
            // Act - Render app directly to admin page
            render(<E2ETestApp initialRoute="/admin" />);
            
            // Assert - Should trigger fresh admin check
            await waitFor(() => {
                expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
            });
            
            // Should eventually show admin features after API call
            await waitFor(() => {
                expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            }, { timeout: 2000 });
            
            // Verify API was called
            expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/admin-status');
        });
        
        it('should maintain admin state across navigation after refresh', async () => {
            // Arrange - Set up admin state
            mockApiClient.get.mockResolvedValue({
                data: { data: { isAdmin: true, isAuthenticated: true } }
            });
            
            const adminState = {
                adminStatus: true,
                lastKnownStatus: true,
                lastCheck: Date.now(),
                gracePeriodEnd: null
            };
            
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(adminState));
            
            // Act - Render app, simulate refresh, then navigate
            const { rerender } = render(<E2ETestApp initialRoute="/admin" />);
            
            act(() => {
                mockAdminPermissions._simulatePageRefresh();
            });
            
            // Wait for admin dashboard to load
            await waitFor(() => {
                expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
                expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            });
            
            // Navigate to home page
            const homeButton = screen.getByTestId('nav-home');
            fireEvent.click(homeButton);
            
            // Assert - Should maintain admin state on home page
            await waitFor(() => {
                expect(screen.getByTestId('home-page')).toBeInTheDocument();
                expect(screen.getByTestId('home-admin-features')).toBeInTheDocument();
            });
            
            // Navigate back to admin page
            const adminButton = screen.getByTestId('nav-admin');
            fireEvent.click(adminButton);
            
            // Should still have admin access
            await waitFor(() => {
                expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
                expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            });
        });
    });
    
    describe('Network Delay Scenarios and Graceful Handling', () => {
        it('should handle slow network responses gracefully', async () => {
            // Arrange - Set up slow network response
            mockAdminPermissions._setNetworkDelay(2000); // 2 second delay
            
            mockApiClient.get.mockImplementation(() => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve({
                            data: { data: { isAdmin: true, isAuthenticated: true } }
                        });
                    }, 2000);
                });
            });
            
            // Act - Render admin dashboard
            render(<E2ETestApp initialRoute="/admin" />);
            
            // Assert - Should show loading state during network delay
            await waitFor(() => {
                expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
            });
            
            // Verify loading state is shown
            let adminStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
            expect(adminStatus.loading).toBe(true);
            
            // Should not show admin content during loading (no last known status)
            expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
            expect(screen.getByTestId('access-denied')).toBeInTheDocument();
            
            // Wait for network response
            await waitFor(() => {
                const updatedStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
                expect(updatedStatus.loading).toBe(false);
                expect(updatedStatus.isAdmin).toBe(true);
            }, { timeout: 4000 });
            
            // Should now show admin content
            expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
        });
        
        it('should show graceful degradation during network delays with last known status', async () => {
            // Arrange - Set up initial admin state, then simulate slow refresh
            mockApiClient.get
                .mockResolvedValueOnce({
                    data: { data: { isAdmin: true, isAuthenticated: true } }
                })
                .mockImplementation(() => {
                    return new Promise(resolve => {
                        setTimeout(() => {
                            resolve({
                                data: { data: { isAdmin: true, isAuthenticated: true } }
                            });
                        }, 2000);
                    });
                });
            
            // Act - Render and establish initial admin state
            render(<E2ETestApp initialRoute="/admin" />);
            
            // Wait for initial admin state
            await waitFor(() => {
                expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            });
            
            // Trigger refresh with network delay
            mockAdminPermissions._setNetworkDelay(2000);
            const refreshButton = screen.getByTestId('refresh-permissions');
            fireEvent.click(refreshButton);
            
            // Assert - Should show graceful degradation
            await waitFor(() => {
                expect(screen.getByTestId('graceful-admin-content')).toBeInTheDocument();
                expect(screen.getByTestId('verifying-permissions')).toBeInTheDocument();
            });
            
            // Admin content should still be visible due to graceful degradation
            expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            
            // Verify loading state with last known status
            const adminStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
            expect(adminStatus.loading).toBe(true);
            expect(adminStatus.lastKnownStatus).toBe(true);
            
            // Wait for refresh to complete
            await waitFor(() => {
                const updatedStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
                expect(updatedStatus.loading).toBe(false);
            }, { timeout: 4000 });
            
            // Should still show admin content
            expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            expect(screen.queryByTestId('verifying-permissions')).not.toBeInTheDocument();
        });
        
        it('should handle network errors gracefully with grace period', async () => {
            // Arrange - Set up initial admin state, then simulate network error
            mockApiClient.get
                .mockResolvedValueOnce({
                    data: { data: { isAdmin: true, isAuthenticated: true } }
                })
                .mockRejectedValue(new Error('Network error'));
            
            // Act - Render and establish initial admin state
            render(<E2ETestApp initialRoute="/admin" />);
            
            // Wait for initial admin state
            await waitFor(() => {
                expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            });
            
            // Simulate network error on refresh
            mockAdminPermissions._simulateNetworkError();
            const refreshButton = screen.getByTestId('refresh-permissions');
            
            await act(async () => {
                fireEvent.click(refreshButton);
                // Wait for error to be processed
                await new Promise(resolve => setTimeout(resolve, 100));
            });
            
            // Assert - Should maintain admin access during grace period
            expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            
            // Verify grace period is active
            const debugInfo = mockAdminPermissions.getDebugInfo();
            expect(debugInfo.errorHandling.isInGracePeriod).toBe(true);
            expect(debugInfo.cacheState.lastKnownStatus).toBe(true);
            
            // Admin status should reflect last known status
            const adminStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
            expect(adminStatus.isAdmin).toBe(true);
            expect(adminStatus.lastKnownStatus).toBe(true);
        });
        
        it('should handle intermittent network connectivity', async () => {
            // Arrange - Set up alternating success/failure pattern
            let callCount = 0;
            mockApiClient.get.mockImplementation(() => {
                callCount++;
                if (callCount % 2 === 0) {
                    // Even calls fail
                    return Promise.reject(new Error('Network error'));
                } else {
                    // Odd calls succeed
                    return Promise.resolve({
                        data: { data: { isAdmin: true, isAuthenticated: true } }
                    });
                }
            });
            
            // Act - Render admin dashboard
            render(<E2ETestApp initialRoute="/admin" />);
            
            // First call should succeed
            await waitFor(() => {
                expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            });
            
            // Trigger refresh (should fail)
            const refreshButton = screen.getByTestId('refresh-permissions');
            
            await act(async () => {
                fireEvent.click(refreshButton);
                await new Promise(resolve => setTimeout(resolve, 100));
            });
            
            // Should maintain admin access due to grace period
            expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            
            // Trigger another refresh (should succeed)
            await act(async () => {
                fireEvent.click(refreshButton);
                await new Promise(resolve => setTimeout(resolve, 100));
            });
            
            // Should still have admin access
            await waitFor(() => {
                const adminStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
                expect(adminStatus.isAdmin).toBe(true);
            });
            
            expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            
            // Verify API was called multiple times
            expect(mockApiClient.get).toHaveBeenCalledTimes(3); // Initial + 2 refreshes
        });
        
        it('should handle timeout scenarios appropriately', async () => {
            // Arrange - Set up timeout simulation
            mockApiClient.get.mockImplementation(() => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        const error = new Error('Request timeout');
                        error.code = 'ECONNABORTED';
                        reject(error);
                    }, 1000);
                });
            });
            
            // Set up last known admin status
            mockAdminPermissions.lastKnownStatus = true;
            mockAdminPermissions.lastCheck = Date.now() - 1000;
            
            // Act - Render admin dashboard
            render(<E2ETestApp initialRoute="/admin" />);
            
            // Should initially show admin content based on last known status
            await waitFor(() => {
                expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
            });
            
            // Wait for timeout to occur
            await waitFor(() => {
                const debugInfo = mockAdminPermissions.getDebugInfo();
                expect(debugInfo.errorHandling.isInGracePeriod).toBe(true);
            }, { timeout: 3000 });
            
            // Should maintain admin access during grace period
            expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            
            // Verify admin status reflects graceful handling
            const adminStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
            expect(adminStatus.isAdmin).toBe(true);
            expect(adminStatus.lastKnownStatus).toBe(true);
        });
    });
    
    describe('Complete User Flow Integration', () => {
        it('should handle complete login-to-admin-access flow with network variations', async () => {
            // Arrange - Set up realistic network conditions
            let apiCallCount = 0;
            
            mockApiClient.post.mockResolvedValue({
                data: { success: true, token: 'mock-token' }
            });
            
            mockApiClient.get.mockImplementation(() => {
                apiCallCount++;
                
                // First call: slow but successful
                if (apiCallCount === 1) {
                    return new Promise(resolve => {
                        setTimeout(() => {
                            resolve({
                                data: { data: { isAdmin: true, isAuthenticated: true } }
                            });
                        }, 1500);
                    });
                }
                
                // Second call: network error
                if (apiCallCount === 2) {
                    return Promise.reject(new Error('Network error'));
                }
                
                // Subsequent calls: fast and successful
                return Promise.resolve({
                    data: { data: { isAdmin: true, isAuthenticated: true } }
                });
            });
            
            // Act - Complete user flow
            render(<E2ETestApp />);
            
            // Step 1: Login
            const loginButton = screen.getByTestId('login-button');
            fireEvent.click(loginButton);
            
            // Step 2: Wait for admin dashboard with slow initial load
            await waitFor(() => {
                expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
            });
            
            // Should show loading state initially
            let adminStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
            expect(adminStatus.loading).toBe(true);
            
            // Step 3: Wait for slow admin check to complete
            await waitFor(() => {
                const updatedStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
                expect(updatedStatus.isAdmin).toBe(true);
                expect(updatedStatus.loading).toBe(false);
            }, { timeout: 3000 });
            
            expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            
            // Step 4: Trigger refresh that will fail
            const refreshButton = screen.getByTestId('refresh-permissions');
            
            await act(async () => {
                fireEvent.click(refreshButton);
                await new Promise(resolve => setTimeout(resolve, 100));
            });
            
            // Should maintain admin access due to grace period
            expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            
            // Step 5: Navigate away and back
            const homeButton = screen.getByTestId('nav-home');
            fireEvent.click(homeButton);
            
            await waitFor(() => {
                expect(screen.getByTestId('home-page')).toBeInTheDocument();
                expect(screen.getByTestId('home-admin-features')).toBeInTheDocument();
            });
            
            // Navigate back to admin
            const adminButton = screen.getByTestId('nav-admin');
            fireEvent.click(adminButton);
            
            await waitFor(() => {
                expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
                expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            });
            
            // Step 6: Simulate page refresh
            const refreshPageButton = screen.getByTestId('simulate-refresh');
            fireEvent.click(refreshPageButton);
            
            // Should maintain admin state after refresh
            expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            
            // Step 7: Final refresh should work (fast response)
            await act(async () => {
                fireEvent.click(refreshButton);
                await new Promise(resolve => setTimeout(resolve, 100));
            });
            
            // Should still have admin access
            const finalStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
            expect(finalStatus.isAdmin).toBe(true);
            expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            
            // Verify API call statistics
            const apiStats = mockAdminPermissions._getApiCallStats();
            expect(apiStats.totalCalls).toBeGreaterThan(0);
            expect(apiStats.successfulCalls).toBeGreaterThan(0);
            expect(apiStats.failedCalls).toBeGreaterThan(0);
        });
        
        it('should handle logout and re-login flow correctly', async () => {
            // Arrange - Set up admin login
            mockApiClient.post.mockResolvedValue({
                data: { success: true, token: 'mock-token' }
            });
            
            mockApiClient.get.mockResolvedValue({
                data: { data: { isAdmin: true, isAuthenticated: true } }
            });
            
            // Act - Login and establish admin state
            render(<E2ETestApp />);
            
            const loginButton = screen.getByTestId('login-button');
            fireEvent.click(loginButton);
            
            await waitFor(() => {
                expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
                expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            });
            
            // Logout
            const logoutButton = screen.getByTestId('logout-button');
            fireEvent.click(logoutButton);
            
            // Should clear admin state and return to login
            await waitFor(() => {
                expect(screen.getByTestId('login-page')).toBeInTheDocument();
            });
            
            // Verify admin state was cleared
            const debugInfo = mockAdminPermissions.getDebugInfo();
            expect(debugInfo.cacheState.adminStatus).toBe(null);
            expect(debugInfo.cacheState.lastKnownStatus).toBe(null);
            
            // Re-login
            const newLoginButton = screen.getByTestId('login-button');
            fireEvent.click(newLoginButton);
            
            // Should re-establish admin state
            await waitFor(() => {
                expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
                expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
            });
            
            const finalStatus = JSON.parse(screen.getByTestId('admin-status').textContent);
            expect(finalStatus.isAdmin).toBe(true);
        });
    });
});