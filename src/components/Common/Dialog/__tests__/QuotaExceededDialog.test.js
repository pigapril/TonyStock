import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuotaExceededDialog } from '../QuotaExceededDialog';

// Mock dependencies
jest.mock('../useDialog', () => ({
  useDialog: jest.fn()
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue, options) => {
      if (options && typeof options === 'object') {
        let result = defaultValue || key;
        Object.keys(options).forEach(optionKey => {
          result = result.replace(`{{${optionKey}}}`, options[optionKey]);
        });
        return result;
      }
      return defaultValue || key;
    }
  })
}));

jest.mock('../../../../utils/analytics', () => ({
  Analytics: {
    ui: {
      dialog: {
        close: jest.fn(),
        action: jest.fn()
      }
    }
  }
}));

jest.mock('../Dialog', () => ({
  Dialog: ({ children, open, onClose, title }) => 
    open ? (
      <div data-testid="dialog">
        <div data-testid="dialog-title">{title}</div>
        <button data-testid="dialog-close" onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null
}));

const { useDialog } = require('../useDialog');
const { Analytics } = require('../../../../utils/analytics');

describe('QuotaExceededDialog', () => {
  const mockCloseDialog = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    useDialog.mockReturnValue({
      dialog: {
        type: 'quotaExceeded',
        isOpen: true,
        props: {}
      },
      closeDialog: mockCloseDialog
    });
  });

  it('should render when dialog type is quotaExceeded', () => {
    render(<QuotaExceededDialog />);
    
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Usage Limit Reached');
  });

  it('should not render when dialog type is not quotaExceeded', () => {
    useDialog.mockReturnValue({
      dialog: {
        type: 'auth',
        isOpen: true,
        props: {}
      },
      closeDialog: mockCloseDialog
    });

    render(<QuotaExceededDialog />);
    
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('should display quota information when provided', () => {
    useDialog.mockReturnValue({
      dialog: {
        type: 'quotaExceeded',
        isOpen: true,
        props: {
          quota: 1000,
          usage: 1000,
          resetTime: '2024-01-01T00:00:00Z',
          message: 'You have exceeded your daily usage limit.'
        }
      },
      closeDialog: mockCloseDialog
    });

    render(<QuotaExceededDialog />);
    
    expect(screen.getByText('You have exceeded your daily usage limit.')).toBeInTheDocument();
    expect(screen.getByText('Usage: 1000/1000')).toBeInTheDocument();
    expect(screen.getByText('Resets at: 2024-01-01T00:00:00Z')).toBeInTheDocument();
  });

  it('should display default message when no custom message provided', () => {
    render(<QuotaExceededDialog />);
    
    expect(screen.getByText('You have exceeded your daily usage limit')).toBeInTheDocument();
  });

  it('should handle close button click', () => {
    render(<QuotaExceededDialog />);
    
    const closeButtons = screen.getAllByText('Close');
    const dialogCloseButton = closeButtons.find(button => button.className === 'btn-secondary');
    fireEvent.click(dialogCloseButton);
    
    expect(mockCloseDialog).toHaveBeenCalled();
    expect(Analytics.ui.dialog.close).toHaveBeenCalledWith({ type: 'quotaExceeded' });
  });

  it('should handle upgrade button click', () => {
    const mockOpen = jest.spyOn(window, 'open').mockImplementation(() => {});
    
    useDialog.mockReturnValue({
      dialog: {
        type: 'quotaExceeded',
        isOpen: true,
        props: {
          upgradeUrl: 'https://example.com/pricing'
        }
      },
      closeDialog: mockCloseDialog
    });

    render(<QuotaExceededDialog />);
    
    const upgradeButton = screen.getByText('Upgrade Plan');
    fireEvent.click(upgradeButton);
    
    expect(mockOpen).toHaveBeenCalledWith('https://example.com/pricing', '_blank');
    expect(Analytics.ui.dialog.action).toHaveBeenCalledWith({
      type: 'quotaExceeded',
      action: 'upgrade_clicked',
      upgradeUrl: 'https://example.com/pricing'
    });
    
    mockOpen.mockRestore();
  });

  it('should use default upgrade URL when none provided', () => {
    const mockOpen = jest.spyOn(window, 'open').mockImplementation(() => {});
    
    render(<QuotaExceededDialog />);
    
    const upgradeButton = screen.getByText('Upgrade Plan');
    fireEvent.click(upgradeButton);
    
    expect(mockOpen).toHaveBeenCalledWith('/pricing', '_blank');
    
    mockOpen.mockRestore();
  });

  it('should handle dialog close from Dialog component', () => {
    render(<QuotaExceededDialog />);
    
    const dialogCloseButton = screen.getByTestId('dialog-close');
    fireEvent.click(dialogCloseButton);
    
    expect(mockCloseDialog).toHaveBeenCalled();
    expect(Analytics.ui.dialog.close).toHaveBeenCalledWith({ type: 'quotaExceeded' });
  });

  it('should not render quota details when not provided', () => {
    render(<QuotaExceededDialog />);
    
    expect(screen.queryByText(/Usage:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Resets at:/)).not.toBeInTheDocument();
  });

  it('should render quota details only when both quota and usage are provided', () => {
    useDialog.mockReturnValue({
      dialog: {
        type: 'quotaExceeded',
        isOpen: true,
        props: {
          quota: 1000,
          // usage not provided
          resetTime: '2024-01-01T00:00:00Z'
        }
      },
      closeDialog: mockCloseDialog
    });

    render(<QuotaExceededDialog />);
    
    expect(screen.queryByText(/Usage:/)).not.toBeInTheDocument();
    expect(screen.getByText('Resets at: 2024-01-01T00:00:00Z')).toBeInTheDocument();
  });
});