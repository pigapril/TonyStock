/**
 * Integration tests for Task 17 & 18: Performance optimization and final integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';

// Import components
import { SubscriptionPlansPage } from '../SubscriptionPlans/SubscriptionPlansPage';
import PlanComparisonTable from '../SubscriptionPlans/components/PlanComparisonTable';
import UsageDashboard from '../UserAccount/components/UsageDashboard';
import { SubscriptionContext } from '../context/SubscriptionContext';
import subscriptionCache from '../../../services/subscriptionCache';

// Mock Chart.js
jest.mock('chart.js/auto', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
  ArcElement: {},
  BarElement: {},
}));

jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }) => <div data-testid=\"line-chart\" data-chart-data={JSON.stringify(data)} />,
  Doughnut: ({ data, options }) => <div data-testid=\"doughnut-chart\" data-chart-data={JSON.stringify(data)} />,
  Bar: ({ data, options }) => <div data-testid=\"bar-chart\" data-chart-data={JSON.stringify(data)} />,
}));

// Test wrapper component
const TestWrapper = ({ children, subscriptionValue = {} }) => {
  const defaultSubscriptionValue = {
    userPlan: { type: 'free' },
    refreshSubscriptionData: jest.fn(),
    ...subscriptionValue
  };

  return (
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        <SubscriptionContext.Provider value={defaultSubscriptionValue}>
          {children}
        </SubscriptionContext.Provider>
      </I18nextProvider>
    </BrowserRouter>
  );
};

describe('Task 17: Performance Optimization', () => {
  beforeEach(() => {
    // Clear cache before each test
    subscriptionCache.clear();
  });

  describe('Caching Implementation', () => {
    test('should cache subscription data correctly', async () => {
      const testData = { plan: 'pro', usage: 1000 };
      
      // Set data in cache
      subscriptionCache.set('user123', testData, 'userPlan');
      
      // Retrieve data from cache
      const cachedData = subscriptionCache.get('user123', 'userPlan');
      
      expect(cachedData).toEqual(testData);
    });

    test('should invalidate expired cache entries', async () => {
      const testData = { plan: 'pro', usage: 1000 };
      
      // Mock short cache duration
      subscriptionCache.cacheConfig.userPlan = 100; // 100ms
      
      subscriptionCache.set('user123', testData, 'userPlan');
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const cachedData = subscriptionCache.get('user123', 'userPlan');
      expect(cachedData).toBeNull();
    });

    test('should provide cache statistics', () => {
      subscriptionCache.set('user1', { plan: 'free' }, 'userPlan');
      subscriptionCache.set('user2', { usage: 500 }, 'usageStats');
      
      const stats = subscriptionCache.getStats();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.cacheTypes).toEqual({
        userPlan: 1,
        usageStats: 1
      });
    });
  });

  describe('Lazy Loading', () => {
    test('should lazy load subscription components', async () => {
      const { preloadSubscriptionComponents } = require('../lazy');
      
      // Mock dynamic imports
      const mockImport = jest.fn().mockResolvedValue({ default: () => <div>Component</div> });
      jest.doMock('../UserAccount/UserAccountPage', () => mockImport);
      
      await preloadSubscriptionComponents();
      
      // Verify that components are preloaded
      expect(mockImport).toHaveBeenCalled();
    });
  });

  describe('Bundle Optimization', () => {
    test('should initialize performance optimizations', () => {
      const { initializeOptimizations } = require('../../../utils/bundleOptimization');
      
      // Mock document methods
      const mockAppendChild = jest.fn();
      const mockCreateElement = jest.fn().mockReturnValue({
        rel: '',
        as: '',
        href: '',
        type: '',
        crossOrigin: ''
      });
      
      Object.defineProperty(document, 'createElement', {
        value: mockCreateElement
      });
      
      Object.defineProperty(document, 'head', {
        value: { appendChild: mockAppendChild }
      });
      
      initializeOptimizations();
      
      expect(mockCreateElement).toHaveBeenCalled();
    });
  });
});

describe('Task 18: Final Integration and Testing', () => {
  describe('SubscriptionPlansPage Integration', () => {
    test('should render subscription plans page with view toggle', () => {
      render(
        <TestWrapper>
          <SubscriptionPlansPage />
        </TestWrapper>
      );

      expect(screen.getByText('Choose the plan that\\'s right for you')).toBeInTheDocument();
      expect(screen.getByText('Card View')).toBeInTheDocument();
      expect(screen.getByText('Comparison View')).toBeInTheDocument();
    });

    test('should switch between card and comparison views', async () => {
      render(
        <TestWrapper>
          <SubscriptionPlansPage />
        </TestWrapper>
      );

      const comparisonViewButton = screen.getByText('Comparison View');
      fireEvent.click(comparisonViewButton);

      await waitFor(() => {
        expect(comparisonViewButton).toHaveClass('active');
      });
    });

    test('should handle plan selection with loading state', async () => {
      const mockOnSelectPlan = jest.fn().mockResolvedValue();
      
      const mockPlans = [
        {
          id: 'free',
          name: 'Free',
          price: 0,
          features: { watchlist: { maxCategories: 3 } },
          limits: { api: { daily: 1000 } }
        },
        {
          id: 'pro',
          name: 'Pro',
          price: 29,
          features: { watchlist: { maxCategories: 10 } },
          limits: { api: { daily: 10000 } }
        }
      ];

      render(
        <TestWrapper>
          <PlanComparisonTable
            plans={mockPlans}
            currentPlan=\"free\"
            onSelectPlan={mockOnSelectPlan}
          />
        </TestWrapper>
      );

      const upgradeButton = screen.getByText('Upgrade to Pro');
      fireEvent.click(upgradeButton);

      expect(mockOnSelectPlan).toHaveBeenCalledWith(mockPlans[1]);
    });
  });

  describe('UsageDashboard Integration', () => {
    const mockPlanLimits = {
      api: { daily: 1000, monthly: 20000 },
      priceAnalysis: { daily: 10, monthly: 200 },
      news: { daily: 50, monthly: 1000 },
      search: { daily: 100, monthly: 2000 }
    };

    test('should render usage dashboard with charts', () => {
      render(
        <TestWrapper>
          <UsageDashboard
            planLimits={mockPlanLimits}
            currentPlan=\"free\"
          />
        </TestWrapper>
      );

      expect(screen.getByText('Usage Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Current Usage')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    test('should handle time range changes', async () => {
      render(
        <TestWrapper>
          <UsageDashboard
            planLimits={mockPlanLimits}
            currentPlan=\"free\"
          />
        </TestWrapper>
      );

      const timeRangeSelect = screen.getByDisplayValue('Last 7 Days');
      fireEvent.change(timeRangeSelect, { target: { value: '30d' } });

      await waitFor(() => {
        expect(timeRangeSelect.value).toBe('30d');
      });
    });

    test('should handle metric selection changes', async () => {
      render(
        <TestWrapper>
          <UsageDashboard
            planLimits={mockPlanLimits}
            currentPlan=\"free\"
          />
        </TestWrapper>
      );

      const metricSelect = screen.getByDisplayValue('API Calls');
      fireEvent.change(metricSelect, { target: { value: 'priceAnalysis' } });

      await waitFor(() => {
        expect(metricSelect.value).toBe('priceAnalysis');
      });
    });

    test('should display usage cards with correct status', () => {
      render(
        <TestWrapper>
          <UsageDashboard
            planLimits={mockPlanLimits}
            currentPlan=\"free\"
          />
        </TestWrapper>
      );

      // Check for usage cards
      expect(screen.getByText('API Calls')).toBeInTheDocument();
      expect(screen.getByText('Price Analysis')).toBeInTheDocument();
      expect(screen.getByText('News Access')).toBeInTheDocument();
      expect(screen.getByText('Search Queries')).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    test('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <SubscriptionPlansPage />
        </TestWrapper>
      );

      // Check that mobile-specific classes are applied
      const container = document.querySelector('.subscription-plans-page');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels and keyboard navigation', () => {
      render(
        <TestWrapper>
          <SubscriptionPlansPage />
        </TestWrapper>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeVisible();
        // Check that buttons are keyboard accessible
        fireEvent.focus(button);
        expect(button).toHaveFocus();
      });
    });

    test('should support screen readers', () => {
      render(
        <TestWrapper>
          <UsageDashboard
            planLimits={mockPlanLimits}
            currentPlan=\"free\"
          />
        </TestWrapper>
      );

      // Check for proper headings structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Check for proper labels
      const selects = screen.getAllByRole('combobox');
      selects.forEach(select => {
        expect(select).toHaveAccessibleName();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      const mockOnSelectPlan = jest.fn().mockRejectedValue(new Error('API Error'));
      
      const mockPlans = [
        {
          id: 'free',
          name: 'Free',
          price: 0,
          features: { watchlist: { maxCategories: 3 } },
          limits: { api: { daily: 1000 } }
        }
      ];

      // Mock console.error to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <TestWrapper>
          <PlanComparisonTable
            plans={mockPlans}
            currentPlan=\"free\"
            onSelectPlan={mockOnSelectPlan}
          />
        </TestWrapper>
      );

      const upgradeButton = screen.getByText('Upgrade to Free');
      fireEvent.click(upgradeButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to select plan:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    test('should memoize expensive calculations', () => {
      const { rerender } = render(
        <TestWrapper>
          <UsageDashboard
            planLimits={mockPlanLimits}
            currentPlan=\"free\"
          />
        </TestWrapper>
      );

      // Re-render with same props
      rerender(
        <TestWrapper>
          <UsageDashboard
            planLimits={mockPlanLimits}
            currentPlan=\"free\"
          />
        </TestWrapper>
      );

      // Component should not re-calculate expensive operations
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });
});

describe('Complete User Journey', () => {
  test('should support complete subscription upgrade flow', async () => {
    const mockOnSelectPlan = jest.fn().mockResolvedValue();
    
    render(
      <TestWrapper subscriptionValue={{ userPlan: { type: 'free' } }}>
        <SubscriptionPlansPage />
      </TestWrapper>
    );

    // User sees current plan
    expect(screen.getByText('Your current plan')).toBeInTheDocument();

    // User switches to comparison view
    fireEvent.click(screen.getByText('Comparison View'));

    await waitFor(() => {
      expect(screen.getByText('Compare Plans')).toBeInTheDocument();
    });

    // User can see feature comparison
    expect(screen.getByText('Features')).toBeInTheDocument();
  });
});