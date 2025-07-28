/**
 * Subscription API Service with Performance Optimization
 * 
 * Handles all subscription-related API calls including user plans,
 * usage statistics, and subscription history with intelligent caching.
 */

import subscriptionCache, { withCache, optimisticUpdate } from './subscriptionCache';

const API_BASE = process.env.REACT_APP_API_BASE || '';

/**
 * Base API call function with error handling
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<object>} API response
 */
const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'include', // Include cookies for authentication
      ...options
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    throw error;
  }
};

/**
 * Subscription API service class with caching
 */
class SubscriptionApiService {
  /**
   * Get user's current plan information (cached)
   * @param {string} userId - User ID for cache key
   * @returns {Promise<object>} User plan data
   */
  static async getUserPlan(userId = 'current') {
    const cachedGetUserPlan = withCache(
      async () => {
        const response = await apiCall('/api/user/plan');
        return response.data || response;
      },
      userId,
      'userPlan'
    );
    
    try {
      return await cachedGetUserPlan();
    } catch (error) {
      console.warn('Failed to fetch user plan from API:', error.message);
      throw error;
    }
  }

  /**
   * Update user's plan with optimistic updates
   * @param {string} planType - New plan type (free, pro, ultra)
   * @param {string} userId - User ID for cache key
   * @returns {Promise<object>} Updated plan data
   */
  static async updateUserPlan(planType, userId = 'current') {
    // Get current data for rollback
    const currentData = subscriptionCache.get(userId, 'userPlan');
    
    // Optimistic update
    const rollback = optimisticUpdate(
      userId,
      'userPlan',
      (data) => ({ ...data, plan: planType }),
      currentData
    );
    
    try {
      const response = await apiCall('/api/user/plan', {
        method: 'PUT',
        body: JSON.stringify({ plan: planType })
      });
      
      const updatedData = response.data || response;
      
      // Update cache with real data
      subscriptionCache.set(userId, updatedData, 'userPlan');
      
      // Invalidate related caches
      subscriptionCache.invalidateType('usageStats');
      
      return updatedData;
    } catch (error) {
      // Rollback optimistic update on error
      rollback();
      console.warn('Failed to update user plan via API:', error.message);
      throw error;
    }
  }

  /**
   * Get user's usage statistics (cached with short TTL)
   * @param {string} userId - User ID for cache key
   * @returns {Promise<object>} Usage statistics data
   */
  static async getUsageStats(userId = 'current') {
    const cachedGetUsageStats = withCache(
      async () => {
        const response = await apiCall('/api/user/usage-stats');
        return response.data || response;
      },
      userId,
      'usageStats'
    );
    
    try {
      return await cachedGetUsageStats();
    } catch (error) {
      console.warn('Failed to fetch usage stats from API:', error.message);
      throw error;
    }
  }

  /**
   * Get user's subscription history (cached with longer TTL)
   * @param {string} userId - User ID for cache key
   * @returns {Promise<array>} Subscription history records
   */
  static async getSubscriptionHistory(userId = 'current') {
    const cachedGetSubscriptionHistory = withCache(
      async () => {
        const response = await apiCall('/api/user/subscription-history');
        return response.data || response;
      },
      userId,
      'subscriptionHistory'
    );
    
    try {
      return await cachedGetSubscriptionHistory();
    } catch (error) {
      console.warn('Failed to fetch subscription history from API:', error.message);
      throw error;
    }
  }

  /**
   * Get plan configuration and limits
   * @param {string} planType - Plan type to get config for
   * @returns {Promise<object>} Plan configuration
   */
  static async getPlanConfig(planType = 'free') {
    try {
      const response = await apiCall(`/api/plans/config/${planType}`);
      return response.data || response;
    } catch (error) {
      console.warn('Failed to fetch plan config from API:', error.message);
      throw error;
    }
  }

  /**
   * Get all available plans for comparison (cached with long TTL)
   * @returns {Promise<object>} All plans comparison data
   */
  static async getAllPlans() {
    const cachedGetAllPlans = withCache(
      async () => {
        const response = await apiCall('/api/plans/comparison');
        return response.data || response;
      },
      'all',
      'planComparison'
    );
    
    try {
      return await cachedGetAllPlans();
    } catch (error) {
      console.warn('Failed to fetch plans comparison from API:', error.message);
      throw error;
    }
  }

  /**
   * Check current usage for a specific feature
   * @param {string} featureType - Feature type (api, priceAnalysis, etc.)
   * @param {string} period - Period (daily, monthly)
   * @returns {Promise<object>} Current usage data
   */
  static async getCurrentUsage(featureType, period = 'daily') {
    try {
      const response = await apiCall(`/api/user/usage/${featureType}/${period}`);
      return response.data || response;
    } catch (error) {
      console.warn('Failed to fetch current usage from API:', error.message);
      throw error;
    }
  }

  /**
   * Reset usage statistics (admin function)
   * @param {string} userId - User ID to reset usage for
   * @param {string} featureType - Feature type to reset
   * @returns {Promise<object>} Reset confirmation
   */
  static async resetUsage(userId, featureType) {
    try {
      const response = await apiCall('/api/admin/usage/reset', {
        method: 'POST',
        body: JSON.stringify({ userId, featureType })
      });
      return response.data || response;
    } catch (error) {
      console.warn('Failed to reset usage via API:', error.message);
      throw error;
    }
  }
}

export default SubscriptionApiService;