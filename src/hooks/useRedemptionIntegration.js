import { useCallback, useEffect } from 'react';
import { useRedemption } from '../components/Redemption/RedemptionContext';
import { useSubscription } from '../components/Subscription/SubscriptionContext';
import { systemLogger } from '../utils/logger';

/**
 * Hook that integrates redemption and subscription contexts
 * Provides unified state and actions for redemption-related functionality
 */
export const useRedemptionIntegration = () => {
  const redemption = useRedemption();
  const subscription = useSubscription();

  /**
   * Handle successful redemption with subscription updates
   */
  const handleRedemptionSuccess = useCallback(async (redemptionData) => {
    systemLogger.info('Handling redemption success integration', {
      redemptionData: redemptionData?.code?.substring(0, 4) + '***'
    });

    try {
      // Call subscription context handler
      await subscription.onRedemptionSuccess(redemptionData);
      
      // Refresh redemption data
      await Promise.all([
        redemption.refreshActivePromotions(true),
        redemption.refreshRedemptionHistory(true)
      ]);
      
      // Clear redemption flow state after successful integration
      setTimeout(() => {
        redemption.clearRedemptionState();
      }, 3000); // Clear after 3 seconds to show success state
      
    } catch (error) {
      systemLogger.error('Failed to handle redemption success integration:', error);
      subscription.onRedemptionError(error);
    }
  }, [redemption, subscription]);

  /**
   * Handle redemption error with proper error propagation
   */
  const handleRedemptionError = useCallback((error) => {
    systemLogger.error('Handling redemption error integration:', error);
    
    // Propagate error to subscription context
    subscription.onRedemptionError(error);
  }, [subscription]);

  /**
   * Enhanced redeem code that integrates with subscription system
   */
  const redeemCodeWithIntegration = useCallback(async (code, confirmed = false) => {
    const result = await redemption.redeemCode(code, confirmed);
    
    if (result.success) {
      await handleRedemptionSuccess(result.data);
    } else {
      handleRedemptionError(result);
    }
    
    return result;
  }, [redemption, handleRedemptionSuccess, handleRedemptionError]);

  /**
   * Check if user has any promotional benefits
   */
  const hasAnyPromotions = useCallback(() => {
    return subscription.hasActivePromotions || 
           (redemption.activePromotions && redemption.activePromotions.length > 0);
  }, [subscription.hasActivePromotions, redemption.activePromotions]);

  /**
   * Get combined promotional status
   */
  const getPromotionalStatus = useCallback(() => {
    return {
      hasActivePromotions: hasAnyPromotions(),
      isPromotionalSubscription: subscription.isPromotionalSubscription,
      promotionalBenefits: subscription.promotionalBenefits,
      promotionExpiresAt: subscription.promotionExpiresAt,
      activePromotions: redemption.activePromotions,
      redemptionHistory: redemption.redemptionHistory
    };
  }, [
    hasAnyPromotions,
    subscription.isPromotionalSubscription,
    subscription.promotionalBenefits,
    subscription.promotionExpiresAt,
    redemption.activePromotions,
    redemption.redemptionHistory
  ]);

  /**
   * Refresh all redemption and subscription data
   */
  const refreshAllData = useCallback(async () => {
    systemLogger.info('Refreshing all redemption and subscription data');
    
    try {
      await Promise.all([
        subscription.refreshUserPlan(),
        subscription.refreshUsageStats(),
        subscription.refreshSubscriptionHistory(),
        redemption.refreshActivePromotions(true),
        redemption.refreshRedemptionHistory(true)
      ]);
    } catch (error) {
      systemLogger.error('Failed to refresh all data:', error);
      throw error;
    }
  }, [subscription, redemption]);

  // Auto-sync when subscription changes affect redemptions
  useEffect(() => {
    if (subscription.userPlan && subscription.userPlan.redemptionSource) {
      // If subscription has redemption source, ensure redemption data is fresh
      redemption.refreshActivePromotions();
    }
  }, [subscription.userPlan, redemption]);

  return {
    // Combined state
    ...redemption,
    ...subscription,
    
    // Enhanced actions
    redeemCode: redeemCodeWithIntegration,
    refreshAllData,
    
    // Utility functions
    hasAnyPromotions,
    getPromotionalStatus,
    
    // Loading state (true if either context is loading)
    loading: redemption.loading || subscription.loading,
    
    // Combined error state
    error: redemption.error || subscription.error,
    
    // Integration handlers
    handleRedemptionSuccess,
    handleRedemptionError
  };
};

export default useRedemptionIntegration;