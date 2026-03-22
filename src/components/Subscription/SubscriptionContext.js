import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Auth/useAuth';
import { subscriptionService } from '../../api/subscriptionService';
import { Analytics } from '../../utils/analytics';
import { useRedemption } from '../Redemption/RedemptionContext';

const SubscriptionContext = createContext({
  userPlan: null,
  usageStats: null,
  subscriptionHistory: null,
  loading: false,
  error: null,
  refreshUsageStats: () => {},
  refreshUserPlan: () => {},
  refreshSubscriptionHistory: () => {},
  updatePlan: () => {},
  cancelSubscription: () => {},
  // Redemption integration
  hasActivePromotions: false,
  promotionalBenefits: null,
  isPromotionalSubscription: false,
  promotionExpiresAt: null,
  onRedemptionSuccess: () => {},
  onRedemptionError: () => {}
});

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const { user, isAuthenticated, checkAuthStatus } = useAuth();
  const [userPlan, setUserPlan] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Redemption integration state
  const [hasActivePromotions, setHasActivePromotions] = useState(false);
  const [promotionalBenefits, setPromotionalBenefits] = useState(null);
  const [isPromotionalSubscription, setIsPromotionalSubscription] = useState(false);
  const [promotionExpiresAt, setPromotionExpiresAt] = useState(null);

  /**
   * Update redemption-related state based on plan data
   */
  const updateRedemptionState = useCallback((planData) => {
    if (!planData) {
      setHasActivePromotions(false);
      setPromotionalBenefits(null);
      setIsPromotionalSubscription(false);
      setPromotionExpiresAt(null);
      return;
    }
    // Check if subscription has promotional aspects
    const hasPromo = planData.redemptionSource === 'redemption' ||
      planData.redemptionSource === 'mixed' ||
      (planData.activePromotions && planData.activePromotions.length > 0);

    setHasActivePromotions(hasPromo);
    setIsPromotionalSubscription(planData.redemptionSource === 'redemption');
    setPromotionalBenefits(planData.activePromotions || null);
    setPromotionExpiresAt(planData.promotionalExpirationDate || null);

  }, []);

  // Refresh usage statistics
  const refreshUsageStats = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      setLoading(true);
      setError(null);

      const stats = await subscriptionService.getUserUsageStats();
      setUsageStats(stats);
      setRetryCount(0);

      Analytics.track('subscription_usage_stats_loaded', {
        userId: user.id,
        totalUsage: stats?.total || 0
      });
    } catch (err) {
      if (err.response?.status === 403 && retryCount < 2) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          refreshUsageStats();
        }, 1000);
        return;
      } else if (err.response?.status === 403) {
        setRetryCount(0);
      }

      if (process.env.NODE_ENV === 'development') {
        const fallbackStats = {
          daily: {
            lohasSpectrum: { used: 0, limit: 5, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
            marketSentiment: { used: 0, limit: 2, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
            watchlist: { used: 0, limit: 0, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) }
          },
          monthly: {
            lohasSpectrum: { used: 0, limit: 5, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
            marketSentiment: { used: 0, limit: 2, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
            watchlist: { used: 0, limit: 0, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
          }
        };
        setUsageStats(fallbackStats);
      } else {
        setError(err.message || 'Failed to load usage statistics');
      }

      Analytics.error({
        type: 'SUBSCRIPTION_ERROR',
        code: err.code || 500,
        message: err.message || 'Failed to load usage statistics',
        context: 'refreshUsageStats'
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, retryCount]);

  // Refresh user plan information
  const refreshUserPlan = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      setLoading(true);
      setError(null);

      const plan = await subscriptionService.getUserPlan();
      
      // If no active subscription found, create a default plan based on user's stored plan
      if (!plan && user?.plan) {
        const isFree = user.plan === 'free';
        const defaultPlan = {
          type: user.plan,
          status: isFree ? 'active' : 'inactive',
          startDate: null,
          endDate: null,
          autoRenew: false,
          cancelAtPeriodEnd: false,
          // ✅ 新增：明確定義時間驗證旗標
          // 如果是付費版但 API 抓不到資料，為了安全起見，強制設為 false (無效)
          // 除非是 Free 版，則永遠有效
          isActive: isFree,
          isExpired: !isFree,
          // 標記這是備用資料 (方便除錯)
          _isFallback: true
        };
        console.warn('⚠️ Using fallback plan with secure flags:', defaultPlan);
        setUserPlan(defaultPlan);
      } else if (plan) {
        // Map backend subscription fields to frontend plan fields
        const mappedPlan = {
          ...plan,
          type: plan.planType || plan.type, // Map planType to type
        };
        
        // Debug log to check the plan data
        setUserPlan(mappedPlan);
      } else {
        setUserPlan(null);
      }
      // Update redemption-related state
      updateRedemptionState(plan);

      Analytics.track('subscription_plan_loaded', {
        userId: user.id,
        planType: plan?.type || 'unknown',
        hasPromotions: plan?.activePromotions?.length > 0,
        redemptionSource: plan?.redemptionSource
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        // mock data etc.
      } else {
        setError(err.message || 'Failed to load plan information');
        Analytics.error({
          type: 'SUBSCRIPTION_ERROR',
          code: err.code || 500,
          message: err.message || 'Failed to load plan information',
          context: 'refreshUserPlan'
        });
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, updateRedemptionState]);

  // Refresh subscription history
  const refreshSubscriptionHistory = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      setLoading(true);
      setError(null);

      const historyResult = await subscriptionService.getSubscriptionHistory();
      
      // 檢查結果並提取實際的訂閱數據
      // API 服務直接返回數組，不是 {success, data} 結構
      if (Array.isArray(historyResult) && historyResult.length > 0) {
        setSubscriptionHistory(historyResult);
      } else if (historyResult && historyResult.success && historyResult.data) {
        // 兼容其他可能的結構
        setSubscriptionHistory(historyResult.data);
      } else {
        setSubscriptionHistory([]);
      }

      Analytics.track('subscription_history_loaded', {
        userId: user.id,
        historyCount: Array.isArray(historyResult) ? historyResult.length : (historyResult?.data?.length || 0)
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        // mock data etc.
      } else {
        setError(err.message || 'Failed to load subscription history');
        Analytics.error({
          type: 'SUBSCRIPTION_ERROR',
          code: err.code || 500,
          message: err.message || 'Failed to load subscription history',
          context: 'refreshSubscriptionHistory'
        });
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Update user plan
  const updatePlan = useCallback(async (newPlanType) => {
    if (!isAuthenticated || !user) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updatedPlan = await subscriptionService.updateUserPlan(newPlanType);
      setUserPlan(updatedPlan);
      // Update redemption-related state
      updateRedemptionState(updatedPlan);

      if (checkAuthStatus) {
        await checkAuthStatus();
      }
      await refreshUsageStats();

      Analytics.track('subscription_plan_updated', {
        userId: user.id,
        oldPlan: userPlan?.type || 'unknown',
        newPlan: newPlanType
      });

      return updatedPlan;
    } catch (err) {
      setError(err.message || 'Failed to update plan');
      Analytics.error({
        type: 'SUBSCRIPTION_ERROR',
        code: err.code || 500,
        message: err.message || 'Failed to update plan',
        context: 'updatePlan'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, userPlan, refreshUsageStats, checkAuthStatus, updateRedemptionState]);

  // Cancel subscription
  const cancelSubscription = useCallback(async (options = {}) => {
    if (!isAuthenticated || !user) {
      throw new Error('請先登入');
    }

    try {
      setLoading(true);
      setError(null);

      const result = await subscriptionService.cancelSubscription(options);
      
      // 刷新所有相關資料
      await Promise.all([
        refreshUserPlan(),
        refreshSubscriptionHistory(),
        checkAuthStatus && checkAuthStatus()
      ]);

      Analytics.track('subscription_cancelled', {
        userId: user.id,
        cancelAtPeriodEnd: options.cancelAtPeriodEnd !== false,
        reason: options.reason || 'user_requested',
        ecpaySuccess: result.ecpayResult?.success
      });

      return result;
    } catch (err) {
      setError(err.message || 'Failed to cancel subscription');
      Analytics.error({
        type: 'SUBSCRIPTION_ERROR',
        code: err.code || 500,
        message: err.message || 'Failed to cancel subscription',
        context: 'cancelSubscription'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, refreshUserPlan, refreshSubscriptionHistory, checkAuthStatus]);

  /** 處理 redemption 成功/失敗 */
  const onRedemptionSuccess = useCallback(async (redemptionData) => {
    try {
      await Promise.all([
        refreshUserPlan(),
        refreshUsageStats(),
        refreshSubscriptionHistory()
      ]);
      Analytics.track('subscription_updated_by_redemption', {
        userId: user?.id,
        redemptionType: redemptionData?.codeType,
        benefitType: redemptionData?.benefits?.type
      });
    } catch (error) {
      // error handling
    }
  }, [refreshUserPlan, refreshUsageStats, refreshSubscriptionHistory, user]);

  const onRedemptionError = useCallback(error => {
    Analytics.track('redemption_error_in_subscription_context', {
      userId: user?.id,
      error: error.message || 'Unknown error',
      errorCode: error.errorCode
    });
  }, [user]);

  // Load initial data when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshUserPlan();
      refreshUsageStats();
      refreshSubscriptionHistory();
    } else {
      setUserPlan(null);
      setUsageStats(null);
      setSubscriptionHistory(null);
      setError(null);
      setHasActivePromotions(false);
      setPromotionalBenefits(null);
      setIsPromotionalSubscription(false);
      setPromotionExpiresAt(null);
    }
  }, [isAuthenticated, user, refreshUserPlan, refreshUsageStats, refreshSubscriptionHistory]);

  // Auto-refresh usage stats every 5 minutes
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const interval = setInterval(() => {
      refreshUsageStats();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user, refreshUsageStats]);

  const value = {
    userPlan,
    usageStats,
    subscriptionHistory,
    loading,
    error,
    refreshUsageStats,
    refreshUserPlan,
    refreshSubscriptionHistory,
    updatePlan,
    cancelSubscription,
    hasActivePromotions,
    promotionalBenefits,
    isPromotionalSubscription,
    promotionExpiresAt,
    onRedemptionSuccess,
    onRedemptionError,
    updateRedemptionState
  };
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
