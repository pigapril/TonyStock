import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import PaymentFlow from '../PaymentFlow';
import paymentService from '../../../services/paymentService';
import i18n from '../../../i18n';

const mockNavigate = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ lang: 'zh-TW' }),
  useSearchParams: () => [mockSearchParams]
}));

jest.mock('../../../services/paymentService', () => ({
  __esModule: true,
  default: {
    createOrder: jest.fn(),
    submitPaymentForm: jest.fn(),
    getPlanPricingFromAPI: jest.fn(),
    getPlanPricing: jest.fn()
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

jest.mock('../../Redemption/RedemptionCodeInput', () => ({
  RedemptionCodeInput: () => <div data-testid="redemption-code-input" />
}));

const mockPaymentService = paymentService;

const pricing = {
  pro: {
    monthly: {
      price: 299,
      currency: 'TWD',
      period: '月'
    },
    yearly: {
      price: 2990,
      currency: 'TWD',
      period: '年',
      discount: '省 598'
    }
  }
};

const renderFlow = async (props = {}, search = '') => {
  mockSearchParams = new URLSearchParams(search);

  render(
    <I18nextProvider i18n={i18n}>
      <PaymentFlow {...props} />
    </I18nextProvider>
  );

  await screen.findByRole('button', { name: '確認方案' });
};

describe('PaymentFlow integration', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockPaymentService.getPlanPricingFromAPI.mockResolvedValue(pricing);
    mockPaymentService.getPlanPricing.mockReturnValue(pricing);
  });

  it('propagates redemption code data from the URL into the order payload', async () => {
    mockPaymentService.createOrder.mockResolvedValue({
      orderId: 'order-redemption',
      merchantTradeNo: 'TN-RED-001',
      amount: 249,
      paymentUrl: 'https://payment.ecpay.com.tw/test'
    });

    await renderFlow({}, 'redemptionCode=SAVE50&discountType=fixed&discountValue=50');

    expect(screen.getAllByText('兌換代碼已套用').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '確認方案' }));
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '創建訂單' }));

    await waitFor(() => {
      expect(mockPaymentService.createOrder).toHaveBeenCalledWith({
        planType: 'pro',
        billingPeriod: 'monthly',
        paymentMethod: 'Credit',
        redemptionCode: 'SAVE50',
        originalAmount: 299,
        finalAmount: 249
      });
    });
  });

  it('falls back to cached pricing when the pricing API is unavailable', async () => {
    mockPaymentService.getPlanPricingFromAPI.mockRejectedValue(new Error('pricing api down'));

    await renderFlow({ billingPeriod: 'yearly' });

    expect(screen.getByText('使用預設定價資料')).toBeInTheDocument();
    expect(screen.getByText('NT$ 2,990')).toBeInTheDocument();
  });
});
