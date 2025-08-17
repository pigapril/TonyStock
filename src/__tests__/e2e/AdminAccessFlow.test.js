/**
 * End-to-End Admin Access Flow Tests
 * 
 * Tests the complete admin access flow from user perspective:
 * - Login to admin page access
 * - Permission changes during session
 * - Error recovery scenarios
 * - Authentication state changes
 * 
 * Requirements: 1.1, 1.2, 5.1, 5.2
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import AdminPage from '../../pages/AdminPage';

// Mock the entire auth system
const mockAuthContext = {
    user: null,
    isAuthenticated: false,
    loading: false,
    login: jest.fn(),
    logout: jest.fn()
};

// Mock API client
jest.mock('../../api/apiClient', () => ({
    get: jest.fn()
}));

jest.mock('../../components/Auth/useAuth', () => ({
    useAuth: () => mockAuthContext
}));

// Mock child components
jest.mock('../../components/Admin/CodeManagement/CodeManagementPanel', () => {
    return function MockCodeManagementPanel() {
        return <div data-testid="code-management-panel">Admin Code Management</div>;
    };
});

jest.mock('../../components/Admin/Analytics/RedemptionAnalytics', () => {
    return function MockRedemptionAnalytics() {
        return <div data-testid="redemption-analytics">Admin Analytics</div>;
    };
});

jest.mock('../../components/Common/LoadingSpinner', () => {
    return function MockLoadingSpinner() {
        return <div data-testid="loading-spinner">Loading...</div>;
    };
});

// Test wrapper component
const TestWrapper = ({ children, initialEntries = ['/admin'] }) => (
    <MemoryRouter initialEntries={initialEntries}>
        <I18nextProvider i18n={i18n}>
            {children}
        </I18nextProvider>
    </MemoryRouter>
);

describe('End-to-End Admin Access Flow Tests', () => {
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

    // Get mocked module
    const mockApiClient = require('../../api/apiClient');

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reset auth context
        Object.assign(mockAuthContext, {
            user: null,
            isAuthenticated: false,
            loading: false
        });

        // Mock console methods
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});

        // Mock window.history.back
        Object.defineProperty(window, 'history', {
            value: { back: jest.fn() },
            writable: true
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Requirement 1.1: Complete login to admin access flow', () => {
        it('should complete full flow from unauthenticated to admin access', async () => {
            // Arrange - Start unauthenticated
            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Should show access denied for unauthenticated user
            await waitFor(() => {
                expect(screen.getByText(/access denied/i)).toBeInTheDocument();
            });

            // Act - Simulate login process
            Object.assign(mockAuthContext, {
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            // Mock successful admin check
            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            // Re-render to simulate auth state change
            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Assert - Should show admin dashboard
            await waitFor(() => {
                expect(screen.getByTestId('code-management-panel')).toBeInTheDocument();
            }, { timeout: 3000 });

            expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/admin-status');
        });

        it('should handle immediate admin access after login', async () => {
            // Arrange - Start with authenticated admin user
            Object.assign(mockAuthContext, {
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

            // Act - Render admin page
            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Should show loading initially
            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

            // Assert - Should quickly show admin content
            await waitFor(() => {
                expect(screen.getByTestId('code-management-panel')).toBeInTheDocument();
            }, { timeout: 2000 });

            expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
        });
    });

    describe('Requirement 1.2: Permission changes during session', () => {
        it('should handle permission revocation during active session', async () => {
            // Arrange - Start with admin access
            Object.assign(mockAuthContext, {
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

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('code-management-panel')).toBeInTheDocument();
            });

            // Act - Simulate permission revocation
            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: false
                    }
                }
            });

            // Re-render to simulate permission check
            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Assert - Should show access denied
            await waitFor(() => {
                expect(screen.getByText(/access denied/i)).toBeInTheDocument();
            });

            expect(screen.queryByTestId('code-management-panel')).not.toBeInTheDocument();
        });

        it('should handle permission grant during session', async () => {
            // Arrange - Start with regular user
            Object.assign(mockAuthContext, {
                user: mockRegularUser,
                isAuthenticated: true,
                loading: false
            });

            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: false
                    }
                }
            });

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText(/access denied/i)).toBeInTheDocument();
            });

            // Act - Simulate permission grant
            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            // Click retry to check permissions again
            const retryButton = screen.getByText(/retry/i);
            fireEvent.click(retryButton);

            // Assert - Should grant access
            await waitFor(() => {
                expect(screen.getByTestId('code-management-panel')).toBeInTheDocument();
            });
        });
    });

    describe('Requirement 5.1: Error recovery scenarios', () => {
        it('should recover from network errors', async () => {
            // Arrange
            Object.assign(mockAuthContext, {
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            // First call fails with network error
            const networkError = new Error('Network Error');
            networkError.code = 'ERR_NETWORK';
            mockApiClient.get.mockRejectedValueOnce(networkError);

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Should show access denied due to error
            await waitFor(() => {
                expect(screen.getByText(/access denied/i)).toBeInTheDocument();
            });

            // Act - Simulate network recovery
            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            // Click retry
            const retryButton = screen.getByText(/retry/i);
            fireEvent.click(retryButton);

            // Assert - Should recover and show admin dashboard
            await waitFor(() => {
                expect(screen.getByTestId('code-management-panel')).toBeInTheDocument();
            });
        });

        it('should handle server errors gracefully', async () => {
            // Arrange
            Object.assign(mockAuthContext, {
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            const serverError = new Error('Internal Server Error');
            serverError.response = { status: 500 };
            mockApiClient.get.mockRejectedValue(serverError);

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Assert - Should show access denied
            await waitFor(() => {
                expect(screen.getByText(/access denied/i)).toBeInTheDocument();
            });

            // Should provide retry option
            expect(screen.getByText(/retry/i)).toBeInTheDocument();
            expect(screen.getByText(/go back/i)).toBeInTheDocument();
        });

        it('should handle authentication errors appropriately', async () => {
            // Arrange
            Object.assign(mockAuthContext, {
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            const authError = new Error('Unauthorized');
            authError.response = { status: 401 };
            mockApiClient.get.mockRejectedValue(authError);

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Assert - Should show access denied
            await waitFor(() => {
                expect(screen.getByText(/access denied/i)).toBeInTheDocument();
            });
        });
    });

    describe('Requirement 5.2: Multiple tab scenarios', () => {
        it('should handle consistent behavior across multiple renders', async () => {
            // Arrange
            Object.assign(mockAuthContext, {
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

            // Act - Render multiple instances (simulating multiple tabs)
            const { unmount: unmount1 } = render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );
            await waitFor(() => {
                expect(screen.getByTestId('code-management-panel')).toBeInTheDocument();
            });
            unmount1();

            const { unmount: unmount2 } = render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );
            await waitFor(() => {
                expect(screen.getByTestId('code-management-panel')).toBeInTheDocument();
            });
            unmount2();

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );
            await waitFor(() => {
                expect(screen.getByTestId('code-management-panel')).toBeInTheDocument();
            });

            // Assert - Each render should make its own API call
            expect(mockApiClient.get).toHaveBeenCalledTimes(3);
        });

        it('should handle authentication state changes', async () => {
            // Arrange - Start with admin access
            Object.assign(mockAuthContext, {
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

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('code-management-panel')).toBeInTheDocument();
            });

            // Act - Simulate logout
            Object.assign(mockAuthContext, {
                user: null,
                isAuthenticated: false,
                loading: false
            });

            // Re-render to reflect auth change
            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Assert - Should show access denied
            await waitFor(() => {
                expect(screen.getByText(/access denied/i)).toBeInTheDocument();
            });

            expect(screen.queryByTestId('code-management-panel')).not.toBeInTheDocument();
        });
    });

    describe('User experience scenarios', () => {
        it('should provide clear feedback during loading states', async () => {
            // Arrange
            Object.assign(mockAuthContext, {
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
                    }), 1000)
                )
            );

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Assert - Should show loading state
            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
            expect(screen.getByText(/checking/i)).toBeInTheDocument();

            // Wait for loading to complete
            await waitFor(() => {
                expect(screen.getByTestId('code-management-panel')).toBeInTheDocument();
            }, { timeout: 2000 });

            expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
        });

        it('should provide helpful error messages and recovery options', async () => {
            // Arrange
            Object.assign(mockAuthContext, {
                user: mockRegularUser,
                isAuthenticated: true,
                loading: false
            });

            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: false
                    }
                }
            });

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Assert - Should show helpful access denied message
            await waitFor(() => {
                expect(screen.getByText(/access denied/i)).toBeInTheDocument();
            });

            // Should provide action buttons
            expect(screen.getByText(/retry/i)).toBeInTheDocument();
            expect(screen.getByText(/go back/i)).toBeInTheDocument();

            // Test go back functionality
            const goBackButton = screen.getByText(/go back/i);
            fireEvent.click(goBackButton);
            expect(window.history.back).toHaveBeenCalled();
        });
    });
});