import { useCallback } from 'react';
import { handleApiError } from '../../../utils/errorHandler';
import { Analytics } from '../../../utils/analytics';

export const useCategoryEdit = (watchlistService, showToast, { setCategories, setLoading }) => {
    const handleOperationError = useCallback((error, operation) => {
        console.log('handleOperationError 收到的錯誤:', error);
        
        if (error.data?.message) {
            showToast(error.data.message, 'error');
            return;
        }

        const errorData = handleApiError(error);
        showToast(errorData.message, 'error');
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
            
            const newCategory = {
                ...result.category,
                stocks: []
            };
            
            setCategories(prevCategories => [...prevCategories, newCategory]);
            
            showToast('分類創建成功', 'success');
            Analytics.watchlist.createCategory({ categoryName: name });
            
            return result.category;
        } catch (error) {
            console.error('Create category error:', error);
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