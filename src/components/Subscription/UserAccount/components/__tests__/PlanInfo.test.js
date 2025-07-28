import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PlanInfo } from '../PlanInfo';
import { SubscriptionProvider } from '../../../context/SubscriptionContext';

// Mock the dependencies
jest.mock('../../../context/SubscriptionContext', () => ({
  ...jest.requireActual('../../../context/SubscriptionContext'),
  useSubscription: jest.fn()
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn()
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

jest.mock('../../Auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: '123', plan: 'free' },
    isAuthenticated: true
  })
}));

const { useSubscription } = require('../../../context/SubscriptionContext');

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('PlanInfo', () => {
  beforeEach(() => {
    useSubscription.mockReturnValue({
      userPlan: {
        type: 'free',
        status: 'active',
        startDate: new Date('2024-01-01'),
        autoRenew: true
      },
      loading: false
    });
  });

  it('renders plan information correctly', () => {
    renderWithProviders(<PlanInfo />);
    
    expect(screen.getByText('Plan Features')).toBeInTheDocument();
    expect(screen.getByText('1,000 API calls per day')).toBeInTheDocument();
    expect(screen.getByText('10 price analyses per day')).toBeInTheDocument();
    expect(screen.getByText('5 watchlist categories')).toBeInTheDocument();
    expect(screen.getByText('Community support')).toBeInTheDocument();
  });

  it('shows upgrade button for free plan', () => {
    renderWithProviders(<PlanInfo />);
    
    expect(screen.getByText('Upgrade Plan')).toBeInTheDocument();
  });

  it('shows upgrade to ultra button for pro plan', () => {
    useSubscription.mockReturnValue({
      userPlan: {
        type: 'pro',
        status: 'active',
        startDate: new Date('2024-01-01'),
        autoRenew: true
      },
      loading: false
    });

    renderWithProviders(<PlanInfo />);
    
    expect(screen.getByText('Upgrade to Ultra')).toBeInTheDocument();
  });

  it('does not show upgrade button for ultra plan', () => {
    useSubscription.mockReturnValue({
      userPlan: {
        type: 'ultra',
        status: 'active',
        startDate: new Date('2024-01-01'),
        autoRenew: true
      },
      loading: false
    });

    renderWithProviders(<PlanInfo />);
    
    expect(screen.queryByText('Upgrade Plan')).not.toBeInTheDocument();
    expect(screen.queryByText('Upgrade to Ultra')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    useSubscription.mockReturnValue({
      userPlan: null,
      loading: true
    });

    renderWithProviders(<PlanInfo />);
    
    expect(screen.getByText('Loading plan information...')).toBeInTheDocument();
  });

  it('displays plan status correctly', () => {
    renderWithProviders(<PlanInfo />);
    
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(document.querySelector('.plan-info__status-indicator--active')).toBeInTheDocument();
  });

  it('displays plan dates when available', () => {
    renderWithProviders(<PlanInfo />);
    
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('Auto Renew')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('shows correct features for pro plan', () => {
    useSubscription.mockReturnValue({
      userPlan: {
        type: 'pro',
        status: 'active'
      },
      loading: false
    });

    renderWithProviders(<PlanInfo />);
    
    expect(screen.getByText('10,000 API calls per day')).toBeInTheDocument();
    expect(screen.getByText('100 price analyses per day')).toBeInTheDocument();
    expect(screen.getByText('20 watchlist categories')).toBeInTheDocument();
    expect(screen.getByText('Priority support')).toBeInTheDocument();
  });

  it('shows correct features for ultra plan', () => {
    useSubscription.mockReturnValue({
      userPlan: {
        type: 'ultra',
        status: 'active'
      },
      loading: false
    });

    renderWithProviders(<PlanInfo />);
    
    expect(screen.getByText('Unlimited API calls')).toBeInTheDocument();
    expect(screen.getByText('Unlimited price analyses')).toBeInTheDocument();
    expect(screen.getByText('100 watchlist categories')).toBeInTheDocument();
    expect(screen.getByText('Premium support')).toBeInTheDocument();
  });
});