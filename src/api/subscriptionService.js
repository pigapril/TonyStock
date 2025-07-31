import apiClient from './apiClient';

class SubscriptionService {
  /**
   * Get user's current plan information
   */
  async getUserPlan() {
    try {
      // 暫時使用 mock 資料，避免 API 錯誤
      // TODO: 當後端 API 準備好時，取消註解下面的程式碼
      /*
      const response = await apiClient.get('/api/auth/profile');
      return {
        type: response.data.plan || 'free',
        startDate: response.data.planStartDate ? new Date(response.data.planStartDate) : new Date(),
        endDate: response.data.planEndDate ? new Date(response.data.planEndDate) : null,
        status: response.data.planStatus || 'active',
        autoRenew: response.data.autoRenew || false
      };
      */
      
      // Mock 資料 - 開發階段使用
      return {
        type: 'free',
        startDate: new Date('2025-01-01'),
        endDate: null,
        status: 'active',
        autoRenew: false
      };
    } catch (error) {
      console.error('Failed to get user plan:', error);
      // 返回預設的免費方案，而不是拋出錯誤
      return {
        type: 'free',
        startDate: new Date(),
        endDate: null,
        status: 'active',
        autoRenew: false
      };
    }
  }

  /**
   * Get user's usage statistics
   */
  async getUserUsageStats() {
    try {
      // 暫時使用 mock 資料，避免 API 錯誤
      // TODO: 當後端 usage stats API 準備好時，取消註解下面的程式碼
      /*
      const response = await apiClient.get('/api/auth/status');
      const user = response.data.data.user;
      */
      
      // Mock 資料 - 開發階段使用
      const mockUsageStats = {
        daily: {
          lohasSpectrum: { used: 2, limit: 5, resetTime: this.getNextDayReset() },
          marketSentiment: { used: 1, limit: 2, resetTime: this.getNextDayReset() },
          watchlist: { used: 0, limit: 0, resetTime: this.getNextDayReset() }
        },
        monthly: {
          lohasSpectrum: { used: 15, limit: 5, resetTime: this.getNextMonthReset() },
          marketSentiment: { used: 8, limit: 2, resetTime: this.getNextMonthReset() },
          watchlist: { used: 0, limit: 0, resetTime: this.getNextMonthReset() }
        }
      };

      return mockUsageStats;
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      // 返回預設的使用統計，而不是拋出錯誤
      return {
        daily: {
          lohasSpectrum: { used: 0, limit: 5, resetTime: this.getNextDayReset() },
          marketSentiment: { used: 0, limit: 2, resetTime: this.getNextDayReset() },
          watchlist: { used: 0, limit: 0, resetTime: this.getNextDayReset() }
        },
        monthly: {
          lohasSpectrum: { used: 0, limit: 5, resetTime: this.getNextMonthReset() },
          marketSentiment: { used: 0, limit: 2, resetTime: this.getNextMonthReset() },
          watchlist: { used: 0, limit: 0, resetTime: this.getNextMonthReset() }
        }
      };
    }
  }

  /**
   * Get user's subscription history
   */
  async getSubscriptionHistory() {
    try {
      // 暫時使用 mock 資料，避免 API 錯誤
      // TODO: 當後端 subscription history API 準備好時，實作真正的 API 呼叫
      
      // Mock 資料 - 開發階段使用
      const mockHistory = [
        {
          id: '1',
          date: new Date('2025-01-01'),
          action: 'upgrade',
          fromPlan: 'free',
          toPlan: 'pro',
          amount: 299,
          status: 'completed'
        }
      ];

      return mockHistory;
    } catch (error) {
      console.error('Failed to get subscription history:', error);
      // 返回空的歷史記錄，而不是拋出錯誤
      return [];
    }
  }

  /**
   * Update user's plan
   */
  async updateUserPlan(newPlanType) {
    try {
      // For now, this is a mock implementation
      // In the future, this should integrate with payment processing
      console.log(`Updating plan to: ${newPlanType}`);
      
      // Mock successful plan update
      return {
        type: newPlanType,
        startDate: new Date(),
        endDate: newPlanType === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'active',
        autoRenew: newPlanType !== 'free'
      };
    } catch (error) {
      console.error('Failed to update plan:', error);
      throw new Error(error.response?.data?.message || 'Failed to update plan');
    }
  }

  /**
   * Get available subscription plans
   */
  getAvailablePlans() {
    return [
      {
        id: 'free',
        name: 'Free',
        price: { monthly: 0, yearly: 0 },
        currency: 'TWD',
        features: {
          lohasSpectrum: { limit: 5, description: 'Limited to 0050 & SPY stocks' },
          marketSentiment: { limit: 2, description: 'Basic access only' },
          watchlist: { limit: 0, description: 'Disabled' },
          ads: true
        },
        popular: false
      },
      {
        id: 'pro',
        name: 'Pro',
        price: { monthly: 299, yearly: 2990 },
        currency: 'TWD',
        features: {
          lohasSpectrum: { limit: -1, description: 'Unlimited, all stocks, custom date ranges' },
          marketSentiment: { limit: -1, description: 'Unlimited, full component & historical access' },
          watchlist: { limit: -1, description: 'Enabled, 5 categories, unlimited stocks per category' },
          ads: false
        },
        popular: true
      }
    ];
  }

  /**
   * Helper method to get next day reset time
   */
  getNextDayReset() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Helper method to get next month reset time
   */
  getNextMonthReset() {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth;
  }

  /**
   * Check if a feature is enabled for the current plan
   */
  isFeatureEnabled(planType, featureType) {
    const plans = this.getAvailablePlans();
    const plan = plans.find(p => p.id === planType);
    if (!plan) return false;
    
    const feature = plan.features[featureType];
    return feature && feature.limit !== 0;
  }

  /**
   * Get feature limit for a plan
   */
  getFeatureLimit(planType, featureType) {
    const plans = this.getAvailablePlans();
    const plan = plans.find(p => p.id === planType);
    if (!plan) return 0;
    
    const feature = plan.features[featureType];
    return feature ? feature.limit : 0;
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;