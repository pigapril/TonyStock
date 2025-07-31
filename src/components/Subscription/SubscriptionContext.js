import React, { createContext, useContext, useState, useEffect } from 'react';
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
  const refreshUsageStats = async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const stats = await subscriptionService.getUserUsageStats();
      setUsageStats(stats);
      
      Analytics.track('subscription_usage_stats_loaded', {
        userId: user.id,
        totalUsage: stats?.total || 0
      });
    } catch (err) {
      console.error('Failed to refresh usage stats:', err);
      // 在開發階段，不要顯示錯誤給用戶，因為我們使用 mock 資料
      if (process.env.NODE_ENV === 'development') {
        console.warn('Using mock data for usage stats in development mode');
      } else {
        setError(err.message || 'Failed to load usage statistics');
        
        Analytics.error({
          type: 'SUBSCRIPTION_ERROR',
          code: err.code || 500,
          message: err.message || 'Failed to load usage statistics',
          context: 'refreshUsageStats'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Refresh user plan information
  const refreshUserPlan = async () => {
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
  };

  // Refresh subscription history
  const refreshSubscriptionHistory = async () => {
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
  };

  // Update user plan
  const updatePlan = async (newPlanType) => {
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
  };

  // Load initial data when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshUserPlan();
      refreshUsageStats();
      refreshSubscriptionHistory();
    } else {
      // Clear data when user logs out
      setUserPlan(null);
      setUsageStats(null);
      setSubscriptionHistory(null);
      setError(null);
    }
  }, [isAuthenticated, user]);

  // Auto-refresh usage stats every 5 minutes
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const interval = setInterval(() => {
      refreshUsageStats();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

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