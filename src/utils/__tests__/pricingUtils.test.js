import { formatPrice, getPricingDisplayData } from '../pricingUtils';

describe('subscription price display', () => {
  test.each(['zh-TW', 'en'])('makes TWD explicit for %s readers', (locale) => {
    expect(formatPrice(199, 'TWD', locale)).toBe('NT$199');
    expect(formatPrice(1990, 'TWD', locale)).toBe('NT$1,990');
  });

  test('keeps zero amounts numeric so callers can choose their own free-plan label', () => {
    expect(formatPrice(0, 'TWD', 'en')).toBe('NT$0');
  });

  test('respects the requested currency and locale without converting the amount', () => {
    expect(formatPrice(1990, 'EUR', 'de-DE')).toBe('1.990\u00a0€');
    expect(formatPrice(199, 'USD', 'en')).toBe('$199');
  });

  test.each([
    ['monthly', 199, 'subscription.billingPeriod.perMonth'],
    ['yearly', 1990, 'subscription.billingPeriod.perYear']
  ])('provides a translation key for the %s billing period', (period, price, periodKey) => {
    expect(getPricingDisplayData({ price: { monthly: 199, yearly: 1990 } }, period)).toMatchObject({
      displayPrice: price,
      periodKey
    });
  });

  test('keeps annual totals and savings unchanged', () => {
    expect(getPricingDisplayData({ price: { monthly: 199, yearly: 1990 } }, 'yearly')).toMatchObject({
      displayPrice: 1990,
      originalPrice: 2388,
      monthlyEquivalent: 166,
      discountPercentage: 17,
      showDiscount: true
    });
  });

  test('uses the monthly label when there is no annual price', () => {
    expect(getPricingDisplayData({ price: { monthly: 199, yearly: 0 } }, 'yearly')).toMatchObject({
      displayPrice: 199,
      periodKey: 'subscription.billingPeriod.perMonth'
    });
    expect(getPricingDisplayData(null, 'monthly').periodKey).toBe('');
  });
});
