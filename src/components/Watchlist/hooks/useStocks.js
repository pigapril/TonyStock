import { useState, useCallback } from 'react';
import { Analytics } from '../../../utils/analytics';
import { handleApiError } from '../../../utils/errorHandler';
import { useTranslation } from 'react-i18next';

export const useStocks = (watchlistService, showToast, onSuccess) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleAddStock = useCallback(async (categoryId, stock) => {
        if (!categoryId || !stock) {
            showToast(t('common.invalidParams'), 'error');
            return false;
        }

        setLoading(true);
        try {
            const result = await watchlistService.addStock(categoryId, stock);
            const stockSymbol = typeof stock === 'string' ? stock : stock.symbol;
            
            showToast(t('watchlist.stock.addSuccess', { symbol: stockSymbol }), 'success');
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
            
            if (error.data?.code === 'STOCK_LIMIT_EXCEEDED') {
                Analytics.watchlist.limitError({
                    type: 'stock_limit',
                    currentCount: error.data?.currentCount,
                    maxLimit: error.data?.maxLimit
                });
            }
            
            return false;
        } finally {
            setLoading(false);
        }
    }, [watchlistService, showToast, onSuccess, t]);

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
            const errorData = handleApiError(error, showToast, t);
            Analytics.error({
                component: 'useStocks',
                action: 'remove_stock',
                error: errorData
            });
            return false;
        } finally {
            setLoading(false);
        }
    }, [watchlistService, showToast, onSuccess, t]);

    return {
        loading,
        error,
        handleAddStock,
        handleRemoveStock
    };
}; 