import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';

import i18n from '../../../i18n';
import MarketSentimentIndex from '../MarketSentimentIndex';
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

jest.mock('../MarketSentimentGauge', () => ({ headlineText }) => <div data-testid="market-sentiment-gauge">{headlineText}</div>);
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

const TestWrapper = ({ initialEntries = ['/zh-TW/market-sentiment'], children }) => (
  <MemoryRouter initialEntries={initialEntries}>
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  </MemoryRouter>
);

describe('Market sentiment shared shell parity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnhancedApiClient.get.mockImplementation((url) => {
      if (url === '/api/market-sentiment-free') {
        return Promise.resolve({
          data: {
            totalScore: 52,
            compositeScoreLastUpdate: '2026-03-20',
            indicators: {
              'AAII Bull-Bear Spread': { percentileRank: 65, value: 12.5, weight: 1.5 }
            }
          }
        });
      }

      if (url === '/api/tw-market-sentiment-free') {
        return Promise.resolve({
          data: {
            totalScore: 57,
            compositeScoreLastUpdate: '2026-03-20',
            comparisonSnapshots: {},
            indicators: {
              tw_vix: { id: 'tw_vix', label: '台指選擇權波動率', percentileRank: 35, value: 18.2, weight: 3 }
            }
          }
        });
      }

      return Promise.resolve({ data: [] });
    });
  });

  it('renders the same shell contract for US and TW adapters', async () => {
    const { rerender } = render(
      <TestWrapper initialEntries={['/zh-TW/market-sentiment']}>
        <MarketSentimentIndex />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('market-sentiment-gauge')).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: /latest market sentiment/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument();
    expect(document.querySelector('.indicator-summary-card')).toBeTruthy();

    rerender(
      <TestWrapper initialEntries={['/zh-TW/tw-market-sentiment']}>
        <TwMarketSentimentIndex />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('market-sentiment-gauge')).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: /latest market sentiment/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument();
    expect(document.querySelector('.indicator-summary-card')).toBeTruthy();
  });
});
