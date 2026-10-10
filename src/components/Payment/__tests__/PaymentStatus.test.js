import React from 'react';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import zhTW from '../../../locales/zh-TW/translation.json';
import en from '../../../locales/en/translation.json';
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
const testI18n = createInstance();
testI18n.init({
  lng: 'zh-TW',
  fallbackLng: 'zh-TW',
  resources: { 'zh-TW': { translation: zhTW }, en: { translation: en } },
  initImmediate: false,
  interpolation: { escapeValue: false }
});
const render = ui => rtlRender(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>);

describe('PaymentStatus', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    await testI18n.changeLanguage('zh-TW');
  });

  it('tracks a confirmed UUID order using the shared merchant transaction id', async () => {
    delete window.dataLayer;
    sessionStorage.clear();
    mockSearchParams = new URLSearchParams('orderId=123e4567-e89b-42d3-a456-426614174000');
    mockPaymentService.pollPaymentStatus.mockResolvedValue({
      success: true, status: 'completed', data: {
        orderStatus: 'paid', order: { status: 'paid', merchantTradeNo: 'uuid-verified', amount: '179', planType: 'pro', billingPeriod: 'yearly' }
      }
    });
    render(<PaymentStatus />);
    await waitFor(() => expect(window.dataLayer?.filter(entry => entry.event === 'purchase')).toHaveLength(1));
    expect(window.dataLayer.find(entry => entry.event === 'purchase').ecommerce).toMatchObject({ transaction_id: 'uuid-verified', value: 179 });
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
    expect(mockNavigate).toHaveBeenCalledWith('/zh-TW/user-account');
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
    expect(mockNavigate).toHaveBeenCalledWith('/zh-TW/subscription-plans', {
      state: {
        retryPayment: true,
        previousOrderId: 'TN123456789'
      }
    });
  });

  it('shows English timeout guidance and the real support address without declaring payment failure', async () => {
    await testI18n.changeLanguage('en');
    mockSearchParams = new URLSearchParams('orderId=TN123456789');
    mockPaymentService.pollPaymentStatusByMerchantTradeNo.mockResolvedValue({
      success: false,
      status: 'timeout'
    });

    const { container } = render(<PaymentStatus />);

    expect(await screen.findByText('Status check timed out')).toBeInTheDocument();
    expect(screen.getByText(/support@sentimentinsideout\.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View account' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[\u3400-\u9fff]/);
    expect(screen.queryByText('Payment failed')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View account' }));
    expect(mockNavigate).toHaveBeenCalledWith('/en/user-account');
  });

  it('localizes a missing order and a Chinese-only provider error on the English page', async () => {
    await testI18n.changeLanguage('en');
    const view = render(<PaymentStatus />);
    expect(await screen.findByText('Order information is missing')).toBeInTheDocument();
    view.unmount();

    mockSearchParams = new URLSearchParams('orderId=TN123456789');
    mockPaymentService.pollPaymentStatusByMerchantTradeNo.mockResolvedValue({
      success: false,
      status: 'failed',
      error: '付款驗證失敗'
    });
    const { container } = render(<PaymentStatus />);
    expect(await screen.findByText('There was a problem with the payment. Please try again later.')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[\u3400-\u9fff]/);
  });
});
