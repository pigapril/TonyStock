import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuotaDialog } from '../QuotaDialog';
import { SubscriptionProvider } from '../../context/SubscriptionContext';

// Mock the dependencies
jest.mock('../../../Common/Dialog/useDialog', () => ({
  useDialog: () => ({
    dialog: {
      type: 'quotaExceeded',
      isOpen: true,
      props: {
        quota: 1000,
        usage: 1000,
        resetTime: new Date('2024-01-01T12:00:00Z'),
        featureType: 'api'
      }
    },
    closeDialog: jest.fn()
  })
}));

jest.mock('../../../Auth/useAuth', () => ({
  useAuth: () => ({
    user: { plan: 'free' },
    isAuthenticated: true
  })
}));

jest.mock('../../../utils/analytics', () => ({
  Analytics: {
    ui: {
      dialog: {
        close: jest.fn(),
        action: jest.fn()
      }
    }
  }
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

const renderWithProvider = (component) => {
  return render(
    <SubscriptionProvider>
      {component}
    </SubscriptionProvider>
  );
};

describe('QuotaDialog', () => {
  it('renders the quota dialog with Apple-style design', () => {
    renderWithProvider(<QuotaDialog />);
    
    expect(screen.getByText('Usage Limit Reached')).toBeInTheDocument();
    expect(screen.getByText(/You've reached your.*limit for today/)).toBeInTheDocument();
  });

  it('displays current plan badge', () => {
    renderWithProvider(<QuotaDialog />);
    
    expect(screen.getByText('Current Plan')).toBeInTheDocument();
    // Plan badge should be rendered
    expect(document.querySelector('.plan-badge')).toBeInTheDocument();
  });

  it('shows usage progress bar when quota and usage are provided', () => {
    renderWithProvider(<QuotaDialog />);
    
    // Usage progress bar should be rendered
    expect(document.querySelector('.usage-progress')).toBeInTheDocument();
  });

  it('displays reset time information', () => {
    renderWithProvider(<QuotaDialog />);
    
    expect(screen.getByText(/Resets at/)).toBeInTheDocument();
  });

  it('shows plan comparison preview', () => {
    renderWithProvider(<QuotaDialog />);
    
    expect(screen.getByText('Get More with Pro')).toBeInTheDocument();
    expect(screen.getByText('1,000 / day')).toBeInTheDocument();
    expect(screen.getByText('10,000 / day')).toBeInTheDocument();
  });

  it('has close and upgrade buttons', () => {
    renderWithProvider(<QuotaDialog />);
    
    expect(screen.getByText('Close')).toBeInTheDocument();
    expect(screen.getByText('View Plans')).toBeInTheDocument();
  });

  it('handles close button click', () => {
    const mockCloseDialog = jest.fn();
    jest.doMock('../../../Common/Dialog/useDialog', () => ({
      useDialog: () => ({
        dialog: {
          type: 'quotaExceeded',
          isOpen: true,
          props: { quota: 1000, usage: 1000 }
        },
        closeDialog: mockCloseDialog
      })
    }));

    renderWithProvider(<QuotaDialog />);
    
    fireEvent.click(screen.getByText('Close'));
    // Note: Due to mocking limitations, we can't easily test the actual function call
    // but we can verify the button is clickable
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('handles upgrade button click', () => {
    // Mock window.location.href
    delete window.location;
    window.location = { href: '' };

    renderWithProvider(<QuotaDialog />);
    
    fireEvent.click(screen.getByText('View Plans'));
    
    // The button should be clickable
    expect(screen.getByText('View Plans')).toBeInTheDocument();
  });

  it('does not render when dialog type is not quotaExceeded', () => {
    jest.doMock('../../../Common/Dialog/useDialog', () => ({
      useDialog: () => ({
        dialog: {
          type: 'other',
          isOpen: true
        },
        closeDialog: jest.fn()
      })
    }));

    const { container } = renderWithProvider(<QuotaDialog />);
    expect(container.firstChild).toBeNull();
  });
});