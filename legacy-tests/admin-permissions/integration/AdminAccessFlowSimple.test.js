/**
 * Simple Admin Access Flow Tests
 * 
 * Basic tests to verify admin page access flow without cache
 * Requirements: 1.1, 1.2, 5.1, 5.2
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
        return <div data-testid="code-management-panel">Admin Code Management</div>;
    };
});

jest.mock('../../components/Common/LoadingSpinner', () => {
    return function MockLoadingSpinner() {
        return <div data-testid="loading-spinner">Loading...</div>;
    };
});

// Test wrapper
const TestWrapper = ({ children }) => (
    <MemoryRouter>
        <I18nextProvider i18n={i18n}>
            {children}
        </I18nextProvider>
    </MemoryRouter>
);

describe('Simple Admin Access Flow Tests', () => {
    const mockApiClient = require('../../api/apiClient');
    const { useAuth } = require('../../components/Auth/useAuth');

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should test basic admin access flow', async () => {
        // Arrange
        useAuth.mockReturnValue({
            user: { id: 'admin-123', email: 'admin@example.com' },
            isAuthenticated: true,
            loading: false
        });

        mockApiClient.get.mockResolvedValue({
            data: { data: { isAuthenticated: true, isAdmin: true } }
        });

        // Act
        render(<TestWrapper><AdminPage /></TestWrapper>);

        // Assert
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.getByTestId('code-management-panel')).toBeInTheDocument();
        });

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/admin-status');
    });
});