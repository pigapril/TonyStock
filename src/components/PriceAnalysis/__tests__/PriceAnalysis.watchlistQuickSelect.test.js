import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { PriceAnalysis } from '../PriceAnalysis';

const mockAuthState = {
  isAuthenticated: true,
  user: { id: 'user-1', plan: 'pro' },
  checkAuthStatus: jest.fn()
};

const mockDialogApi = {
  openDialog: jest.fn()
};

const mockAdContext = {
  requestAdDisplay: jest.fn(),
  requestTrialPromotion: jest.fn()
};

const mockToastApi = {
  showToast: jest.fn(),
  toast: null,
  hideToast: jest.fn()
};

jest.mock('react-responsive', () => ({
  useMediaQuery: jest.fn(() => false)
}));

beforeAll(() => {
  window.requestIdleCallback = window.requestIdleCallback || ((callback) => setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 0));
  window.cancelIdleCallback = window.cancelIdleCallback || ((id) => clearTimeout(id));
});

jest.mock('react-chartjs-2', () => ({
  Line: require('react').forwardRef((props, ref) => <div ref={ref} data-testid="price-analysis-line-chart" {...props} />)
}));

jest.mock('../../PageContainer/PageContainer', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="page-container">{children}</div>
}));

jest.mock('../../ULBandChart/ULBandChart', () => ({
  __esModule: true,
  default: () => <div data-testid="ul-band-chart" />
}));

jest.mock('../../../utils/enhancedApiClient', () => ({
  get: jest.fn()
}));

jest.mock('../../../components/Auth/useAuth', () => ({
  useAuth: () => mockAuthState
}));

jest.mock('../../../components/Common/Dialog/useDialog', () => ({
  useDialog: () => mockDialogApi
}));

jest.mock('../../../components/Common/InterstitialAdModal/AdContext', () => ({
  useAdContext: () => mockAdContext
}));

jest.mock('../../../components/Watchlist/hooks/useToastManager', () => ({
  useToastManager: () => mockToastApi
}));

jest.mock('../../../components/Watchlist/services/watchlistService', () => ({
  __esModule: true,
  default: {
    getCategoriesLite: jest.fn(),
    getFreePreview: jest.fn()
  }
}));

jest.mock('../../../utils/freeStockListUtils', () => ({
  isStockAllowed: jest.fn(() => true),
  getFreeStockList: jest.fn(() => []),
  getStocksByRegion: jest.fn().mockResolvedValue({})
}));

const mockEnhancedApiClient = require('../../../utils/enhancedApiClient');
const mockWatchlistService = require('../../../components/Watchlist/services/watchlistService').default;

const createIntegratedAnalysisPayload = (stockCode = 'SPY') => ({
  data: {
    data: {
      stockCode,
      dates: ['2026-03-20'],
      prices: [100],
      sdAnalysis: {
        trendLine: [100],
        tl_minus_2sd: [80],
        tl_minus_sd: [90],
        tl_plus_sd: [110],
        tl_plus_2sd: [120]
      },
      weeklyDates: ['2026-03-20'],
      weeklyPrices: [100],
      upperBand: [110],
      lowerBand: [90],
      ma20: [100],
      currentPrice: 100,
      currentPricePosition: 0,
      sentiment: {
        key: 'sentiment.neutral',
        value: 'Neutral'
      }
    }
  }
});

const TestWrapper = ({ children }) => (
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  </MemoryRouter>
);

describe('PriceAnalysis watchlist quick select', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.user = { id: 'user-1', plan: 'pro' };
    mockWatchlistService.getCategoriesLite.mockResolvedValue([
      {
        id: 'cat-1',
        name: 'Core',
        stocks: [{ stockCode: 'SPY', name: 'SPY ETF' }]
      }
    ]);
    mockWatchlistService.getFreePreview.mockResolvedValue([{
      id: 'platform-featured',
      name: '平台精選',
      stocks: [
        { symbol: '0050', name: '元大台灣50', nameEn: 'Yuanta Taiwan 50' },
        { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', nameEn: 'SPDR S&P 500 ETF Trust' },
        { symbol: 'QQQ', name: 'Invesco QQQ Trust', nameEn: 'Invesco QQQ Trust' }
      ]
    }]);
    mockEnhancedApiClient.get.mockImplementation((url) => {
      if (url === '/api/hot-searches') {
        return Promise.resolve({
          data: {
            data: {
              top_searches: []
            }
          }
        });
      }

      if (url === '/api/integrated-analysis') {
        return Promise.resolve(createIntegratedAnalysisPayload());
      }

      return Promise.resolve({
        data: {
          data: []
        }
      });
    });
  });

  it('renders the watchlist quick select categories with the original inline list', async () => {
    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    fireEvent.click(await screen.findByRole('button', { name: /^(Watchlist|追蹤清單|自選列表)/i }));

    expect(await screen.findByText('Core')).toBeInTheDocument();
    expect(screen.getAllByText('SPY').length).toBeGreaterThan(0);
  });

  it('prefetches watchlist data in the background before the tab is opened', async () => {
    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockWatchlistService.getCategoriesLite).toHaveBeenCalled();
    });

    expect(screen.queryByText('Core')).not.toBeInTheDocument();
  });

  it('allows Free users to open the curated three-stock preview and select a stock', async () => {
    mockAuthState.user = { id: 'user-1', plan: 'free' };

    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    fireEvent.click(await screen.findByRole('button', { name: /^(Watchlist|追蹤清單|自選列表)/i }));

    const featuredCategory = await screen.findByRole('button', { name: /平台精選/ });
    await waitFor(() => {
      expect(featuredCategory).toHaveClass('collapsed');
    });
    fireEvent.click(featuredCategory);

    expect(await screen.findByText('0050')).toBeInTheDocument();
    expect(screen.getAllByText('SPY').length).toBeGreaterThan(0);
    expect(screen.getByText('QQQ')).toBeInTheDocument();

    expect(mockWatchlistService.getFreePreview).toHaveBeenCalled();
    expect(mockWatchlistService.getCategoriesLite).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('0050'));
    expect(screen.getByRole('combobox')).toHaveValue('0050');
  });
});
