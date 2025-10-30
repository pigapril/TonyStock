import { useState, useEffect, useCallback } from 'react';
import plansService from '../services/plansService';

/**
 * usePricing Hook
 * 
 * 提供方案定價資料的 React Hook
 * 整合快取和錯誤處理
 */
export const usePricing = (options = {}) => {
    const { 
        includeMetadata = false, 
        autoLoad = true,
        planType = null 
    } = options;

    const [pricingData, setPricingData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    /**
     * 載入定價資料
     */
    const loadPricingData = useCallback(async (forceRefresh = false) => {
        try {
            setLoading(true);
            setError(null);

            let data;
            if (planType) {
                // 獲取特定方案
                const planData = await plansService.getPlanPricing(planType, { includeMetadata });
                data = {
                    plan: planData,
                    currency: "TWD",
                    lastUpdated: new Date().toISOString()
                };
            } else {
                // 獲取所有方案
                data = await plansService.getPricingData({ includeMetadata, forceRefresh });
            }

            setPricingData(data);
            setLastUpdated(new Date().toISOString());

            console.log('✅ usePricing: 定價資料載入成功', {
                planType: planType || 'all',
                includeMetadata,
                forceRefresh,
                plansCount: planType ? 1 : Object.keys(data.plans || {}).length
            });

        } catch (err) {
            console.error('❌ usePricing: 定價資料載入失敗', err);
            setError(err.message || '載入定價資料失敗');
        } finally {
            setLoading(false);
        }
    }, [planType, includeMetadata]);

    /**
     * 重新整理定價資料
     */
    const refresh = useCallback(() => {
        return loadPricingData(true);
    }, [loadPricingData]);

    /**
     * 清除快取並重新載入
     */
    const clearCacheAndReload = useCallback(() => {
        plansService.clearCache();
        return loadPricingData(true);
    }, [loadPricingData]);

    // 自動載入
    useEffect(() => {
        if (autoLoad) {
            loadPricingData();
        }
    }, [autoLoad, loadPricingData]);

    /**
     * 獲取特定方案的定價資訊
     */
    const getPlanData = useCallback((targetPlanType) => {
        if (!pricingData) return null;

        if (planType && planType === targetPlanType) {
            return pricingData.plan;
        }

        return pricingData.plans?.[targetPlanType] || null;
    }, [pricingData, planType]);

    /**
     * 檢查是否有定價資料
     */
    const hasPricingData = Boolean(pricingData);

    /**
     * 獲取快取狀態
     */
    const cacheStatus = plansService.getCacheStatus();

    return {
        // 資料
        pricingData,
        loading,
        error,
        lastUpdated,
        hasPricingData,
        cacheStatus,

        // 方法
        loadPricingData,
        refresh,
        clearCacheAndReload,
        getPlanData,

        // 便利屬性
        isLoading: loading,
        hasError: Boolean(error),
        isEmpty: !loading && !pricingData
    };
};

/**
 * usePlanPricing Hook
 * 
 * 專門用於獲取特定方案定價的簡化 Hook
 */
export const usePlanPricing = (planType, options = {}) => {
    return usePricing({
        ...options,
        planType,
        autoLoad: Boolean(planType)
    });
};

export default usePricing;