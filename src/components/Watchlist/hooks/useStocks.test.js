import { act, renderHook } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { useStocks } from './useStocks';
import { Analytics } from '../../../utils/analytics';
import { handleApiError } from '../../../utils/errorHandler';

jest.mock('../../../utils/analytics', () => ({
  Analytics: {
    watchlist: {
      addStock: jest.fn(),
      removeStock: jest.fn(),
      reorderStocks: jest.fn(),
      limitError: jest.fn()
    },
    error: jest.fn()
  }
}));

jest.mock('../../../utils/errorHandler', () => ({
  handleApiError: jest.fn(() => ({ errorCode: 'UNKNOWN', message: 'Request failed' }))
}));

const wrapper = ({ children }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
);

describe('useStocks', () => {
  let watchlistService;
  let showToast;
  let onSuccess;

  beforeEach(() => {
    jest.clearAllMocks();
    watchlistService = {
      addStock: jest.fn().mockResolvedValue({ id: 'stock-1' }),
      removeStock: jest.fn().mockResolvedValue(undefined),
      reorderStocks: jest.fn().mockResolvedValue(undefined)
    };
    showToast = jest.fn();
    onSuccess = jest.fn().mockResolvedValue(undefined);
  });

  it('rejects invalid add parameters without calling the service', async () => {
    const { result } = renderHook(() => useStocks(watchlistService, showToast, onSuccess), { wrapper });

    let added;
    await act(async () => {
      added = await result.current.handleAddStock('', null);
    });

    expect(added).toBe(false);
    expect(watchlistService.addStock).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('adds a stock, reports success, tracks analytics and reloads its category', async () => {
    const { result } = renderHook(() => useStocks(watchlistService, showToast, onSuccess), { wrapper });

    let added;
    await act(async () => {
      added = await result.current.handleAddStock('cat-1', { symbol: 'AAPL' });
    });

    expect(added).toBe(true);
    expect(watchlistService.addStock).toHaveBeenCalledWith('cat-1', { symbol: 'AAPL' });
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('AAPL'), 'success');
    expect(Analytics.watchlist.addStock).toHaveBeenCalledWith({ categoryId: 'cat-1', stockSymbol: 'AAPL' });
    expect(onSuccess).toHaveBeenCalledWith('cat-1', 'stocks');
    expect(result.current.loading).toBe(false);
  });

  it('returns false and records an error when adding a stock fails', async () => {
    const error = new Error('limit reached');
    error.response = { status: 403, data: { data: { currentCount: 10, maxLimit: 10 } } };
    watchlistService.addStock.mockRejectedValue(error);
    handleApiError.mockReturnValue({ errorCode: 'STOCK_LIMIT_EXCEEDED', message: 'Limit reached' });
    const { result } = renderHook(() => useStocks(watchlistService, showToast, onSuccess), { wrapper });

    let added;
    await act(async () => {
      added = await result.current.handleAddStock('cat-1', 'AAPL');
    });

    expect(added).toBe(false);
    expect(Analytics.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'add_stock' }));
    expect(Analytics.watchlist.limitError).toHaveBeenCalledWith({
      type: 'stock_limit', currentCount: 10, maxLimit: 10
    });
    expect(result.current.loading).toBe(false);
  });

  it('removes a stock and reloads the affected category', async () => {
    const { result } = renderHook(() => useStocks(watchlistService, showToast, onSuccess), { wrapper });

    let removed;
    await act(async () => {
      removed = await result.current.handleRemoveStock('cat-1', 'stock-1');
    });

    expect(removed).toBe(true);
    expect(watchlistService.removeStock).toHaveBeenCalledWith('cat-1', 'stock-1');
    expect(Analytics.watchlist.removeStock).toHaveBeenCalledWith({ categoryId: 'cat-1', stockId: 'stock-1' });
    expect(onSuccess).toHaveBeenCalledWith('cat-1', 'stocks');
  });

  it('reorders stocks and reloads the order after completion', async () => {
    const { result } = renderHook(() => useStocks(watchlistService, showToast, onSuccess), { wrapper });
    const orders = [{ id: 'stock-1', sortOrder: 0 }, { id: 'stock-2', sortOrder: 1 }];

    await act(async () => {
      await result.current.handleReorderStocks('cat-1', orders);
    });

    expect(watchlistService.reorderStocks).toHaveBeenCalledWith('cat-1', orders);
    expect(Analytics.watchlist.reorderStocks).toHaveBeenCalledWith({
      categoryId: 'cat-1', count: 2, component: 'WatchlistContainer'
    });
    expect(onSuccess).toHaveBeenCalledWith('cat-1', 'order');
  });
});
