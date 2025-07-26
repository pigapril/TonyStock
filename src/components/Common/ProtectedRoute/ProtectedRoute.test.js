import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock all dependencies before importing the component
jest.mock('../../Auth/useAuth', () => ({
  useAuth: jest.fn()
}));

jest.mock('../Dialog/useDialog', () => ({
  useDialog: jest.fn()
}));

jest.mock('../../../utils/analytics', () => ({
  Analytics: {
    auth: {
      routeProtection: jest.fn()
    }
  }
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key
  })
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Navigate: ({ to, state, replace }) => (
    <div 
      data-testid="navigate" 
      data-to={to} 
      data-state={JSON.stringify(state)} 
      data-replace={replace} 
    />
  ),
  useLocation: jest.fn(() => ({ pathname: '/' }))
}));

// Import the component after mocking
import { ProtectedRoute } from './ProtectedRoute';

// Get the mocked functions
const { useAuth } = require('../../Auth/useAuth');
const { useDialog } = require('../Dialog/useDialog');
const { Analytics } = require('../../../utils/analytics');
const { useLocation } = require('react-router-dom');

// Setup default mock implementations
const mockOpenDialog = jest.fn();
useDialog.mockReturnValue({
  openDialog: mockOpenDialog
});

// Test wrapper component
const TestWrapper = ({ children, initialEntries = ['/'] }) => (
  <MemoryRouter initialEntries={initialEntries}>
    {children}
  </MemoryRouter>
);

// Test child component
const TestChild = () => <div data-testid="protected-content">Protected Content</div>;

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({
        user: { id: '123', email: 'test@example.com' },
        loading: false,
        watchlistAccess: true
      });
    });

    it('should render children when user is authenticated', () => {
      render(
        <TestWrapper>
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should track successful route protection', () => {
      render(
        <TestWrapper>
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(Analytics.auth.routeProtection).toHaveBeenCalledWith({
        status: 'success',
        path: '/'
      });
    });

    it('should render children when requireAuth is false', () => {
      render(
        <TestWrapper>
          <ProtectedRoute requireAuth={false}>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({
        user: null,
        loading: false,
        watchlistAccess: false
      });
    });

    it('should redirect to home and open auth dialog when user is not authenticated', async () => {
      render(
        <TestWrapper>
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Should not render protected content
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

      // Should open auth dialog
      await waitFor(() => {
        expect(mockOpenDialog).toHaveBeenCalledWith('auth', {
          returnPath: '/',
          message: 'protectedRoute.loginRequired'
        });
      });
    });

    it('should track dialog shown event', async () => {
      render(
        <TestWrapper>
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(Analytics.auth.routeProtection).toHaveBeenCalledWith({
          status: 'dialog_shown',
          from: '/'
        });
      });
    });

    it('should render children when requireAuth is false', () => {
      render(
        <TestWrapper>
          <ProtectedRoute requireAuth={false}>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should not open dialog multiple times', async () => {
      const { rerender } = render(
        <TestWrapper>
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockOpenDialog).toHaveBeenCalledTimes(1);
      });

      // Re-render the component
      rerender(
        <TestWrapper>
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Should not call openDialog again
      expect(mockOpenDialog).toHaveBeenCalledTimes(1);
    });
  });

  describe('when authentication is loading', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({
        user: null,
        loading: true,
        watchlistAccess: false
      });
    });

    it('should show loading spinner when authentication is loading', () => {
      render(
        <TestWrapper>
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('protectedRoute.loading')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument(); // spinner has implicit role
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should not open auth dialog while loading', () => {
      render(
        <TestWrapper>
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(mockOpenDialog).not.toHaveBeenCalled();
    });
  });

  describe('watchlist access control', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({
        user: { id: '123', email: 'test@example.com' },
        loading: false,
        watchlistAccess: false
      });
    });

    it('should redirect to unauthorized page when accessing watchlist without permission', () => {
      // Mock location to simulate watchlist path
      useLocation.mockReturnValue({ pathname: '/watchlist' });

      render(
        <TestWrapper initialEntries={['/watchlist']}>
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Should redirect to unauthorized
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/unauthorized');
    });

    it('should render children when accessing watchlist with permission', () => {
      useAuth.mockReturnValue({
        user: { id: '123', email: 'test@example.com' },
        loading: false,
        watchlistAccess: true
      });

      useLocation.mockReturnValue({ pathname: '/watchlist' });

      render(
        <TestWrapper initialEntries={['/watchlist']}>
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should render children when not accessing watchlist path', () => {
      useLocation.mockReturnValue({ pathname: '/market-sentiment' });

      render(
        <TestWrapper initialEntries={['/market-sentiment']}>
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('dialog reset behavior', () => {
    it('should reset dialog shown flag when user logs in', async () => {
      // Start with unauthenticated user
      useAuth.mockReturnValue({
        user: null,
        loading: false,
        watchlistAccess: false
      });

      const { rerender } = render(
        <TestWrapper>
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Dialog should be shown
      await waitFor(() => {
        expect(mockOpenDialog).toHaveBeenCalledTimes(1);
      });

      // User logs in
      useAuth.mockReturnValue({
        user: { id: '123', email: 'test@example.com' },
        loading: false,
        watchlistAccess: true
      });

      rerender(
        <TestWrapper>
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Should render protected content
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();

      // User logs out again
      useAuth.mockReturnValue({
        user: null,
        loading: false,
        watchlistAccess: false
      });

      rerender(
        <TestWrapper>
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Dialog should be shown again
      await waitFor(() => {
        expect(mockOpenDialog).toHaveBeenCalledTimes(2);
      });
    });
  });
});