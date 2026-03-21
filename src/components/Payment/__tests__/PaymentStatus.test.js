import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PaymentStatus from '../PaymentStatus';
import paymentService from '../../../services/paymentService';

const mockNavigate = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams]
}));

jest.mock('../../../services/paymentService', () => ({
  __esModule: true,
  default: {
    pollPaymentStatus: jest.fn(),
    pollPaymentStatusByMerchantTradeNo: jest.fn()
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

const mockPaymentService = paymentService;

describe('PaymentStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('shows a failed state immediately when orderId is missing', async () => {
    render(<PaymentStatus />);

    expect(await screen.findByText('付款失敗')).toBeInTheDocument();
    expect(screen.getByText('缺少訂單資訊')).toBeInTheDocument();
  });

  it('polls by merchantTradeNo for non-UUID order ids and renders success details', async () => {
    mockSearchParams = new URLSearchParams('orderId=TN123456789');
    mockPaymentService.pollPaymentStatusByMerchantTradeNo.mockResolvedValue({
      success: true,
      status: 'completed',
      data: {
        amount: 299,
        billingPeriod: 'monthly',
        subscription: {
          planType: 'pro',
          startDate: '2025-01-15T00:00:00.000Z',
          endDate: '2025-02-15T00:00:00.000Z'
        }
      }
    });

    render(<PaymentStatus />);

    await waitFor(() => {
      expect(mockPaymentService.pollPaymentStatusByMerchantTradeNo).toHaveBeenCalledWith('TN123456789', {
        maxAttempts: 60,
        interval: 5000
      });
    });

    expect(await screen.findByText('付款成功！')).toBeInTheDocument();
    expect(screen.getByText('查看帳戶資訊')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '查看帳戶資訊' }));
    expect(mockNavigate).toHaveBeenCalledWith('/account');
  });

  it('polls by order id for UUID-based return URLs', async () => {
    mockSearchParams = new URLSearchParams('orderId=123e4567-e89b-42d3-a456-426614174000');
    mockPaymentService.pollPaymentStatus.mockResolvedValue({
      success: true,
      status: 'completed',
      data: {
        amount: 299,
        billingPeriod: 'monthly',
        subscription: {
          planType: 'pro',
          startDate: '2025-01-15T00:00:00.000Z',
          endDate: '2025-02-15T00:00:00.000Z'
        }
      }
    });

    render(<PaymentStatus />);

    await waitFor(() => {
      expect(mockPaymentService.pollPaymentStatus).toHaveBeenCalledWith(
        '123e4567-e89b-42d3-a456-426614174000',
        {
          maxAttempts: 60,
          interval: 5000
        }
      );
    });
  });

  it('keeps the processing UI visible while the polling promise is still pending', () => {
    mockSearchParams = new URLSearchParams('orderId=TN123456789');
    mockPaymentService.pollPaymentStatusByMerchantTradeNo.mockImplementation(
      () => new Promise(() => {})
    );

    render(<PaymentStatus />);

    expect(screen.getByText('付款處理中...')).toBeInTheDocument();
    expect(screen.getByText('手動重新檢查')).toBeInTheDocument();
  });

  it('renders the failure state and retry navigation when polling fails', async () => {
    mockSearchParams = new URLSearchParams('orderId=TN123456789');
    mockPaymentService.pollPaymentStatusByMerchantTradeNo.mockResolvedValue({
      success: false,
      status: 'failed',
      error: '付款驗證失敗',
      data: {
        orderId: 'order-123',
        orderStatus: 'failed',
        paymentStatus: 'failed'
      }
    });

    render(<PaymentStatus />);

    expect(await screen.findByText('付款失敗')).toBeInTheDocument();
    expect(screen.getByText('付款驗證失敗')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '重新付款' }));
    expect(mockNavigate).toHaveBeenCalledWith('/subscription', {
      state: {
        retryPayment: true,
        previousOrderId: 'TN123456789'
      }
    });
  });
});
