/**
 * Plans Service
 * 
 * 前端方案定價服務
 * 提供統一的定價資料獲取介面
 */

import { apiClient } from './apiClient';

class PlansService {
    constructor() {
        this.cache = null;
        this.cacheTimestamp = null;
        this.CACHE_DURATION = 30 * 60 * 1000; // 30分鐘快取
    }

    /**
     * 獲取所有方案的定價資訊
     * @param {Object} options - 選項
     * @param {boolean} options.includeMetadata - 是否包含詳細元數據
     * @param {boolean} options.forceRefresh - 是否強制重新獲取
     * @returns {Promise<Object>} 定價資訊
     */
    async getPricingData(options = {}) {
        const { includeMetadata = false, forceRefresh = false } = options;

        // 檢查快取（除非強制重新整理）
        if (!forceRefresh && this.cache && this.isCacheValid()) {
            console.log('🔄 PlansService: 使用快取的定價資料');
            return this.cache;
        }

        try {
            console.log('🌐 PlansService: 從 API 獲取定價資料', { includeMetadata });

            const params = new URLSearchParams();
            if (includeMetadata) {
                params.append('metadata', 'true');
            }

            const response = await apiClient.get(`/api/plans/pricing?${params.toString()}`);

            if (response.data.success) {
                // 更新快取
                this.cache = response.data.data;
                this.cacheTimestamp = Date.now();

                console.log('✅ PlansService: 定價資料獲取成功', {
                    plansCount: Object.keys(this.cache.plans || {}).length,
                    currency: this.cache.currency,
                    cached: true
                });

                return this.cache;
            } else {
                throw new Error('API 回應指示失敗');
            }

        } catch (error) {
            console.error('❌ PlansService: 獲取定價資料失敗', error);

            // 如果有快取資料，使用快取作為 fallback
            if (this.cache) {
                console.warn('⚠️ PlansService: 使用過期快取作為 fallback');
                return this.cache;
            }

            // 使用硬編碼的 fallback 資料
            return this.getFallbackPricingData();
        }
    }

    /**
     * 獲取特定方案的定價資訊
     * @param {string} planType - 方案類型 (free, pro)
     * @param {Object} options - 選項
     * @returns {Promise<Object|null>} 方案定價資訊
     */
    async getPlanPricing(planType, options = {}) {
        try {
            console.log('🔍 PlansService: 獲取特定方案定價', { planType });

            const params = new URLSearchParams();
            params.append('plan', planType);

            const response = await apiClient.get(`/api/plans/pricing?${params.toString()}`);

            if (response.data.success) {
                console.log('✅ PlansService: 特定方案定價獲取成功', { planType });
                return response.data.data.plan;
            } else {
                throw new Error('API 回應指示失敗');
            }

        } catch (error) {
            console.error('❌ PlansService: 獲取特定方案定價失敗', { planType, error });

            // 嘗試從完整資料中提取
            try {
                const allPricing = await this.getPricingData(options);
                return allPricing.plans[planType] || null;
            } catch (fallbackError) {
                console.error('❌ PlansService: Fallback 也失敗', fallbackError);
                return null;
            }
        }
    }

    /**
     * 檢查快取是否仍然有效
     * @returns {boolean} 快取是否有效
     */
    isCacheValid() {
        if (!this.cacheTimestamp) {
            return false;
        }

        const now = Date.now();
        const isValid = (now - this.cacheTimestamp) < this.CACHE_DURATION;

        if (!isValid) {
            console.log('⏰ PlansService: 快取已過期', {
                cacheAge: now - this.cacheTimestamp,
                maxAge: this.CACHE_DURATION
            });
        }

        return isValid;
    }

    /**
     * 手動清除快取
     */
    clearCache() {
        console.log('🗑️ PlansService: 手動清除快取');
        this.cache = null;
        this.cacheTimestamp = null;
    }

    /**
     * 獲取 fallback 定價資料
     * 當 API 請求失敗時使用
     * @returns {Object} 基本定價資料
     */
    getFallbackPricingData() {
        console.warn('⚠️ PlansService: 使用 fallback 定價資料');

        return {
            plans: {
                free: {
                    name: "免費方案",
                    description: "基本功能，含廣告",
                    pricing: {
                        monthly: 0,
                        yearly: 0,
                        currency: "TWD"
                    },
                    features: {
                        ads: true,
                        lohasSpectrum: true,
                        marketSentiment: false,
                        watchlist: false
                    }
                },
                pro: {
                    name: "專業方案",
                    description: "無廣告，完整功能",
                    pricing: {
                        monthly: 599,
                        yearly: 5990,
                        currency: "TWD"
                    },
                    features: {
                        ads: false,
                        lohasSpectrum: true,
                        marketSentiment: true,
                        watchlist: true
                    }
                }
            },
            currency: "TWD",
            lastUpdated: new Date().toISOString(),
            fallback: true
        };
    }

    /**
     * 獲取服務健康狀態
     * @returns {Promise<Object>} 健康狀態資訊
     */
    async getHealthStatus() {
        try {
            const response = await apiClient.get('/api/plans/health');
            return response.data;
        } catch (error) {
            console.error('❌ PlansService: 健康檢查失敗', error);
            return {
                success: false,
                data: {
                    service: 'plans',
                    status: 'unhealthy',
                    error: error.message
                }
            };
        }
    }

    /**
     * 獲取快取狀態資訊
     * @returns {Object} 快取狀態
     */
    getCacheStatus() {
        return {
            cached: !!this.cache,
            valid: this.isCacheValid(),
            age: this.cacheTimestamp ? Date.now() - this.cacheTimestamp : null,
            maxAge: this.CACHE_DURATION,
            lastUpdated: this.cacheTimestamp ? new Date(this.cacheTimestamp).toISOString() : null
        };
    }
}

// 創建單例實例
const plansService = new PlansService();

export default plansService;