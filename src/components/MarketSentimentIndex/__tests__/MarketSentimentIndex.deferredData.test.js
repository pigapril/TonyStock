import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';

import i18n from '../../../i18n';
import MarketSentimentIndex from '../MarketSentimentIndex';

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

const sentimentPayload = {
  compositeScore: 52,
  compositeScoreLastUpdate: '2026-03-20',
  indicators: {
    'AAII Bull-Bear Spread': {
      percentileRank: 65,
      value: 12.5
    },
    'Market Momentum': {
      percentileRank: 40,
      value: 8.2
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

describe('MarketSentimentIndex deferred data loading', () => {
  beforeAll(() => {
    window.requestIdleCallback = window.requestIdleCallback || ((callback) => setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 0));
    window.cancelIdleCallback = window.cancelIdleCallback || ((id) => clearTimeout(id));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnhancedApiClient.get.mockImplementation((url) => {
      if (url === '/api/market-sentiment-free') {
        return Promise.resolve({ data: sentimentPayload });
      }

      if (url === '/api/composite-historical-data') {
        return Promise.resolve({
          data: [
            { date: '2026-03-19', compositeScore: 48, spyClose: 580 }
          ]
        });
      }

      if (url === '/api/indicator-history') {
        return Promise.resolve({
          data: [
            { date: '2026-03-01', value: 10, percentileRank: 50 },
            { date: '2026-03-20', value: 12, percentileRank: 65 }
          ]
        });
      }

      return Promise.resolve({ data: [] });
    });
  });

  it('does not fetch historical or indicator detail data on initial render', async () => {
    const { container } = render(
      <TestWrapper>
        <MarketSentimentIndex />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('market-sentiment-gauge')).toBeInTheDocument();
    });

    expect(mockEnhancedApiClient.get).toHaveBeenCalledWith('/api/market-sentiment-free');
    expect(mockEnhancedApiClient.get).not.toHaveBeenCalledWith('/api/composite-historical-data', expect.anything());
    expect(
      mockEnhancedApiClient.get.mock.calls.some(([url]) => url === '/api/indicator-history')
    ).toBe(false);

    fireEvent.click(screen.getByRole('tab', { name: /history|歷史趨勢/i }));

    await waitFor(() => {
      expect(
        mockEnhancedApiClient.get.mock.calls.some(([url]) => url === '/api/composite-historical-data')
      ).toBe(true);
    });

    fireEvent.click(container.querySelector('.indicator-summary-card'));

    await waitFor(() => {
      expect(
        mockEnhancedApiClient.get.mock.calls.some(([url]) => url === '/api/indicator-history')
      ).toBe(true);
    });
  });
});
