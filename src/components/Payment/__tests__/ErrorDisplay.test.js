import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import ErrorDisplay, { ErrorBoundary } from '../../Common/ErrorDisplay';
import i18n from '../../../i18n';

const renderWithI18n = (ui) =>
  render(
    <I18nextProvider i18n={i18n}>
      {ui}
    </I18nextProvider>
  );

describe('ErrorDisplay', () => {
  const baseError = {
    code: 'PAYMENT_FAILED',
    title: '付款失敗',
    message: '付款過程中發生問題，請稍後再試',
    severity: 'error',
    recoverable: true,
    timestamp: '2025-01-10T12:00:00.000Z',
    context: 'payment'
  };

  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the banner variant with retry, action, and dismiss handlers', async () => {
    const onRetry = jest.fn();
    const onDismiss = jest.fn();
    const onAction = jest.fn();

    renderWithI18n(
      <ErrorDisplay
        error={{ ...baseError, action: 'back' }}
        onRetry={onRetry}
        onDismiss={onDismiss}
        onAction={onAction}
      />
    );

    expect(screen.getByText('付款失敗')).toBeInTheDocument();
    expect(screen.getByText('付款過程中發生問題，請稍後再試')).toBeInTheDocument();

    fireEvent.click(screen.getByText('common.retry'));
    await waitFor(() => {
      expect(onRetry).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    expect(onAction).toHaveBeenCalledWith({
      text: '返回',
      action: 'back',
      variant: 'secondary'
    });

    const dismissButton = screen.getAllByRole('button').find((button) => button.textContent === '');
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders modal details and triggers auto retry countdown', async () => {
    const onRetry = jest.fn();

    renderWithI18n(
      <ErrorDisplay
        error={baseError}
        mode="modal"
        showDetails={true}
        autoRetry={true}
        retryDelay={1000}
        onRetry={onRetry}
      />
    );

    expect(document.querySelector('.fixed.inset-0.bg-gray-500')).toBeInTheDocument();
    expect(screen.getByText('common.technicalDetails')).toBeInTheDocument();
    expect(screen.getByText('PAYMENT_FAILED')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(onRetry).toHaveBeenCalled();
    });
  });

  it('shows the fallback banner from ErrorBoundary when a child throws', () => {
    const Thrower = () => {
      throw new Error('boom');
    };
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    renderWithI18n(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    );

    expect(screen.getByText('組件錯誤')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
