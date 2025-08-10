/**
 * Utility functions for subscription pricing calculations
 */

/**
 * Calculate discount percentage for yearly vs monthly pricing
 * @param {number} monthlyPrice - Monthly price
 * @param {number} yearlyPrice - Yearly price
 * @returns {number} Discount percentage (0-100)
 */
export const getDiscountPercentage = (monthlyPrice, yearlyPrice) => {
  if (!monthlyPrice || !yearlyPrice || monthlyPrice <= 0 || yearlyPrice <= 0) {
    return 0;
  }
  
  const monthlyEquivalentOfYearly = yearlyPrice / 12;
  const discountPercentage = Math.round((1 - (monthlyEquivalentOfYearly / monthlyPrice)) * 100);
  
  // Ensure percentage is between 0 and 100
  return Math.max(0, Math.min(100, discountPercentage));
};

/**
 * Calculate monthly equivalent price from yearly pricing
 * @param {number} yearlyPrice - Yearly price
 * @returns {number} Monthly equivalent price
 */
export const getMonthlyEquivalent = (yearlyPrice) => {
  if (!yearlyPrice || yearlyPrice <= 0) {
    return 0;
  }
  
  return Math.round(yearlyPrice / 12);
};

/**
 * Format discount percentage for display
 * @param {number} percentage - Discount percentage
 * @returns {string} Formatted discount string
 */
export const formatDiscount = (percentage) => {
  if (!percentage || percentage <= 0) {
    return '';
  }
  
  return `${percentage}%`;
};

/**
 * Calculate total savings amount for yearly vs monthly
 * @param {number} monthlyPrice - Monthly price
 * @param {number} yearlyPrice - Yearly price
 * @returns {number} Total savings amount
 */
export const getTotalSavings = (monthlyPrice, yearlyPrice) => {
  if (!monthlyPrice || !yearlyPrice || monthlyPrice <= 0 || yearlyPrice <= 0) {
    return 0;
  }
  
  const yearlyEquivalentOfMonthly = monthlyPrice * 12;
  return Math.max(0, yearlyEquivalentOfMonthly - yearlyPrice);
};

/**
 * Format price with currency
 * @param {number} price - Price amount
 * @param {string} currency - Currency code (default: 'TWD')
 * @returns {string} Formatted price string
 */
export const formatPrice = (price, currency = 'TWD') => {
  if (price === 0) {
    return '免費';
  }
  
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  }).format(price);
};

/**
 * Get pricing display data for a plan based on billing period
 * @param {Object} plan - Plan object with pricing information
 * @param {string} billingPeriod - 'monthly' or 'yearly'
 * @returns {Object} Pricing display data
 */
export const getPricingDisplayData = (plan, billingPeriod) => {
  if (!plan || !plan.price) {
    return {
      displayPrice: 0,
      period: '',
      discountPercentage: 0,
      originalPrice: 0,
      showDiscount: false
    };
  }
  
  const { monthly, yearly } = plan.price;
  
  if (billingPeriod === 'yearly' && yearly > 0) {
    const discountPercentage = getDiscountPercentage(monthly, yearly);
    const monthlyEquivalent = getMonthlyEquivalent(yearly);
    
    return {
      displayPrice: yearly,
      period: '/年',
      discountPercentage,
      originalPrice: monthly * 12,
      monthlyEquivalent,
      showDiscount: discountPercentage > 0
    };
  }
  
  return {
    displayPrice: monthly,
    period: '/月',
    discountPercentage: 0,
    originalPrice: 0,
    showDiscount: false
  };
};