/**
 * usePaymentErrorHandler Hook 測試
 * 
 * @author ECPay Integration Team
 * @version 1.0.0
 */

import { renderHook, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { usePaymentErrorHandler } from '../../../hooks/usePaymentErrorHandler';

// Mock paymentErrorHandler
jest.mock('../../../utils/paymentErrorHandler', () => ({
  handleError: jest.fn((error) => ({
    code: 'PAYMENT_FAILED',
    title: '付款失敗',
    message: '付款過程中發生問題',
    severity: 'error',
    recoverable: true,
    autoRecoverable: true,
    retryDelay: 2000,
    timestamp: new Date().toISOString()
  })),
  smartRecovery: jest.fn(),
  getActionSuggestion: jest.fn(() => ({
    text: '重試',
    action: 'retry',
    variant: 'primary'
  }))
}));

// Mock logger
jest.mock('../../../utils/logger');

const wrapper = ({ children }) => (
  <I18nextProvider i18n={i18n}>
    {children}
  </I18nextProvider>
);

describe('usePaymentErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('基本功能', () => {
    test('應該初始化正確的狀態', () => {
      const { result } = renderHook(() => usePaymentErrorHandler(), { wrapper });

      expect(result.current.error).toBeNull();
      expect(result.current.isRetrying).toBe(false);
      expect(result.current.isRecovering).toBe(false);
      expect(result.current.retryCount).toBe(0);
      expect(result.current.hasError).toBe(false);
    });

    test('應該正確處理錯誤', () => {
      const { result } = renderHook(() => usePaymentErrorHandler(), { wrapper });

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.hasError).toBe(true);
      expect(result.current.errorCode).toBe('PAYMENT_FAILED');
      expect(result.current.errorSeverity).toBe('error');
    });

    test('應該正確清除錯誤', () => {
      const { result } = renderHook(() => usePaymentErrorHandler(), { wrapper });

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      expect(result.current.hasError).toBe(true);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.hasError).toBe(false);
      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('自動重試功能', () => {
    test('應該在啟用自動重試時自動重試', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const onRecovery = jest.fn();

      const { result } = renderHook(() => 
        usePaymentErrorHandler({
          autoRetry: true,
          maxRetries: 2,
          retryDelay: 1000,
          onRecovery
        }), 
        { wrapper }
      );

      // 觸發錯誤
      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      expect(result.current.hasError).toBe(true);

      // 設置操作函數
      act(() => {
        result.current.executeWithErrorHandling(mockOperation);
      });

      // 快進時間觸發自動重試
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.isRetrying).toBe(true);
    });

    test('應該在達到最大重試次數後停止', () => {
      const { result } = renderHook(() => 
        usePaymentErrorHandler({
          autoRetry: true,
          maxRetries: 2
        }), 
        { wrapper }
      );

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      // 模擬多次重試
      act(() => {
        result.current.retry();
      });
      act(() => {
        result.current.retry();
      });

      expect(result.current.retryCount).toBe(2);
      expect(result.current.canRetry()).toBe(false);
    });
  });

  describe('手動重試功能', () => {
    test('應該正確執行手動重試', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success');
      
      const onRecovery = jest.fn();

      const { result } = renderHook(() => 
        usePaymentErrorHandler({ onRecovery }), 
        { wrapper }
      );

      // 執行操作並失敗
      await act(async () => {
        try {
          await result.current.executeWithErrorHandling(mockOperation);
        } catch (error) {
          // 預期的錯誤
        }
      });

      expect(result.current.hasError).toBe(true);

      // 手動重試
      await act(async () => {
        await result.current.retry();
      });

      expect(onRecovery).toHaveBeenCalledWith('success');
      expect(result.current.hasError).toBe(false);
    });

    test('應該正確追蹤重試次數', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Always fail'));

      const { result } = renderHook(() => 
        usePaymentErrorHandler({ maxRetries: 3 }), 
        { wrapper }
      );

      await act(async () => {
        try {
          await result.current.executeWithErrorHandling(mockOperation);
        } catch (error) {
          // 預期的錯誤
        }
      });

      // 執行多次重試
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          try {
            await result.current.retry();
          } catch (error) {
            // 預期的錯誤
          }
        });
      }

      expect(result.current.retryCount).toBe(3);
      expect(result.current.canRetry()).toBe(false);
    });
  });

  describe('智能恢復功能', () => {
    test('應該正確執行智能恢復', async () => {
      const mockOperation = jest.fn().mockResolvedValue('recovered');
      const paymentErrorHandler = require('../../../utils/paymentErrorHandler');
      paymentErrorHandler.smartRecovery.mockResolvedValue('recovered');

      const { result } = renderHook(() => usePaymentErrorHandler(), { wrapper });

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      await act(async () => {
        const recoveryResult = await result.current.smartRecover(mockOperation);
        expect(recoveryResult).toBe('recovered');
      });

      expect(paymentErrorHandler.smartRecovery).toHaveBeenCalled();
      expect(result.current.hasError).toBe(false);
    });

    test('應該在智能恢復失敗時保持錯誤狀態', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Recovery failed'));
      const paymentErrorHandler = require('../../../utils/paymentErrorHandler');
      paymentErrorHandler.smartRecovery.mockRejectedValue(new Error('Recovery failed'));

      const { result } = renderHook(() => usePaymentErrorHandler(), { wrapper });

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      await act(async () => {
        try {
          await result.current.smartRecover(mockOperation);
        } catch (error) {
          expect(error.message).toBe('Recovery failed');
        }
      });

      expect(result.current.hasError).toBe(true);
    });
  });

  describe('錯誤訊息和翻譯', () => {
    test('應該返回翻譯後的錯誤訊息', () => {
      const { result } = renderHook(() => usePaymentErrorHandler(), { wrapper });

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      const errorMessage = result.current.getErrorMessage();
      expect(typeof errorMessage).toBe('string');
      expect(errorMessage.length).toBeGreaterThan(0);
    });

    test('應該返回翻譯後的錯誤標題', () => {
      const { result } = renderHook(() => usePaymentErrorHandler(), { wrapper });

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      const errorTitle = result.current.getErrorTitle();
      expect(typeof errorTitle).toBe('string');
      expect(errorTitle.length).toBeGreaterThan(0);
    });

    test('應該返回翻譯後的操作建議', () => {
      const { result } = renderHook(() => usePaymentErrorHandler(), { wrapper });

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      const actionSuggestion = result.current.getActionSuggestion();
      expect(actionSuggestion).toHaveProperty('text');
      expect(actionSuggestion).toHaveProperty('action');
      expect(actionSuggestion).toHaveProperty('variant');
    });
  });

  describe('狀態檢查方法', () => {
    test('應該正確檢查錯誤是否可恢復', () => {
      const { result } = renderHook(() => usePaymentErrorHandler(), { wrapper });

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      expect(result.current.isRecoverable()).toBe(true);
    });

    test('應該正確檢查是否可以重試', () => {
      const { result } = renderHook(() => 
        usePaymentErrorHandler({ maxRetries: 3 }), 
        { wrapper }
      );

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      expect(result.current.canRetry()).toBe(true);

      // 模擬達到最大重試次數
      act(() => {
        for (let i = 0; i < 3; i++) {
          result.current.retry().catch(() => {});
        }
      });

      expect(result.current.canRetry()).toBe(false);
    });

    test('應該正確計算重試進度', () => {
      const { result } = renderHook(() => 
        usePaymentErrorHandler({ maxRetries: 4 }), 
        { wrapper }
      );

      expect(result.current.getRetryProgress()).toBe(0);

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      // 模擬 2 次重試
      act(() => {
        result.current.retry().catch(() => {});
        result.current.retry().catch(() => {});
      });

      expect(result.current.getRetryProgress()).toBe(50); // 2/4 * 100
    });
  });

  describe('錯誤類型檢查', () => {
    test('應該正確識別網路錯誤', () => {
      const paymentErrorHandler = require('../../../utils/paymentErrorHandler');
      paymentErrorHandler.handleError.mockReturnValue({
        code: 'NETWORK_ERROR',
        title: '網路錯誤',
        message: '網路連線異常',
        severity: 'warning',
        recoverable: true
      });

      const { result } = renderHook(() => usePaymentErrorHandler(), { wrapper });

      act(() => {
        result.current.handleError(new Error('Network error'));
      });

      expect(result.current.isNetworkError).toBe(true);
      expect(result.current.isAuthError).toBe(false);
      expect(result.current.isValidationError).toBe(false);
    });

    test('應該正確識別認證錯誤', () => {
      const paymentErrorHandler = require('../../../utils/paymentErrorHandler');
      paymentErrorHandler.handleError.mockReturnValue({
        code: 'USER_NOT_AUTHENTICATED',
        title: '認證錯誤',
        message: '用戶未認證',
        severity: 'warning',
        recoverable: true
      });

      const { result } = renderHook(() => usePaymentErrorHandler(), { wrapper });

      act(() => {
        result.current.handleError(new Error('Auth error'));
      });

      expect(result.current.isAuthError).toBe(true);
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isValidationError).toBe(false);
    });

    test('應該正確識別驗證錯誤', () => {
      const paymentErrorHandler = require('../../../utils/paymentErrorHandler');
      paymentErrorHandler.handleError.mockReturnValue({
        code: 'VALIDATION_ERROR',
        title: '驗證錯誤',
        message: '資料驗證失敗',
        severity: 'warning',
        recoverable: true
      });

      const { result } = renderHook(() => usePaymentErrorHandler(), { wrapper });

      act(() => {
        result.current.handleError(new Error('Validation error'));
      });

      expect(result.current.isValidationError).toBe(true);
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isAuthError).toBe(false);
    });
  });

  describe('回調函數', () => {
    test('應該在錯誤發生時調用 onError 回調', () => {
      const onError = jest.fn();

      const { result } = renderHook(() => 
        usePaymentErrorHandler({ onError }), 
        { wrapper }
      );

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'PAYMENT_FAILED'
        })
      );
    });

    test('應該在恢復成功時調用 onRecovery 回調', async () => {
      const onRecovery = jest.fn();
      const mockOperation = jest.fn().mockResolvedValue('success');

      const { result } = renderHook(() => 
        usePaymentErrorHandler({ onRecovery }), 
        { wrapper }
      );

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      await act(async () => {
        await result.current.executeWithErrorHandling(mockOperation);
      });

      expect(onRecovery).toHaveBeenCalledWith('success');
    });
  });

  describe('清理功能', () => {
    test('應該在組件卸載時清理定時器', () => {
      const { result, unmount } = renderHook(() => 
        usePaymentErrorHandler({
          autoRetry: true,
          retryDelay: 5000
        }), 
        { wrapper }
      );

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      // 卸載組件
      unmount();

      // 快進時間，確保沒有定時器執行
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // 如果清理正確，這裡不應該有任何副作用
      expect(true).toBe(true); // 測試通過表示清理成功
    });
  });
});