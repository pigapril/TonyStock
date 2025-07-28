import React from 'react';
import { render, screen } from '@testing-library/react';
import { SubscriptionHistory } from '../SubscriptionHistory';

// Mock the dependencies
jest.mock('../../../context/SubscriptionContext', () => ({
  useSubscription: jest.fn()
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

const { useSubscription } = require('../../../context/SubscriptionContext');

const mockSubscriptionHistory = [
  {
    id: '1',
    date: new Date('2024-01-01'),
    action: 'upgrade',
    fromPlan: 'free',
    toPlan: 'pro',
    amount: 299,
    status: 'completed'
  },
  {
    id: '2',
    date: new Date('2024-02-01'),
    action: 'renewal',
    fromPlan: 'pro',
    toPlan: 'pro',
    amount: 299,
    status: 'completed'
  },
  {
    id: '3',
    date: new Date('2024-03-01'),
    action: 'upgrade',
    fromPlan: 'pro',
    toPlan: 'ultra',
    amount: 599,
    status: 'pending'
  }
];

describe('SubscriptionHistory', () => {
  beforeEach(() => {
    useSubscription.mockReturnValue({
      subscriptionHistory: mockSubscriptionHistory,
      loading: false
    });
  });

  it('renders subscription history correctly', () => {
    render(<SubscriptionHistory />);
    
    expect(screen.getByText('upgrade')).toBeInTheDocument();
    expect(screen.getByText('renewal')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('displays timeline with correct number of items', () => {
    render(<SubscriptionHistory />);
    
    const timelineItems = document.querySelectorAll('.subscription-history__item');
    expect(timelineItems).toHaveLength(3);
  });

  it('shows plan changes with badges', () => {
    render(<SubscriptionHistory />);
    
    // Should show plan badges for plan changes
    const planBadges = document.querySelectorAll('.plan-badge');
    expect(planBadges.length).toBeGreaterThan(0);
  });

  it('displays amounts when available', () => {
    render(<SubscriptionHistory />);
    
    expect(screen.getByText('Amount')).toBeInTheDocument();
    // Should format currency (mocked to return the key)
    expect(screen.getByText(/NT\$299|299/)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    useSubscription.mockReturnValue({
      subscriptionHistory: null,
      loading: true
    });

    render(<SubscriptionHistory />);
    
    expect(screen.getByText('Loading subscription history...')).toBeInTheDocument();
  });

  it('shows empty state when no history', () => {
    useSubscription.mockReturnValue({
      subscriptionHistory: [],
      loading: false
    });

    render(<SubscriptionHistory />);
    
    expect(screen.getByText('No Subscription History')).toBeInTheDocument();
    expect(screen.getByText('Your subscription changes and renewals will appear here.')).toBeInTheDocument();
  });

  it('displays correct action icons and colors', () => {
    render(<SubscriptionHistory />);
    
    const timelineDots = document.querySelectorAll('.subscription-history__timeline-dot');
    expect(timelineDots).toHaveLength(3);
    
    // Check if icons are displayed
    expect(screen.getByText('⬆️')).toBeInTheDocument(); // upgrade icon
    expect(screen.getByText('🔄')).toBeInTheDocument(); // renewal icon
  });

  it('formats dates correctly', () => {
    render(<SubscriptionHistory />);
    
    // Should display formatted dates
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('shows status with correct colors', () => {
    render(<SubscriptionHistory />);
    
    const statusElements = document.querySelectorAll('.subscription-history__status');
    expect(statusElements.length).toBeGreaterThan(0);
  });

  it('displays timeline lines between items', () => {
    render(<SubscriptionHistory />);
    
    const timelineLines = document.querySelectorAll('.subscription-history__timeline-line');
    // Should have n-1 lines for n items
    expect(timelineLines).toHaveLength(2);
  });

  it('handles missing amount gracefully', () => {
    const historyWithoutAmount = [
      {
        id: '1',
        date: new Date('2024-01-01'),
        action: 'cancellation',
        fromPlan: 'pro',
        toPlan: null,
        status: 'completed'
      }
    ];

    useSubscription.mockReturnValue({
      subscriptionHistory: historyWithoutAmount,
      loading: false
    });

    render(<SubscriptionHistory />);
    
    expect(screen.getByText('cancellation')).toBeInTheDocument();
    expect(screen.queryByText('Amount')).not.toBeInTheDocument();
  });
});