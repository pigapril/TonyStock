import React from 'react';
import { render, screen } from '@testing-library/react';
import { getChannelState, getCombinedStateKey } from '../PriceAnalysis';
import PriceAnalysisChartWorkspace from '../PriceAnalysisChartWorkspace';
import zhTW from '../../../locales/zh-TW/translation.json';
import en from '../../../locales/en/translation.json';

// PriceAnalysis.js 會經由 auth → apiClient 鏈把 axios(ESM)拉進來，jest 轉不動，
// 所以即使這裡只用到兩個純函式，仍要跟既有測試一樣把這條鏈擋掉。
jest.mock('../../../utils/enhancedApiClient', () => ({ get: jest.fn() }));

jest.mock('../../../components/Auth/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: null, checkAuthStatus: jest.fn() })
}));

jest.mock('../../../components/Common/Dialog/useDialog', () => ({
  useDialog: () => ({ openDialog: jest.fn() })
}));

jest.mock('../../../components/Common/InterstitialAdModal/AdContext', () => ({
  useAdContext: () => ({ requestAdDisplay: jest.fn() })
}));

jest.mock('../../../components/Watchlist/hooks/useToastManager', () => ({
  useToastManager: () => ({ showToast: jest.fn(), toast: null, hideToast: jest.fn() })
}));

jest.mock('../../../components/Watchlist/services/watchlistService', () => ({
  __esModule: true,
  default: { getCategoriesLite: jest.fn().mockResolvedValue([]) }
}));

jest.mock('../../../utils/freeStockListUtils', () => ({
  isStockAllowed: jest.fn(() => true),
  getFreeStockList: jest.fn(() => [])
}));

jest.mock('../../PageContainer/PageContainer', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>
}));

jest.mock('react-responsive', () => ({ useMediaQuery: jest.fn(() => false) }));

jest.mock('react-chartjs-2', () => ({
  Line: require('react').forwardRef((props, ref) => <div ref={ref} data-testid="line-chart" />)
}));

jest.mock('../../ULBandChart/ULBandChart', () => ({
  __esModule: true,
  default: () => <div data-testid="ul-band-chart" />
}));

describe('getChannelState', () => {
  it('週線價高於上緣時回傳 above', () => {
    expect(getChannelState([130], [120], [90])).toBe('above');
  });

  it('週線價低於下緣時回傳 below', () => {
    expect(getChannelState([70], [110], [90])).toBe('below');
  });

  it('落在通道內回傳 inside', () => {
    expect(getChannelState([100], [110], [90])).toBe('inside');
  });

  it('只取最後一筆，前面的值不影響判定', () => {
    expect(getChannelState([70, 100], [110, 110], [90, 90])).toBe('inside');
  });

  it('缺少通道資料時回傳 null，呼叫端要能接受', () => {
    expect(getChannelState(undefined, undefined, undefined)).toBeNull();
    expect(getChannelState([], [], [])).toBeNull();
    expect(getChannelState([100], [null], [90])).toBeNull();
  });
});

describe('getCombinedStateKey', () => {
  const KEY = 'priceAnalysis.sentiment';

  it('極度恐懼且跌破下緣 → fearConfirmed', () => {
    expect(getCombinedStateKey(`${KEY}.extremeFear`, 'below')).toBe('fearConfirmed');
  });

  it('極度恐懼但通道還在帶內 → fearOnly', () => {
    expect(getCombinedStateKey(`${KEY}.extremeFear`, 'inside')).toBe('fearOnly');
  });

  it('極度貪婪且突破上緣 → greedConfirmed', () => {
    expect(getCombinedStateKey(`${KEY}.extremeGreed`, 'above')).toBe('greedConfirmed');
  });

  it('極度貪婪但通道還在帶內 → greedOnly', () => {
    expect(getCombinedStateKey(`${KEY}.extremeGreed`, 'inside')).toBe('greedOnly');
  });

  it('非極端位階不產生合併狀態', () => {
    ['neutral', 'fear', 'greed'].forEach((level) => {
      expect(getCombinedStateKey(`${KEY}.${level}`, 'below')).toBeNull();
    });
  });

  it('沒有通道資料時，極端位階仍回報「只有五線譜到位」', () => {
    expect(getCombinedStateKey(`${KEY}.extremeFear`, null)).toBe('fearOnly');
  });
});

describe('合併狀態的文案', () => {
  // 2026-08 回測：恐懼側是唯一有統計基礎的一側，所以只有它能帶歷史陳述。
  // 這條規則若被改壞，等於在沒有證據的一側給出時機暗示。
  it.each([['zh-TW', zhTW], ['en', en]])('%s：恐懼側帶回測數字與免責，貪婪側都沒有', (_lang, dict) => {
    const combined = dict.priceAnalysis.combined;

    expect(combined.fearConfirmed.body).toMatch(/2\.7%/);
    expect(combined.greedConfirmed.body).not.toMatch(/2\.7%/);
    expect(combined.greedOnly.body).not.toMatch(/2\.7%/);
    expect(combined.fearOnly.body).not.toMatch(/2\.7%/);

    ['inside', 'above', 'below'].forEach((state) => {
      expect(dict.priceAnalysis.channel[state]).toBeTruthy();
    });
  });

  it('中文恐懼側說明保留免責語句', () => {
    expect(zhTW.priceAnalysis.combined.fearConfirmed.body).toMatch(/不構成投資建議/);
  });

  it('英文恐懼側說明保留免責語句', () => {
    expect(en.priceAnalysis.combined.fearConfirmed.body).toMatch(/not investment advice/i);
  });
});

describe('PriceAnalysisChartWorkspace 渲染合併狀態', () => {
  const baseProps = {
    isMobile: false,
    loading: false,
    isPending: false,
    chartRef: { current: null },
    ulbandChartRef: { current: null },
    chartCardRef: { current: null },
    chartData: { labels: ['2026-03-20'], datasets: [] },
    localizedChartData: null,
    lineChartOptions: {},
    ulbandData: { dates: ['2026-03-20'], prices: [100], upperBand: [110], lowerBand: [90], ma20: [100] },
    syncedXRange: null,
    displayedStockCode: '0050.TW',
    analysisSentimentText: '極度恐懼',
    getSentimentSuffix: (key) => (key ? key.split('.').pop() : 'neutral'),
    formatPrice: (v) => String(v),
    t: (key) => key
  };

  const renderWorkspace = (analysisResult, combinedStateKey) => render(
    <PriceAnalysisChartWorkspace
      {...baseProps}
      analysisResult={analysisResult}
      combinedStateKey={combinedStateKey}
    />
  );

  it('有通道狀態時在 header 顯示通道欄位，並帶上對應的修飾類別', () => {
    const { container } = renderWorkspace(
      { price: 70, sentimentKey: 'priceAnalysis.sentiment.extremeFear', channelState: 'below' },
      'fearConfirmed'
    );

    expect(container.querySelector('.channel-value--below')).toBeInTheDocument();
    expect(screen.getByText('priceAnalysis.channel.below')).toBeInTheDocument();
    expect(container.querySelector('.combined-state-note--fearConfirmed')).toBeInTheDocument();
    expect(screen.getByText('priceAnalysis.combined.fearConfirmed.body')).toBeInTheDocument();
  });

  it('沒有合併狀態時不渲染說明區塊', () => {
    const { container } = renderWorkspace(
      { price: 100, sentimentKey: 'priceAnalysis.sentiment.neutral', channelState: 'inside' },
      null
    );

    expect(container.querySelector('.channel-value')).toBeInTheDocument();
    expect(container.querySelector('.combined-state-note')).not.toBeInTheDocument();
  });

  it('兩張圖上下並排，不再有切換分頁', () => {
    const { container } = renderWorkspace(
      { price: 100, sentimentKey: 'priceAnalysis.sentiment.neutral', channelState: 'inside' },
      null
    );

    expect(container.querySelector('.chart-stack__main')).toBeInTheDocument();
    expect(container.querySelector('.chart-stack__band')).toBeInTheDocument();
    // 交集要能被看見，靠的是兩張圖同時在畫面上，不是使用者自己切分頁
    expect(container.querySelector('.chart-tabs')).not.toBeInTheDocument();
  });

  it('沒有通道資料時不渲染通道欄位數值，畫面其餘部分照常', () => {
    const { container } = renderWorkspace(
      { price: 100, sentimentKey: 'priceAnalysis.sentiment.neutral', channelState: null },
      null
    );

    expect(container.querySelector('.channel-value')).not.toBeInTheDocument();
    expect(screen.getByText('0050.TW')).toBeInTheDocument();
  });
});
