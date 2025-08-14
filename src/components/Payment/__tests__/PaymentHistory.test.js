/**
 * PaymentHistory 組件測試
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import PaymentHistory from '../PaymentHistory';
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

describe('PaymentHistory', () => {
  const mockPayments = [
    {
      id: 'payment-1',
      merchantTradeNo: 'TN123456789',
      amount: 299,
      status: 'paid',
      paymentMethod: 'credit_card',
      createdAt: '2024-01-15T10:00:00Z',
      planType: 'pro',
      billingPeriod: 'monthly'
    },
    {
      id: 'payment-2',
      merchantTradeNo: 'TN987654321',
      amount: 2990,
      status: 'paid',
      paymentMethod: 'atm',
      createdAt: '2024-01-01T10:00:00Z',
      planType: 'pro',
      billingPeriod: 'yearly'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockPaymentService.getPaymentHistory.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(
      <TestWrapper>
        <PaymentHistory />
      </TestWrapper>
    );

    expect(screen.getByText(/載入中/)).toBeInTheDocument();
  });

  it('displays payment history when loaded', async () => {
    mockPaymentService.getPaymentHistory.mockResolvedValue(mockPayments);

    render(
      <TestWrapper>
        <PaymentHistory />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('TN123456789')).toBeInTheDocument();
      expect(screen.getByText('TN987654321')).toBeInTheDocument();
      expect(screen.getByText('NT$299')).toBeInTheDocument();
      expect(screen.getByText('NT$2,990')).toBeInTheDocument();
    });
  });

  it('shows empty state when no payments', async () => {
    mockPaymentService.getPaymentHistory.mockResolvedValue([]);

    render(
      <TestWrapper>
        <PaymentHistory />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/尚無付款記錄/)).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    const mockError = new Error('Failed to load payments');
    mockPaymentService.getPaymentHistory.mockRejectedValue(mockError);

    render(
      <TestWrapper>
        <PaymentHistory />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/載入失敗/)).toBeInTheDocument();
    });
  });

  it('displays payment status correctly', async () => {
    const paymentsWithDifferentStatus = [
      { ...mockPayments[0], status: 'paid' },
      { ...mockPayments[1], status: 'pending' },
      { ...mockPayments[0], id: 'payment-3', status: 'failed' }
    ];

    mockPaymentService.getPaymentHistory.mockResolvedValue(paymentsWithDifferentStatus);

    render(
      <TestWrapper>
        <PaymentHistory />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/已付款/)).toBeInTheDocument();
      expect(screen.getByText(/處理中/)).toBeInTheDocument();
      expect(screen.getByText(/失敗/)).toBeInTheDocument();
    });
  });

  it('displays payment method correctly', async () => {
    mockPaymentService.getPaymentHistory.mockResolvedValue(mockPayments);

    render(
      <TestWrapper>
        <PaymentHistory />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/信用卡/)).toBeInTheDocument();
      expect(screen.getByText(/ATM/)).toBeInTheDocument();
    });
  });

  it('formats dates correctly', async () => {
    mockPaymentService.getPaymentHistory.mockResolvedValue(mockPayments);

    render(
      <TestWrapper>
        <PaymentHistory />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/2024-01-15/)).toBeInTheDocument();
      expect(screen.getByText(/2024-01-01/)).toBeInTheDocument();
    });
  });

  it('shows plan type and billing period', async () => {
    mockPaymentService.getPaymentHistory.mockResolvedValue(mockPayments);

    render(
      <TestWrapper>
        <PaymentHistory />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/專業方案/)).toBeInTheDocument();
      expect(screen.getByText(/月繳/)).toBeInTheDocument();
      expect(screen.getByText(/年繳/)).toBeInTheDocument();
    });
  });

  it('has proper table headers', async () => {
    mockPaymentService.getPaymentHistory.mockResolvedValue(mockPayments);

    render(
      <TestWrapper>
        <PaymentHistory />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/訂單編號/)).toBeInTheDocument();
      expect(screen.getByText(/金額/)).toBeInTheDocument();
      expect(screen.getByText(/狀態/)).toBeInTheDocument();
      expect(screen.getByText(/付款方式/)).toBeInTheDocument();
      expect(screen.getByText(/日期/)).toBeInTheDocument();
    });
  });
});