import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Auth/useAuth';
import { subscriptionService } from '../../api/subscriptionService';
import { Analytics } from '../../utils/analytics';

const SubscriptionContext = createContext({
  userPlan: null,
  usageStats: null,
  subscriptionHistory: null,
  loading: false,
  error: null,
  refreshUsageStats: () => {},
  refreshUserPlan: () => {},
  refreshSubscriptionHistory: () => {},
  updatePlan: () => {}
});

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [userPlan, setUserPlan] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refresh usage statistics
  const refreshUsageStats = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const stats = await subscriptionService.getUserUsageStats();
      console.log('📊 Usage stats received:', stats);
      console.log('📊 Setting usageStats state with:', stats);
      setUsageStats(stats);
      console.log('📊 UsageStats state updated');
      
      Analytics.track('subscription_usage_stats_loaded', {
        userId: user.id,
        totalUsage: stats?.total || 0
      });
    } catch (err) {
      console.error('❌ Failed to refresh usage stats:', err);
      console.error('❌ Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      // 在開發模式下，提供 fallback 數據而不是顯示錯誤
      if (process.env.NODE_ENV === 'development') {
        console.warn('🔧 Using fallback data for usage stats in development mode');
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
        // 設置錯誤狀態
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
  }, [isAuthenticated, user]);

  // Refresh user plan information
  const refreshUserPlan = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const plan = await subscriptionService.getUserPlan();
      setUserPlan(plan);
      
      Analytics.track('subscription_plan_loaded', {
        userId: user.id,
        planType: plan?.type || 'unknown'
      });
    } catch (err) {
      console.error('Failed to refresh user plan:', err);
      // 在開發階段，不要顯示錯誤給用戶，因為我們使用 mock 資料
      if (process.env.NODE_ENV === 'development') {
        console.warn('Using mock data for user plan in development mode');
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
  }, [isAuthenticated, user]);

  // Refresh subscription history
  const refreshSubscriptionHistory = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const history = await subscriptionService.getSubscriptionHistory();
      setSubscriptionHistory(history);
      
      Analytics.track('subscription_history_loaded', {
        userId: user.id,
        historyCount: history?.length || 0
      });
    } catch (err) {
      console.error('Failed to refresh subscription history:', err);
      // 在開發階段，不要顯示錯誤給用戶，因為我們使用 mock 資料
      if (process.env.NODE_ENV === 'development') {
        console.warn('Using mock data for subscription history in development mode');
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
    if (!isAuthenticated || !user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const updatedPlan = await subscriptionService.updateUserPlan(newPlanType);
      setUserPlan(updatedPlan);
      
      // Refresh usage stats after plan change
      await refreshUsageStats();
      
      Analytics.track('subscription_plan_updated', {
        userId: user.id,
        oldPlan: userPlan?.type || 'unknown',
        newPlan: newPlanType
      });
      
      return updatedPlan;
    } catch (err) {
      console.error('Failed to update plan:', err);
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
  }, [isAuthenticated, user, userPlan, refreshUsageStats]);

  // Load initial data when user changes
  useEffect(() => {
    console.log('🔄 SubscriptionContext useEffect triggered:', {
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id
    });
    
    if (isAuthenticated && user) {
      console.log('✅ User authenticated, loading subscription data...');
      refreshUserPlan();
      refreshUsageStats();
      refreshSubscriptionHistory();
    } else {
      console.log('❌ User not authenticated, clearing subscription data...');
      // Clear data when user logs out
      setUserPlan(null);
      setUsageStats(null);
      setSubscriptionHistory(null);
      setError(null);
    }
  }, [isAuthenticated, user, refreshUserPlan, refreshUsageStats, refreshSubscriptionHistory]);

  // Auto-refresh usage stats every 5 minutes
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const interval = setInterval(() => {
      refreshUsageStats();
    }, 5 * 60 * 1000); // 5 minutes

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
    updatePlan
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};