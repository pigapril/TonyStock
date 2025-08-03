/**
 * Test for PriceAnalysis component Turnstile feature flag behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n/i18n';
import { PriceAnalysis } from '../PriceAnalysis';

// Mock dependencies
jest.mock('../../../utils/enhancedApiClient');
jest.mock('../../../components/Auth/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true })
}));
jest.mock('../../../components/Common/Dialog/useDialog', () => ({
  useDialog: () => ({ openDialog: jest.fn() })
}));
jest.mock('../../../components/Common/InterstitialAdModal/AdContext', () => ({
  useAdContext: () => ({ requestAdDisplay: jest.fn() })
}));
jest.mock('../../../components/Watchlist/hooks/useToastManager', () => ({
  useToastManager: () => ({
    showToast: jest.fn(),
    toast: null,
    hideToast: jest.fn()
  })
}));
jest.mock('react-turnstile', () => {
  return function MockTurnstile({ onSuccess }) {
    React.useEffect(() => {
      // Auto-trigger success for testing
      setTimeout(() => onSuccess('mock-token'), 100);
    }, [onSuccess]);
    return <div data-testid="turnstile-widget">Turnstile Widget</div>;
  };
});

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  </BrowserRouter>
);

describe('PriceAnalysis Turnstile Feature Flag', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should not render Turnstile widget when feature is disabled', async () => {
    // Set environment variable to disable Turnstile
    process.env.REACT_APP_TURNSTILE_ENABLED = 'false';

    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText(/股票代碼/)).toBeInTheDocument();
    });

    // Turnstile widget should not be present
    expect(screen.queryByTestId('turnstile-widget')).not.toBeInTheDocument();
  });

  test('should render Turnstile widget when feature is enabled', async () => {
    // Set environment variable to enable Turnstile
    process.env.REACT_APP_TURNSTILE_ENABLED = 'true';

    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText(/股票代碼/)).toBeInTheDocument();
    });

    // Turnstile widget should be present
    expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument();
  });

  test('should show correct button text when Turnstile is disabled', async () => {
    // Set environment variable to disable Turnstile
    process.env.REACT_APP_TURNSTILE_ENABLED = 'false';

    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText(/股票代碼/)).toBeInTheDocument();
    });

    // Button should show "開始分析" instead of "請先完成驗證"
    const submitButton = screen.getByRole('button', { name: /開始分析|Start Analysis/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).not.toBeDisabled();
  });

  test('should show verification button text when Turnstile is enabled and no token', async () => {
    // Set environment variable to enable Turnstile
    process.env.REACT_APP_TURNSTILE_ENABLED = 'true';

    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText(/股票代碼/)).toBeInTheDocument();
    });

    // Initially, button should show verification text and be disabled
    const submitButton = screen.getByRole('button', { name: /請先完成驗證|Complete Verification/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  test('should enable button after Turnstile verification when feature is enabled', async () => {
    // Set environment variable to enable Turnstile
    process.env.REACT_APP_TURNSTILE_ENABLED = 'true';

    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    // Wait for component to render and Turnstile to auto-verify
    await waitFor(() => {
      expect(screen.getByText(/股票代碼/)).toBeInTheDocument();
    });

    // Wait for Turnstile auto-verification
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /開始分析|Start Analysis/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    }, { timeout: 3000 });
  });

  test('should handle form submission without Turnstile token when feature is disabled', async () => {
    // Set environment variable to disable Turnstile
    process.env.REACT_APP_TURNSTILE_ENABLED = 'false';

    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText(/股票代碼/)).toBeInTheDocument();
    });

    // Fill in stock code
    const stockInput = screen.getByPlaceholderText(/請輸入股票代碼/);
    fireEvent.change(stockInput, { target: { value: 'AAPL' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /開始分析|Start Analysis/i });
    fireEvent.click(submitButton);

    // Should not show Turnstile-related errors
    await waitFor(() => {
      expect(screen.queryByText(/請先完成驗證/)).not.toBeInTheDocument();
      expect(screen.queryByText(/驗證失敗/)).not.toBeInTheDocument();
    });
  });
});

export default {};