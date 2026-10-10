import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import { PaymentResult } from '../PaymentResult/PaymentResult';
import apiClient from '../../../api/apiClient';

let mockSearch = '';
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ search: mockSearch }), useNavigate: () => mockNavigate, useParams: () => ({ lang: 'zh-TW' })
}));
const mockT = key => key;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock('../../../api/apiClient', () => ({ get: jest.fn() }));
const purchases = () => (window.dataLayer || []).filter(entry => entry.event === 'purchase');
beforeEach(() => { jest.clearAllMocks(); delete window.dataLayer; sessionStorage.clear(); });
afterEach(cleanup);

it('verifies callback URL success and uses server amount rather than URL amount', async () => {
  mockSearch = '?MerchantTradeNo=verified-return&RtnCode=1&TradeAmt=9999';
  apiClient.get.mockResolvedValue({ data: { success: true, data: {
    merchantTradeNo: 'verified-return', isSuccess: true, orderStatus: 'paid',
    amount: 179, planType: 'pro', billingPeriod: 'yearly'
  } }});
  const view = render(<PaymentResult />);
  await waitFor(() => expect(purchases()).toHaveLength(1));
  expect(purchases()[0].ecommerce.value).toBe(179);
  expect(apiClient.get).toHaveBeenCalledWith('/api/payment/status/verified-return');
  view.unmount();
  render(<PaymentResult />);
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
  expect(purchases()).toHaveLength(1);
});

it.each(['pending', 'failed'])('does not trust forged URL success when server is %s', async orderStatus => {
  mockSearch = `?MerchantTradeNo=unpaid-${orderStatus}&RtnCode=1&TradeAmt=179`;
  apiClient.get.mockResolvedValue({ data: { success: true, data: {
    merchantTradeNo: `unpaid-${orderStatus}`, isSuccess: false, orderStatus,
    amount: 179, planType: 'pro', billingPeriod: 'monthly'
  } }});
  render(<PaymentResult />);
  await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
  expect(purchases()).toHaveLength(0);
});

it('tracks a server-confirmed ClientBackURL purchase', async () => {
  mockSearch = '?source=client&MerchantTradeNo=client-return';
  apiClient.get.mockResolvedValue({ data: { success: true, data: {
    merchantTradeNo: 'client-return', isSuccess: true, orderStatus: 'paid',
    amount: 199, planType: 'pro', billingPeriod: 'monthly'
  } }});
  render(<PaymentResult />);
  await waitFor(() => expect(purchases()).toHaveLength(1));
});

it.each(['client', 'callback'])('waits for a pending server callback on the %s return route', async source => {
  const id = `settled-${source}`;
  mockSearch = source === 'client' ? `?source=client&MerchantTradeNo=${id}` : `?MerchantTradeNo=${id}&RtnCode=1`;
  const data = { merchantTradeNo: id, amount: 179, planType: 'pro', billingPeriod: 'monthly' };
  apiClient.get.mockResolvedValueOnce({ data: { success: true, data: { ...data, orderStatus: 'pending', isSuccess: false } } });
  apiClient.get.mockResolvedValue({ data: { success: true, data: { ...data, orderStatus: 'paid', isSuccess: true } } });
  render(<PaymentResult />);
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));
  expect(purchases()).toHaveLength(0);
  await waitFor(() => expect(purchases()).toHaveLength(1), { timeout: 2500 });
});
