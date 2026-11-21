import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const mockUseAuth = jest.fn();
const mockOpenDialog = jest.fn();
const mockRouteProtection = jest.fn();
let mockLocation = { pathname: '/' };

jest.mock('../../Auth/useAuth', () => ({
    useAuth: mockUseAuth
}));

jest.mock('../Dialog/useDialog', () => ({
    useDialog: () => ({
        openDialog: mockOpenDialog
    })
}));

jest.mock('../../../utils/analytics', () => ({
    Analytics: {
        auth: {
            routeProtection: mockRouteProtection
        }
    }
}));

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}));

jest.mock('react-router-dom', () => ({
    useLocation: () => mockLocation
}));

const { ProtectedRoute } = require('./ProtectedRoute');

const TestChild = () => <div data-testid="protected-content">Protected Content</div>;

describe('ProtectedRoute', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocation = { pathname: '/' };
        delete process.env.REACT_APP_TEMPORARY_FREE_MODE;
        mockUseAuth.mockReturnValue({
            user: { id: 'user-1', email: 'member@example.com' },
            loading: false,
            watchlistAccess: true
        });
    });

    it('renders children and tracks success for authenticated users', () => {
        render(
            <ProtectedRoute>
                <TestChild />
            </ProtectedRoute>
        );

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(mockRouteProtection).toHaveBeenCalledWith({
            status: 'success',
            path: '/'
        });
    });

    it('opens the auth dialog and preserves the requested URL for unauthenticated users', async () => {
        mockLocation = {
            pathname: '/zh-TW/market-sentiment',
            search: '?timeRange=1Y',
            hash: '#aaii'
        };
        mockUseAuth.mockReturnValue({
            user: null,
            loading: false,
            watchlistAccess: false
        });

        render(
            <ProtectedRoute>
                <TestChild />
            </ProtectedRoute>
        );

        await waitFor(() => {
            expect(mockOpenDialog).toHaveBeenCalledWith('auth', {
                returnPath: '/zh-TW/market-sentiment?timeRange=1Y#aaii',
                message: 'protectedRoute.loginRequired'
            });
        });

        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
        expect(mockRouteProtection).toHaveBeenCalledWith({
            status: 'dialog_shown',
            from: '/zh-TW/market-sentiment?timeRange=1Y#aaii'
        });
    });

    it('shows a loading status while authentication is still resolving', () => {
        mockUseAuth.mockReturnValue({
            user: null,
            loading: true,
            watchlistAccess: false
        });

        render(
            <ProtectedRoute>
                <TestChild />
            </ProtectedRoute>
        );

        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByText('protectedRoute.loading')).toBeInTheDocument();
        expect(mockOpenDialog).not.toHaveBeenCalled();
    });

    it('allows authenticated Free users to enter the read-only Watchlist page', () => {
        mockLocation = { pathname: '/zh-TW/watchlist' };
        mockUseAuth.mockReturnValue({
            user: { id: 'user-2', email: 'member@example.com' },
            loading: false,
            watchlistAccess: false
        });

        render(
            <ProtectedRoute>
                <TestChild />
            </ProtectedRoute>
        );

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('allows watchlist access in temporary free mode', () => {
        process.env.REACT_APP_TEMPORARY_FREE_MODE = 'true';
        mockLocation = { pathname: '/en/watchlist' };
        mockUseAuth.mockReturnValue({
            user: { id: 'user-3', email: 'member@example.com' },
            loading: false,
            watchlistAccess: false
        });

        render(
            <ProtectedRoute>
                <TestChild />
            </ProtectedRoute>
        );

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('resets the dialog guard after login so a later logout can prompt again', async () => {
        mockUseAuth.mockReturnValue({
            user: null,
            loading: false,
            watchlistAccess: false
        });

        const { rerender } = render(
            <ProtectedRoute>
                <TestChild />
            </ProtectedRoute>
        );

        await waitFor(() => {
            expect(mockOpenDialog).toHaveBeenCalledTimes(1);
        });

        mockUseAuth.mockReturnValue({
            user: { id: 'user-4', email: 'member@example.com' },
            loading: false,
            watchlistAccess: true
        });

        rerender(
            <ProtectedRoute>
                <TestChild />
            </ProtectedRoute>
        );

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();

        mockUseAuth.mockReturnValue({
            user: null,
            loading: false,
            watchlistAccess: false
        });

        rerender(
            <ProtectedRoute>
                <TestChild />
            </ProtectedRoute>
        );

        await waitFor(() => {
            expect(mockOpenDialog).toHaveBeenCalledTimes(2);
        });
    });
});
