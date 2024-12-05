import { useState, useCallback } from 'react';
import { Analytics } from '../../../utils/analytics';
import { handleApiError } from '../../../utils/errorHandler';

export const useStocks = (watchlistService, showToast, onSuccess) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleAddStock = useCallback(async (categoryId, stock) => {
        if (!categoryId || !stock) {
            showToast('無效的操作參數', 'error');
            return false;
        }

        setLoading(true);
        try {
            const result = await watchlistService.addStock(categoryId, stock);
            const stockSymbol = typeof stock === 'string' ? stock : stock.symbol;
            
            showToast(`已添加 ${stockSymbol} 到追蹤清單`, 'success');
            Analytics.watchlist.addStock({ categoryId, stockSymbol });
            
            if (onSuccess) {
                onSuccess();
            }
            return true;
            
        } catch (error) {
            console.error('Add stock error:', error);
            
            if (error.data?.message) {
                showToast(error.data.message, 'error');
            } else {
                const errorData = handleApiError(error);
                showToast(errorData.message, 'error');
            }
            
            Analytics.error({
                component: 'useStocks',
                action: 'add_stock',
                error
            });
            
            return false;
        } finally {
            setLoading(false);
        }
    }, [watchlistService, showToast, onSuccess]);

    const handleRemoveStock = useCallback(async (categoryId, itemId) => {
        setLoading(true);
        try {
            await watchlistService.removeStock(categoryId, itemId);
            
            Analytics.watchlist.removeStock({
                categoryId,
                stockId: itemId
            });

            if (onSuccess) {
                onSuccess();
            }

            return true;
        } catch (error) {
            const errorData = handleApiError(error);
            showToast(errorData.message, 'error');
            Analytics.error({
                component: 'useStocks',
                action: 'remove_stock',
                error: errorData
            });
            return false;
        } finally {
            setLoading(false);
        }
    }, [watchlistService, showToast, onSuccess]);

    return {
        loading,
        error,
        handleAddStock,
        handleRemoveStock
    };
}; 