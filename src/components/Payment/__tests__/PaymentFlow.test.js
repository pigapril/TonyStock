/**
 * PaymentFlow 組件測試
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

describe('PaymentFlow', () => {
  const defaultProps = {
    planType: 'pro',
    billingPeriod: 'monthly',
    onSuccess: jest.fn(),
    onError: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders payment flow correctly', () => {
    render(
      <TestWrapper>
        <PaymentFlow {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText(/付款方式/)).toBeInTheDocument();
    expect(screen.getByText(/信用卡/)).toBeInTheDocument();
    expect(screen.getByText(/ATM 轉帳/)).toBeInTheDocument();
  });

  it('shows loading state when creating order', async () => {
    mockPaymentService.createOrder.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(
      <TestWrapper>
        <PaymentFlow {...defaultProps} />
      </TestWrapper>
    );

    const creditCardButton = screen.getByText(/信用卡/);
    fireEvent.click(creditCardButton);

    const proceedButton = screen.getByText(/確認付款/);
    fireEvent.click(proceedButton);

    expect(screen.getByText(/處理中/)).toBeInTheDocument();
  });

  it('handles payment method selection', () => {
    render(
      <TestWrapper>
        <PaymentFlow {...defaultProps} />
      </TestWrapper>
    );

    const atmButton = screen.getByText(/ATM 轉帳/);
    fireEvent.click(atmButton);

    expect(atmButton).toHaveClass('selected');
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <TestWrapper>
        <PaymentFlow {...defaultProps} />
      </TestWrapper>
    );

    const cancelButton = screen.getByText(/取消/);
    fireEvent.click(cancelButton);

    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('handles order creation success', async () => {
    const mockOrder = {
      id: 'order-123',
      paymentUrl: 'https://payment.ecpay.com.tw/test',
      merchantTradeNo: 'TN123456789'
    };

    mockPaymentService.createOrder.mockResolvedValue(mockOrder);

    render(
      <TestWrapper>
        <PaymentFlow {...defaultProps} />
      </TestWrapper>
    );

    const creditCardButton = screen.getByText(/信用卡/);
    fireEvent.click(creditCardButton);

    const proceedButton = screen.getByText(/確認付款/);
    fireEvent.click(proceedButton);

    await waitFor(() => {
      expect(mockPaymentService.createOrder).toHaveBeenCalledWith({
        planType: 'pro',
        billingPeriod: 'monthly',
        paymentMethod: 'credit_card'
      });
    });
  });

  it('handles order creation error', async () => {
    const mockError = new Error('Payment failed');
    mockPaymentService.createOrder.mockRejectedValue(mockError);

    render(
      <TestWrapper>
        <PaymentFlow {...defaultProps} />
      </TestWrapper>
    );

    const creditCardButton = screen.getByText(/信用卡/);
    fireEvent.click(creditCardButton);

    const proceedButton = screen.getByText(/確認付款/);
    fireEvent.click(proceedButton);

    await waitFor(() => {
      expect(defaultProps.onError).toHaveBeenCalledWith(mockError);
    });
  });

  it('validates required fields before submission', () => {
    render(
      <TestWrapper>
        <PaymentFlow {...defaultProps} />
      </TestWrapper>
    );

    const proceedButton = screen.getByText(/確認付款/);
    fireEvent.click(proceedButton);

    expect(screen.getByText(/請選擇付款方式/)).toBeInTheDocument();
  });

  it('shows terms and conditions checkbox', () => {
    render(
      <TestWrapper>
        <PaymentFlow {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText(/我同意服務條款/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('requires terms acceptance before payment', () => {
    render(
      <TestWrapper>
        <PaymentFlow {...defaultProps} />
      </TestWrapper>
    );

    const creditCardButton = screen.getByText(/信用卡/);
    fireEvent.click(creditCardButton);

    const proceedButton = screen.getByText(/確認付款/);
    fireEvent.click(proceedButton);

    expect(screen.getByText(/請同意服務條款/)).toBeInTheDocument();
  });
});