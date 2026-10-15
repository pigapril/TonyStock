import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { PriceAnalysis } from '../PriceAnalysis';
import { HOT_SEARCH_CACHE_KEY } from '../hotSearchCache';
import zhTW from '../../../locales/zh-TW/translation.json';
import en from '../../../locales/en/translation.json';
import { trackProductEvent } from '../../../utils/productAnalytics';

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

jest.mock('../../../utils/productAnalytics', () => ({ trackProductEvent: jest.fn() }));

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
  getFreeStockList: jest.fn(() => []),
  getStocksByRegion: jest.fn(() => Promise.resolve({}))
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

const TestWrapper = ({ children, initialEntries }) => (
  <MemoryRouter initialEntries={initialEntries} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = { id: 'user-1', plan: 'pro' };
    mockAuthState.checkAuthStatus.mockResolvedValue(undefined);
    window.localStorage.removeItem(HOT_SEARCH_CACHE_KEY);
    // CRA 預設 resetMocks: true，jest.mock 工廠給的實作每個 test 前都會被清掉，
    // 不重設的話 isStockAllowed 會回傳 undefined，手動送出的路徑會卡在方案檢查。
    require('../../../utils/freeStockListUtils').isStockAllowed.mockReturnValue(true);
    require('../../../utils/freeStockListUtils').getFreeStockList.mockReturnValue([]);
    require('../../../utils/freeStockListUtils').getStocksByRegion.mockResolvedValue({});
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
      expect(screen.getByPlaceholderText(/2330.*AAPL/i)).toBeInTheDocument();
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
      expect(screen.getByPlaceholderText(/2330.*AAPL/i)).toBeInTheDocument();
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

    await screen.findByPlaceholderText(/2330.*AAPL/i);
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

  /* eslint-disable testing-library/no-node-access, testing-library/no-container -- 驗證熱門搜尋填入原有預留節點，而不是新增版面區塊。 */
  it('沒有熱門搜尋資料時預留高度，但不顯示標籤或空的入口', async () => {
    const { container } = render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/2330.*AAPL/i)).toBeInTheDocument();
    });

    const slot = container.querySelector('.pa-hot-search-slot');
    expect(slot).toBeEmptyDOMElement();
    expect(slot).toHaveAttribute('aria-hidden', 'true');
  });

  it('熱門搜尋資料回來後只填入預留區塊', async () => {
    let resolveHotSearches;
    mockEnhancedApiClient.get.mockImplementation((url) => {
      if (url === '/api/hot-searches') {
        return new Promise((resolve) => { resolveHotSearches = resolve; });
      }
      if (url === '/api/integrated-analysis') {
        return Promise.resolve(createIntegratedAnalysisPayload());
      }
      return Promise.resolve({ data: { data: [] } });
    });

    const { container } = render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    const reservedSlot = container.querySelector('.pa-hot-search-slot');
    expect(reservedSlot).toBeEmptyDOMElement();
    await waitFor(() => expect(resolveHotSearches).toBeDefined());
    await act(async () => resolveHotSearches({
      data: { data: { top_searches: [{ keyword: 'SPY', name: 'S&P 500 ETF' }] } }
    }));
    const hotChip = await screen.findByRole('button', { name: /SPY.*S&P 500 ETF/i });
    expect(container.querySelector('.pa-hot-search-slot')).toBe(reservedSlot);
    expect(reservedSlot).toHaveAttribute('aria-hidden', 'false');
    expect(container.querySelector('.pa-hot-search-slot')).toContainElement(hotChip);
    expect(JSON.parse(window.localStorage.getItem(HOT_SEARCH_CACHE_KEY))).toEqual([
      { keyword: 'SPY', name: 'S&P 500 ETF' }
    ]);
  });

  /* eslint-enable testing-library/no-node-access, testing-library/no-container */

  it('先顯示上次榜單，API 回空清單時仍保留', async () => {
    window.localStorage.setItem(HOT_SEARCH_CACHE_KEY, JSON.stringify([
      { keyword: 'AAPL', name: 'Apple' }
    ]));
    let resolveHotSearches;
    mockEnhancedApiClient.get.mockImplementation((url) => {
      if (url === '/api/hot-searches') {
        return new Promise((resolve) => { resolveHotSearches = resolve; });
      }
      if (url === '/api/integrated-analysis') {
        return Promise.resolve(createIntegratedAnalysisPayload());
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    expect(screen.getByRole('button', { name: /AAPL.*Apple/i })).toBeInTheDocument();
    await act(async () => {
      resolveHotSearches({ data: { data: { top_searches: [] } } });
    });
    expect(screen.getByRole('button', { name: /AAPL.*Apple/i })).toBeInTheDocument();
  });

  it('API 暫時失敗時不清掉上次榜單', async () => {
    window.localStorage.setItem(HOT_SEARCH_CACHE_KEY, JSON.stringify([
      { keyword: 'MSFT', name: 'Microsoft' }
    ]));
    const requestError = Object.assign(new Error('offline'), { response: { status: 403 } });
    mockEnhancedApiClient.get.mockImplementation((url) => {
      if (url === '/api/hot-searches') return Promise.reject(requestError);
      if (url === '/api/integrated-analysis') return Promise.resolve(createIntegratedAnalysisPayload());
      return Promise.resolve({ data: { data: [] } });
    });

    render(
      <TestWrapper>
        <PriceAnalysis />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockEnhancedApiClient.get).toHaveBeenCalledWith('/api/hot-searches', expect.any(Object));
    });
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('button', { name: /MSFT.*Microsoft/i })).toBeInTheDocument();
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

  it('試用返回非 SPY 股票時保留年數與日期，權限重新整理也不重複查詢', async () => {
    const initialEntries = [{
      pathname: '/zh-TW/priceanalysis',
      search: '?stockCode=AAPL&years=7&backTestDate=2026-09-01',
      state: { resumeAfterTrial: true }
    }];
    const tree = () => <TestWrapper initialEntries={initialEntries}><PriceAnalysis /></TestWrapper>;
    const { rerender } = render(tree());

    await waitFor(() => expect(mockEnhancedApiClient.get).toHaveBeenCalledWith(
      '/api/integrated-analysis',
      expect.objectContaining({ params: { stockCode: 'AAPL', years: 7, backTestDate: '2026-09-01' } })
    ));
    await waitFor(() => expect(trackProductEvent).toHaveBeenCalledWith(
      'price_analysis_completed', expect.any(Object)
    ));
    expect(screen.getByPlaceholderText(/2330.*AAPL/i)).toHaveValue('AAPL');
    expect(screen.getByPlaceholderText(/輸入年數|Enter years/i)).toHaveValue('7');

    mockAuthState.user = { id: 'user-1', plan: 'pro', refreshed: true };
    rerender(tree());
    await act(async () => { await Promise.resolve(); });

    expect(mockEnhancedApiClient.get.mock.calls.filter(([url]) => url === '/api/integrated-analysis'))
      .toHaveLength(1);
    expect(trackProductEvent.mock.calls.filter(([event]) => event === 'price_analysis_completed'))
      .toHaveLength(1);
  });

  it('偽造試用返回狀態不能讓免費使用者查詢受限股票', async () => {
    mockAuthState.user = { id: 'user-1', plan: 'free' };
    require('../../../utils/freeStockListUtils').isStockAllowed.mockImplementation((symbol, plan) => plan === 'pro');
    render(
      <TestWrapper initialEntries={[{
        pathname: '/zh-TW/priceanalysis',
        search: '?stockCode=AAPL&years=7&backTestDate=2026-09-01',
        state: { resumeAfterTrial: true }
      }]}><PriceAnalysis /></TestWrapper>
    );

    await waitFor(() => expect(mockDialogApi.openDialog).toHaveBeenCalledWith(
      'featureUpgrade', expect.objectContaining({ stockCode: 'AAPL' })
    ));
    expect(mockEnhancedApiClient.get.mock.calls.filter(([url]) => url === '/api/integrated-analysis'))
      .toHaveLength(0);
    expect(trackProductEvent).not.toHaveBeenCalledWith('price_analysis_completed', expect.any(Object));
    const [, props] = mockDialogApi.openDialog.mock.calls.find(([type]) => type === 'featureUpgrade');
    const returnPath = new URL(props.upgradeUrl, 'https://local.invalid').searchParams.get('returnTo');
    const returnUrl = new URL(returnPath, 'https://local.invalid');
    expect(Object.fromEntries(returnUrl.searchParams)).toEqual({
      stockCode: 'AAPL', years: '7', backTestDate: '2026-09-01'
    });
  });

  it.each(['manual', 'hotSearch'])('從 %s 觸發升級時保留剛選的股票與目前查詢設定', async (source) => {
    mockAuthState.user = { id: 'user-1', plan: 'free' };
    require('../../../utils/freeStockListUtils').isStockAllowed.mockReturnValue(false);
    window.localStorage.setItem(HOT_SEARCH_CACHE_KEY, JSON.stringify([{ keyword: 'AAPL', name: 'Apple' }]));
    render(
      <TestWrapper initialEntries={['/zh-TW/priceanalysis?stockCode=MSFT&years=3.5&backTestDate=2026-09-01']}>
        <PriceAnalysis />
      </TestWrapper>
    );
    await screen.findByRole('group', { name: /分析期長|Analysis Period/i });
    clickHorizon('自訂|Custom');
    const yearsInput = await screen.findByPlaceholderText(/輸入年數|Enter years/i);
    fireEvent.change(yearsInput, { target: { value: '7' } });

    if (source === 'manual') {
      const stockInput = screen.getByPlaceholderText(/2330.*AAPL/i);
      fireEvent.change(stockInput, { target: { value: 'AAPL' } });
      fireEvent.submit(stockInput.closest('form'));
    } else {
      fireEvent.click(screen.getByRole('button', { name: /AAPL.*Apple/i }));
    }

    await waitFor(() => expect(mockDialogApi.openDialog).toHaveBeenCalledWith(
      'featureUpgrade', expect.objectContaining({ stockCode: 'AAPL' })
    ));
    const [, props] = mockDialogApi.openDialog.mock.calls.find(([type]) => type === 'featureUpgrade');
    const returnPath = new URL(props.upgradeUrl, 'https://local.invalid').searchParams.get('returnTo');
    const returnUrl = new URL(returnPath, 'https://local.invalid');
    expect(returnUrl.pathname).toMatch(/^\/(zh-TW|en)\/priceanalysis$/);
    expect(Object.fromEntries(returnUrl.searchParams)).toEqual({
      stockCode: 'AAPL', years: '7', backTestDate: '2026-09-01'
    });
    expect(mockEnhancedApiClient.get.mock.calls.filter(([url]) => url === '/api/integrated-analysis'))
      .toHaveLength(0);
  });

  it('訪客登入後延續剛輸入的股票、年數與日期', async () => {
    mockAuthState.isAuthenticated = false;
    mockAuthState.user = null;
    const initialEntries = ['/zh-TW/priceanalysis?stockCode=MSFT&years=7&backTestDate=2026-09-01'];
    const tree = () => <TestWrapper initialEntries={initialEntries}><PriceAnalysis /></TestWrapper>;
    const { rerender } = render(tree());
    const stockInput = await screen.findByPlaceholderText(/2330.*AAPL/i);
    fireEvent.change(stockInput, { target: { value: 'AAPL' } });
    fireEvent.submit(stockInput.closest('form'));

    await waitFor(() => expect(mockDialogApi.openDialog).toHaveBeenCalledWith('auth', expect.any(Object)));
    const [, props] = mockDialogApi.openDialog.mock.calls.find(([type]) => type === 'auth');
    expect(Object.fromEntries(new URL(props.returnPath, 'https://local.invalid').searchParams)).toEqual({
      stockCode: 'AAPL', years: '7', backTestDate: '2026-09-01'
    });
    expect(mockEnhancedApiClient.get.mock.calls.filter(([url]) => url === '/api/integrated-analysis'))
      .toHaveLength(0);

    mockAuthState.isAuthenticated = true;
    mockAuthState.user = { id: 'user-1', plan: 'pro' };
    rerender(tree());

    await waitFor(() => expect(mockEnhancedApiClient.get).toHaveBeenCalledWith(
      '/api/integrated-analysis',
      expect.objectContaining({ params: { stockCode: 'AAPL', years: 7, backTestDate: '2026-09-01' } })
    ));
    expect(screen.getByPlaceholderText(/2330.*AAPL/i)).toHaveValue('AAPL');
    expect(mockEnhancedApiClient.get.mock.calls.filter(([url]) => url === '/api/integrated-analysis'))
      .toHaveLength(1);
  });

  it.each(['success', 'failed', 'empty'])('只有成功的分析資料才送完成事件：%s', async (outcome) => {
    let finishAnalysis;
    let failAnalysis;
    mockEnhancedApiClient.get.mockImplementation((url) => {
      if (url === '/api/integrated-analysis') return new Promise((resolve, reject) => {
        finishAnalysis = resolve;
        failAnalysis = reject;
      });
      return Promise.resolve({ data: { data: { top_searches: [] } } });
    });
    render(
      <TestWrapper initialEntries={[{
        pathname: '/zh-TW/priceanalysis',
        search: '?stockCode=AAPL&years=7',
        state: { resumeAfterTrial: true }
      }]}><PriceAnalysis /></TestWrapper>
    );
    await waitFor(() => expect(finishAnalysis).toBeDefined());
    expect(trackProductEvent).not.toHaveBeenCalledWith('price_analysis_completed', expect.any(Object));

    await act(async () => {
      if (outcome === 'failed') {
        failAnalysis(Object.assign(new Error('offline'), { response: { status: 403 } }));
      } else {
        const payload = createIntegratedAnalysisPayload('AAPL');
        if (outcome === 'empty') payload.data.data.prices = [];
        finishAnalysis(payload);
      }
    });

    const completed = trackProductEvent.mock.calls.filter(([event]) => event === 'price_analysis_completed');
    expect(completed).toHaveLength(outcome === 'success' ? 1 : 0);
  });
});
