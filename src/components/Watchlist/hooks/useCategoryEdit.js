import { useCallback } from 'react';
import { handleApiError } from '../../../utils/errorHandler';
import { Analytics } from '../../../utils/analytics';
import { useTranslation } from 'react-i18next';

export const useCategoryEdit = (watchlistService, showToast, { setCategories, setLoading }) => {
    const { t } = useTranslation();

    const handleOperationError = useCallback((error, operation) => {
        console.log('handleOperationError 收到的錯誤:', error);

        if (error.data?.message) {
            showToast(error.data.message, 'error');
            return;
        }

        const errorData = handleApiError(error, showToast, t);
    }, [showToast, t]);

    const loadCategories = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const data = await watchlistService.getCategories();
            setCategories(data);
            return data;
        } catch (error) {
            handleOperationError(error, 'load_categories');
            return [];
        } finally {
            if (!silent) setLoading(false);
        }
    }, [handleOperationError, watchlistService, setCategories, setLoading]);

    const createCategory = async (name) => {
        try {
            setLoading(true);
            const result = await watchlistService.createCategory(name);

            const newCategory = {
                ...result.category,
                stocks: []
            };

            setCategories(prevCategories => [...prevCategories, newCategory]);

            showToast(t('watchlist.category.createSuccess'), 'success');
            Analytics.watchlist.createCategory({ categoryName: name });

            return result.category;
        } catch (error) {
            console.error('Create category error:', error);

            if (error.data?.code === 'CATEGORY_LIMIT_EXCEEDED') {
                Analytics.watchlist.limitError({
                    type: 'category_limit',
                    currentCount: error.data?.currentCount,
                    maxLimit: error.data?.maxLimit
                });
            }

            handleOperationError(error, 'create_category');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const updateCategory = async (categoryId, name) => {
        try {
            await watchlistService.updateCategory(categoryId, name);
            await loadCategories();
            showToast(t('watchlist.category.updateSuccess'), 'success');
        } catch (error) {
            handleOperationError(error, 'update_category');
            throw error;
        }
    };

    const deleteCategory = async (categoryId) => {
        try {
            if (!window.confirm(t('watchlist.category.deleteConfirm'))) {
                return false;
            }

            await watchlistService.deleteCategory(categoryId);
            const updatedCategories = await loadCategories();
            showToast(t('watchlist.category.deleteSuccess'), 'success');

            Analytics.watchlist.categoryDelete({
                categoryId,
                component: 'WatchlistContainer',
                action: 'delete_category'
            });

            return {
                success: true,
                updatedCategories
            };
        } catch (error) {
            handleOperationError(error, 'delete_category');
            return { success: false };
        }
    };

    /**
     * 重新排序分類
     * @param {Array<{id: string, sortOrder: number}>} orders - 排序資料
     */
    const reorderCategories = useCallback(async (orders) => {
        try {
            // 樂觀更新 - 先更新本地狀態
            setCategories(prevCategories => {
                const categoryMap = new Map(prevCategories.map(cat => [cat.id, cat]));
                return orders
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map(order => categoryMap.get(order.id))
                    .filter(Boolean);
            });

            // 發送 API 請求
            await watchlistService.reorderCategories(orders);

            Analytics.watchlist.reorderCategories({
                count: orders.length,
                component: 'CategoryManagerDialog'
            });
        } catch (error) {
            // 失敗時回滾 - 重新載入分類
            console.error('Reorder categories failed:', error);
            await loadCategories();
            handleOperationError(error, 'reorder_categories');
        }
    }, [watchlistService, setCategories, loadCategories, handleOperationError]);

    return {
        loadCategories,
        createCategory,
        updateCategory,
        deleteCategory,
        reorderCategories
    };
}; 