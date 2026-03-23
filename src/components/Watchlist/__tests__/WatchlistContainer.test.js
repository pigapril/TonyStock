import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { WatchlistContainer } from '../WatchlistContainer';

const mockNavigate = jest.fn();
const mockRequestAdDisplay = jest.fn();
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
  reorderCategories: jest.fn(),
  handleCategoryDeleted: jest.fn()
};

const mockStocksApi = {
  loading: false,
  handleAddStock: jest.fn(),
  handleRemoveStock: jest.fn(),
  handleReorderStocks: jest.fn()
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

jest.mock('../../Auth/useAuth', () => ({
  useAuth: () => mockAuthState
}));

jest.mock('../../Common/InterstitialAdModal/AdContext', () => ({
  useAdContext: () => ({ requestAdDisplay: mockRequestAdDisplay })
}));

jest.mock('../hooks/useToastManager', () => ({
  useToastManager: () => ({
    toast: null,
    showToast: jest.fn(),
    hideToast: jest.fn()
  })
}));

jest.mock('../hooks/useCategories', () => ({
  useCategories: () => mockCategoriesApi
}));

jest.mock('../hooks/useStocks', () => ({
  useStocks: () => mockStocksApi
}));

jest.mock('../services/watchlistService', () => ({
  __esModule: true,
  default: {}
}));

jest.mock('../SearchBox', () => ({
  SearchBox: () => <div data-testid="watchlist-search-box" />
}));

jest.mock('../components/StockCard/StaticStockList', () => ({
  StaticStockList: ({ stocks }) => (
    <div data-testid="static-stock-list">
      {stocks.map((stock) => (
        <div key={stock.id}>{stock.symbol}</div>
      ))}
    </div>
  )
}));

jest.mock('react-helmet-async', () => ({
  Helmet: ({ children }) => <>{children}</>
}));

jest.mock('../components/StockCard/DraggableStockList', () => ({
  __esModule: true,
  default: () => <div data-testid="draggable-stock-list" />
}));

jest.mock('../components/CategoryManagerDialog', () => ({
  __esModule: true,
  CategoryManagerDialog: ({ open }) => open ? <div data-testid="category-manager-dialog" /> : null
}));

jest.mock('../components/CreateCategoryDialog', () => ({
  __esModule: true,
  CreateCategoryDialog: ({ open }) => open ? <div data-testid="create-category-dialog" /> : null
}));

jest.mock('../components/EditCategoryDialog', () => ({
  __esModule: true,
  EditCategoryDialog: ({ open }) => open ? <div data-testid="edit-category-dialog" /> : null
}));

jest.mock('../NewsDialog', () => ({
  __esModule: true,
  default: ({ open }) => open ? <div data-testid="news-dialog" /> : null
}));

const TestWrapper = ({ children }) => (
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  </MemoryRouter>
);

const categories = [
  {
    id: 'cat-1',
    name: 'Core',
    stocks: [
      { id: 'spy', symbol: 'SPY', name: 'SPY ETF', nameEn: 'SPY ETF', price: 520, analysis: { tl_plus_2sd: 540, tl_plus_sd: 530, tl_minus_sd: 500, tl_minus_2sd: 490 } }
    ]
  },
  {
    id: 'cat-2',
    name: 'Growth',
    stocks: [
      { id: 'nvda', symbol: 'NVDA', name: 'NVIDIA', nameEn: 'NVIDIA', price: 900, analysis: { tl_plus_2sd: 940, tl_plus_sd: 920, tl_minus_sd: 860, tl_minus_2sd: 840 } }
    ]
  }
];

describe('WatchlistContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = { id: 'user-1', plan: 'pro' };
    mockCategoriesApi.categories = categories;
    mockCategoriesApi.loading = false;
  });

  it('shows login gate when unauthenticated', () => {
    mockAuthState.isAuthenticated = false;

    render(
      <TestWrapper>
        <WatchlistContainer />
      </TestWrapper>
    );

    expect(screen.getByText(/Please log in|請先登入/i)).toBeInTheDocument();
    expect(screen.queryByTestId('watchlist-search-box')).not.toBeInTheDocument();
  });

  it('renders only the active category in browse mode and does not mount dnd', async () => {
    render(
      <TestWrapper>
        <WatchlistContainer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('watchlist-search-box')).toBeInTheDocument();
    });

    expect(screen.getByTestId('static-stock-list')).toBeInTheDocument();
    expect(screen.getByText('SPY')).toBeInTheDocument();
    expect(screen.queryByText('NVDA')).not.toBeInTheDocument();
    expect(screen.queryByTestId('draggable-stock-list')).not.toBeInTheDocument();
  });

  it('mounts the draggable list only after entering edit mode', async () => {
    render(
      <TestWrapper>
        <WatchlistContainer />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('watchlist-edit-mode-button'));

    await waitFor(() => {
      expect(screen.getByTestId('draggable-stock-list')).toBeInTheDocument();
    });
  });

  it('keeps browse mode as non-editing path without mounting draggable list', async () => {
    render(
      <TestWrapper>
        <WatchlistContainer />
      </TestWrapper>
    );

    expect(screen.getByTestId('static-stock-list')).toBeInTheDocument();
    expect(screen.queryByTestId('draggable-stock-list')).not.toBeInTheDocument();
  });

  it('mounts deferred dialogs only when opened', async () => {
    render(
      <TestWrapper>
        <WatchlistContainer />
      </TestWrapper>
    );

    expect(screen.queryByTestId('category-manager-dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('manage-categories-button'));

    await waitFor(() => {
      expect(screen.getByTestId('category-manager-dialog')).toBeInTheDocument();
    });
  });
});
