import enhancedApiClient from '../utils/enhancedApiClient';
import csrfClient from '../utils/csrfClient';

// 調試用：檢查 CSRF token 狀態
const debugCSRFStatus = () => {
  console.log('🔐 CSRF Debug Info:', {
    isInitialized: csrfClient.isTokenInitialized(),
    hasToken: !!csrfClient.getCSRFToken(),
    tokenLength: csrfClient.getCSRFToken()?.length || 0
  });
};

class SubscriptionService {
  /**
   * Get user's current plan information
   */
  async getUserPlan() {
    try {
      // 從 auth status API 獲取用戶方案資訊
      const response = await enhancedApiClient.get('/api/auth/status');

      if (response.data.status === 'success' && response.data.data.isAuthenticated) {
        const user = response.data.data.user;
        return {
          type: user.plan || 'free',
          startDate: new Date(), // TODO: 從後端獲取實際開始日期
          endDate: user.plan === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天後
          status: 'active',
          autoRenew: user.plan !== 'free'
        };
      }

      // 如果未認證，返回免費方案
      return {
        type: 'free',
        startDate: new Date(),
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
      // 使用真實的 API 獲取用量統計
      const response = await enhancedApiClient.get('/api/auth/usage-stats');

      console.log('📊 API Response:', response.data);
      console.log('📊 Response status:', response.data.status);
      console.log('📊 Response data:', response.data.data);

      if (response.data.status === 'success') {
        const stats = response.data.data;
        console.log('📊 Usage stats from API:', stats);
        return stats;
      } else {
        throw new Error(response.data.message || 'Failed to get usage stats');
      }
    } catch (error) {
      console.error('❌ Failed to get usage stats:', error);

      // 拋出錯誤，讓 SubscriptionContext 處理
      throw error;
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
  async updateUserPlan(newPlanType, paymentResult = null) {
    try {
      console.log(`Updating plan to: ${newPlanType}`);
      debugCSRFStatus();

      // 確保 CSRF token 已初始化
      if (!csrfClient.isTokenInitialized()) {
        console.log('CSRF token not initialized, attempting to initialize...');
        try {
          await csrfClient.initializeCSRFToken();
          console.log('CSRF token initialized successfully');
        } catch (csrfError) {
          console.error('Failed to initialize CSRF token:', csrfError);
          throw new Error('Authentication required. Please refresh the page and try again.');
        }
      }

      // 使用 csrfClient 進行 CSRF 保護的 PUT 請求
      const requestData = {
        planType: newPlanType,
        paymentResult: paymentResult // 保留未來付款結果的參數
      };
      
      console.log('📤 Sending request data:', requestData);
      
      const response = await csrfClient.put('/api/auth/plan', requestData);

      console.log('Plan update response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      // csrfClient 返回的是 fetch Response，需要解析 JSON
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.warn('Could not parse error response as JSON:', parseError);
        }

        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error('Plan update failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Plan update response data:', data);

      if (data.status === 'success') {
        const updatedUser = data.data.user;
        const planChange = data.data.planChange;

        console.log('Plan updated successfully:', {
          from: planChange.from,
          to: planChange.to,
          user: updatedUser
        });

        return {
          type: updatedUser.plan,
          startDate: new Date(),
          endDate: updatedUser.plan === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
          autoRenew: updatedUser.plan !== 'free'
        };
      } else {
        throw new Error(data.message || 'Failed to update plan');
      }
    } catch (error) {
      console.error('Failed to update plan:', error);
      debugCSRFStatus(); // 錯誤時也顯示 CSRF 狀態
      throw new Error(error.message || 'Failed to update plan');
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