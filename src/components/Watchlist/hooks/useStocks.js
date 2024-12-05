import { useState, useCallback } from 'react';
import { Analytics } from '../../../utils/analytics';
import { handleApiError } from '../../../utils/errorHandler';

export const useStocks = (watchlistService, showToast, onSuccess) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleAddStock = useCallback(async (categoryId, stock) => {
        if (!categoryId) {
            showToast('請先選擇分類', 'warning');
            return false;
        }

        if (!stock || (!stock.symbol && typeof stock !== 'string')) {
            showToast('無效的股票資料', 'error');
            return false;
        }

        setLoading(true);
        try {
            await watchlistService.addStock(categoryId, stock);
            showToast(`已添加 ${typeof stock === 'string' ? stock : stock.symbol} 到追蹤清單`, 'success');
            
            Analytics.watchlist.addStock({
                categoryId,
                stockSymbol: typeof stock === 'string' ? stock : stock.symbol
            });

            if (onSuccess) {
                onSuccess();
            }

            return true;
        } catch (error) {
            const errorData = handleApiError(error);
            
            if (errorData.errorCode === 'DUPLICATE_STOCK') {
                showToast(`${typeof stock === 'string' ? stock : stock.symbol} 已在此分類中`, 'warning');
            } else if (errorData.errorCode === 'INVALID_STOCK_SYMBOL') {
                showToast('無效的股票代碼', 'error');
            } else {
                showToast(errorData.message, 'error');
                Analytics.error({
                    component: 'useStocks',
                    action: 'add_stock',
                    error: errorData
                });
            }
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