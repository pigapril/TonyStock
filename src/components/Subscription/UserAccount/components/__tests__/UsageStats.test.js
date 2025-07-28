import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UsageStats } from '../UsageStats';

// Mock the dependencies
jest.mock('../../../context/SubscriptionContext', () => ({
  useSubscription: jest.fn()
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue, options) => {
      if (options && options.hours) {
        return `Resets in ${options.hours} hours`;
      }
      if (options && options.days) {
        return `Resets in ${options.days} days`;
      }
      return defaultValue || key;
    }
  })
}));

const { useSubscription } = require('../../../context/SubscriptionContext');

const mockUsageStats = {
  daily: {
    api: { used: 150, limit: 1000, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    priceAnalysis: { used: 3, limit: 10, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    news: { used: 12, limit: 50, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    search: { used: 25, limit: 100, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) }
  },
  monthly: {
    api: { used: 3500, limit: 20000, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    priceAnalysis: { used: 45, limit: 200, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    news: { used: 280, limit: 1000, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    search: { used: 650, limit: 2000, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
  }
};

describe('UsageStats', () => {
  beforeEach(() => {
    useSubscription.mockReturnValue({
      usageStats: mockUsageStats,
      loading: false
    });
  });

  it('renders usage statistics correctly', () => {
    render(<UsageStats />);
    
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('Daily Usage')).toBeInTheDocument();
    expect(screen.getByText('API Calls')).toBeInTheDocument();
    expect(screen.getByText('Price Analysis')).toBeInTheDocument();
    expect(screen.getByText('News Access')).toBeInTheDocument();
    expect(screen.getByText('Search Queries')).toBeInTheDocument();
  });

  it('switches between daily and monthly tabs', () => {
    render(<UsageStats />);
    
    // Initially shows daily usage
    expect(screen.getByText('Daily Usage')).toBeInTheDocument();
    
    // Click monthly tab
    fireEvent.click(screen.getByText('Monthly'));
    
    expect(screen.getByText('Monthly Usage')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toHaveClass('usage-stats__tab--active');
  });

  it('displays usage progress bars', () => {
    render(<UsageStats />);
    
    // Check if progress bars are rendered
    expect(document.querySelectorAll('.usage-progress')).toHaveLength(4);
  });

  it('shows usage summary with percentages', () => {
    render(<UsageStats />);
    
    expect(screen.getByText('Usage Summary')).toBeInTheDocument();
    
    // Check for percentage calculations (150/1000 = 15%)
    expect(screen.getByText('15%')).toBeInTheDocument();
    
    // Check for usage numbers
    expect(screen.getByText('150 / 1K')).toBeInTheDocument();
  });

  it('displays reset time information', () => {
    render(<UsageStats />);
    
    expect(screen.getByText(/Resets in \d+ hours/)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    useSubscription.mockReturnValue({
      usageStats: null,
      loading: true
    });

    render(<UsageStats />);
    
    expect(screen.getByText('Loading usage statistics...')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    useSubscription.mockReturnValue({
      usageStats: null,
      loading: false
    });

    render(<UsageStats />);
    
    expect(screen.getByText('No usage data available')).toBeInTheDocument();
  });

  it('handles unlimited usage correctly', () => {
    const unlimitedStats = {
      daily: {
        api: { used: 150, limit: -1, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) }
      }
    };

    useSubscription.mockReturnValue({
      usageStats: unlimitedStats,
      loading: false
    });

    render(<UsageStats />);
    
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
  });

  it('shows warning for high usage', () => {
    const highUsageStats = {
      daily: {
        api: { used: 950, limit: 1000, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) }
      }
    };

    useSubscription.mockReturnValue({
      usageStats: highUsageStats,
      loading: false
    });

    render(<UsageStats />);
    
    // Should show 95% usage
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  it('formats large numbers correctly', () => {
    const largeNumberStats = {
      daily: {
        api: { used: 1500, limit: 10000, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) }
      }
    };

    useSubscription.mockReturnValue({
      usageStats: largeNumberStats,
      loading: false
    });

    render(<UsageStats />);
    
    // Should format 1500 as 1.5K and 10000 as 10K
    expect(screen.getByText('1.5K / 10K')).toBeInTheDocument();
  });
});