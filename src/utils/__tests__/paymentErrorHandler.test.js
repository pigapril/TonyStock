/**
 * PaymentErrorHandler 測試
 */

import { handlePaymentError, getErrorMessage, isRetryableError } from '../paymentErrorHandler';

describe('PaymentErrorHandler', () => {
  describe('handlePaymentError', () => {
    it('handles network errors', () => {
      const error = new Error('Network Error');
      error.code = 'NETWORK_ERROR';

      const result = handlePaymentError(error);

      expect(result.userMessage).toContain('網路連線');
      expect(result.isRetryable).toBe(true);
      expect(result.errorCode).toBe('NETWORK_ERROR');
    });

    it('handles payment declined errors', () => {
      const error = new Error('Payment declined');
      error.code = 'PAYMENT_DECLINED';

      const result = handlePaymentError(error);

      expect(result.userMessage).toContain('付款被拒絕');
      expect(result.isRetryable).toBe(false);
      expect(result.errorCode).toBe('PAYMENT_DECLINED');
    });

    it('handles insufficient funds errors', () => {
      const error = new Error('Insufficient funds');
      error.code = 'INSUFFICIENT_FUNDS';

      const result = handlePaymentError(error);

      expect(result.userMessage).toContain('餘額不足');
      expect(result.isRetryable).toBe(false);
      expect(result.errorCode).toBe('INSUFFICIENT_FUNDS');
    });

    it('handles expired card errors', () => {
      const error = new Error('Card expired');
      error.code = 'CARD_EXPIRED';

      const result = handlePaymentError(error);

      expect(result.userMessage).toContain('信用卡已過期');
      expect(result.isRetryable).toBe(false);
      expect(result.errorCode).toBe('CARD_EXPIRED');
    });

    it('handles server errors', () => {
      const error = new Error('Internal server error');
      error.code = 'SERVER_ERROR';

      const result = handlePaymentError(error);

      expect(result.userMessage).toContain('伺服器錯誤');
      expect(result.isRetryable).toBe(true);
      expect(result.errorCode).toBe('SERVER_ERROR');
    });

    it('handles timeout errors', () => {
      const error = new Error('Request timeout');
      error.code = 'TIMEOUT';

      const result = handlePaymentError(error);

      expect(result.userMessage).toContain('請求逾時');
      expect(result.isRetryable).toBe(true);
      expect(result.errorCode).toBe('TIMEOUT');
    });

    it('handles unknown errors', () => {
      const error = new Error('Unknown error');

      const result = handlePaymentError(error);

      expect(result.userMessage).toContain('未知錯誤');
      expect(result.isRetryable).toBe(false);
      expect(result.errorCode).toBe('UNKNOWN_ERROR');
    });

    it('handles errors without code', () => {
      const error = new Error('Some error message');

      const result = handlePaymentError(error);

      expect(result.userMessage).toBe('Some error message');
      expect(result.isRetryable).toBe(false);
      expect(result.errorCode).toBe('UNKNOWN_ERROR');
    });
  });

  describe('getErrorMessage', () => {
    it('returns correct message for known error codes', () => {
      expect(getErrorMessage('NETWORK_ERROR')).toContain('網路連線');
      expect(getErrorMessage('PAYMENT_DECLINED')).toContain('付款被拒絕');
      expect(getErrorMessage('INSUFFICIENT_FUNDS')).toContain('餘額不足');
    });

    it('returns default message for unknown error codes', () => {
      expect(getErrorMessage('UNKNOWN_CODE')).toContain('未知錯誤');
    });
  });

  describe('isRetryableError', () => {
    it('identifies retryable errors correctly', () => {
      expect(isRetryableError('NETWORK_ERROR')).toBe(true);
      expect(isRetryableError('SERVER_ERROR')).toBe(true);
      expect(isRetryableError('TIMEOUT')).toBe(true);
    });

    it('identifies non-retryable errors correctly', () => {
      expect(isRetryableError('PAYMENT_DECLINED')).toBe(false);
      expect(isRetryableError('INSUFFICIENT_FUNDS')).toBe(false);
      expect(isRetryableError('CARD_EXPIRED')).toBe(false);
      expect(isRetryableError('INVALID_CARD')).toBe(false);
    });

    it('defaults to non-retryable for unknown errors', () => {
      expect(isRetryableError('UNKNOWN_CODE')).toBe(false);
    });
  });
});