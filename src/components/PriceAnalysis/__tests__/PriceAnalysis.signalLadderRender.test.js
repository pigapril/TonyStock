import React from 'react';
import { render, screen } from '@testing-library/react';
import PriceAnalysisChartWorkspace from '../PriceAnalysisChartWorkspace';
import { getSignalLadder, getHorizonAlignment } from '../signalLadder';
import zhTW from '../../../locales/zh-TW/translation.json';
import en from '../../../locales/en/translation.json';

// 與既有測試相同：擋掉 auth → apiClient → axios(ESM) 那條 jest 轉不動的鏈。
jest.mock('../../../utils/enhancedApiClient', () => ({ get: jest.fn() }));
jest.mock('../../../components/Auth/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: null, checkAuthStatus: jest.fn() })
}));
jest.mock('../../../components/Common/Dialog/useDialog', () => ({ useDialog: () => ({ openDialog: jest.fn() }) }));
jest.mock('../../../components/Common/InterstitialAdModal/AdContext', () => ({ useAdContext: () => ({ requestAdDisplay: jest.fn() }) }));
jest.mock('../../../components/Watchlist/hooks/useToastManager', () => ({
  useToastManager: () => ({ showToast: jest.fn(), toast: null, hideToast: jest.fn() })
}));
jest.mock('../../../components/Watchlist/services/watchlistService', () => ({
  __esModule: true, default: { getCategoriesLite: jest.fn().mockResolvedValue([]) }
}));
jest.mock('../../../utils/freeStockListUtils', () => ({
  isStockAllowed: jest.fn(() => true), getFreeStockList: jest.fn(() => [])
}));
jest.mock('../../PageContainer/PageContainer', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock('react-responsive', () => ({ useMediaQuery: jest.fn(() => false) }));
jest.mock('react-chartjs-2', () => ({
  Line: require('react').forwardRef((props, ref) => <div ref={ref} data-testid="line-chart" />)
}));
jest.mock('../../ULBandChart/ULBandChart', () => ({ __esModule: true, default: () => <div data-testid="ul-band-chart" /> }));

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
  // 真的查表，這樣文案漏寫會被測出來，而不是印出 key 就算過
  t: (key, vars) => {
    const raw = key.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), zhTW);
    if (raw == null) return `MISSING:${key}`;
    return vars ? raw.replace(/\{\{(\w+)\}\}/g, (_, n) => vars[n]) : raw;
  }
};

const snap = { tl_minus_2sd: 80, tl_minus_sd: 90, tl_plus_sd: 110, tl_plus_2sd: 120 };

const renderWith = ({ price = 70, channelState = 'below', horizonSnapshots = { short: snap, medium: snap, long: snap }, marketExtreme = null, displayedHorizonKey = 'long' } = {}) => {
  const alignment = getHorizonAlignment(price, horizonSnapshots);
  const ladder = getSignalLadder({
    sentimentKey: 'priceAnalysis.sentiment.extremeFear', alignment, marketExtreme
  });
  return render(
    <PriceAnalysisChartWorkspace
      {...baseProps}
      analysisResult={{ price, sentimentKey: 'priceAnalysis.sentiment.extremeFear', channelState, alignment }}
      displayedHorizonKey={displayedHorizonKey}
      combinedStateKey={channelState === 'below' ? 'fearConfirmed' : 'fearOnly'}
      signalLadder={ladder}
    />
  );
};

describe('條件清單的畫面', () => {
  it('三個長度都到極端時只有一項，而且打勾', () => {
    const { container } = renderWith();
    const items = container.querySelectorAll('.signal-ladder__item');
    expect(items).toHaveLength(1);
    expect(items[0].className).toContain('signal-ladder__item--met');
    expect(screen.getByText(zhTW.priceAnalysis.ladder.extremeFear.horizons)).toBeInTheDocument();
  });

  it('不重複標題已經講過的通道狀態', () => {
    // 標題是「極度恐懼 ＋ 跌破下緣」，清單再列一次通道就是同一句話講兩遍。
    const { container } = renderWith();
    expect(container.textContent).not.toContain('樂活通道也是');
    expect(container.querySelectorAll('.signal-ladder__item')).toHaveLength(1);
  });

  it('後端沒回週期快照時整個清單不出現，而不是顯示成未達成', () => {
    // 顯示「尚未達成」等於宣稱已經確認過，跟「無從判斷」是兩件事。
    const { container } = renderWith({ horizonSnapshots: null });
    expect(container.querySelector('.signal-ladder')).toBeNull();
    expect(container.textContent).not.toContain(zhTW.priceAnalysis.ladder.extremeFear.horizons);
  });

  it('未達成的項目會標給讀屏，不是只靠顏色', () => {
    const { container } = renderWith({
      horizonSnapshots: { short: snap, medium: { ...snap, tl_minus_2sd: 10 }, long: snap }  // 1.5 年還沒到極端
    });
    const item = container.querySelector('.signal-ladder__item--pending');
    expect(item).not.toBeNull();
    expect(item.getAttribute('aria-label')).toContain(zhTW.priceAnalysis.ladder.notMet);
  });

  it('沒有市場資料時不列市場那一項——不顯示永遠打不了勾的條件', () => {
    const { container } = renderWith();
    expect(container.textContent).not.toContain('整個市場');
  });

  it('有市場資料時列出來，而且不把廣度的百分比丟給使用者', () => {
    // 「目前有 31.2% 的標的在這個位置」要先知道池子是哪 28／38 檔、門檻怎麼定才讀得懂。
    // 使用者查的個股不一定在池子裡，看到「0%」還會跟眼前的極度恐懼打架。
    const { container } = renderWith({
      marketExtreme: { extremeFear: true, extremeGreed: false, fearPct: 31.2, greedPct: 0, date: '2026-09-05' }
    });
    const items = container.querySelectorAll('.signal-ladder__item');
    expect(items).toHaveLength(2);
    expect(items[1].textContent).toContain(zhTW.priceAnalysis.ladder.extremeFear.market);
    expect(container.textContent).not.toContain('31.2');
    expect(items[1].className).toContain('--met');
  });

  it('市場還沒到極端時顯示未達成，但一樣不出現百分比', () => {
    const { container } = renderWith({
      marketExtreme: { extremeFear: false, extremeGreed: false, fearPct: 4.1, greedPct: 0, date: '2026-09-05' }
    });
    const item = container.querySelectorAll('.signal-ladder__item')[1];
    expect(item.className).toContain('--pending');
    expect(item.textContent).not.toContain('4.1');
  });

  it('清單跟原本的說明在同一塊，且仍在圖表卡片外面', () => {
    const { container } = renderWith();
    const ladder = container.querySelector('.signal-ladder');
    expect(ladder.closest('.combined-state-note')).not.toBeNull();
    expect(ladder.closest('.chart-card')).toBeNull();
  });

  it('原本的標題與內文一字未改，仍然照常顯示', () => {
    renderWith();
    expect(screen.getByText(zhTW.priceAnalysis.combined.fearConfirmed.title)).toBeInTheDocument();
    expect(screen.getByText(zhTW.priceAnalysis.combined.fearConfirmed.body)).toBeInTheDocument();
  });

  it('非極端位階時完全不顯示清單', () => {
    const alignment = getHorizonAlignment(100, { short: snap, medium: snap, long: snap });
    const { container } = render(
      <PriceAnalysisChartWorkspace
        {...baseProps}
        analysisResult={{ price: 100, sentimentKey: 'priceAnalysis.sentiment.neutral', channelState: 'inside', alignment }}
        combinedStateKey={null}
        signalLadder={getSignalLadder({ sentimentKey: 'priceAnalysis.sentiment.neutral', alignment })}
      />
    );
    expect(container.querySelector('.signal-ladder')).toBeNull();
  });
});

describe('條件清單的文案', () => {
  const zh = zhTW.priceAnalysis.ladder;
  const enLadder = en.priceAnalysis.ladder;

  it('中英文的鍵完全對齊，不會有一邊漏翻', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(enLadder).sort());
    // 階梯只在恐懼側出現，所以只有 extremeFear 一組（見 signalLadder.js 的說明）
    expect(Object.keys(zh)).not.toContain('extremeGreed');
    expect(Object.keys(zh.extremeFear).sort()).toEqual(Object.keys(enLadder.extremeFear).sort());
  });

  it('不使用只有內部看得懂的詞', () => {
    // Tony 明確點名過：畫面上不准出現驗證過程中自創的用語。
    // 只掃「值」——鍵名（horizons 之類）是程式內部用的，使用者看不到。
    const values = (obj) => Object.values(obj)
      .flatMap((v) => (typeof v === 'string' ? [v] : values(v)));

    const banned = ['期長', '廣度', '訊號強度', '分位', '中位', '回測', '對齊'];
    const text = values(zh).join(' ');
    banned.forEach((word) => expect(text).not.toContain(word));

    const bannedEn = ['percentile', 'breadth', 'backtest', 'horizon', 'median'];
    const textEn = values(enLadder).join(' ').toLowerCase();
    bannedEn.forEach((word) => expect(textEn).not.toContain(word));
  });

  it('用的是網站上已經有的名詞（極度恐懼／貪婪）', () => {
    expect(zh.extremeFear.horizons).toContain('極度恐懼');
    expect(zh.extremeFear.market).toContain('極度恐懼');
  });

  it('期長用具體年數，不用「短期」——「短期」在樂活通道已經有別的意思了', () => {
    // 樂活通道的狀態現在叫「跌破下緣／突破上緣」；「短期」曾經同時被兩張圖用，
    // 五線譜的「短期」指半年視窗。同一張卡上兩個意思，使用者分不出來。
    Object.values(zh).forEach((v) => {
      if (typeof v === 'object') Object.values(v).forEach((s) => expect(s).not.toContain('短期'));
    });
    expect(zh.extremeFear.horizons).toContain('0.5 年');
    expect(zh.extremeFear.horizons).toContain('3.5 年');
  });
});

describe('其他週期情緒', () => {
  const cells = (container) => [...container.querySelectorAll('.horizon-grid__cell')]
    .map((el) => el.querySelector('.horizon-grid__period').textContent);

  it('只列沒被畫出來的兩個週期——圖表那個週期就是左邊的「市場情緒」', () => {
    const { container } = renderWith({ displayedHorizonKey: 'long' });
    expect(cells(container)).toEqual([
      zhTW.priceAnalysis.form.periodShort,
      zhTW.priceAnalysis.form.periodMedium
    ]);
  });

  it('換一個圖表週期，被拿掉的就換成那一個', () => {
    const { container } = renderWith({ displayedHorizonKey: 'short' });
    expect(cells(container)).toEqual([
      zhTW.priceAnalysis.form.periodMedium,
      zhTW.priceAnalysis.form.periodLong
    ]);
  });

  it('自訂年數時三個都不是圖表週期，三個都列', () => {
    const { container } = renderWith({ displayedHorizonKey: null });
    expect(cells(container)).toHaveLength(3);
  });

  it('排在「市場情緒」與「樂活通道」之間', () => {
    const { container } = renderWith();
    const labels = [...container.querySelectorAll('.analysis-item .analysis-label')]
      .map((el) => el.textContent.replace(/[^\u4e00-\u9fa5]/g, ''));
    const i = labels.indexOf(zhTW.priceAnalysis.result.marketSentiment);
    expect(labels[i + 1]).toBe(zhTW.priceAnalysis.result.horizons);
    expect(labels[i + 2]).toBe(zhTW.priceAnalysis.result.channelPosition);
  });
});
