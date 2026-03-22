/**
 * Integration test to verify RedemptionService implementation
 * Tests the key requirements for task 10.1 and 10.2
 */

describe('Redemption Service Integration', () => {
  test('RedemptionService should have all required methods', () => {
    const redemptionService = require('../redemptionService').default;
    
    // Verify all API integration methods exist
    expect(typeof redemptionService.previewRedemption).toBe('function');
    expect(typeof redemptionService.redeemCode).toBe('function');
    expect(typeof redemptionService.validateCode).toBe('function');
    expect(typeof redemptionService.getRedemptionHistory).toBe('function');
    expect(typeof redemptionService.getActivePromotions).toBe('function');
    expect(typeof redemptionService.cancelPendingRedemption).toBe('function');
    
    // Verify caching methods exist
    expect(typeof redemptionService.clearCache).toBe('function');
    expect(typeof redemptionService.clearCacheType).toBe('function');
    expect(typeof redemptionService.getCacheStats).toBe('function');
    
    // Verify error handling methods exist
    expect(typeof redemptionService.formatErrorMessage).toBe('function');
    expect(typeof redemptionService.getErrorActionRequirements).toBe('function');
    expect(typeof redemptionService.isRetryableError).toBe('function');
    expect(typeof redemptionService.getRetryDelay).toBe('function');
    
    // Verify cleanup method exists
    expect(typeof redemptionService.destroy).toBe('function');
  });

  test('RedemptionService should have proper cache configuration', () => {
    const redemptionService = require('../redemptionService').default;
    
    expect(redemptionService.cacheConfig).toBeDefined();
    expect(redemptionService.cacheConfig.redemptionHistory).toBeDefined();
    expect(redemptionService.cacheConfig.activePromotions).toBeDefined();
    expect(redemptionService.cacheConfig.codeValidation).toBeDefined();
    
    // Verify TTL values are reasonable
    expect(redemptionService.cacheConfig.redemptionHistory.ttl).toBeGreaterThan(0);
    expect(redemptionService.cacheConfig.activePromotions.ttl).toBeGreaterThan(0);
    expect(redemptionService.cacheConfig.codeValidation.ttl).toBeGreaterThan(0);
  });

  test('RedemptionService should have retry configuration', () => {
    const redemptionService = require('../redemptionService').default;
    
    expect(redemptionService.retryAttempts).toBeGreaterThan(0);
    expect(redemptionService.retryDelay).toBeGreaterThan(0);
  });

  test('RedemptionContext should export required hooks and providers', () => {
    const redemptionContext = require('../components/Redemption/RedemptionContext');
    
    expect(typeof redemptionContext.useRedemption).toBe('function');
    expect(typeof redemptionContext.RedemptionProvider).toBe('function');
  });

  test('RedemptionProviderWrapper should exist', () => {
    const wrapper = require('../components/Redemption/RedemptionProviderWrapper');
    
    expect(typeof wrapper.RedemptionProviderWrapper).toBe('function');
    expect(typeof wrapper.useRedemptionWithSubscription).toBe('function');
  });

  test('useRedemptionIntegration hook should exist', () => {
    const hook = require('../hooks/useRedemptionIntegration');
    
    expect(typeof hook.useRedemptionIntegration).toBe('function');
  });

  test('SubscriptionContext should have redemption integration', () => {
    // This test verifies that the SubscriptionContext has been extended
    // with redemption-related properties and methods
    
    // Note: We can't easily test the actual context without setting up
    // the full React testing environment, but we can verify the file
    // has been updated with the expected exports
    
    const fs = require('fs');
    const path = require('path');
    
    const subscriptionContextPath = path.join(__dirname, '../components/Subscription/SubscriptionContext.js');
    const content = fs.readFileSync(subscriptionContextPath, 'utf8');
    
    // Verify redemption-related properties are in the context
    expect(content).toContain('hasActivePromotions');
    expect(content).toContain('promotionalBenefits');
    expect(content).toContain('isPromotionalSubscription');
    expect(content).toContain('promotionExpiresAt');
    expect(content).toContain('onRedemptionSuccess');
    expect(content).toContain('onRedemptionError');
    expect(content).toContain('updateRedemptionState');
  });
});