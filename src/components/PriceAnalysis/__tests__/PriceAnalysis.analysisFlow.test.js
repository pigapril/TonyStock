import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
  requestAdDisplay: jest.fn()
};

const mockToastApi = {
  showToast: jest.fn(),
  toast: null,
  hideToast: jest.fn()
};

jest.mock('react-responsive', () => ({
  useMediaQuery: jest.fn(() => false)
}));

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
    getCategoriesLite: jest.fn().mockResolvedValue([])
  }
}));

jest.mock('../../../utils/freeStockListUtils', () => ({
  isStockAllowed: jest.fn(() => true),
  getFreeStockList: jest.fn(() => [])
}));

const mockEnhancedApiClient = require('../../../utils/enhancedApiClient');

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

describe('PriceAnalysis analysis flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnhancedApiClient.get.mockImplementation((url, config = {}) => {
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
        return Promise.resolve(
          createIntegratedAnalysisPayload(config?.params?.stockCode || 'SPY')
        );
      }

      return Promise.resolve({
        data: {
          data: []
        }
      });
    });
  });

  it('allows form submission without captcha gating', async () => {
    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/請輸入股票代碼|e\.g\., SPY, AAPL/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/請先完成驗證|Complete Verification/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(
        mockEnhancedApiClient.get.mock.calls.some(([url, config]) => (
          url === '/api/integrated-analysis'
          && config?.params?.stockCode === 'SPY'
        ))
      ).toBe(true);
    });
  });
});
