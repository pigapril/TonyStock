/**
 * Admin Page Access Flow Integration Tests
 * 
 * Tests the complete admin page access flow without cache to ensure:
 * - Immediate admin page access after login
 * - No stuck permission check screens
 * - Authentication state changes reflect immediately
 * - Error scenarios handle gracefully without cache confusion
 * 
 * Requirements: 1.1, 1.2, 5.1, 5.2
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import AdminPage from '../../pages/AdminPage';

// Mock API client
jest.mock('../../api/apiClient', () => ({
    get: jest.fn()
}));

// Mock useAuth hook
jest.mock('../../components/Auth/useAuth', () => ({
    useAuth: jest.fn()
}));

// Mock child components
jest.mock('../../components/Admin/CodeManagement/CodeManagementPanel', () => {
    return function MockCodeManagementPanel() {
        return <div data-testid="code-management-panel">Code Management Panel</div>;
    };
});

jest.mock('../../components/Admin/Analytics/RedemptionAnalytics', () => {
    return function MockRedemptionAnalytics() {
        return <div data-testid="redemption-analytics">Redemption Analytics</div>;
    };
});

jest.mock('../../components/Common/LoadingSpinner', () => {
    return function MockLoadingSpinner() {
        return <div data-testid="loading-spinner">Loading...</div>;
    };
});

// Test wrapper component
const TestWrapper = ({ children }) => (
    <BrowserRouter>
        <I18nextProvider i18n={i18n}>
            {children}
        </I18nextProvider>
    </BrowserRouter>
);

describe('Admin Page Access Flow Integration Tests', () => {
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
        
        // Mock console methods to reduce test noise
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Requirement 1.1: Immediate admin page access after authentication', () => {
        it('should grant immediate access when authenticated admin user navigates to admin page', async () => {
            // Arrange - Mock authenticated admin user
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            // Mock successful admin status API response
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

            // Assert - Should show loading initially, then admin content
            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

            // Wait for admin status check to complete
            await waitFor(() => {
                expect(screen.getByTestId('code-management-panel')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify API was called for real-time permission check
            expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/admin-status');
            
            // Verify admin content is displayed and access denied is not shown
            expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
        });

        it('should perform real-time permission check without using cached data', async () => {
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

            // Act - Render admin page multiple times to verify no caching
            const { unmount } = render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(mockApiClient.get).toHaveBeenCalledTimes(1);
            });

            unmount();

            // Render again - should make another API call (no cache)
            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(mockApiClient.get).toHaveBeenCalledTimes(2);
            });

            // Assert - Each render should make a fresh API call
            expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/admin-status');
        });
    });

    describe('Requirement 1.2: Immediate access denial for non-admin users', () => {
        it('should immediately deny access when permission check fails', async () => {
            // Arrange - Mock authenticated regular user
            useAuth.mockReturnValue({
                user: mockRegularUser,
                isAuthenticated: true,
                loading: false
            });

            // Mock API response indicating user is not admin
            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: false
                    }
                }
            });

            // Act
            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Assert - Should show loading initially
            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

            // Wait for permission check to complete and show access denied
            await waitFor(() => {
                expect(screen.getByText(/access denied/i)).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify admin content is not displayed
            expect(screen.queryByTestId('code-management-panel')).not.toBeInTheDocument();
        });

        it('should provide retry functionality when access is denied', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockRegularUser,
                isAuthenticated: true,
                loading: false
            });

            // Initially deny access
            mockApiClient.get.mockResolvedValueOnce({
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

            // Wait for access denied screen
            await waitFor(() => {
                expect(screen.getByText(/access denied/i)).toBeInTheDocument();
            });

            // Mock successful retry
            mockApiClient.get.mockResolvedValueOnce({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            // Act - Click retry button
            const retryButton = screen.getByText(/retry/i);
            fireEvent.click(retryButton);

            // Assert - Should make another API call and grant access
            await waitFor(() => {
                expect(screen.getByTestId('code-management-panel')).toBeInTheDocument();
            });

            expect(mockApiClient.get).toHaveBeenCalledTimes(2);
        });
    });

    describe('Requirement 5.1: No stuck permission check screens', () => {
        it('should not get stuck on permission check screen when API responds quickly', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            // Mock fast API response
            mockApiClient.get.mockResolvedValue({
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            });

            // Act
            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Assert - Loading should disappear quickly
            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

            await waitFor(() => {
                expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
            }, { timeout: 1000 });

            expect(screen.getByTestId('code-management-panel')).toBeInTheDocument();
        });

        it('should handle slow API responses without indefinite loading', async () => {
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
                    }), 1000)
                )
            );

            // Act
            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Assert - Should show loading initially
            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

            // Wait for API response and content to load
            await waitFor(() => {
                expect(screen.getByTestId('code-management-panel')).toBeInTheDocument();
            }, { timeout: 2000 });

            // Loading should be gone after content loads
            expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
        });
    });

    describe('Requirement 5.2: Graceful error handling without cache confusion', () => {
        it('should handle network errors gracefully without cache fallback', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            // Mock network error
            const networkError = new Error('Network Error');
            networkError.code = 'ERR_NETWORK';
            mockApiClient.get.mockRejectedValue(networkError);

            // Act
            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Assert - Should show loading initially
            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

            // Wait for error handling to complete
            await waitFor(() => {
                expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
            }, { timeout: 3000 });

            // Should show access denied (secure default) rather than cached result
            expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        });

        it('should handle server errors (5xx) gracefully', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            // Mock server error
            const serverError = new Error('Internal Server Error');
            serverError.response = { status: 500 };
            mockApiClient.get.mockRejectedValue(serverError);

            // Act
            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Assert - Should handle error gracefully
            await waitFor(() => {
                expect(screen.getByText(/access denied/i)).toBeInTheDocument();
            }, { timeout: 3000 });
        });

        it('should handle authentication errors (401/403) gracefully', async () => {
            // Arrange
            useAuth.mockReturnValue({
                user: mockAdminUser,
                isAuthenticated: true,
                loading: false
            });

            // Mock authentication error
            const authError = new Error('Unauthorized');
            authError.response = { status: 401 };
            mockApiClient.get.mockRejectedValue(authError);

            // Act
            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Assert - Should show access denied
            await waitFor(() => {
                expect(screen.getByText(/access denied/i)).toBeInTheDocument();
            }, { timeout: 3000 });
        });
    });

    describe('Multiple API calls without cache interference', () => {
        it('should make independent API calls for each permission check', async () => {
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

            // Act - Render multiple times
            const { unmount: unmount1 } = render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(mockApiClient.get).toHaveBeenCalledTimes(1);
            });

            unmount1();

            const { unmount: unmount2 } = render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(mockApiClient.get).toHaveBeenCalledTimes(2);
            });

            unmount2();

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(mockApiClient.get).toHaveBeenCalledTimes(3);
            });

            // Assert - Each render should make independent API calls
            expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/admin-status');
        });
    });
});