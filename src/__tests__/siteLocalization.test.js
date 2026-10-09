import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import en from '../locales/en/translation.json';
import zhTW from '../locales/zh-TW/translation.json';
import PaymentFlow from '../components/Payment/PaymentFlow';
import PaymentHistory from '../components/Payment/PaymentHistory';
import { PaymentResult } from '../components/Payment/PaymentResult/PaymentResult';
import ChatWidget from '../components/ChatWidget/ChatWidget';
import NewsDialog from '../components/Watchlist/NewsDialog';
import AnnouncementBar from '../components/Common/AnnouncementBar/AnnouncementBar';
import PriceAnalysisChartEnhancements from '../components/PriceAnalysis/PriceAnalysisChartEnhancements';
import redemptionService from '../services/redemptionService';
import paymentService from '../services/paymentService';
import apiClient from '../api/apiClient';
import csrfClient from '../utils/csrfClient';
import enhancedApiClient from '../utils/enhancedApiClient';

let mockLanguage = 'en';
let mockSearchParams = new URLSearchParams();
const mockNavigate = jest.fn();
jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }));
jest.mock('react-router-dom', () => ({
  useParams: () => ({ lang: mockLanguage }),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
  useLocation: () => ({ search: `?${mockSearchParams}` })
}));
jest.mock('../services/paymentService', () => ({ __esModule: true, default: {
  getPlanPricingFromAPI: jest.fn(), getPlanPricing: jest.fn(), createOrder: jest.fn(),
  submitPaymentForm: jest.fn(), getPaymentHistory: jest.fn()
} }));
jest.mock('../api/apiClient', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('../utils/csrfClient', () => ({ __esModule: true, default: { fetchWithCSRF: jest.fn() } }));
jest.mock('../utils/enhancedApiClient', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('../utils/logger', () => ({ systemLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../utils/analytics', () => ({ Analytics: { auth: { loginRequired: jest.fn() } } }));
jest.mock('../components/Auth/useAuth', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('../components/Common/Dialog/useDialog', () => ({ useDialog: () => ({ openDialog: jest.fn() }) }));
jest.mock('../components/Common/Dialog/Dialog', () => ({ Dialog: ({ children }) => <div>{children}</div> }));
jest.mock('../components/Redemption/RedemptionCodeInput', () => ({ RedemptionCodeInput: () => null }));
jest.mock('../components/Common/AnnouncementBar/AnnouncementDevTools', () => () => null);
jest.mock('../utils/announcementCooldown', () => ({ __esModule: true, default: {
  cleanupExpiredData: jest.fn(), shouldShowAnnouncement: () => true
} }));

let instance;
const renderLocalized = node => render(<I18nextProvider i18n={instance}>{node}</I18nextProvider>);
beforeEach(async () => {
  jest.clearAllMocks();
  sessionStorage.clear();
  mockLanguage = 'en';
  mockSearchParams = new URLSearchParams();
  instance = createInstance();
  await instance.init({ lng: 'en', fallbackLng: 'en', resources: {
    en: { translation: en }, 'zh-TW': { translation: zhTW }
  }, interpolation: { escapeValue: false } });
});

test('English annual checkout stays English through confirmation and sends its language', async () => {
  paymentService.getPlanPricingFromAPI.mockResolvedValue({ pro: {
    monthly: { price: 199, period: '月' }, yearly: { price: 1990, period: '年', discount: '約 17% 折扣' }
  } });
  paymentService.createOrder.mockResolvedValue({ orderId: 'synthetic-order', amount: 1990 });
  const { container } = renderLocalized(<PaymentFlow billingPeriod="yearly" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Confirm Plan' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('link', { name: 'Terms of Service and Privacy Policy' })).toHaveAttribute('href', '/en/legal');
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Create Order' }));
  expect(await screen.findByRole('button', { name: 'Proceed to Payment' })).toBeVisible();
  expect(paymentService.createOrder).toHaveBeenCalledWith(expect.objectContaining({ language: 'en', billingPeriod: 'yearly', finalAmount: 1990 }));
  expect(container.textContent).not.toMatch(/[\u3400-\u9fff]|\{\{/);
});

test('payment history ignores backend Chinese copy and updates already loaded records on language change', async () => {
  paymentService.getPaymentHistory.mockResolvedValue([{
    id: 'synthetic-payment', orderId: 'synthetic-order', amount: 199, status: 'success',
    displayText: '付款成功', paymentMethod: '信用卡', planType: 'pro', billingPeriod: 'monthly',
    createdAt: '2026-10-08T12:00:00Z'
  }]);
  const { container } = renderLocalized(<PaymentHistory userId="synthetic-user" />);
  expect(await screen.findByText('Success')).toBeVisible();
  expect(container.textContent).toContain('Monthly');
  expect(container.textContent).not.toMatch(/[\u3400-\u9fff]/);
  await act(async () => { await instance.changeLanguage('zh-TW'); });
  expect(screen.getByText('付款成功')).toBeVisible();
  expect(container.textContent).toContain('月付');
  expect(container.textContent).not.toContain('Monthly');
  expect(paymentService.getPaymentHistory).toHaveBeenCalledTimes(1);
});

test('redemption error paths and plan CTA leave no interpolation tokens or untranslated fallback', () => {
  const t = instance.t.bind(instance);
  expect(t('redemption.actions.upgrade_to_plan', { planName: 'Pro' })).toBe('Upgrade to Pro');
  for (const errorCode of ['CODE_EXHAUSTED', 'USER_LIMIT_EXCEEDED', 'CODE_NOT_FOUND', 'CODE_INACTIVE', 'NOT_NEW_CUSTOMER', 'NOT_FIRST_TIME_USER']) {
    const text = redemptionService.formatErrorMessage({ errorCode, error: '後端原始錯誤', data: { details: {} } }, t);
    expect(text).not.toMatch(/\{\{|redemption\.errors\.|[\u3400-\u9fff]/);
    expect(text).not.toBe(en.redemption.errors.unknown);
  }
  expect(redemptionService.formatErrorMessage({ errorCode: 'PLAN_NOT_ELIGIBLE', data: {
    details: { eligiblePlanNames: 'Pro' }
  } }, t)).toContain('Pro');
  const plans = redemptionService.formatErrorMessage({ errorCode: 'PLAN_NOT_ELIGIBLE', data: {
    errors: [{ details: { eligiblePlans: ['free', 'pro'], eligiblePlanNames: '免費 或 Pro' } }]
  } }, t);
  expect(plans).toContain('Free Plan, Pro Plan');
  expect(plans).not.toMatch(/[\u3400-\u9fff]/);
  expect(redemptionService.formatErrorMessage({ errorCode: 'UNRECOGNIZED', error: '後端原文' }, t)).toBe(en.redemption.errors.unknown);
});

test('payment failure uses localized text rather than the provider message', async () => {
  mockSearchParams = new URLSearchParams('RtnCode=0&MerchantTradeNo=synthetic&RtnMsg=付款失敗');
  const { container } = renderLocalized(<PaymentResult />);
  expect(await screen.findByText(en.payment.result.failure.message)).toBeVisible();
  expect(container.textContent).not.toMatch(/[\u3400-\u9fff]/);
});

test('payment polling interpolates the attempt numbers', async () => {
  jest.useFakeTimers();
  try {
    apiClient.get.mockResolvedValue({ data: { success: false } });
    mockSearchParams = new URLSearchParams('source=client&merchantTradeNo=synthetic');
    const view = renderLocalized(<PaymentResult />);
    await act(async () => {});
    expect(screen.getByText('Waiting for payment confirmation... (1/30)')).toBeVisible();
    view.unmount();
  } finally { jest.clearAllTimers(); jest.useRealTimers(); }
});

test('FAQ refreshes in the selected language while keeping the chat open', async () => {
  csrfClient.fetchWithCSRF.mockImplementation(url => Promise.resolve({ json: () => Promise.resolve({ faq:
    url.endsWith('/en') ? { 'Market sentiment': { 'What is sentiment?': 'Market mood.' } }
      : { '市場情緒': { '什麼是情緒？': '市場心理。' } }
  }) }));
  await instance.changeLanguage('zh-TW');
  renderLocalized(<ChatWidget />);
  fireEvent.click(screen.getByRole('button', { name: zhTW.chatWidget.headerTitle }));
  expect(await screen.findByText('市場情緒')).toBeVisible();
  await act(async () => { await instance.changeLanguage('en'); });
  expect(await screen.findByText('Market sentiment')).toBeVisible();
  expect(screen.queryByText('市場情緒')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Close' })).toBeVisible();
  expect(sessionStorage.getItem('chatWidget.session.v2.zh-TW')).toContain('市場情緒');
  expect(sessionStorage.getItem('chatWidget.session.v2.en')).toContain('Market sentiment');
});

test('English news dates follow the page language', () => {
  renderLocalized(<NewsDialog open news={{ title: 'Synthetic news', publishedAt: '2026-10-08T12:00:00Z', description: 'News summary', url: 'https://example.test' }} />);
  expect(screen.getByText(/October/)).toBeVisible();
  expect(screen.queryByText(/年|上午|下午/)).not.toBeInTheDocument();
});

test('chart controls update their tooltip and accessible names with the page language', async () => {
  renderLocalized(<PriceAnalysisChartEnhancements isMobile={false} chartRef={{ current: null }} chartCardRef={{ current: null }} chartData={{ labels: [] }} />);
  for (const label of ['Zoom in', 'Zoom out', 'Reset zoom']) {
    expect(screen.getByRole('button', { name: label })).toHaveAttribute('title', label);
  }
  await act(async () => { await instance.changeLanguage('zh-TW'); });
  for (const label of ['放大', '縮小', '重置']) {
    expect(screen.getByRole('button', { name: label })).toHaveAttribute('title', label);
  }
});

test('English announcement controls are translated and do not show a Chinese-only announcement', async () => {
  enhancedApiClient.get.mockResolvedValue({ data: { success: true, data: { enabled: true, message_en: 'Synthetic bulletin', message_zh: '中文公告' } } });
  const view = renderLocalized(<AnnouncementBar />);
  expect(await screen.findByText('Synthetic bulletin')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Close announcement' })).toHaveAttribute('title', 'Close announcement');
  view.unmount();
  enhancedApiClient.get.mockResolvedValue({ data: { success: true, data: { enabled: true, message_zh: '中文公告' } } });
  const { container } = renderLocalized(<AnnouncementBar />);
  await waitFor(() => expect(enhancedApiClient.get).toHaveBeenCalledTimes(2));
  expect(container).toBeEmptyDOMElement();
});
