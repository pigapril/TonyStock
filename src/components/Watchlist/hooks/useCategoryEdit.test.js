import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { useCategoryEdit } from './useCategoryEdit';
import { Analytics } from '../../../utils/analytics';
import { handleApiError } from '../../../utils/errorHandler';

jest.mock('../../../utils/analytics', () => ({
  Analytics: {
    watchlist: {
      createCategory: jest.fn(),
      limitError: jest.fn(),
      categoryDelete: jest.fn(),
      reorderCategories: jest.fn()
    }
  }
}));

jest.mock('../../../utils/errorHandler', () => ({
  handleApiError: jest.fn(() => ({ errorCode: 'UNKNOWN', message: 'Request failed' }))
}));

const wrapper = ({ children }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
);

describe('useCategoryEdit', () => {
  let service;
  let showToast;

  const setup = (initialCategories = []) => renderHook(() => {
    const [categories, setCategories] = React.useState(initialCategories);
    const [loading, setLoading] = React.useState(false);
    const api = useCategoryEdit(service, showToast, { setCategories, setLoading });
    return { ...api, categories, loading };
  }, { wrapper });

  beforeEach(() => {
    jest.clearAllMocks();
    service = {
      getCategoriesInitial: jest.fn().mockResolvedValue([]),
      createCategory: jest.fn().mockResolvedValue({ category: { id: 'cat-new', name: 'New' } }),
      updateCategory: jest.fn().mockResolvedValue(undefined),
      deleteCategory: jest.fn().mockResolvedValue(undefined),
      reorderCategories: jest.fn().mockResolvedValue(undefined)
    };
    showToast = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads category structure while preserving already hydrated stock data', async () => {
    const existing = [{ id: 'cat-1', name: 'Old', stocks: [{ id: 'stock-1', price: 100, analysis: { signal: 'buy' } }] }];
    service.getCategoriesInitial.mockResolvedValue([
      { id: 'cat-1', name: 'Updated', stocks: [{ id: 'stock-1', symbol: 'AAPL' }] }
    ]);
    const { result } = setup(existing);

    let loaded;
    await act(async () => {
      loaded = await result.current.loadCategories();
    });

    expect(loaded[0].name).toBe('Updated');
    expect(result.current.categories[0].stocks[0]).toEqual({
      id: 'stock-1', symbol: 'AAPL', price: 100, analysis: { signal: 'buy' }
    });
    expect(result.current.loading).toBe(false);
  });

  it('creates a category, updates local state and tracks analytics', async () => {
    const { result } = setup();

    let created;
    await act(async () => {
      created = await result.current.createCategory('Growth');
    });

    expect(created).toEqual({ id: 'cat-new', name: 'New' });
    expect(result.current.categories).toEqual([{ id: 'cat-new', name: 'New', stocks: [] }]);
    expect(showToast).toHaveBeenCalledWith(expect.any(String), 'success');
    expect(Analytics.watchlist.createCategory).toHaveBeenCalledWith({ categoryName: 'Growth' });
    expect(result.current.loading).toBe(false);
  });

  it('tracks category-limit errors and rethrows the original error', async () => {
    const error = new Error('category limit reached');
    error.data = { code: 'CATEGORY_LIMIT_EXCEEDED', message: 'Category limit reached', currentCount: 5, maxLimit: 5 };
    service.createCategory.mockRejectedValue(error);
    const { result } = setup();

    await act(async () => {
      await expect(result.current.createCategory('Extra')).rejects.toBe(error);
    });

    expect(Analytics.watchlist.limitError).toHaveBeenCalledWith({
      type: 'category_limit', currentCount: 5, maxLimit: 5
    });
    expect(showToast).toHaveBeenCalledWith(error.data.message, 'error');
    expect(result.current.loading).toBe(false);
  });

  it('does not delete a category when the user cancels confirmation', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    const { result } = setup();

    let deleted;
    await act(async () => {
      deleted = await result.current.deleteCategory('cat-1');
    });

    expect(deleted).toBe(false);
    expect(service.deleteCategory).not.toHaveBeenCalled();
  });

  it('deletes a category, refreshes the structure and records analytics', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    service.getCategoriesInitial.mockResolvedValue([{ id: 'cat-2', name: 'Remaining', stocks: [] }]);
    const { result } = setup();

    let deleted;
    await act(async () => {
      deleted = await result.current.deleteCategory('cat-1');
    });

    expect(service.deleteCategory).toHaveBeenCalledWith('cat-1');
    expect(deleted).toEqual({ success: true, updatedCategories: [{ id: 'cat-2', name: 'Remaining', stocks: [] }] });
    expect(Analytics.watchlist.categoryDelete).toHaveBeenCalledWith({
      categoryId: 'cat-1', component: 'WatchlistContainer', action: 'delete_category'
    });
  });

  it('reorders optimistically and reloads categories after a failed request', async () => {
    const original = [{ id: 'cat-1', name: 'One' }, { id: 'cat-2', name: 'Two' }];
    service.reorderCategories.mockRejectedValue(new Error('offline'));
    service.getCategoriesInitial.mockResolvedValue(original);
    const { result } = setup(original);

    await act(async () => {
      await result.current.reorderCategories([
        { id: 'cat-2', sortOrder: 0 }, { id: 'cat-1', sortOrder: 1 }
      ]);
    });

    expect(service.reorderCategories).toHaveBeenCalled();
    expect(service.getCategoriesInitial).toHaveBeenCalled();
    expect(result.current.categories).toEqual([
      { id: 'cat-1', name: 'One', stocks: [] },
      { id: 'cat-2', name: 'Two', stocks: [] }
    ]);
  });
});
