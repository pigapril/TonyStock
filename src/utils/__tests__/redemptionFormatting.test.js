/**
 * Tests for Redemption Formatting Utilities
 */

import {
    formatCurrency,
    formatDate,
    getPluralizedTimeUnit,
    formatTimeExtension,
    formatDiscountDescription,
    formatBenefitDescription,
    formatCountdown,
    formatNumber,
    formatPercentage,
    getLocalizedPlanName,
    formatEstimatedValue
} from '../redemptionFormatting';

describe('Redemption Formatting Utilities', () => {
    describe('formatCurrency', () => {
        test('formats TWD currency correctly for zh-TW locale', () => {
            const result = formatCurrency(1000, 'TWD', 'zh-TW');
            expect(result).toBe('NT$1,000');
        });

        test('formats USD currency correctly for en locale', () => {
            const result = formatCurrency(1000, 'USD', 'en');
            expect(result).toBe('$1,000');
        });

        test('handles decimal amounts', () => {
            const result = formatCurrency(1234.56, 'TWD', 'en');
            expect(result).toBe('NT$1,234.56');
        });
    });

    describe('getPluralizedTimeUnit', () => {
        test('returns singular form for 1 in English', () => {
            expect(getPluralizedTimeUnit(1, 'day', 'en')).toBe('day');
            expect(getPluralizedTimeUnit(1, 'month', 'en')).toBe('month');
            expect(getPluralizedTimeUnit(1, 'year', 'en')).toBe('year');
        });

        test('returns plural form for multiple in English', () => {
            expect(getPluralizedTimeUnit(2, 'day', 'en')).toBe('days');
            expect(getPluralizedTimeUnit(3, 'month', 'en')).toBe('months');
            expect(getPluralizedTimeUnit(5, 'year', 'en')).toBe('years');
        });

        test('returns Chinese units without pluralization', () => {
            expect(getPluralizedTimeUnit(1, 'day', 'zh-TW')).toBe('天');
            expect(getPluralizedTimeUnit(5, 'day', 'zh-TW')).toBe('天');
            expect(getPluralizedTimeUnit(1, 'month', 'zh-TW')).toBe('個月');
            expect(getPluralizedTimeUnit(3, 'month', 'zh-TW')).toBe('個月');
        });
    });

    describe('formatTimeExtension', () => {
        test('formats time extension for English', () => {
            expect(formatTimeExtension(30, 'day', 'en')).toBe('Extend 30 days');
            expect(formatTimeExtension(1, 'month', 'en')).toBe('Extend 1 month');
            expect(formatTimeExtension(2, 'year', 'en')).toBe('Extend 2 years');
        });

        test('formats time extension for Chinese', () => {
            expect(formatTimeExtension(30, 'day', 'zh-TW')).toBe('延長 30 天');
            expect(formatTimeExtension(1, 'month', 'zh-TW')).toBe('延長 1 個月');
            expect(formatTimeExtension(2, 'year', 'zh-TW')).toBe('延長 2 年');
        });
    });

    describe('formatDiscountDescription', () => {
        test('formats percentage discount', () => {
            const discount = { discountType: 'percentage', percentage: 20 };
            expect(formatDiscountDescription(discount, 'en')).toBe('20% discount');
            expect(formatDiscountDescription(discount, 'zh-TW')).toBe('20% 折扣');
        });

        test('formats fixed amount discount', () => {
            const discount = { discountType: 'fixed', amount: 100, currency: 'TWD' };
            expect(formatDiscountDescription(discount, 'en')).toBe('NT$100 discount');
            expect(formatDiscountDescription(discount, 'zh-TW')).toBe('NT$100 折扣');
        });
    });

    describe('formatBenefitDescription', () => {
        test('formats discount benefit', () => {
            const benefit = { type: 'discount', discountType: 'percentage', percentage: 25 };
            const result = formatBenefitDescription(benefit, 'en');
            
            expect(result.title).toBe('Discount Applied');
            expect(result.icon).toBe('💰');
            expect(result.highlight).toBe('25%');
        });

        test('formats extension benefit', () => {
            const benefit = { type: 'extension', duration: 30, unit: 'day' };
            const result = formatBenefitDescription(benefit, 'en');
            
            expect(result.title).toBe('Subscription Extended');
            expect(result.icon).toBe('⏰');
            expect(result.highlight).toBe('+30 days');
        });

        test('formats upgrade benefit', () => {
            const benefit = { type: 'upgrade', targetPlan: 'pro' };
            const result = formatBenefitDescription(benefit, 'en');
            
            expect(result.title).toBe('Plan Upgrade');
            expect(result.icon).toBe('⭐');
            expect(result.highlight).toBe('Pro Plan');
        });
    });

    describe('formatCountdown', () => {
        test('formats countdown with days and hours', () => {
            const timeRemaining = 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000; // 2 days 5 hours
            expect(formatCountdown(timeRemaining, 'en')).toBe('2d 5h remaining');
            expect(formatCountdown(timeRemaining, 'zh-TW')).toBe('剩餘 2 天 5 小時');
        });

        test('formats countdown with hours and minutes', () => {
            const timeRemaining = 3 * 60 * 60 * 1000 + 45 * 60 * 1000; // 3 hours 45 minutes
            expect(formatCountdown(timeRemaining, 'en')).toBe('3h 45m remaining');
            expect(formatCountdown(timeRemaining, 'zh-TW')).toBe('剩餘 3 小時 45 分鐘');
        });

        test('formats countdown with minutes only', () => {
            const timeRemaining = 30 * 60 * 1000; // 30 minutes
            expect(formatCountdown(timeRemaining, 'en')).toBe('30m remaining');
            expect(formatCountdown(timeRemaining, 'zh-TW')).toBe('剩餘 30 分鐘');
        });
    });

    describe('formatNumber', () => {
        test('formats numbers with thousands separator', () => {
            expect(formatNumber(1234567, {}, 'en')).toBe('1,234,567');
            expect(formatNumber(1234567, {}, 'zh-TW')).toBe('1,234,567');
        });

        test('formats numbers with decimal places', () => {
            expect(formatNumber(1234.56, { minimumFractionDigits: 2 }, 'en')).toBe('1,234.56');
        });
    });

    describe('formatPercentage', () => {
        test('formats percentage correctly', () => {
            expect(formatPercentage(25, 'en')).toBe('25%');
            expect(formatPercentage(50.5, 'en')).toBe('50.5%');
        });
    });

    describe('getLocalizedPlanName', () => {
        test('returns localized plan names', () => {
            expect(getLocalizedPlanName('pro', 'en')).toBe('Pro Plan');
            expect(getLocalizedPlanName('pro', 'zh-TW')).toBe('Pro 方案');
            expect(getLocalizedPlanName('free', 'en')).toBe('Free Plan');
            expect(getLocalizedPlanName('free', 'zh-TW')).toBe('免費方案');
        });

        test('returns original key for unknown plans', () => {
            expect(getLocalizedPlanName('unknown', 'en')).toBe('unknown');
        });
    });

    describe('formatEstimatedValue', () => {
        test('formats estimated value with currency', () => {
            expect(formatEstimatedValue(500, 'TWD', 'en')).toBe('Estimated Value: NT$500');
            expect(formatEstimatedValue(500, 'TWD', 'zh-TW')).toBe('預估價值：NT$500');
        });
    });
});