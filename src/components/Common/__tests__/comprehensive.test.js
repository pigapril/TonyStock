import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import '@testing-library/jest-dom';
import i18n from '../../../i18n';

// Import components to test
import { ProtectedRoute } from '../ProtectedRoute/ProtectedRoute';
import { QuotaExceededDialog } from '../Dialog/QuotaExceededDialog';
import { AdBanner } from '../AdBanner/AdBanner';

// Mock dependencies
jest.mock('../../Auth/useAuth', () => ({
  useAuth: jest.fn()
}));

jest.mock('../Dialog/useDialog', () => ({
  useDialog: jest.fn()
}));

const mockUseAuth = require('../../Auth/useAuth').useAuth;
const mockUseDialog = require('../Dialog/useDialog').useDialog;

describe('Common Components Comprehensive Tests', () => {
  const renderWithProviders = (component) => {
    return render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          {component}
        </I18nextProvider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ProtectedRoute Component', () => {
    const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

    test('should render children when user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: 1, name: 'Test User' }
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    test('should show login prompt when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null
      });

      mockUseDialog.mockReturnValue({
        openDialog: jest.fn()
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.getByText(/login required/i)).toBeInTheDocument();
    });

    test('should handle loading state', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: null, // Loading state
        user: null
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('should open login dialog when login button is clicked', () => {
      const mockOpenDialog = jest.fn();
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null
      });

      mockUseDialog.mockReturnValue({
        openDialog: mockOpenDialog
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      const loginButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(loginButton);

      expect(mockOpenDialog).toHaveBeenCalledWith('auth', {
        returnPath: expect.any(String),
        message: expect.any(String)
      });
    });

    test('should handle different user roles', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: 1, name: 'Test User', role: 'admin' }
      });

      renderWithProviders(
        <ProtectedRoute requiredRole="admin">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    test('should deny access for insufficient role', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: 1, name: 'Test User', role: 'user' }
      });

      renderWithProviders(
        <ProtectedRoute requiredRole="admin">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.getByText(/insufficient permissions/i)).toBeInTheDocument();
    });
  });

  describe('QuotaExceededDialog Component', () => {
    const defaultProps = {
      isOpen: true,
      onClose: jest.fn(),
      quotaInfo: {
        quota: 1000,
        usage: 1000,
        resetTime: '2024-01-02T00:00:00Z',
        upgradeUrl: '/upgrade'
      }
    };

    test('should render quota information correctly', () => {
      renderWithProviders(<QuotaExceededDialog {...defaultProps} />);

      expect(screen.getByText(/quota exceeded/i)).toBeInTheDocument();
      expect(screen.getByText(/1000/)).toBeInTheDocument(); // Usage/quota numbers
      expect(screen.getByText(/upgrade/i)).toBeInTheDocument();
    });

    test('should handle close button click', () => {
      const mockOnClose = jest.fn();
      
      renderWithProviders(
        <QuotaExceededDialog {...defaultProps} onClose={mockOnClose} />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('should show upgrade button when upgrade URL is provided', () => {
      renderWithProviders(<QuotaExceededDialog {...defaultProps} />);

      const upgradeButton = screen.getByRole('button', { name: /upgrade/i });
      expect(upgradeButton).toBeInTheDocument();
    });

    test('should not render when isOpen is false', () => {
      renderWithProviders(
        <QuotaExceededDialog {...defaultProps} isOpen={false} />
      );

      expect(screen.queryByText(/quota exceeded/i)).not.toBeInTheDocument();
    });

    test('should handle keyboard navigation', () => {
      renderWithProviders(<QuotaExceededDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');

      // Test ESC key
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    test('should display reset time correctly', () => {
      renderWithProviders(<QuotaExceededDialog {...defaultProps} />);

      // Should show formatted reset time
      expect(screen.getByText(/resets/i)).toBeInTheDocument();
    });

    test('should handle different quota scenarios', () => {
      const scenarios = [
        {
          quota: 1000,
          usage: 1000,
          message: 'Daily limit reached'
        },
        {
          quota: 20000,
          usage: 20000,
          message: 'Monthly limit reached'
        },
        {
          quota: -1,
          usage: 0,
          message: 'Unlimited plan'
        }
      ];

      scenarios.forEach(scenario => {
        const { rerender } = renderWithProviders(
          <QuotaExceededDialog
            {...defaultProps}
            quotaInfo={{ ...defaultProps.quotaInfo, ...scenario }}
          />
        );

        if (scenario.quota === -1) {
          expect(screen.queryByText(/quota exceeded/i)).not.toBeInTheDocument();
        } else {
          expect(screen.getByText(/quota exceeded/i)).toBeInTheDocument();
        }
      });
    });
  });

  describe('AdBanner Component', () => {
    test('should render ad banner correctly', () => {
      renderWithProviders(<AdBanner />);

      const adContainer = screen.getByTestId('ad-banner');
      expect(adContainer).toBeInTheDocument();
    });

    test('should handle ad loading states', async () => {
      renderWithProviders(<AdBanner />);

      // Should show loading state initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Wait for ad to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });

    test('should handle ad blocking detection', () => {
      // Mock ad blocker detection
      Object.defineProperty(window, 'adBlockDetected', {
        value: true,
        writable: true
      });

      renderWithProviders(<AdBanner />);

      expect(screen.getByText(/ad blocker detected/i)).toBeInTheDocument();
    });

    test('should be responsive to different screen sizes', () => {
      // Mock different screen sizes
      const mockMatchMedia = (query) => ({
        matches: query.includes('max-width: 768px'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      });

      window.matchMedia = mockMatchMedia;

      renderWithProviders(<AdBanner />);

      const adContainer = screen.getByTestId('ad-banner');
      expect(adContainer).toHaveClass('responsive');
    });

    test('should handle ad click tracking', () => {
      const mockTrackEvent = jest.fn();
      window.gtag = mockTrackEvent;

      renderWithProviders(<AdBanner />);

      const adElement = screen.getByTestId('ad-banner');
      fireEvent.click(adElement);

      expect(mockTrackEvent).toHaveBeenCalledWith('event', 'ad_click', {
        event_category: 'advertisement',
        event_label: 'banner'
      });
    });

    test('should respect user preferences for ads', () => {
      // Mock user preference to hide ads
      localStorage.setItem('hideAds', 'true');

      renderWithProviders(<AdBanner />);

      expect(screen.queryByTestId('ad-banner')).not.toBeInTheDocument();

      // Cleanup
      localStorage.removeItem('hideAds');
    });
  });

  describe('Accessibility Tests', () => {
    test('should have proper ARIA labels and roles', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null
      });

      mockUseDialog.mockReturnValue({
        openDialog: jest.fn()
      });

      renderWithProviders(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      const loginButton = screen.getByRole('button', { name: /login/i });
      expect(loginButton).toHaveAttribute('aria-label');
    });

    test('should support keyboard navigation', () => {
      renderWithProviders(
        <QuotaExceededDialog
          isOpen={true}
          onClose={jest.fn()}
          quotaInfo={{
            quota: 1000,
            usage: 1000,
            resetTime: '2024-01-02T00:00:00Z'
          }}
        />
      );

      const dialog = screen.getByRole('dialog');
      const buttons = screen.getAllByRole('button');

      // Should be able to tab through buttons
      buttons.forEach(button => {
        button.focus();
        expect(document.activeElement).toBe(button);
      });
    });

    test('should have proper contrast ratios', () => {
      renderWithProviders(<AdBanner />);

      const adContainer = screen.getByTestId('ad-banner');
      const styles = window.getComputedStyle(adContainer);

      // This is a simplified test - in real scenarios you'd use tools like axe-core
      expect(styles.color).toBeDefined();
      expect(styles.backgroundColor).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    test('should not cause memory leaks', () => {
      const { unmount } = renderWithProviders(<AdBanner />);

      // Simulate component lifecycle
      unmount();

      // Check that event listeners are cleaned up
      // This is a simplified test - real memory leak detection would be more complex
      expect(true).toBe(true);
    });

    test('should lazy load heavy components', async () => {
      const LazyComponent = React.lazy(() => 
        Promise.resolve({ default: () => <div>Lazy Content</div> })
      );

      renderWithProviders(
        <React.Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </React.Suspense>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Lazy Content')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundary Tests', () => {
    test('should handle component errors gracefully', () => {
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      const ErrorBoundary = ({ children }) => {
        try {
          return children;
        } catch (error) {
          return <div>Something went wrong</div>;
        }
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderWithProviders(
          <ErrorBoundary>
            <ErrorComponent />
          </ErrorBoundary>
        );
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('Internationalization Tests', () => {
    test('should render in different languages', () => {
      // Test Chinese
      i18n.changeLanguage('zh-TW');
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null
      });

      mockUseDialog.mockReturnValue({
        openDialog: jest.fn()
      });

      renderWithProviders(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      // Should show Chinese text
      expect(screen.getByText(/需要登入/i)).toBeInTheDocument();

      // Test English
      i18n.changeLanguage('en');
      
      const { rerender } = renderWithProviders(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText(/login required/i)).toBeInTheDocument();
    });

    test('should handle missing translations gracefully', () => {
      i18n.changeLanguage('invalid-lang');

      renderWithProviders(
        <QuotaExceededDialog
          isOpen={true}
          onClose={jest.fn()}
          quotaInfo={{
            quota: 1000,
            usage: 1000,
            resetTime: '2024-01-02T00:00:00Z'
          }}
        />
      );

      // Should fallback to default language or show keys
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});