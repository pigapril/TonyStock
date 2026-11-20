import {
  formatCurrency,
  formatDate,
  formatCountdown,
  formatTimeExtension,
  formatDiscountDescription,
  formatBenefitDescription,
  getLocalizedPlanName,
  getPluralizedTimeUnit,
} from '../redemptionFormatting';

describe('redemption formatting supports Simplified Chinese', () => {
  test('uses Simplified Chinese number and date formatting', () => {
    expect(formatCurrency(1234, 'TWD', 'zh-CN')).toBe('NT$1,234');
    expect(formatDate('2025-01-02T00:00:00.000Z', 'PPP', 'zh-CN')).toContain('2025');
    expect(formatDate('2025-01-02T00:00:00.000Z', 'PPP', 'zh-CN')).toContain('1月2日');
  });

  test('uses Simplified Chinese subscription terms and countdown copy', () => {
    expect(getPluralizedTimeUnit(2, 'month', 'zh-CN')).toBe('个月');
    expect(formatTimeExtension(30, 'day', 'zh-CN')).toBe('延长 30 天');
    expect(getLocalizedPlanName('pro', 'zh-CN')).toBe('Pro 套餐');
    expect(formatCountdown(25 * 60 * 60 * 1000, 'zh-CN')).toBe('剩余 1 天 1 小时');
  });

  test('keeps Traditional Chinese formatting independent from Simplified Chinese', () => {
    expect(getPluralizedTimeUnit(2, 'month', 'zh-TW')).toBe('個月');
    expect(formatTimeExtension(30, 'day', 'zh-TW')).toBe('延長 30 天');
    expect(getLocalizedPlanName('pro', 'zh-TW')).toBe('Pro 方案');
  });
});

describe('Korean numeric and date locale primitives', () => {
  test('uses Korean locale formatting without adding Korean translation copy', () => {
    expect(formatCurrency(1234, 'TWD', 'ko-KR')).toBe('NT$1,234');
    const date = formatDate('2025-01-02T00:00:00.000Z', 'PPP', 'ko-KR');
    expect(date).toContain('2025');
    expect(date).toContain('1월 2일');
  });

  test('formats Korean redemption and subscription benefit copy naturally', () => {
    expect(getPluralizedTimeUnit(2, 'month', 'ko-KR')).toBe('개월');
    expect(formatTimeExtension(30, 'day', 'ko-KR')).toBe('구독 기간 30일 연장');
    expect(getLocalizedPlanName('pro', 'ko-KR')).toBe('Pro 요금제');
    expect(formatDiscountDescription({ discountType: 'percentage', percentage: 15 }, 'ko-KR'))
      .toBe('15% 할인');
    expect(formatDiscountDescription({ discountType: 'fixed', amount: 200, currency: 'TWD' }, 'ko-KR'))
      .toBe('NT$200 할인');
    expect(formatCountdown(25 * 60 * 60 * 1000, 'ko-KR')).toBe('남은 기간 1일 1시간');
    expect(formatBenefitDescription({ type: 'extension', duration: 30, unit: 'day' }, 'ko-KR'))
      .toMatchObject({ title: '구독 기간 연장', description: '구독 기간 30일 연장', highlight: '+30일' });
    expect(formatBenefitDescription({ type: 'upgrade', targetPlan: 'pro' }, 'ko-KR'))
      .toMatchObject({ title: '요금제 업그레이드', description: 'Pro 요금제로 업그레이드' });
  });
});
