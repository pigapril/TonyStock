import enhancedApiClient from '../utils/enhancedApiClient';
import csrfClient from '../utils/csrfClient';
import { systemLogger } from '../utils/logger';

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
      console.log('🔄 Getting user plan from subscription API...');

      // 首先嘗試從訂閱 API 獲取詳細的訂閱信息
      try {
        const subscriptionResponse = await enhancedApiClient.get('/api/subscription/current');

        console.log('📊 Subscription API response:', subscriptionResponse.data);

        if (subscriptionResponse.data.status === 'success' && subscriptionResponse.data.data.subscription) {
          const subscription = subscriptionResponse.data.data.subscription;

          console.log('📊 Found active subscription:', {
            id: subscription.id,
            planType: subscription.planType,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            currentPeriodEnd: subscription.currentPeriodEnd
          });

          // 將後端的訂閱數據映射到前端期望的格式
          return {
            type: subscription.planType,
            startDate: subscription.startDate ? new Date(subscription.startDate) : null,
            endDate: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null,
            status: subscription.status, // 保留原始狀態供參考
            autoRenew: subscription.autoRenew,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            cancelledAt: subscription.cancelledAt ? new Date(subscription.cancelledAt) : null,
            // ✅ 優先使用這些經過時間驗證的欄位
            isActive: subscription.isActive, // 後端已進行時間比對
            isExpired: subscription.isExpired, // 後端已進行時間比對
            isCancelled: subscription.isCancelled,
            willCancelAtPeriodEnd: subscription.willCancelAtPeriodEnd,
            daysUntilExpiry: subscription.daysUntilExpiry,
            // 添加額外的訂閱信息
            subscriptionId: subscription.id,
            currentPeriodStart: subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart) : null
          };
        }
      } catch (subscriptionError) {
        console.warn('⚠️ Failed to get subscription details, falling back to auth status:', subscriptionError.message);
      }

      // 如果沒有找到訂閱記錄，從 auth status API 獲取基本用戶方案資訊
      const response = await enhancedApiClient.get('/api/auth/status');

      if (response.data.status === 'success' && response.data.data.isAuthenticated) {
        const user = response.data.data.user;

        console.log('📊 Fallback to user plan from auth status:', user.plan);

        return {
          type: user.plan || 'free',
          // 沒有訂閱記錄時，方案起始日就是註冊日；拿不到就不顯示，不要用當下時間充數
          startDate: user.createdAt ? new Date(user.createdAt) : null,
          endDate: user.plan === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
          autoRenew: user.plan !== 'free',
          cancelAtPeriodEnd: false, // 默認值
          cancelledAt: null
        };
      }

      // 如果未認證，返回免費方案
      console.log('📊 User not authenticated, returning free plan');
      return {
        type: 'free',
        startDate: null,
        endDate: null,
        status: 'active',
        autoRenew: false,
        cancelAtPeriodEnd: false,
        cancelledAt: null
      };
    } catch (error) {
      console.error('❌ Failed to get user plan:', error);
      // 返回預設的免費方案，而不是拋出錯誤
      return {
        type: 'free',
        startDate: null,
        endDate: null,
        status: 'active',
        autoRenew: false,
        cancelAtPeriodEnd: false,
        cancelledAt: null
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
      systemLogger.info('Getting subscription history from API');

      // 呼叫真實的後端 API
      const response = await enhancedApiClient.get('/api/subscription/history');

      systemLogger.info('Subscription history API response:', response);

      // 添加詳細的響應日誌
      console.log('🔍 Full API response:', response);
      console.log('🔍 Response data:', response.data);
      console.log('🔍 Response data.data:', response.data?.data);
      console.log('🔍 Subscriptions array:', response.data?.data?.subscriptions);

      // 處理 API 響應資料
      let historyData = [];
      if (Array.isArray(response)) {
        historyData = response;
      } else if (response && Array.isArray(response.subscriptions)) {
        historyData = response.subscriptions;
      } else if (response && response.data && Array.isArray(response.data.subscriptions)) {
        historyData = response.data.subscriptions;
      } else if (response && response.data && response.data.data && Array.isArray(response.data.data.subscriptions)) {
        // 修復：正確的響應結構是 response.data.data.subscriptions
        historyData = response.data.data.subscriptions;
      }

      console.log('🔍 Extracted historyData:', historyData);

      // 格式化訂閱歷史資料以符合組件需求
      const formattedHistory = historyData.map(subscription => {
        // ✅ 使用 isActive 和 isExpired 判斷有效狀態（考慮時間因素）
        const isActiveNow = subscription.isActive && !subscription.isExpired;
        
        // 判斷動作類型
        let action = 'renewal';
        if (subscription.planType === 'pro' && isActiveNow) {
          action = 'upgrade';
        } else if (subscription.planType === 'free') {
          action = 'downgrade';
        } else if (subscription.status === 'cancelled' || subscription.isCancelled) {
          action = 'cancellation';
        }

        return {
          id: subscription.id,
          date: subscription.createdAt || subscription.currentPeriodStart,
          action: action,
          fromPlan: subscription.previousPlanType || 'free',
          toPlan: subscription.planType,
          amount: subscription.amount || (subscription.planType === 'pro' ? 299 : 0),
          // ✅ 使用計算後的有效狀態
          status: isActiveNow ? 'completed' : (subscription.isExpired ? 'expired' : subscription.status),
          planType: subscription.planType,
          billingPeriod: subscription.billingPeriod || 'monthly',
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          // 保留時間驗證欄位供前端使用
          isActive: subscription.isActive,
          isExpired: subscription.isExpired
        };
      });

      systemLogger.info('Subscription history loaded:', {
        historyCount: formattedHistory.length
      });

      return formattedHistory;

    } catch (error) {
      systemLogger.error('Failed to get subscription history:', {
        error: error.message
      });

      // 在開發環境下提供 fallback 資料，生產環境返回空陣列
      if (process.env.NODE_ENV === 'development') {
        const fallbackHistory = [
          {
            id: 'dev-1',
            date: new Date('2025-01-01'),
            action: 'upgrade',
            fromPlan: 'free',
            toPlan: 'pro',
            amount: 299,
            status: 'completed',
            planType: 'pro',
            billingPeriod: 'monthly'
          }
        ];
        return fallbackHistory;
      }

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
   * Get available subscription plans from API (新的 Source of Truth 方法)
   */
  async getAvailablePlansFromAPI() {
    try {
      console.log('🌐 SubscriptionService: 從 Plans API 獲取方案資料');

      const response = await enhancedApiClient.get('/api/plans/pricing');

      if (response.data.success && response.data.data.plans) {
        const apiPlans = response.data.data.plans;

        console.log('✅ SubscriptionService: API 方案資料獲取成功', {
          plansCount: Object.keys(apiPlans).length,
          currency: response.data.data.currency
        });

        // 將 API 資料轉換為前端期望的格式
        const formattedPlans = Object.keys(apiPlans).map(planId => {
          const apiPlan = apiPlans[planId];

          return {
            id: planId,
            name: apiPlan.name,
            price: {
              monthly: apiPlan.pricing.monthly,
              yearly: apiPlan.pricing.yearly
            },
            displayPrice: { monthly: '$---', yearly: '$---' },
            showRealPrice: true, // 從 API 獲取時預設顯示真實價格
            currency: apiPlan.pricing.currency,
            features: this.mapAPIFeaturesToLegacyFormat(apiPlan.features, planId),
            popular: planId === 'pro' // Pro 方案標記為熱門
          };
        });

        console.log('🔄 SubscriptionService: 方案資料格式化完成', formattedPlans);
        return formattedPlans;

      } else {
        throw new Error('API 回應格式不正確');
      }

    } catch (error) {
      console.error('❌ SubscriptionService: 從 API 獲取方案失敗，使用 fallback', error);

      // 使用 fallback 方案資料
      return this.getAvailablePlans();
    }
  }

  /**
   * 將 API 功能格式轉換為舊版格式
   * @param {Object} apiFeatures - API 回傳的功能物件
   * @param {string} planId - 方案 ID
   * @returns {Object} 舊版格式的功能物件
   */
  mapAPIFeaturesToLegacyFormat(apiFeatures, planId) {
    if (planId === 'free') {
      return {
        lohasSpectrum: { limit: 5, description: 'Limited to 0050 & SPY stocks' },
        marketSentiment: { limit: 2, description: 'Basic access only' },
        watchlist: { limit: 0, description: 'Disabled' },
        ads: apiFeatures.ads || true
      };
    } else if (planId === 'pro') {
      return {
        lohasSpectrum: { limit: -1, description: 'Unlimited, all stocks, custom date ranges' },
        marketSentiment: { limit: -1, description: 'Unlimited, full component & historical access' },
        watchlist: { limit: -1, description: 'Enabled, 5 categories, unlimited stocks per category' },
        ads: apiFeatures.ads || false
      };
    }

    // 預設格式
    return {
      lohasSpectrum: { limit: 0, description: 'Unknown' },
      marketSentiment: { limit: 0, description: 'Unknown' },
      watchlist: { limit: 0, description: 'Unknown' },
      ads: true
    };
  }

  /**
   * Get available subscription plans (同步 fallback 方法)
   * 保留原有的同步方法作為 fallback
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
        price: { monthly: 599, yearly: 5990 }, // 這些將被 API 資料覆蓋
        displayPrice: { monthly: '$---', yearly: '$---' },
        showRealPrice: true,
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
   * Cancel user's subscription
   */
  async cancelSubscription(options = {}) {
    try {
      console.log('Cancelling subscription with options:', options);
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

      const requestData = {
        cancelAtPeriodEnd: options.cancelAtPeriodEnd !== false, // 預設為 true
        reason: options.reason || 'user_requested'
      };

      console.log('📤 Sending cancel request:', requestData);

      const response = await csrfClient.post('/api/subscription/cancel', requestData);

      console.log('Cancel subscription response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.warn('Could not parse error response as JSON:', parseError);
        }

        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error('Cancel subscription failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Cancel subscription response data:', data);

      if (data.status === 'success') {
        systemLogger.info('Subscription cancelled successfully:', {
          subscriptionId: data.data?.subscription?.id,
          cancelAtPeriodEnd: data.data?.subscription?.cancelAtPeriodEnd,
          currentPeriodEnd: data.data?.subscription?.currentPeriodEnd,
          ecpayResult: data.data?.ecpayResult
        });

        return {
          success: true,
          subscription: data.data.subscription,
          ecpayResult: data.data.ecpayResult,
          message: data.message || '訂閱已成功取消'
        };
      } else {
        throw new Error(data.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      systemLogger.error('Cancel subscription error:', {
        error: error.message
      });
      throw new Error(error.message || 'Failed to cancel subscription');
    }
  }

  /**
   * Check if a feature is enabled for the current plan
   */
  isFeatureEnabled(planType, featureType) {
    // 检查临时免费模式
    const isTemporaryFreeMode = process.env.REACT_APP_TEMPORARY_FREE_MODE === 'true';
    if (isTemporaryFreeMode) {
      console.log('🎁 TEMPORARY_FREE_MODE enabled: granting access to', featureType);
      return true;
    }

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