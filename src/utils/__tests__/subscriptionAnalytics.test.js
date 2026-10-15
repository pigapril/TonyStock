import { trackSubscriptionCheckout, trackSubscriptionPurchase } from '../subscriptionAnalytics';

const paid = id => ({ merchantTradeNo: id, isSuccess: true, amount: '179', planType: 'pro', billingPeriod: 'monthly' });
beforeEach(() => {
  delete window.dataLayer;
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});
afterEach(() => jest.restoreAllMocks());
const events = () => (window.dataLayer || []).filter(entry => entry.event);

it('uses authoritative discounted amounts and GA4 ecommerce fields', () => {
  trackSubscriptionCheckout(paid('checkout-1'));
  trackSubscriptionPurchase(paid('purchase-1'));
  expect(events().map(entry => entry.event)).toEqual(['begin_checkout', 'purchase']);
  expect(events()[1]).toMatchObject({ ecommerce: {
    transaction_id: 'purchase-1', currency: 'TWD', value: 179,
    items: [{ item_id: 'pro_monthly', item_name: 'Pro', item_variant: 'monthly', price: 179, quantity: 1 }]
  }});
  expect(window.dataLayer[0]).toEqual({ ecommerce: null });
  expect(window.dataLayer[2]).toEqual({ ecommerce: null });
});

it('deduplicates server response shapes across return routes', () => {
  trackSubscriptionPurchase(paid('same-1'));
  trackSubscriptionPurchase({ orderStatus: 'paid', order: { ...paid('same-1'), status: 'paid' } });
  expect(events()).toHaveLength(1);
});

it('honors storage after a reload and handles blocked storage', () => {
  sessionStorage.setItem('sio:subscription:purchase:reload-1', '1');
  trackSubscriptionPurchase(paid('reload-1'));
  expect(events()).toHaveLength(0);
  const blocked = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  trackSubscriptionPurchase(paid('storage-1'));
  trackSubscriptionPurchase(paid('storage-1'));
  expect(events()).toHaveLength(1);
  blocked.mockRestore();
});

it('rejects pending, failed, URL codes, missing ids and invalid amounts', () => {
  [
    { ...paid('pending'), isSuccess: false, orderStatus: 'pending' },
    { ...paid('failed'), isSuccess: false, orderStatus: 'failed' },
    { ...paid('url'), isSuccess: undefined, rtnCode: '1' },
    { ...paid(null) },
    ...[null, '', undefined, 'bad', -1, Infinity].map(amount => ({ ...paid('invalid'), amount }))
  ].forEach(trackSubscriptionPurchase);
  expect(events()).toHaveLength(0);
});

it('excludes account fields and URL queries and retains zero amounts', () => {
  window.history.replaceState({}, '', '/payment/result?token=PRIVATE');
  trackSubscriptionPurchase({ ...paid('zero-1'), amount: 0, email: 'PRIVATE', token: 'PRIVATE', userId: 'PRIVATE' });
  expect(events()[0].ecommerce.value).toBe(0);
  expect(JSON.stringify(events())).not.toContain('PRIVATE');
  window.history.replaceState({}, '', '/');
});

it('cannot interrupt payment and permits retries after a failed push', () => {
  window.dataLayer = { push: () => { throw new Error('blocked'); } };
  expect(() => trackSubscriptionPurchase(paid('retry-1'))).not.toThrow();
  window.dataLayer = [];
  trackSubscriptionPurchase(paid('retry-1'));
  expect(events()).toHaveLength(1);
});

it.each([
  ['/en/payment/result', 'en'],
  ['/zh-TW/payment/result', 'zh-TW'],
  ['/en-US/payment/result', null],
  ['/ko/payment/result', null],
  ['/payment/result', null]
])('records site_locale from %s for checkout and purchase', (pathname, locale) => {
  window.history.replaceState({}, '', `${pathname}?MerchantTradeNo=PRIVATE#PRIVATE`);
  jest.spyOn(document, 'referrer', 'get').mockReturnValue('https://example.test/return?token=PRIVATE#PRIVATE');
  const order = paid(`locale-${pathname}`);
  trackSubscriptionCheckout(order);
  trackSubscriptionPurchase(order);
  expect(events()).toHaveLength(2);
  events().forEach(event => {
    expect(event).toMatchObject({ site_locale: locale, page_path: pathname, page_referrer: 'https://example.test/return' });
  });
  expect(JSON.stringify(events())).not.toContain('PRIVATE');
});
