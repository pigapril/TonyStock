import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { usePaymentErrorHandler } from '../../../hooks/usePaymentErrorHandler';
import paymentErrorHandler from '../../../utils/paymentErrorHandler';
import i18n from '../../../i18n';

jest.mock('../../../utils/paymentErrorHandler', () => ({
  __esModule: true,
  default: {
    handleError: jest.fn(),
    smartRecovery: jest.fn(),
    getActionSuggestion: jest.fn(() => ({
      text: '重試',
      action: 'retry',
      variant: 'primary'
    }))
  }
}));

jest.mock('../../../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

const mockPaymentErrorHandler = paymentErrorHandler;

const wrapper = ({ children }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
);

describe('usePaymentErrorHandler', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockPaymentErrorHandler.handleError.mockReturnValue({
      code: 'PAYMENT_FAILED',
      title: '付款失敗',
      message: '付款過程中發生問題',
      severity: 'error',
      recoverable: true,
      autoRecoverable: true,
      retryDelay: 1000,
      action: 'retry',
      timestamp: '2025-01-10T12:00:00.000Z'
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('exposes the normalized error state and resets it with clearError', () => {
    const { result } = renderHook(() => usePaymentErrorHandler(), { wrapper });

    act(() => {
      result.current.handleError(new Error('boom'));
    });

    expect(result.current.hasError).toBe(true);
    expect(result.current.errorCode).toBe('PAYMENT_FAILED');
    expect(result.current.getErrorTitle()).toBe('付款失敗');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.hasError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
  });

  it('retries the stored operation and calls onRecovery after a recoverable failure', async () => {
    const onRecovery = jest.fn();
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('first attempt failed'))
      .mockResolvedValueOnce('ok');

    const { result } = renderHook(
      () => usePaymentErrorHandler({ onRecovery }),
      { wrapper }
    );

    await act(async () => {
      await expect(result.current.executeWithErrorHandling(operation)).rejects.toThrow('first attempt failed');
    });

    await act(async () => {
      await result.current.retry();
    });

    expect(operation).toHaveBeenCalledTimes(2);
    expect(onRecovery).toHaveBeenCalledWith('ok');
    expect(result.current.hasError).toBe(false);
  });

  it('supports smart recovery and auto retry scheduling', async () => {
    const onRecovery = jest.fn();
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('temporary outage'))
      .mockResolvedValueOnce('recovered');

    mockPaymentErrorHandler.smartRecovery.mockResolvedValue('smart-recovered');

    const { result } = renderHook(
      () => usePaymentErrorHandler({ autoRetry: true, retryDelay: 1000, onRecovery }),
      { wrapper }
    );

    await act(async () => {
      await expect(result.current.executeWithErrorHandling(operation)).rejects.toThrow('temporary outage');
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(onRecovery).toHaveBeenCalledWith('recovered');
    });

    act(() => {
      result.current.handleError(new Error('recoverable'));
    });

    await act(async () => {
      await expect(result.current.smartRecover(() => Promise.resolve('ignored'))).resolves.toBe('smart-recovered');
    });

    expect(mockPaymentErrorHandler.smartRecovery).toHaveBeenCalled();
  });
});
