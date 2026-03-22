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

const renderPaymentFlow = async (props = {}, search = '') => {
  mockSearchParams = new URLSearchParams(search);

  render(
    <I18nextProvider i18n={i18n}>
      <PaymentFlow {...props} />
    </I18nextProvider>
  );

  await screen.findByRole('button', { name: '確認方案' });
};

describe('PaymentFlow', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockPaymentService.getPlanPricingFromAPI.mockResolvedValue(pricing);
    mockPaymentService.getPlanPricing.mockReturnValue(pricing);
  });

  it('creates an order from the curated checkout flow and submits the payment form', async () => {
    const orderData = {
      orderId: 'order-123',
      merchantTradeNo: 'TN123456789',
      amount: 299,
      paymentUrl: 'https://payment.ecpay.com.tw/test',
      formData: {
        MerchantTradeNo: 'TN123456789'
      }
    };

    mockPaymentService.createOrder.mockResolvedValue(orderData);

    await renderPaymentFlow();

    fireEvent.click(screen.getByRole('button', { name: '確認方案' }));
    expect(screen.getByLabelText('信用卡定期定額')).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    const createOrderButton = screen.getByRole('button', { name: '創建訂單' });
    expect(createOrderButton).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(createOrderButton).not.toBeDisabled();

    fireEvent.click(createOrderButton);

    await waitFor(() => {
      expect(mockPaymentService.createOrder).toHaveBeenCalledWith({
        planType: 'pro',
        billingPeriod: 'monthly',
        paymentMethod: 'Credit',
        redemptionCode: undefined,
        originalAmount: 299,
        finalAmount: 299
      });
    });

    fireEvent.click(await screen.findByRole('button', { name: '前往付款' }));

    expect(mockPaymentService.submitPaymentForm).toHaveBeenCalledWith(orderData);
  });

  it('surfaces create-order failures without breaking the checkout state machine', async () => {
    const onError = jest.fn();
    const requestError = new Error('network down');

    mockPaymentService.createOrder.mockRejectedValue(requestError);

    await renderPaymentFlow({ onError });

    fireEvent.click(screen.getByRole('button', { name: '確認方案' }));
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '創建訂單' }));

    expect(await screen.findByText('創建訂單時發生錯誤，請稍後再試')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(requestError);
  });
});
