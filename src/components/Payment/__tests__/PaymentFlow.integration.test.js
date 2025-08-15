/**
 * PaymentFlow 整合測試
 * 測試完整的付款流程
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import PaymentFlow from '../PaymentFlow';
import * as paymentService from '../../../services/paymentService';
import i18n from '../../../i18n';

// Mock services
jest.mock('../../../services/paymentService');
jest.mock('../../../utils/logger');

const mockPaymentService = paymentService as jest.Mocked<typeof paymentService>;

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  </BrowserRouter>
);

describe('PaymentFlow Integration Tests', () => {
  const defaultProps = {
    planType: 'pro',
    billingPeriod: 'monthly',
    onSuccess: jest.fn(),
    onError: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.open for payment redirect
    global.window.open = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('completes full payment flow successfully', async () => {
    const mockOrder = {
      id: 'order-123',
      merchantTradeNo: 'TN123456789',
      paymentUrl: 'https://payment.ecpay.com.tw/test',
      amount: 299
    };

    mockPaymentService.createOrder.mockResolvedValue(mockOrder);

    render(
      <TestWrapper>
        <PaymentFlow {...defaultProps} />
      </TestWrapper>
    );

    // Step 1: Select payment method
    const creditCardButton = screen.getByText(/信用卡/);
    fireEvent.click(creditCardButton);

    // Step 2: Accept terms
    const termsCheckbox = screen.getByRole('checkbox');
    fireEvent.click(termsCheckbox);

    // Step 3: Proceed with payment
    const proceedButton = screen.getByText(/確認付款/);
    fireEvent.click(proceedButton);

    // Verify loading state
    expect(screen.getByText(/處理中/)).toBeInTheDocument();

    // Wait for order creation
    await waitFor(() => {
      expect(mockPaymentService.createOrder).toHaveBeenCalledWith({
        planType: 'pro',
        billingPeriod: 'monthly',
        paymentMethod: 'credit_card'
      });
    });

    // Verify payment redirect
    await waitFor(() => {
      expect(global.window.open).toHaveBeenCalledWith(
        mockOrder.paymentUrl,
        '_blank',
        expect.any(String)
      );
    });
  });

  it('handles payment flow with Credit Card method', async () => {
    const mockOrder = {
      id: 'order-456',
      merchantTradeNo: 'TN987654321',
      paymentUrl: 'https://payment.ecpay.com.tw/atm',
      amount: 299,
      bankCode: '007',
      virtualAccount: '1234567890123456'
    };

    mockPaymentService.createOrder.mockResolvedValue(mockOrder);

    render(
      <TestWrapper>
        <PaymentFlow {...defaultProps} />
      </TestWrapper>
    );

    // Select ATM payment
    const atmButton = screen.getByText(/ATM 轉帳/);
    fireEvent.click(atmButton);

    // Accept terms
    const termsCheckbox = screen.getByRole('checkbox');
    fireEvent.click(termsCheckbox);

    // Proceed with payment
    const proceedButton = screen.getByText(/確認付款/);
    fireEvent.click(proceedButton);

    await waitFor(() => {
      expect(mockPaymentService.createOrder).toHaveBeenCalledWith({
        planType: 'pro',
        billingPeriod: 'monthly',
        paymentMethod: 'credit_card'
      });
    });

    // Should show ATM instructions
    await waitFor(() => {
      expect(screen.getByText(/銀行代碼/)).toBeInTheDocument();
      expect(screen.getByText(/虛擬帳號/)).toBeInTheDocument();
    });
  });

  it('handles yearly billing period correctly', async () => {
    const yearlyProps = {
      ...defaultProps,
      billingPeriod: 'yearly'
    };

    const mockOrder = {
      id: 'order-yearly',
      merchantTradeNo: 'TN111111111',
      paymentUrl: 'https://payment.ecpay.com.tw/yearly',
      amount: 2990
    };

    mockPaymentService.createOrder.mockResolvedValue(mockOrder);

    render(
      <TestWrapper>
        <PaymentFlow {...yearlyProps} />
      </TestWrapper>
    );

    // Should show yearly pricing
    expect(screen.getByText(/NT\$2,990/)).toBeInTheDocument();
    expect(screen.getByText(/年繳/)).toBeInTheDocument();

    // Complete payment flow
    const creditCardButton = screen.getByText(/信用卡/);
    fireEvent.click(creditCardButton);

    const termsCheckbox = screen.getByRole('checkbox');
    fireEvent.click(termsCheckbox);

    const proceedButton = screen.getByText(/確認付款/);
    fireEvent.click(proceedButton);

    await waitFor(() => {
      expect(mockPaymentService.createOrder).toHaveBeenCalledWith({
        planType: 'pro',
        billingPeriod: 'yearly',
        paymentMethod: 'credit_card'
      });
    });
  });

  it('handles network errors gracefully', async () => {
    const networkError = new Error('Network Error');
    networkError.code = 'NETWORK_ERROR';
    
    mockPaymentService.createOrder.mockRejectedValue(networkError);

    render(
      <TestWrapper>
        <PaymentFlow {...defaultProps} />
      </TestWrapper>
    );

    // Complete form
    const creditCardButton = screen.getByText(/信用卡/);
    fireEvent.click(creditCardButton);

    const termsCheckbox = screen.getByRole('checkbox');
    fireEvent.click(termsCheckbox);

    const proceedButton = screen.getByText(/確認付款/);
    fireEvent.click(proceedButton);

    // Should show error and retry option
    await waitFor(() => {
      expect(screen.getByText(/網路連線問題/)).toBeInTheDocument();
      expect(screen.getByText(/重試/)).toBeInTheDocument();
    });

    // Should call onError callback
    expect(defaultProps.onError).toHaveBeenCalledWith(networkError);
  });

  it('validates form before submission', async () => {
    render(
      <TestWrapper>
        <PaymentFlow {...defaultProps} />
      </TestWrapper>
    );

    // Try to proceed without selecting payment method
    const proceedButton = screen.getByText(/確認付款/);
    fireEvent.click(proceedButton);

    expect(screen.getByText(/請選擇付款方式/)).toBeInTheDocument();
    expect(mockPaymentService.createOrder).not.toHaveBeenCalled();

    // Select payment method but don't accept terms
    const creditCardButton = screen.getByText(/信用卡/);
    fireEvent.click(creditCardButton);

    fireEvent.click(proceedButton);

    expect(screen.getByText(/請同意服務條款/)).toBeInTheDocument();
    expect(mockPaymentService.createOrder).not.toHaveBeenCalled();
  });

  it('handles cancellation correctly', () => {
    render(
      <TestWrapper>
        <PaymentFlow {...defaultProps} />
      </TestWrapper>
    );

    const cancelButton = screen.getByText(/取消/);
    fireEvent.click(cancelButton);

    expect(defaultProps.onCancel).toHaveBeenCalled();
  });
});