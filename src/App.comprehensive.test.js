import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import '@testing-library/jest-dom';
import App from './App';
import i18n from './i18n';

// Mock all the heavy components to focus on App logic
jest.mock('./components/Home/Home', () => ({
  Home: () => <div data-testid="home-page">Home Page</div>
}));

jest.mock('./components/PriceAnalysis/PriceAnalysis', () => ({
  PriceAnalysis: () => <div data-testid="price-analysis-page">Price Analysis Page</div>
}));

jest.mock('./components/MarketSentimentIndex/MarketSentimentIndex', () => 
  () => <div data-testid="market-sentiment-page">Market Sentiment Page</div>
);

jest.mock('./components/Watchlist/WatchlistContainer', () => ({
  WatchlistContainer: () => <div data-testid="watchlist-page">Watchlist Page</div>
}));

jest.mock('./components/Auth/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    logout: jest.fn()
  })
}));

jest.mock('./components/Common/Dialog/DialogContext', () => ({
  DialogProvider: ({ children }) => children,
  useDialog: () => ({
    openDialog: jest.fn()
  })
}));

jest.mock('./components/Subscription/context/SubscriptionContext', () => ({
  SubscriptionProvider: ({ children }) => children
}));

jest.mock('./components/Common/InterstitialAdModal/AdContext', () => ({
  AdProvider: ({ children }) => children
}));

jest.mock('./api/setupApiClient', () => ({
  initializeApiClient: jest.fn()
}));

// Mock react-responsive
jest.mock('react-responsive', () => ({
  useMediaQuery: () => false // Default to desktop
}));

// Mock window.dataLayer
Object.defineProperty(window, 'dataLayer', {
  value: [],
  writable: true
});

describe('App Component Comprehensive Tests', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock scrollTo
    window.scrollTo = jest.fn();
  });

  const renderApp = (initialRoute = '/zh-TW') => {
    window.history.pushState({}, 'Test page', initialRoute);
    
    return render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <App />
        </I18nextProvider>
      </BrowserRouter>
    );
  };

  describe('Language Routing', () => {
    test('should redirect to default language when no language specified', async () => {
      renderApp('/');
      
      await waitFor(() => {
        expect(window.location.pathname).toMatch(/\/(zh-TW|en)/);
      });
    });

    test('should handle Chinese language route', async () => {
      renderApp('/zh-TW');
      
      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    test('should handle English language route', async () => {
      renderApp('/en');
      
      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    test('should redirect invalid language to fallback', async () => {
      renderApp('/invalid-lang');
      
      await waitFor(() => {
        expect(window.location.pathname).toMatch(/\/(zh-TW|en)/);
      });
    });
  });

  describe('Navigation Structure', () => {
    test('should render main navigation elements', async () => {
      renderApp('/zh-TW');
      
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('banner')).toBeInTheDocument();
      });
    });

    test('should render logo and navigation links', async () => {
      renderApp('/zh-TW');
      
      await waitFor(() => {
        expect(screen.getByAltText(/appName/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
      });
    });
  });

  describe('Route Protection', () => {
    test('should render protected routes when authenticated', async () => {
      // Mock authenticated user
      const mockUseAuth = require('./components/Auth/AuthContext').useAuth;
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: 1, name: 'Test User' },
        logout: jest.fn()
      });

      renderApp('/zh-TW/priceanalysis');
      
      await waitFor(() => {
        expect(screen.getByTestId('price-analysis-page')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    test('should handle mobile layout', async () => {
      // Mock mobile view
      const mockUseMediaQuery = require('react-responsive').useMediaQuery;
      mockUseMediaQuery.mockReturnValue(true);

      renderApp('/zh-TW');
      
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid routes gracefully', async () => {
      renderApp('/zh-TW/invalid-route');
      
      await waitFor(() => {
        // Should redirect to home
        expect(window.location.pathname).toBe('/zh-TW/');
      });
    });
  });

  describe('Analytics Integration', () => {
    test('should track page views', async () => {
      renderApp('/zh-TW');
      
      await waitFor(() => {
        expect(window.dataLayer).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              event: 'pageview'
            })
          ])
        );
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async () => {
      renderApp('/zh-TW');
      
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('banner')).toBeInTheDocument();
      });
    });

    test('should support keyboard navigation', async () => {
      renderApp('/zh-TW');
      
      await waitFor(() => {
        const homeLink = screen.getByRole('link', { name: /home/i });
        expect(homeLink).toBeInTheDocument();
        
        // Test tab navigation
        homeLink.focus();
        expect(document.activeElement).toBe(homeLink);
      });
    });
  });
});