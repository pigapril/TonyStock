import { useState, useCallback } from 'react';

export const useCategorySelection = () => {
    const [activeTab, setActiveTab] = useState(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);

    const handleTabChange = useCallback((categoryId) => {
        setActiveTab(categoryId);
        setSelectedCategoryId(categoryId);
    }, []);

    const handleCategoryDeleted = useCallback((deletedCategoryId, categories) => {
        if (deletedCategoryId !== activeTab) return;

        if (categories.length > 0) {
            const firstCategory = categories[0];
            handleTabChange(firstCategory.id);
        } else {
            handleTabChange(null);
        }
    }, [activeTab, handleTabChange]);

    const selectFirstCategory = useCallback((categories) => {
        if (categories?.length > 0 && !activeTab) {
            const firstCategory = categories[0];
            handleTabChange(firstCategory.id);
        }
    }, [activeTab, handleTabChange]);

    return {
        activeTab,
        selectedCategoryId,
        handleTabChange,
        selectFirstCategory,
        handleCategoryDeleted
    };
}; 