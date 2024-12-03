import { useCategoryEdit } from './useCategoryEdit';
import { useCategorySelection } from './useCategorySelection';
import { useCategoryState } from './useCategoryState';

export const useCategories = (watchlistService, showToast) => {
    const {
        categories,
        setCategories,
        loading,
        setLoading,
        editingCategory,
        setEditingCategory,
        error,
        clearError
    } = useCategoryState();

    const {
        loadCategories,
        createCategory,
        updateCategory,
        deleteCategory
    } = useCategoryEdit(watchlistService, showToast, { setCategories, setLoading });

    const {
        activeTab,
        selectedCategoryId,
        handleTabChange,
        selectFirstCategory,
        handleCategoryDeleted
    } = useCategorySelection();

    return {
        // 狀態
        categories,
        loading,
        editingCategory,
        error,
        activeTab,
        selectedCategoryId,
        
        // 操作方法
        setEditingCategory,
        clearError,
        loadCategories,
        createCategory,
        updateCategory,
        deleteCategory,
        handleTabChange,
        selectFirstCategory,
        handleCategoryDeleted
    };
}; 