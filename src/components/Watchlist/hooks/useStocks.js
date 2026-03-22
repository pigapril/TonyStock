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

            const errorData = handleApiError(error, showToast, t);

            Analytics.error({
                component: 'useStocks',
                action: 'add_stock',
                error: {
                    errorCode: errorData.errorCode,
                    message: errorData.message,
                    originalMessage: error.message,
                    status: error.response?.status
                }
            });

            if (errorData.errorCode === 'STOCK_LIMIT_EXCEEDED') {
                Analytics.watchlist.limitError({
                    type: 'stock_limit',
                    currentCount: error.response?.data?.data?.currentCount,
                    maxLimit: error.response?.data?.data?.maxLimit
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

    /**
     * 重新排序分類內的股票
     * @param {string} categoryId - 分類 ID
     * @param {Array<{id: string, sortOrder: number}>} orders - 排序資料
     */
    const handleReorderStocks = useCallback(async (categoryId, orders) => {
        try {
            await watchlistService.reorderStocks(categoryId, orders);

            Analytics.watchlist.reorderStocks({
                categoryId,
                count: orders.length,
                component: 'WatchlistContainer'
            });

            // 成功後重新載入分類以確保排序正確
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Reorder stocks failed:', error);
            const errorData = handleApiError(error, showToast, t);
            Analytics.error({
                component: 'useStocks',
                action: 'reorder_stocks',
                error: errorData
            });
            // 失敗時重新載入以回滾
            if (onSuccess) {
                onSuccess();
            }
        }
    }, [watchlistService, showToast, onSuccess, t]);

    return {
        loading,
        error,
        handleAddStock,
        handleRemoveStock,
        handleReorderStocks
    };
}; 