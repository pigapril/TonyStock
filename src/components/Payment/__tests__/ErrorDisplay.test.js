/**
 * 錯誤顯示組件測試
 * 
 * @author ECPay Integration Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import ErrorDisplay, { ErrorBoundary } from '../../Common/ErrorDisplay';

// Mock paymentErrorHandler
jest.mock('../../../utils/paymentErrorHandler', () => ({
  getActionSuggestion: jest.fn((action) => ({
    text: `Action: ${action}`,
    action,
    variant: 'primary'
  })),
  getSeverityColor: jest.fn((severity) => `color-${severity}`)
}));

const renderWithI18n = (component) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

describe('ErrorDisplay', () => {
  const mockError = {
    code: 'PAYMENT_FAILED',
    title: '付款失敗',
    message: '付款過程中發生問題，請檢查付款資訊後重試',
    severity: 'error',
    action: 'retry',
    recoverable: true,
    timestamp: '2025-01-10T12:00:00.000Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本渲染', () => {
    test('應該渲染錯誤訊息', () => {
      renderWithI18n(<ErrorDisplay error={mockError} />);
      
      expect(screen.getByText('付款失敗')).toBeInTheDocument();
      expect(screen.getByText('付款過程中發生問題，請檢查付款資訊後重試')).toBeInTheDocument();
    });

    test('當沒有錯誤時不應該渲染任何內容', () => {
      const { container } = renderWithI18n(<ErrorDisplay error={null} />);
      expect(container.firstChild).toBeNull();
    });

    test('應該顯示正確的嚴重程度樣式', () => {
      const { container } = renderWithI18n(<ErrorDisplay error={mockError} />);
      expect(container.firstChild).toHaveClass('color-error');
    });
  });

  describe('不同顯示模式', () => {
    test('應該以 banner 模式渲染', () => {
      renderWithI18n(<ErrorDisplay error={mockError} mode="banner" />);
      expect(screen.getByText('付款失敗')).toBeInTheDocument();
    });

    test('應該以 modal 模式渲染', () => {
      renderWithI18n(<ErrorDisplay error={mockError} mode="modal" />);
      expect(screen.getByText('付款失敗')).toBeInTheDocument();
      // Modal 應該有背景遮罩
      expect(document.querySelector('.fixed.inset-0.bg-gray-500')).toBeInTheDocument();
    });

    test('應該以 inline 模式渲染', () => {
      renderWithI18n(<ErrorDisplay error={mockError} mode="inline" />);
      expect(screen.getByText('付款失敗')).toBeInTheDocument();
    });

    test('應該以 toast 模式渲染', () => {
      renderWithI18n(<ErrorDisplay error={mockError} mode="toast" />);
      expect(screen.getByText('付款失敗')).toBeInTheDocument();
    });
  });

  describe('互動功能', () => {
    test('應該顯示重試按鈕並處理點擊', async () => {
      const onRetry = jest.fn();
      renderWithI18n(
        <ErrorDisplay 
          error={mockError} 
          showRetry={true}
          onRetry={onRetry}
        />
      );

      const retryButton = screen.getByText('common.retry');
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalled();
      });
    });

    test('應該顯示關閉按鈕並處理點擊', () => {
      const onDismiss = jest.fn();
      renderWithI18n(
        <ErrorDisplay 
          error={mockError} 
          showDismiss={true}
          onDismiss={onDismiss}
        />
      );

      const dismissButton = screen.getByRole('button', { name: '' }); // X 按鈕沒有文字
      fireEvent.click(dismissButton);
      expect(onDismiss).toHaveBeenCalled();
    });

    test('應該顯示操作按鈕並處理點擊', () => {
      const onAction = jest.fn();
      renderWithI18n(
        <ErrorDisplay 
          error={mockError}
          onAction={onAction}
        />
      );

      const actionButton = screen.getByText('Action: retry');
      fireEvent.click(actionButton);
      expect(onAction).toHaveBeenCalledWith({
        text: 'Action: retry',
        action: 'retry',
        variant: 'primary'
      });
    });

    test('不可恢復的錯誤不應該顯示重試按鈕', () => {
      const nonRecoverableError = {
        ...mockError,
        recoverable: false
      };

      renderWithI18n(
        <ErrorDisplay 
          error={nonRecoverableError} 
          showRetry={true}
        />
      );

      expect(screen.queryByText('common.retry')).not.toBeInTheDocument();
    });
  });

  describe('自動重試功能', () => {
    test('應該顯示自動重試倒計時', async () => {
      const onRetry = jest.fn();
      renderWithI18n(
        <ErrorDisplay 
          error={mockError}
          autoRetry={true}
          retryDelay={3000}
          onRetry={onRetry}
        />
      );

      // 應該顯示倒計時
      expect(screen.getByText(/common.retryIn/)).toBeInTheDocument();

      // 等待自動重試
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalled();
      }, { timeout: 4000 });
    });

    test('重試按鈕在倒計時期間應該被禁用', () => {
      renderWithI18n(
        <ErrorDisplay 
          error={mockError}
          autoRetry={true}
          retryDelay={3000}
          showRetry={true}
        />
      );

      const retryButton = screen.getByRole('button');
      expect(retryButton).toBeDisabled();
    });
  });

  describe('錯誤詳情', () => {
    test('應該顯示錯誤詳情', () => {
      renderWithI18n(
        <ErrorDisplay 
          error={mockError}
          showDetails={true}
        />
      );

      expect(screen.getByText('common.technicalDetails')).toBeInTheDocument();
      expect(screen.getByText('common.errorCode')).toBeInTheDocument();
      expect(screen.getByText('PAYMENT_FAILED')).toBeInTheDocument();
    });

    test('預設情況下不應該顯示錯誤詳情', () => {
      renderWithI18n(<ErrorDisplay error={mockError} />);
      expect(screen.queryByText('common.technicalDetails')).not.toBeInTheDocument();
    });
  });

  describe('不同嚴重程度', () => {
    const severityTests = [
      { severity: 'error', expectedIcon: 'XCircleIcon' },
      { severity: 'warning', expectedIcon: 'ExclamationTriangleIcon' },
      { severity: 'info', expectedIcon: 'InformationCircleIcon' }
    ];

    severityTests.forEach(({ severity, expectedIcon }) => {
      test(`應該為 ${severity} 嚴重程度顯示正確的圖示`, () => {
        const errorWithSeverity = { ...mockError, severity };
        renderWithI18n(<ErrorDisplay error={errorWithSeverity} />);
        
        // 檢查是否有對應的圖示類別
        expect(document.querySelector(`[data-testid="${expectedIcon}"]`)).toBeInTheDocument();
      });
    });
  });

  describe('載入狀態', () => {
    test('重試時應該顯示載入狀態', async () => {
      const onRetry = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      renderWithI18n(
        <ErrorDisplay 
          error={mockError}
          showRetry={true}
          onRetry={onRetry}
        />
      );

      const retryButton = screen.getByText('common.retry');
      fireEvent.click(retryButton);

      // 應該顯示重試中狀態
      await waitFor(() => {
        expect(screen.getByText('common.retrying')).toBeInTheDocument();
      });

      // 等待重試完成
      await waitFor(() => {
        expect(screen.getByText('common.retry')).toBeInTheDocument();
      });
    });
  });
});

describe('ErrorBoundary', () => {
  // 抑制 console.error 在測試中的輸出
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  const ThrowError = ({ shouldThrow }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>No error</div>;
  };

  test('應該捕獲並顯示錯誤', () => {
    renderWithI18n(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('組件錯誤')).toBeInTheDocument();
    expect(screen.getByText('頁面組件發生錯誤，請重新整理頁面')).toBeInTheDocument();
  });

  test('正常情況下應該渲染子組件', () => {
    renderWithI18n(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  test('應該提供重試功能', () => {
    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    renderWithI18n(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByText('common.retry');
    fireEvent.click(retryButton);

    expect(mockReload).toHaveBeenCalled();
  });
});