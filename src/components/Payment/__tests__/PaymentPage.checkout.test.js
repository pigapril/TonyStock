import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import en from '../../../locales/resources/en/common.json';
import zhTW from '../../../locales/resources/zh-TW/common.json';
import zhCN from '../../../locales/resources/zh-CN/common.json';
import { Analytics } from '../../../utils/analytics';
import PaymentPage from '../../../pages/PaymentPage';
import paymentService from '../../../services/paymentService';

let mockLang = 'en';
let mockPeriod = 'monthly';
const mockNavigate = jest.fn();
const mockUser = { id: 'user-test' };
let mockParams;
jest.mock('react-router-dom', () => ({
  useParams: () => ({ lang: mockLang }), useNavigate: () => mockNavigate,
  useSearchParams: () => [mockParams]
}));
jest.mock('../../Auth/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../Subscription/SubscriptionContext', () => ({ useSubscription: () => ({ userPlan: 'free' }) }));
jest.mock('../../../utils/analytics', () => ({ Analytics: { track: jest.fn() } }));
jest.mock('../../../api/subscriptionService', () => ({ getAvailablePlans: () => [{ id: 'pro', name: 'Pro' }] }));
jest.mock('../../../services/paymentService', () => ({
  createOrder: jest.fn(),
  markPaymentSubmissionStarted: jest.fn(),
  submitPaymentForm: jest.fn()
}));

describe.each([
  ['en', 'monthly', 'en'], ['en', 'yearly', 'en'],
  ['zh-TW', 'monthly', 'zh-TW'], ['zh-TW', 'yearly', 'zh-TW'],
  ['zh-CN', 'monthly', 'en'], ['zh-CN', 'yearly', 'en']
])('checkout flow %s %s', (lang, period, paymentServiceLanguage) => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    window.dataLayer = [];
  });
  afterEach(() => jest.restoreAllMocks());

  it('creates the authoritative order on entry and confirms payment from the same page', async () => {
    const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
    mockLang = lang;
    mockPeriod = period;
    mockParams = new URLSearchParams(`plan=pro&period=${mockPeriod}`);
    const order = {
      orderId: 'order-test',
      merchantTradeNo: `trade-${lang}-${period}`,
      amount: 179,
      originalAmount: 199,
      discountAmount: 20,
      currency: 'TWD',
      formData: { CheckMacValue: 'signed-test-payload' },
      paymentUrl: 'https://example.test',
      reusedOrder: false
    };
    paymentService.createOrder
      .mockRejectedValueOnce({ response: { data: { errorCode: 'ORDER_CREATION_IN_PROGRESS' } } })
      .mockRejectedValueOnce({ response: { data: { errorCode: 'SUBSCRIPTION_REQUEST_IN_PROGRESS' } } })
      .mockResolvedValue(order);
    paymentService.markPaymentSubmissionStarted.mockResolvedValue({ orderId: order.orderId });
    paymentService.submitPaymentForm.mockImplementation(() => {});
    const i18n = createInstance();
    i18n.init({ lng: lang, resources: {
      en: { translation: en },
      'zh-TW': { translation: zhTW },
      'zh-CN': { translation: zhCN }
    }, initAsync: false, interpolation: { escapeValue: false } });
    render(<I18nextProvider i18n={i18n}><PaymentPage /></I18nextProvider>);
    await screen.findByTestId('payment-plan-amount', {}, { timeout: 4000 });
    expect(screen.getAllByAltText('Mastercard')).toHaveLength(1);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByText(i18n.t('payment.form.confirmPlan'))).not.toBeInTheDocument();
    expect(screen.getByTestId('payment-plan-amount')).toHaveTextContent('TWD 179');
    expect(screen.getByTestId('payment-order-total')).toHaveTextContent('TWD 179');
    expect(screen.getByTestId('payment-original-amount')).toHaveTextContent('TWD 199');
    expect(screen.getByTestId('payment-renewal-notice')).toHaveTextContent('TWD 179');
    expect(screen.getByRole('link', { name: i18n.t('payment.form.termsAndConditions') }))
      .toHaveAttribute('href', `/${lang}/legal`);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);

    const proceedButton = screen.getByRole('button', { name: i18n.t('payment.form.proceedToPayment') });
    expect(proceedButton).toBeDisabled();
    expect(paymentService.createOrder).toHaveBeenCalledTimes(3);
    expect(paymentService.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      language: paymentServiceLanguage,
      billingPeriod: period,
      paymentMethod: 'Credit'
    }));
    expect(window.dataLayer.filter(entry => entry.event === 'begin_checkout').slice(-1)[0]).toMatchObject({ ecommerce: { currency: 'TWD', value: 179 } });
    expect(Analytics.track).not.toHaveBeenCalledWith('payment_success', expect.anything());

    fireEvent.click(screen.getByRole('checkbox'));
    expect(proceedButton).toBeEnabled();
    fireEvent.click(proceedButton);
    await waitFor(() => expect(paymentService.markPaymentSubmissionStarted).toHaveBeenCalledWith('order-test'));
    await waitFor(() => expect(paymentService.submitPaymentForm).toHaveBeenCalledWith(order));
    expect(screen.getAllByAltText('Mastercard')).toHaveLength(1);
  });

  it('requires fresh consent when an expired order is replaced with a new amount', async () => {
    jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
    mockLang = lang;
    mockParams = new URLSearchParams(`plan=pro&period=${period}`);
    const makeOrder = (orderId, amount) => ({
      orderId,
      merchantTradeNo: `trade-${orderId}`,
      amount,
      originalAmount: amount,
      discountAmount: 0,
      currency: 'TWD',
      formData: { CheckMacValue: `signed-${orderId}` },
      paymentUrl: 'https://example.test',
      reusedOrder: false
    });
    const firstOrder = makeOrder('first', 179);
    const refreshedOrder = makeOrder('refreshed', 249);
    paymentService.createOrder
      .mockResolvedValueOnce(firstOrder)
      .mockResolvedValueOnce(refreshedOrder);
    paymentService.markPaymentSubmissionStarted.mockRejectedValue({
      response: { data: { errorCode: 'ORDER_EXPIRED' } }
    });

    const i18n = createInstance();
    i18n.init({ lng: lang, resources: {
      en: { translation: en },
      'zh-TW': { translation: zhTW },
      'zh-CN': { translation: zhCN }
    }, initAsync: false, interpolation: { escapeValue: false } });
    render(<I18nextProvider i18n={i18n}><PaymentPage /></I18nextProvider>);

    await screen.findByTestId('payment-order-total');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('payment.form.proceedToPayment') }));

    await waitFor(() => expect(paymentService.createOrder).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId('payment-order-total')).toHaveTextContent('TWD 249'));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: i18n.t('payment.form.proceedToPayment') })).toBeDisabled();
    expect(paymentService.submitPaymentForm).not.toHaveBeenCalled();
  });

  it('routes an already-submitted order to status confirmation without posting again', async () => {
    jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
    mockLang = lang;
    mockParams = new URLSearchParams(`plan=pro&period=${period}`);
    const order = {
      orderId: 'already-submitted',
      merchantTradeNo: 'trade-already-submitted',
      amount: 199,
      originalAmount: 199,
      discountAmount: 0,
      currency: 'TWD',
      formData: { CheckMacValue: 'signed-test-payload' },
      paymentUrl: 'https://example.test',
      reusedOrder: true
    };
    paymentService.createOrder.mockResolvedValue(order);
    paymentService.markPaymentSubmissionStarted.mockRejectedValue({
      response: {
        data: {
          errorCode: 'PAYMENT_SUBMISSION_IN_PROGRESS',
          data: { merchantTradeNo: order.merchantTradeNo }
        }
      }
    });

    const i18n = createInstance();
    i18n.init({ lng: lang, resources: {
      en: { translation: en },
      'zh-TW': { translation: zhTW },
      'zh-CN': { translation: zhCN }
    }, initAsync: false, interpolation: { escapeValue: false } });
    render(<I18nextProvider i18n={i18n}><PaymentPage /></I18nextProvider>);

    await screen.findByTestId('payment-order-total');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('payment.form.proceedToPayment') }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(
      `/${lang}/payment/result?source=client&merchantTradeNo=${order.merchantTradeNo}`,
      { replace: true }
    ));
    expect(paymentService.submitPaymentForm).not.toHaveBeenCalled();
  });
});
