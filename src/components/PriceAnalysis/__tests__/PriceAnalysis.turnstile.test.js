import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { PriceAnalysis } from '../PriceAnalysis';

const mockAuthState = {
  isAuthenticated: true,
  user: { id: 'user-1' },
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
  getWatchlist: jest.fn().mockResolvedValue([])
}));

jest.mock('../../../utils/freeStockListUtils', () => ({
  isStockAllowed: jest.fn(() => true),
  getFreeStockList: jest.fn(() => [])
}));

const mockTurnstile = jest.fn();
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

jest.mock('react-turnstile', () => {
  return function MockTurnstile(props) {
    mockTurnstile(props);
    return <div data-testid="turnstile-widget">Turnstile Widget</div>;
  };
});

const mockEnhancedApiClient = require('../../../utils/enhancedApiClient');

const TestWrapper = ({ children }) => (
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  </MemoryRouter>
);

describe('PriceAnalysis Turnstile gating', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
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

  afterEach(() => {
    process.env = originalEnv;
  });

  it('does not render Turnstile when the feature flag is disabled', async () => {
    process.env.REACT_APP_TURNSTILE_ENABLED = 'false';

    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /開始分析|Start Analysis/i })).toBeInTheDocument();
    });

    expect(screen.queryByTestId('turnstile-widget')).not.toBeInTheDocument();
  });

  it('keeps analysis blocked until verification succeeds when the feature flag is enabled', async () => {
    process.env.REACT_APP_TURNSTILE_ENABLED = 'true';

    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /請先完成驗證|Complete Verification/i });
    expect(submitButton).toBeDisabled();

    mockTurnstile.mock.calls[0][0].onSuccess('mock-token');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /開始分析|Start Analysis/i })).not.toBeDisabled();
    });
  });

  it('allows form submission without a token when Turnstile is disabled', async () => {
    process.env.REACT_APP_TURNSTILE_ENABLED = 'false';

    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/請輸入股票代碼|e\.g\., SPY, AAPL/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/請輸入股票代碼|e\.g\., SPY, AAPL/i), {
      target: { value: 'AAPL' }
    });
    fireEvent.click(screen.getByRole('button', { name: /開始分析|Start Analysis/i }));

    await waitFor(() => {
      expect(screen.queryByText(/請先完成驗證|Complete Verification/i)).not.toBeInTheDocument();
    });
  });
});
