import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';

import i18n from '../../../i18n';
import TwMarketSentimentIndex from '../TwMarketSentimentIndex';

const mockToastApi = {
  showToast: jest.fn(),
  toast: null,
  hideToast: jest.fn()
};

const mockAdContext = {
  requestAdDisplay: jest.fn()
};

const mockAuthState = {
  user: null,
  checkAuthStatus: jest.fn()
};

jest.mock('react-chartjs-2', () => ({
  Line: require('react').forwardRef((props, ref) => <div ref={ref} data-testid="mock-line-chart" {...props} />)
}));

jest.mock('../../PageContainer/PageContainer', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="page-container">{children}</div>
}));

jest.mock('../../Common/Dialog/FeatureUpgradeDialog', () => ({
  FeatureUpgradeDialog: () => null
}));

jest.mock('../../Watchlist/hooks/useToastManager', () => ({
  useToastManager: () => mockToastApi
}));

jest.mock('../../Common/InterstitialAdModal/AdContext', () => ({
  useAdContext: () => mockAdContext
}));

jest.mock('../../Auth/useAuth', () => ({
  useAuth: () => mockAuthState
}));

jest.mock('../../../utils/enhancedApiClient', () => ({
  get: jest.fn()
}));

jest.mock('../MarketSentimentGauge', () => () => <div data-testid="market-sentiment-gauge" />);
jest.mock('../MarketSentimentDescriptionSection', () => ({
  __esModule: true,
  default: () => <div data-testid="market-sentiment-description" />
}));
jest.mock('../DeferredHistoryWorkspace', () => ({
  __esModule: true,
  default: () => <div data-testid="history-workspace" />
}));
jest.mock('../../IndicatorItem/IndicatorItem', () => ({
  __esModule: true,
  default: () => <div data-testid="indicator-item" />
}));

const mockEnhancedApiClient = require('../../../utils/enhancedApiClient');

const summaryPayload = {
  market: { key: 'tw', benchmarkLabel: 'TAIEX / 台股加權指數' },
  totalScore: 57,
  compositeScoreLastUpdate: '2026-03-20',
  comparisonSnapshots: {
    previousDay: { score: 51, date: '2026-03-19' }
  },
  indicators: {
    tw_vix: {
      id: 'tw_vix',
      label: '台指選擇權波動率',
      percentileRank: 35,
      value: 18.2,
      weight: 3
    },
    pcr_ratio: {
      id: 'pcr_ratio',
      label: 'Put/Call Ratio',
      percentileRank: 68,
      value: 1.14,
      weight: 3
    }
  }
};

const TestWrapper = ({ children }) => (
  <MemoryRouter>
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  </MemoryRouter>
);

describe('TwMarketSentimentIndex deferred data loading', () => {
  beforeAll(() => {
    window.requestIdleCallback = window.requestIdleCallback || ((callback) => setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 0));
    window.cancelIdleCallback = window.cancelIdleCallback || ((id) => clearTimeout(id));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnhancedApiClient.get.mockImplementation((url) => {
      if (url === '/api/tw-market-sentiment-free') {
        return Promise.resolve({ data: summaryPayload });
      }

      if (url === '/api/tw-composite-historical-data') {
        return Promise.resolve({
          data: [
            { date: '2026-03-19', compositeScore: 48, benchmarkClose: null, spyClose: null }
          ]
        });
      }

      if (url === '/api/tw-indicator-history') {
        return Promise.resolve({
          data: {
            indicatorId: 'tw_vix',
            history: [
              { date: '2026-03-01', value: 10, percentileRank: 50 },
              { date: '2026-03-20', value: 12, percentileRank: 65 }
            ]
          }
        });
      }

      return Promise.resolve({ data: [] });
    });
  });

  it('defers TW history and detail requests until the user activates them', async () => {
    const { container } = render(
      <TestWrapper>
        <TwMarketSentimentIndex />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('market-sentiment-gauge')).toBeInTheDocument();
    });

    expect(mockEnhancedApiClient.get).toHaveBeenCalledWith('/api/tw-market-sentiment-free');
    expect(mockEnhancedApiClient.get.mock.calls.some(([url]) => url === '/api/tw-composite-historical-data')).toBe(false);
    expect(mockEnhancedApiClient.get.mock.calls.some(([url]) => url === '/api/tw-indicator-history')).toBe(false);

    fireEvent.click(screen.getByRole('tab', { name: /history|歷史趨勢/i }));

    await waitFor(() => {
      expect(mockEnhancedApiClient.get.mock.calls.some(([url]) => url === '/api/tw-composite-historical-data')).toBe(true);
    });

    fireEvent.click(container.querySelector('.indicator-summary-card'));

    await waitFor(() => {
      expect(mockEnhancedApiClient.get.mock.calls.some(([url]) => url === '/api/tw-indicator-history')).toBe(true);
    });
  });
});
