import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import PaymentHistory from '../PaymentHistory';
import paymentService from '../../../services/paymentService';
import i18n from '../../../i18n';

jest.mock('../../../services/paymentService', () => ({
  __esModule: true,
  default: {
    getPaymentHistory: jest.fn()
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

const renderHistory = (props = {}) =>
  render(
    <I18nextProvider i18n={i18n}>
      <PaymentHistory userId="user-123" {...props} />
    </I18nextProvider>
  );

describe('PaymentHistory', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading state while payment history is being fetched', () => {
    mockPaymentService.getPaymentHistory.mockImplementation(() => new Promise(() => {}));

    renderHistory();

    expect(screen.getByText(/載入中/)).toBeInTheDocument();
  });

  it('renders the curated payment cards for successful API responses', async () => {
    mockPaymentService.getPaymentHistory.mockResolvedValue([
      {
        id: 'payment-1',
        merchantTradeNo: 'TN123456789',
        amount: 299,
        status: 'success',
        displayText: '付款成功',
        planType: 'pro',
        billingPeriod: 'monthly',
        paymentMethod: '信用卡',
        createdAt: '2025-01-15T10:00:00.000Z'
      },
      {
        id: 'payment-2',
        merchantTradeNo: 'TN987654321',
        amount: 2990,
        status: 'failed',
        displayText: '付款失敗',
        planType: 'pro',
        billingPeriod: 'yearly',
        paymentMethod: '信用卡',
        createdAt: '2025-01-01T10:00:00.000Z'
      }
    ]);

    renderHistory();

    expect(await screen.findByText('付款記錄')).toBeInTheDocument();
    expect(screen.getByText(/TN123456789/)).toBeInTheDocument();
    expect(screen.getByText(/TN987654321/)).toBeInTheDocument();
    expect(screen.getByText('TWD 299')).toBeInTheDocument();
    expect(screen.getByText('TWD 2,990')).toBeInTheDocument();
    expect(screen.getByText('付款成功')).toBeInTheDocument();
    expect(screen.getByText('付款失敗')).toBeInTheDocument();
  });

  it('renders the empty state when the user has no payment records', async () => {
    mockPaymentService.getPaymentHistory.mockResolvedValue([]);

    renderHistory();

    expect(await screen.findByText('暫無付款記錄')).toBeInTheDocument();
  });

  it('shows the translated error state and retries the fetch on demand', async () => {
    mockPaymentService.getPaymentHistory
      .mockRejectedValueOnce(new Error('payments unavailable'))
      .mockResolvedValueOnce([
        {
          id: 'payment-1',
          merchantTradeNo: 'TN123456789',
          amount: 299,
          status: 'success',
          displayText: '付款成功',
          planType: 'pro',
          billingPeriod: 'monthly',
          createdAt: '2025-01-15T10:00:00.000Z'
        }
      ]);

    renderHistory();

    expect(await screen.findByText(/payments unavailable/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockPaymentService.getPaymentHistory).toHaveBeenCalledTimes(2);
    });
  });
});
