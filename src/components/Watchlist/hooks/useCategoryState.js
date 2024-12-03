import { useState } from 'react';

export const useCategoryState = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [error, setError] = useState(null);

    const clearError = () => setError(null);
    const resetEditingCategory = () => setEditingCategory(null);

    return {
        categories,
        setCategories,
        loading,
        setLoading,
        editingCategory,
        setEditingCategory,
        error,
        setError,
        clearError,
        resetEditingCategory
    };
}; 