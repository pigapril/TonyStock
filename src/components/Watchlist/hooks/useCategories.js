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
        loadCategoriesInitial,
        createCategory,
        updateCategory,
        deleteCategory,
        reorderCategories
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
        setCategories,
        setEditingCategory,
        clearError,
        loadCategories,
        loadCategoriesInitial,
        createCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        handleTabChange,
        selectFirstCategory,
        handleCategoryDeleted
    };
};
