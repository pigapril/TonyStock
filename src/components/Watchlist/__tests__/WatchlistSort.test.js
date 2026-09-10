import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { WatchlistContainer } from '../WatchlistContainer';
import { StockListHeaderRow } from '../components/StockCard/StockListHeaderRow';

const mockAuthState = {
  user: { id: 'user-1', plan: 'pro' },
  isAuthenticated: true,
  checkAuthStatus: jest.fn()
};

const mockCategoriesApi = {
  categories: [],
  loading: false,
  editingCategory: null,
  setEditingCategory: jest.fn(),
  setCategories: jest.fn(),
  loadCategories: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  reorderCategories: jest.fn()
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn()
}));

jest.mock('../../Auth/useAuth', () => ({ useAuth: () => mockAuthState }));

jest.mock('../../Common/InterstitialAdModal/AdContext', () => ({
  useAdContext: () => ({ requestAdDisplay: jest.fn() })
}));

jest.mock('../hooks/useToastManager', () => ({
  useToastManager: () => ({ toast: null, showToast: jest.fn(), hideToast: jest.fn() })
}));

jest.mock('../hooks/useCategories', () => ({ useCategories: () => mockCategoriesApi }));

jest.mock('../hooks/useStocks', () => ({
  useStocks: () => ({
    loading: false,
    handleAddStock: jest.fn(),
    handleRemoveStock: jest.fn(),
    handleReorderStocks: jest.fn()
  })
}));

jest.mock('../services/watchlistService', () => ({ __esModule: true, default: {} }));

jest.mock('../SearchBox', () => ({ SearchBox: () => <div /> }));

jest.mock('react-helmet-async', () => ({ Helmet: ({ children }) => <>{children}</> }));

// 把收到的順序與排序回呼攤出來，這樣不必渲染整張卡片就能驗證接線
jest.mock('../components/StockCard/StaticStockList', () => ({
  StaticStockList: ({ stocks, onSortChange, isEditing }) => (
    <div data-testid="static-stock-list" data-editing={String(isEditing)}>
      <span data-testid="order">{stocks.map((s) => s.symbol).join(',')}</span>
      <button type="button" onClick={() => onSortChange('price', 'asc')}>price-asc</button>
      <button type="button" onClick={() => onSortChange('price', 'desc')}>price-desc</button>
      <button type="button" onClick={() => onSortChange('price', null)}>price-clear</button>
    </div>
  )
}));

jest.mock('../components/StockCard/DraggableStockList', () => ({
  __esModule: true,
  default: () => <div data-testid="draggable-stock-list" />
}));

jest.mock('../components/CategoryManagerDialog', () => ({ __esModule: true, CategoryManagerDialog: () => null }));
jest.mock('../components/CreateCategoryDialog', () => ({ __esModule: true, CreateCategoryDialog: () => null }));
jest.mock('../components/EditCategoryDialog', () => ({ __esModule: true, EditCategoryDialog: () => null }));
jest.mock('../NewsDialog', () => ({ __esModule: true, default: () => null }));

const bands = (trendLine, sd) => ({
  trendLine,
  tl_minus_2sd: trendLine - 2 * sd,
  tl_minus_sd: trendLine - sd,
  tl_plus_sd: trendLine + sd,
  tl_plus_2sd: trendLine + 2 * sd
});

const categories = [
  {
    id: 'cat-1',
    name: 'Core',
    stocks: [
      { id: 'nvda', symbol: 'NVDA', price: 900, analysis: bands(800, 50) },
      { id: 'spy', symbol: 'SPY', price: 520, analysis: bands(500, 10) },
      { id: 'aapl', symbol: 'AAPL', price: 200, analysis: bands(210, 20) }
    ]
  }
];

const renderContainer = () => render(
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <I18nextProvider i18n={i18n}>
      <WatchlistContainer />
    </I18nextProvider>
  </MemoryRouter>
);

describe('觀察清單欄位排序', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockCategoriesApi.categories = categories;
  });

  it('預設是手動順序，不動後端給的排列', () => {
    renderContainer();

    expect(screen.getByTestId('order')).toHaveTextContent('NVDA,SPY,AAPL');
  });

  it('點排序後畫面順序跟著換，歸零後回到手動順序', () => {
    renderContainer();

    fireEvent.click(screen.getByText('price-asc'));
    expect(screen.getByTestId('order')).toHaveTextContent('AAPL,SPY,NVDA');

    fireEvent.click(screen.getByText('price-desc'));
    expect(screen.getByTestId('order')).toHaveTextContent('NVDA,SPY,AAPL');

    fireEvent.click(screen.getByText('price-clear'));
    expect(screen.getByTestId('order')).toHaveTextContent('NVDA,SPY,AAPL');
    expect(window.localStorage.getItem('watchlist:sort:cat-1')).toBeNull();
  });

  it('排序記在該分類名下，重新載入後讀回來', () => {
    const first = renderContainer();

    fireEvent.click(screen.getByText('price-asc'));
    expect(window.localStorage.getItem('watchlist:sort:cat-1'))
      .toBe(JSON.stringify({ key: 'price', direction: 'asc' }));

    first.unmount();
    renderContainer();

    expect(screen.getByTestId('order')).toHaveTextContent('AAPL,SPY,NVDA');
  });

  // 拖曳寫的是永久的 sortOrder。在排序後的畫面上拖，會把顯示順序存成手動順序。
  it('排序生效時不給拖曳，但編輯模式的刪除照留', async () => {
    renderContainer();

    fireEvent.click(screen.getByTestId('watchlist-edit-mode-button'));
    await waitFor(() => expect(screen.getByTestId('draggable-stock-list')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('watchlist-sort-menu-trigger'));
    fireEvent.click(screen.getByTestId('sort-button-price'));

    expect(screen.queryByTestId('draggable-stock-list')).not.toBeInTheDocument();
    expect(screen.getByTestId('static-stock-list')).toHaveAttribute('data-editing', 'true');
    expect(screen.getByTestId('order')).toHaveTextContent('AAPL,SPY,NVDA');
  });
});

describe('StockListHeaderRow 三態切換', () => {
  const renderHeader = (sortState, onSortChange) => render(
    <I18nextProvider i18n={i18n}>
      <StockListHeaderRow sortState={sortState} onSortChange={onSortChange} />
    </I18nextProvider>
  );

  it('代碼、價格、情緒三欄可點，價格分析與新聞不可點', () => {
    renderHeader({ key: null, direction: null }, jest.fn());

    expect(screen.getByTestId('sort-button-symbol')).toBeInTheDocument();
    expect(screen.getByTestId('sort-button-price')).toBeInTheDocument();
    expect(screen.getByTestId('sort-button-sentiment')).toBeInTheDocument();
    expect(screen.queryByTestId('sort-button-analysis')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sort-button-news')).not.toBeInTheDocument();
  });

  it('無排序 → 升冪 → 降冪 → 無排序', () => {
    const onSortChange = jest.fn();

    const { unmount } = renderHeader({ key: null, direction: null }, onSortChange);
    fireEvent.click(screen.getByTestId('sort-button-sentiment'));
    expect(onSortChange).toHaveBeenLastCalledWith('sentiment', 'asc');
    unmount();

    const second = renderHeader({ key: 'sentiment', direction: 'asc' }, onSortChange);
    fireEvent.click(screen.getByTestId('sort-button-sentiment'));
    expect(onSortChange).toHaveBeenLastCalledWith('sentiment', 'desc');
    second.unmount();

    renderHeader({ key: 'sentiment', direction: 'desc' }, onSortChange);
    fireEvent.click(screen.getByTestId('sort-button-sentiment'));
    expect(onSortChange).toHaveBeenLastCalledWith('sentiment', null);
  });

  it('只有正在排序的那一欄顯示方向', () => {
    renderHeader({ key: 'price', direction: 'desc' }, jest.fn());

    expect(screen.getByTestId('sort-button-price')).toHaveAttribute('data-direction', 'desc');
    expect(screen.getByTestId('sort-button-symbol')).toHaveAttribute('data-direction', 'none');
    expect(screen.getByTestId('sort-button-sentiment')).toHaveAttribute('data-direction', 'none');
  });
});
