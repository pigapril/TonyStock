import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  loading: false,
  checkAuthStatus: jest.fn()
};
const mockDialogState = { isOpen: false, type: null, props: {} };
const mockOpenDialog = jest.fn();
const mockFetchFreeTrialEligibility = jest.fn();
const mockNavigate = jest.fn();
let mockRestrictedPreview = false;

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

jest.mock('../../Common/Dialog/useDialog', () => ({
  useDialog: () => ({ dialog: mockDialogState, openDialog: mockOpenDialog })
}));

jest.mock('../../../services/freeTrialService', () => ({
  fetchFreeTrialEligibility: (...args) => mockFetchFreeTrialEligibility(...args)
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
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
    mockAuthState.user = null;
    mockAuthState.loading = false;
    mockDialogState.isOpen = false;
    mockDialogState.type = null;
    mockDialogState.props = {};
    mockRestrictedPreview = false;
    mockFetchFreeTrialEligibility.mockResolvedValue({ eligible: true });
    mockEnhancedApiClient.get.mockImplementation((url) => {
      if (url === '/api/market-sentiment-free') {
        return Promise.resolve({
          data: {
            totalScore: 52,
            compositeScoreLastUpdate: '2026-03-20',
            isRestricted: mockRestrictedPreview,
            restrictionCutoffDate: '2026-08-31',
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
            isRestricted: mockRestrictedPreview,
            restrictionCutoffDate: '2026-08-31',
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
    expect(screen.getByRole('button', { name: /AAII Investor Sentiment/i })).toBeInTheDocument();

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
    expect(screen.getByRole('button', { name: /台指選擇權波動率/ })).toBeInTheDocument();
  });

  it('offers a free trial to guests and routes eligible accounts into the trial after sign-in', async () => {
    mockRestrictedPreview = true;
    const { rerender } = render(
      <TestWrapper initialEntries={['/en/market-sentiment']}>
        <MarketSentimentIndex />
      </TestWrapper>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Try Pro free' }));
    expect(mockOpenDialog).toHaveBeenCalledWith('auth', expect.objectContaining({
      customTitle: expect.any(String),
      customDescription: expect.any(String)
    }));

    mockAuthState.user = { id: 'first-time-user', email: 'first@example.com', plan: 'free' };
    rerender(
      <TestWrapper initialEntries={['/en/market-sentiment']}>
        <MarketSentimentIndex />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/en/payment/free-trial');
    });
  });

  it('sends signed-in accounts to the trial or plans according to first-subscription eligibility', async () => {
    mockRestrictedPreview = true;
    mockAuthState.user = { id: 'eligible-user', email: 'eligible@example.com', plan: 'free' };
    mockFetchFreeTrialEligibility.mockResolvedValueOnce({ eligible: true });

    const { rerender } = render(
      <TestWrapper initialEntries={['/en/market-sentiment']}>
        <MarketSentimentIndex />
      </TestWrapper>
    );

    // 先等 sentiment data 載入（delay banner 出現）再等 eligibility API 完成
    await screen.findByRole('button', { name: 'Try Pro free' });
    await act(async () => {
      await waitFor(() => expect(mockFetchFreeTrialEligibility).toHaveBeenCalledTimes(1));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Try Pro free' }));
    expect(mockNavigate).toHaveBeenCalledWith('/en/payment/free-trial');

    mockNavigate.mockClear();
    mockAuthState.user = { id: 'existing-subscriber', email: 'subscriber@example.com', plan: 'free' };
    mockFetchFreeTrialEligibility.mockResolvedValueOnce({ eligible: false });
    rerender(
      <TestWrapper initialEntries={['/en/market-sentiment']}>
        <MarketSentimentIndex />
      </TestWrapper>
    );

    await act(async () => {
      await waitFor(() => expect(mockFetchFreeTrialEligibility).toHaveBeenCalledTimes(2));
    });
    // eligible: false → showFreeTrialCta = false → 按鈕文字改為升級文案
    fireEvent.click(await screen.findByRole('button', { name: 'Upgrade for latest data' }));
    expect(mockNavigate).toHaveBeenCalledWith('/en/subscription-plans', expect.objectContaining({ state: expect.any(Object) }));
  });
});
