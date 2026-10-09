import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import en from '../../../locales/resources/en/common.json';
import zhTW from '../../../locales/resources/zh-TW/common.json';
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
jest.mock('../../../services/paymentService', () => ({ getPlanPricingFromAPI: jest.fn(), createOrder: jest.fn() }));

describe.each([['en', 'monthly'], ['en', 'yearly'], ['zh-TW', 'monthly'], ['zh-TW', 'yearly']])('checkout flow %s %s', (lang, period) => {
  afterEach(() => jest.restoreAllMocks());

  it('preserves locale, scrolls to each next step and shows the authoritative order amount', async () => {
    const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
    mockLang = lang;
    mockPeriod = period;
    mockParams = new URLSearchParams(`plan=pro&period=${mockPeriod}`);
    paymentService.getPlanPricingFromAPI.mockResolvedValue({ pro: { monthly: { price: 199 }, yearly: { price: 1990 } } });
    paymentService.createOrder.mockResolvedValue({ orderId: 'order-test', amount: 179, currency: 'TWD', formData: {}, paymentUrl: 'https://example.test' });
    const i18n = createInstance();
    i18n.init({ lng: lang, resources: { en: { translation: en }, 'zh-TW': { translation: zhTW } }, initImmediate: false, interpolation: { escapeValue: false } });
    const { container } = render(<I18nextProvider i18n={i18n}><PaymentPage /></I18nextProvider>);
    await waitFor(() => expect(container.querySelector('.payment-page__loading')).not.toBeInTheDocument());
    expect(screen.getAllByAltText('Mastercard')).toHaveLength(1);
    scrollTo.mockClear();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('payment.form.confirmPlan') }));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('payment.form.createOrder') }));
    await screen.findByRole('button', { name: i18n.t('payment.form.proceedToPayment') });
    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
    expect(paymentService.createOrder).toHaveBeenCalledWith(expect.objectContaining({ language: lang, billingPeriod: period }));
    expect(container.querySelector('.payment-page__order-total')).toHaveTextContent('TWD 179');
    expect(container.querySelector('.payment-page__renewal-notice')).toHaveTextContent('TWD 179');
    expect(screen.getAllByAltText('Mastercard')).toHaveLength(1);
  });
});
