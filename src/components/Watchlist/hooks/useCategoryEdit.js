import { useCallback } from 'react';
import { handleApiError } from '../../../utils/errorHandler';
import { Analytics } from '../../../utils/analytics';

export const useCategoryEdit = (watchlistService, showToast, { setCategories, setLoading }) => {
    const handleOperationError = useCallback((error, operation) => {
        const errorData = handleApiError(error);
        
        if (errorData.errorCode === 'UNAUTHORIZED' || errorData.errorCode === 'SESSION_EXPIRED') {
            showToast('請重新登入', 'error');
            return;
        }
        
        showToast(errorData.message, 'error');
        Analytics.error({
            component: 'WatchlistContainer',
            action: operation,
            error: errorData
        });
    }, [showToast]);

    const loadCategories = useCallback(async () => {
        try {
            setLoading(true);
            const data = await watchlistService.getCategories();
            setCategories(data);
            return data;
        } catch (error) {
            handleOperationError(error, 'load_categories');
            return [];
        } finally {
            setLoading(false);
        }
    }, [handleOperationError, watchlistService, setCategories, setLoading]);

    const createCategory = async (name) => {
        try {
            setLoading(true);
            const result = await watchlistService.createCategory(name);
            const newCategory = result.category || result;
            
            setCategories(prevCategories => [
                ...prevCategories,
                { ...newCategory, stocks: [] }
            ]);
            
            showToast('分類創建成功', 'success');
            return newCategory;
        } catch (error) {
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
            showToast('分類已更新', 'success');
        } catch (error) {
            handleOperationError(error, 'update_category');
            throw error;
        }
    };

    const deleteCategory = async (categoryId) => {
        try {
            if (!window.confirm('確定要刪除此分類嗎？此操作無法復原。')) {
                return false;
            }

            await watchlistService.deleteCategory(categoryId);
            const updatedCategories = await loadCategories();
            showToast('分類已刪除', 'success');
            
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

    return {
        loadCategories,
        createCategory,
        updateCategory,
        deleteCategory
    };
}; 