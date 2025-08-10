import {
  getDiscountPercentage,
  getMonthlyEquivalent,
  formatDiscount,
  getTotalSavings,
  formatPrice,
  getPricingDisplayData
} from '../pricingUtils';

describe('pricingUtils', () => {
  describe('getDiscountPercentage', () => {
    it('should calculate correct discount percentage', () => {
      expect(getDiscountPercentage(299, 2990)).toBe(17);
      expect(getDiscountPercentage(100, 1000)).toBe(17);
      expect(getDiscountPercentage(50, 500)).toBe(17);
    });

    it('should handle edge cases', () => {
      expect(getDiscountPercentage(0, 1000)).toBe(0);
      expect(getDiscountPercentage(100, 0)).toBe(0);
      expect(getDiscountPercentage(-100, 1000)).toBe(0);
      expect(getDiscountPercentage(100, -1000)).toBe(0);
    });

    it('should return 0 for invalid inputs', () => {
      expect(getDiscountPercentage(null, 1000)).toBe(0);
      expect(getDiscountPercentage(100, null)).toBe(0);
      expect(getDiscountPercentage(undefined, 1000)).toBe(0);
    });
  });

  describe('getMonthlyEquivalent', () => {
    it('should calculate monthly equivalent correctly', () => {
      expect(getMonthlyEquivalent(2990)).toBe(249);
      expect(getMonthlyEquivalent(1200)).toBe(100);
      expect(getMonthlyEquivalent(600)).toBe(50);
    });

    it('should handle edge cases', () => {
      expect(getMonthlyEquivalent(0)).toBe(0);
      expect(getMonthlyEquivalent(-1200)).toBe(0);
      expect(getMonthlyEquivalent(null)).toBe(0);
      expect(getMonthlyEquivalent(undefined)).toBe(0);
    });
  });

  describe('formatDiscount', () => {
    it('should format discount percentage correctly', () => {
      expect(formatDiscount(17)).toBe('17%');
      expect(formatDiscount(25)).toBe('25%');
      expect(formatDiscount(5)).toBe('5%');
    });

    it('should handle edge cases', () => {
      expect(formatDiscount(0)).toBe('');
      expect(formatDiscount(-5)).toBe('');
      expect(formatDiscount(null)).toBe('');
      expect(formatDiscount(undefined)).toBe('');
    });
  });

  describe('getTotalSavings', () => {
    it('should calculate total savings correctly', () => {
      expect(getTotalSavings(299, 2990)).toBe(598);
      expect(getTotalSavings(100, 1000)).toBe(200);
    });

    it('should handle edge cases', () => {
      expect(getTotalSavings(0, 1000)).toBe(0);
      expect(getTotalSavings(100, 0)).toBe(0);
      expect(getTotalSavings(100, 1500)).toBe(0); // No savings case
    });
  });

  describe('formatPrice', () => {
    it('should format price correctly', () => {
      expect(formatPrice(299)).toMatch(/\$299/);
      expect(formatPrice(2990)).toMatch(/\$2,990/);
    });

    it('should handle free price', () => {
      expect(formatPrice(0)).toBe('免費');
    });
  });

  describe('getPricingDisplayData', () => {
    const mockPlan = {
      price: {
        monthly: 299,
        yearly: 2990
      }
    };

    it('should return correct data for monthly billing', () => {
      const result = getPricingDisplayData(mockPlan, 'monthly');
      expect(result).toEqual({
        displayPrice: 299,
        period: '/月',
        discountPercentage: 0,
        originalPrice: 0,
        showDiscount: false
      });
    });

    it('should return correct data for yearly billing', () => {
      const result = getPricingDisplayData(mockPlan, 'yearly');
      expect(result).toEqual({
        displayPrice: 2990,
        period: '/年',
        discountPercentage: 17,
        originalPrice: 3588,
        monthlyEquivalent: 249,
        showDiscount: true
      });
    });

    it('should handle invalid plan data', () => {
      const result = getPricingDisplayData(null, 'monthly');
      expect(result).toEqual({
        displayPrice: 0,
        period: '',
        discountPercentage: 0,
        originalPrice: 0,
        showDiscount: false
      });
    });
  });
});