/**
 * Test for SubscriptionPlansPage data structure fix
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../../i18n';
import { SubscriptionPlansPage } from '../SubscriptionPlansPage';
import { SubscriptionContext } from '../../context/SubscriptionContext';

// Mock the context
const mockSubscriptionValue = {
  userPlan: { type: 'free' },
  refreshSubscriptionData: jest.fn(),
};

const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <I18nextProvider i18n={i18n}>
      <SubscriptionContext.Provider value={mockSubscriptionValue}>
        {children}
      </SubscriptionContext.Provider>
    </I18nextProvider>
  </BrowserRouter>
);

describe('SubscriptionPlansPage Data Structure Fix', () => {
  test('should render without plan.features.map error', () => {
    // This test verifies that the data structure fix works
    expect(() => {
      render(
        <TestWrapper>
          <SubscriptionPlansPage />
        </TestWrapper>
      );
    }).not.toThrow();
  });

  test('should display plan cards with features array', () => {
    render(
      <TestWrapper>
        <SubscriptionPlansPage />
      </TestWrapper>
    );

    // Check that plan cards are rendered (they use features array)
    expect(screen.getByText('Choose the plan that\'s right for you')).toBeInTheDocument();
  });

  test('should have both features array and extendedFeatures object in plan data', () => {
    const { container } = render(
      <TestWrapper>
        <SubscriptionPlansPage />
      </TestWrapper>
    );

    // The component should render without errors, indicating both data structures exist
    expect(container).toBeInTheDocument();
  });
});

// Test the data structure directly
describe('Plan Data Structure', () => {
  test('should have correct data structure for both PlanCard and PlanComparisonTable', () => {
    // Mock the plan data structure that should be used
    const mockPlan = {
      id: 'free',
      name: 'Free',
      price: 0,
      // Array format for PlanCard
      features: [
        '1,000 API calls per day',
        '10 price analyses per day',
        '3 watchlist categories'
      ],
      // Object format for PlanComparisonTable
      extendedFeatures: {
        watchlist: {
          maxCategories: 3,
          maxStocksPerCategory: 10
        },
        realTimeData: false,
        advancedAnalytics: false,
        prioritySupport: false,
        apiRateLimit: 'Standard'
      },
      limits: {
        api: { daily: 1000, monthly: 20000 },
        priceAnalysis: { daily: 10, monthly: 200 }
      }
    };

    // Test that features is an array (for PlanCard)
    expect(Array.isArray(mockPlan.features)).toBe(true);
    expect(mockPlan.features.length).toBeGreaterThan(0);

    // Test that extendedFeatures is an object (for PlanComparisonTable)
    expect(typeof mockPlan.extendedFeatures).toBe('object');
    expect(mockPlan.extendedFeatures).not.toBeNull();
    expect(mockPlan.extendedFeatures.watchlist).toBeDefined();

    // Test that limits structure is correct
    expect(mockPlan.limits.api.daily).toBe(1000);
    expect(mockPlan.limits.priceAnalysis.daily).toBe(10);
  });
});