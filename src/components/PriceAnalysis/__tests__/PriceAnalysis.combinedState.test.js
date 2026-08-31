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
  // 2026-08 用 1248 檔標的重跑後，四個狀態都有可查證的方向：
  // 恐懼側「兩個都到位」明顯佔優、「只有五線譜」沒有優勢、
  // 貪婪側「兩個都到頂」後續一年偏弱。文案要各自帶得出數字，
  // 不能退回「無法判斷」這種對使用者沒有用的中立敘述。
  const STATES = ['fearConfirmed', 'fearOnly', 'greedConfirmed', 'greedOnly'];

  it.each([['zh-TW', zhTW], ['en', en]])('%s：四個狀態各自帶數字，不是空話', (_lang, dict) => {
    const combined = dict.priceAnalysis.combined;

    STATES.forEach((state) => {
      expect(combined[state].title).toBeTruthy();
      // 帶得出數字＝有回測依據；純形容詞的文案讀完不知道要做什麼
      expect(combined[state].body).toMatch(/\d/);
      expect(combined[state].body.length).toBeGreaterThan(40);
    });

    // 四個狀態要能被分辨，不能兩張卡講一樣的話
    const titles = STATES.map((state) => combined[state].title);
    expect(new Set(titles).size).toBe(STATES.length);

    ['inside', 'above', 'below'].forEach((state) => {
      expect(dict.priceAnalysis.channel[state]).toBeTruthy();
    });
  });

  it.each([['zh-TW', zhTW], ['en', en]])('%s：兩個都到位的狀態要說明代價，不只講好處', (_lang, dict) => {
    // 恐懼側最強的一格容易被讀成「進場保證」，回測其實顯示期間還會再往下探，
    // 這句拿掉就等於只報喜。
    expect(dict.priceAnalysis.combined.fearConfirmed.body).toMatch(/8%/);
  });

  it.each([['zh-TW', zhTW], ['en', en]])('%s：主打數字必須是 1–3 個月，不是一年', (_lang, dict) => {
    // 一年 +18% 那個數字幾乎全部來自 2008 與 2020；剔掉這兩段就掉到 +3.7% 且不顯著。
    // 把它當主打等於拿危機報酬當常態。真正跨年代都成立的是 1–3 個月。
    const body = dict.priceAnalysis.combined.fearConfirmed.body;
    expect(body).not.toMatch(/18\.4|18\.8/);
  });

  // 這張卡是寫給投資人看的。判準不是「統計名詞一律不准」，而是「這個詞在這一頁上
  // 沒有任何解釋，讀的人不會為了看懂它去翻回測過程」。像「平均」「上漲機率」都留著，
  // 但只在分析報告裡才有意義的簡寫要擋掉。
  const ANALYST_JARGON_ZH = ['超額', '分位', '顯著', 'z 值', 'p 值', '常態'];
  const ANALYST_JARGON_EN = ['excess return', 'percentile', 'statistically', 'p-value', 'z-score'];

  it.each([['zh-TW', zhTW, ANALYST_JARGON_ZH], ['en', en, ANALYST_JARGON_EN]])(
    '%s：不使用分析報告術語', (_lang, dict, jargon) => {
      Object.values(dict.priceAnalysis.combined).forEach(({ title, body }) => {
        jargon.forEach((word) => {
          expect(`${title} ${body}`.toLowerCase()).not.toContain(word.toLowerCase());
        });
      });
    }
  );

  it.each([['zh-TW', zhTW], ['en', en]])('%s：文案沿用畫面上已經有的狀態名稱', (_lang, dict) => {
    const pa = dict.priceAnalysis;
    const combined = pa.combined;
    // 標題要接得上使用者在上方欄位看到的字，不要另創一套說法
    expect(combined.fearConfirmed.title).toContain(pa.sentiment.extremeFear);
    expect(combined.fearConfirmed.title).toContain(pa.channel.below);
    expect(combined.greedConfirmed.title).toContain(pa.sentiment.extremeGreed);
    expect(combined.greedConfirmed.title).toContain(pa.channel.above);
    expect(combined.fearOnly.title).toContain(pa.sentiment.extremeFear);
    expect(combined.greedOnly.title).toContain(pa.sentiment.extremeGreed);
  });

  // 狀態卡的數字和文章是同一份回測。先前就漂過一次（卡片寫 34 檔、文章寫 37 檔；
  // 同樣 60 個交易日，卡片講「兩個月」文章講「三個月」），所以在這裡釘住：
  // 卡片上的每個百分比都要能在文章裡找到。
  it('狀態卡引用的數字都能在文章中找到出處', () => {
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(
      __dirname, '../../../../public/articles',
      '4.樂活五線譜576萬筆台美股資料實測結果分析'
    );
    const article = fs.readFileSync(
      path.join(dir, '樂活五線譜576萬筆台美股資料實測結果分析.zh-TW.ini.md'), 'utf8'
    );

    Object.entries(zhTW.priceAnalysis.combined).forEach(([state, { body }]) => {
      (body.match(/\d+\.?\d*%/g) || []).forEach((figure) => {
        expect(`${state}: ${figure} 不在文章中`).toBe(
          article.includes(figure) ? `${state}: ${figure} 不在文章中` : `${state}: ${figure} 應該出現在文章中`
        );
      });
    });
  });

  it('頁面說明區塊仍保留「不能單獨當買賣依據」', () => {
    expect(zhTW.priceAnalysis.description.tips.limitation).toMatch(/不應該單獨作為買賣依據/);
    expect(en.priceAnalysis.description.tips.limitation).toMatch(/should not be used as the sole basis/i);
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
