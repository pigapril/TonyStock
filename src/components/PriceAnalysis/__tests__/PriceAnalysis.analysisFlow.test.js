import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { PriceAnalysis } from '../PriceAnalysis';
import zhTW from '../../../locales/zh-TW/translation.json';
import en from '../../../locales/en/translation.json';

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

// 期長從下拉選單改成一排按鈕。這些 helper 讓測試照使用者的方式操作（點按鈕），
// 而不是設 select 的 value。
const horizonButton = (label) => screen.getByRole('button', { name: new RegExp(label) });
const clickHorizon = (label) => fireEvent.click(horizonButton(label));

describe('PriceAnalysis analysis flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // CRA 預設 resetMocks: true，jest.mock 工廠給的實作每個 test 前都會被清掉，
    // 不重設的話 isStockAllowed 會回傳 undefined，手動送出的路徑會卡在方案檢查。
    require('../../../utils/freeStockListUtils').isStockAllowed.mockReturnValue(true);
    require('../../../utils/freeStockListUtils').getFreeStockList.mockReturnValue([]);
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

  it('頂部查詢列不再有「開始分析」按鈕，設定直接攤在搜尋列右緣', async () => {
    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/請輸入股票代碼|e\.g\., SPY, AAPL/i)).toBeInTheDocument();
    });

    // 選建議、按 Enter、點清單都會直接分析，按鈕就沒有存在的理由了
    expect(screen.queryByRole('button', { name: /開始分析|Start Analysis/i })).not.toBeInTheDocument();

    // 桌機空間夠，期長與回測日期就直接放出來，不藏在收合面板後面。
    // 期長是三個週期＋自訂，四個都要在，而且預設按著 3.5 年那顆。
    const group = screen.getByRole('group', { name: /分析期長|Analysis Period/i });
    const buttons = [...group.querySelectorAll('button')];
    expect(buttons).toHaveLength(4);
    expect(buttons.filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(buttons.find((b) => b.getAttribute('aria-pressed') === 'true').textContent)
      .toMatch(/3\.5/);
    // 三個週期各自的位階放在結果列的「其他週期情緒」，搜尋列只負責切換：
    // 同一件事在兩個地方講，還會把輸入框的寬度吃掉。
    expect(group.querySelectorAll('.pa-horizon__dot')).toHaveLength(0);
    // 欄位靠自己的字說明自己是什麼，不另外加標題（placeholder 就是欄位名稱）
    expect(screen.getByPlaceholderText(/回測日期|Backtest date/i)).toBeInTheDocument();
  });

  it('自訂年數按 Enter 就送出（表單要有隱含送出，不能靠計時器猜）', async () => {
    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    await screen.findByRole('group', { name: /分析期長|Analysis Period/i });
    await waitFor(() => {
      expect(mockEnhancedApiClient.get.mock.calls.some(([url]) => url === '/api/integrated-analysis')).toBe(true);
    });

    clickHorizon('自訂|Custom');
    const yearsInput = await screen.findByPlaceholderText(/輸入年數|Enter years/i);
    fireEvent.change(yearsInput, { target: { value: '7' } });

    // 打完還沒送出之前，不該有任何 7 年的請求
    expect(
      mockEnhancedApiClient.get.mock.calls.some(([url, config]) => (
        url === '/api/integrated-analysis' && config?.params?.years === 7
      ))
    ).toBe(false);

    fireEvent.submit(yearsInput.closest('form'));

    await waitFor(() => {
      expect(
        mockEnhancedApiClient.get.mock.calls.some(([url, config]) => (
          url === '/api/integrated-analysis' && config?.params?.years === 7
        ))
      ).toBe(true);
    });
  });

  it('年數欄位移開游標也會送出，pill 上的數字才不會跟圖表對不起來', async () => {
    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    await screen.findByRole('group', { name: /分析期長|Analysis Period/i });
    await waitFor(() => {
      expect(mockEnhancedApiClient.get.mock.calls.some(([url]) => url === '/api/integrated-analysis')).toBe(true);
    });

    clickHorizon('自訂|Custom');
    const yearsInput = await screen.findByPlaceholderText(/輸入年數|Enter years/i);
    fireEvent.change(yearsInput, { target: { value: '5' } });
    fireEvent.blur(yearsInput);

    await waitFor(() => {
      expect(
        mockEnhancedApiClient.get.mock.calls.some(([url, config]) => (
          url === '/api/integrated-analysis' && config?.params?.years === 5
        ))
      ).toBe(true);
    });
  });

  it('表單有隱含送出用的 submit，Enter 才不會被瀏覽器忽略', async () => {
    const { container } = render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    await screen.findByPlaceholderText(/請輸入股票代碼|e\.g\., SPY, AAPL/i);
    const form = container.querySelector('form.pa-searchbar');
    // 表單有兩個以上文字欄位時，沒有 submit 按鈕的話瀏覽器不會處理 Enter
    expect(form.querySelector('button[type="submit"]')).toBeInTheDocument();
  });

  it('空狀態的提示不會叫使用者去點已經不存在的按鈕', () => {
    // 按鈕拿掉之後這句還留著「請輸入條件並點擊『開始分析』」，
    // 等於叫人去找一個畫面上沒有的東西。
    [zhTW, en].forEach((dict) => {
      expect(dict.priceAnalysis.prompt.enterSymbol).not.toMatch(/開始分析|Start Analysis/i);
    });
  });

  it('期長選「自訂」才長出年數輸入框，且不會白打一次 API', async () => {
    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    await screen.findByRole('group', { name: /分析期長|Analysis Period/i });
    await waitFor(() => {
      expect(mockEnhancedApiClient.get.mock.calls.some(([url]) => url === '/api/integrated-analysis')).toBe(true);
    });

    const before = mockEnhancedApiClient.get.mock.calls
      .filter(([url]) => url === '/api/integrated-analysis').length;

    clickHorizon('自訂|Custom');

    // 切到自訂只是預填目前期長，窗口沒變，不該再送一次
    const yearsInput = await screen.findByPlaceholderText(/輸入年數|Enter years/i);
    expect(yearsInput).toHaveValue('3.5');
    expect(
      mockEnhancedApiClient.get.mock.calls.filter(([url]) => url === '/api/integrated-analysis').length
    ).toBe(before);
  });

  it('沒有熱門搜尋資料時整列不渲染，不留空框', async () => {
    const { container } = render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/請輸入股票代碼|e\.g\., SPY, AAPL/i)).toBeInTheDocument();
    });

    expect(container.querySelector('.pa-hot-row')).not.toBeInTheDocument();
  });

  it('換分析期長就直接重跑，不必再按一次按鈕', async () => {
    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(
        mockEnhancedApiClient.get.mock.calls.some(([url, config]) => (
          url === '/api/integrated-analysis' && config?.params?.years === 3.5
        ))
      ).toBe(true);
    });

    clickHorizon('0.5 年|0.5 years');

    await waitFor(() => {
      expect(
        mockEnhancedApiClient.get.mock.calls.some(([url, config]) => (
          url === '/api/integrated-analysis' && config?.params?.years === 0.5
        ))
      ).toBe(true);
    }, { timeout: 3000 });
  });
});
