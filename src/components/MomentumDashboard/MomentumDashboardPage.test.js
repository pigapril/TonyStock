import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import apiClient from '../../api/apiClient';
import { useAuth } from '../Auth/useAuth';
import MomentumDashboardPage from './MomentumDashboardPage';
import { TOUR_STORAGE_KEY } from './tourStorage';
import { trackProductEvent } from '../../utils/productAnalytics';
jest.mock('../PageContainer/PageContainer', () => ({children}) => <>{children}</>);
jest.mock('./MomentumScreenResults', () => ({plan}) => <div data-testid="momentum-screen-results">{plan}</div>);
jest.mock('./MomentumDashboardTour', () => ({onFinish}) => <div role="dialog"><button onClick={onFinish}>完成教學</button></div>);
jest.mock('../../utils/productAnalytics', () => ({ trackProductEvent: jest.fn() }));

jest.mock('../Auth/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../../api/apiClient', () => ({ get: jest.fn() }));
jest.mock('react-i18next', () => {
  const copy = require('../../locales/zh-TW/translation.json');
  const t = (key, options = {}) => {
    const value = key.split('.').reduce((item, part) => item?.[part], copy) ?? options.defaultValue ?? key;
    return value.replace(/{{(\w+)}}/g, (_, name) => options[name] ?? '');
  };
  return { useTranslation: () => ({ t, i18n: { language: 'zh-TW' } }) };
});

const industry = [
  { symbol: 'XLK', name: 'Technology Select Sector SPDR Fund', group: 'Technology', Rank: 81, change1dPct: -0.018, price: 140, return20: 0.15, benchmarkReturn20: 0.10, return60: -0.08, benchmarkReturn60: -0.05, '20R': 90, '60R': 80, '120R': 77, REL20: 0.01, REL60: 0.02, REL120: 0.03 },
  { symbol: 'XLE', name: 'Energy Select Sector SPDR Fund', group: 'Energy', Rank: 45, change1dPct: 0.023 }
];
const response = (rows = industry) => ({ data: { data: { access: { version: 2, plan: 'pro', totalCount: 5, freeCount: 2 }, asOf: '2026-09-25', data: {
  Industry: rows, Assets: [{ symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', group: 'U.S. Market', Rank: 72, change1dPct: 0.001 }], Structure: [{ symbol: 'SPMO', name: 'Invesco S&P 500 Momentum ETF', group: 'Factors', Rank: 60 }, { symbol: 'IWF', name: 'iShares Russell 1000 Growth ETF', group: 'Growth', Rank: 70 }]
} } } });
const assetRows = () => screen.getAllByRole('button').filter((button) => button.classList.contains('momentum-row'));

describe('MomentumDashboardPage', () => {
  beforeEach(() => { window.localStorage.setItem(TOUR_STORAGE_KEY, '1'); jest.clearAllMocks(); useAuth.mockReturnValue({ user: null, loading: false }); apiClient.get.mockResolvedValue(response()); });

  it('selects the first ETF on desktop and keeps the panel open while changing rows and filters', async () => {
    const originalMedia = window.matchMedia;
    window.matchMedia = query => ({matches: query === '(min-width: 901px)', addEventListener: jest.fn(), removeEventListener: jest.fn()});
    try {
      render(<MomentumDashboardPage />);
      await screen.findByRole('complementary', {name:'XLK 明細'});
      expect(assetRows()[0]).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('complementary', {name:'XLK 明細'})).not.toHaveFocus();
      fireEvent.click(assetRows()[0]);
      expect(screen.getByRole('complementary', {name:'XLK 明細'})).toBeVisible();
      fireEvent.click(assetRows()[1]);
      expect(screen.getByRole('complementary', {name:'XLE 明細'})).toBeVisible();
      fireEvent.change(screen.getByRole('searchbox'), {target:{value:'科技'}});
      expect(screen.getByRole('complementary', {name:'XLK 明細'})).toBeVisible();
      expect(screen.getByRole('searchbox')).not.toHaveAttribute('aria-hidden', 'true');
      fireEvent.change(screen.getByRole('searchbox'), {target:{value:'no-match'}});
      expect(screen.queryByRole('complementary', {name:/明細/})).not.toBeInTheDocument();
      fireEvent.change(screen.getByRole('searchbox'), {target:{value:''}});
      expect(screen.getByRole('complementary', {name:'XLK 明細'})).toBeVisible();
      fireEvent.click(screen.getByRole('button', {name:'主要資產'}));
      expect(screen.getByRole('complementary', {name:'SPY 明細'})).toBeVisible();
    } finally { window.matchMedia = originalMedia; }
  });

  it('allows returning users to replay the tutorial and remembers dismissal', async () => {
    render(<MomentumDashboardPage />);await screen.findByText('XLK');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'使用教學'}));await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button',{name:'完成教學'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1');
    fireEvent.click(screen.getByRole('button',{name:'使用教學'}));await screen.findByRole('dialog');
  });

  it('remembers dismissal when users select a primary tab during the tutorial', async () => {
    render(<MomentumDashboardPage />); await screen.findByText('XLK');
    window.localStorage.removeItem(TOUR_STORAGE_KEY);
    fireEvent.click(screen.getByRole('button', {name:'使用教學'})); await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('tab', {name:'動能選股'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1');
  });

  it('starts the first-visit tutorial only after usable data has loaded', async () => {
    jest.useFakeTimers();window.localStorage.removeItem(TOUR_STORAGE_KEY);
    let resolve;apiClient.get.mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
    const view=render(<MomentumDashboardPage />);
    try {
      await act(async()=>{jest.advanceTimersByTime(2000);});
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button',{name:'使用教學'})).toBeDisabled();
      await act(async()=>{resolve(response());});
      await act(async()=>{jest.advanceTimersByTime(900);});
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button',{name:'完成教學'}));
      await act(async()=>{jest.advanceTimersByTime(2000);});
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } finally {view.unmount();jest.clearAllTimers();jest.useRealTimers();}
  });

  it('starts with momentum and switches both the map and ETF ordering to daily change', async () => {
    render(<MomentumDashboardPage />);
    await screen.findByText('XLK');
    expect(assetRows()[0]).toHaveTextContent('XLK');
    expect(screen.getByRole('button', { name: '科技，81，查看標的' })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('group', { name: '比較方式' })).getByRole('button', { name: '單日漲跌' }));
    expect(assetRows()[0]).toHaveTextContent('XLE');
    expect(trackProductEvent).toHaveBeenCalledWith('momentum_view');
    expect(trackProductEvent).toHaveBeenCalledWith('momentum_interaction', expect.objectContaining({ action: 'metric_change', metric: 'daily' }));
    expect(screen.getByRole('button', { name: '科技，-1.8%，查看標的' })).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/api/public/momentum-dashboard?access=v2', { signal: expect.any(AbortSignal) });
  });

  it('toggles both sortable columns and keeps missing values last', async () => {
    apiClient.get.mockResolvedValue(response([...industry, { symbol: 'EMPTY', name: 'Missing', group: 'Other', Rank: null, change1dPct: null }]));
    render(<MomentumDashboardPage />);
    await screen.findByText('XLK');
    fireEvent.click(screen.getByRole('button', { name: '近期動能強弱：點擊改為由低至高' }));
    expect(assetRows()[0]).toHaveTextContent('XLE');
    expect(assetRows().at(-1)).toHaveTextContent('EMPTY');
    expect(screen.getByText('依動能分數由低至高排列')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '近期動能強弱：點擊改為由高至低' }));
    expect(assetRows()[0]).toHaveTextContent('XLK');
    fireEvent.click(screen.getByRole('button', { name: '單日漲跌：點擊改為由高至低' }));
    expect(assetRows()[0]).toHaveTextContent('XLE');
    fireEvent.click(screen.getByRole('button', { name: '單日漲跌：點擊改為由低至高' }));
    expect(assetRows()[0]).toHaveTextContent('XLK');
    expect(assetRows().at(-1)).toHaveTextContent('EMPTY');
    expect(screen.getByText('依單日漲跌幅由低至高排列')).toBeVisible();
  });

  it('filters by sector, opens the shared detail panel and clears the filter', async () => {
    render(<MomentumDashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: '科技，81，查看標的' }));
    expect(screen.queryByText('XLE')).not.toBeInTheDocument();
    fireEvent.click(assetRows()[0]);
    expect(assetRows()[0]).toHaveAttribute('aria-expanded', 'true');
    expect(trackProductEvent).toHaveBeenCalledWith('momentum_interaction', expect.objectContaining({ action: 'asset_open', asset_symbol: 'XLK' }));
    expect(screen.getByRole('complementary', { name: /明細/ })).toHaveTextContent('$140.00');
    expect(screen.getByRole('columnheader', {name:'120 交易日'})).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /在 Yahoo Finance 查看標的資料/ })).toHaveAttribute('href', 'https://finance.yahoo.com/quote/XLK/');
    fireEvent.click(screen.getByRole('button', { name: /返回全部標的/ }));
    expect(screen.getByText('XLE')).toBeInTheDocument();
  });

  it('separates screening from browsing and preserves the ETF selection when returning', async () => {
    render(<MomentumDashboardPage />); await screen.findByText('XLK');
    fireEvent.click(assetRows()[0]);
    const original = assetRows()[0];
    fireEvent.click(screen.getByRole('tab', { name: '動能選股' }));
    expect(screen.getByTestId('momentum-screen-results')).toBeVisible();
    expect(screen.queryByRole('group', { name: '比較方式' })).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: /明細/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '市場總覽' }));
    expect(original).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '← 返回 ETF 清單' }));
    expect(screen.queryByRole('complementary', { name: /明細/ })).not.toBeInTheDocument();
    expect(original).toHaveFocus();
  });

  it('restores the mobile list scroll position and supports keyboard tab navigation', async () => {
    const originalMedia = window.matchMedia, originalScroll = window.scrollTo;
    const originalIntoView = Element.prototype.scrollIntoView;
    const originalY = window.scrollY;
    window.matchMedia = query => ({ matches: query === '(max-width: 900px)' });
    window.scrollTo = jest.fn(); Element.prototype.scrollIntoView = jest.fn();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 420 });
    try {
      render(<MomentumDashboardPage />); await screen.findByText('XLK');
      const trigger = assetRows()[0]; fireEvent.click(trigger);
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({block:'start', behavior:'auto'});
      fireEvent.click(screen.getByRole('button', {name:'← 返回 ETF 清單'}));
      expect(window.scrollTo).toHaveBeenCalledWith({top:420, behavior:'auto'});
      expect(trigger).toHaveFocus();
      fireEvent.keyDown(screen.getByRole('tab', {name:'市場總覽'}), {key:'ArrowRight'});
      expect(screen.getByRole('tab', {name:'動能選股'})).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', {name:'動能選股'})).toHaveFocus();
    } finally {
      window.matchMedia = originalMedia; window.scrollTo = originalScroll;
      Element.prototype.scrollIntoView = originalIntoView;
      Object.defineProperty(window, 'scrollY', {configurable:true, value:originalY});
    }
  });

  it('supports Chinese group search and resets the search when changing scope', async () => {
    render(<MomentumDashboardPage />);
    await screen.findByText('XLK');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '能源' } });
    expect(screen.queryByText('XLK')).not.toBeInTheDocument();
    expect(screen.getByText('XLE')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '主要資產' }));
    expect(screen.getByText('SPY')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('shows actual asset and benchmark returns as percentages, not their difference', async () => {
    render(<MomentumDashboardPage />);
    await screen.findByText('XLK');
    fireEvent.click(assetRows()[0]);
    const detail = screen.getByRole('complementary', { name: /明細/ });
    expect(within(detail).getByText('+15.0%')).toBeVisible();
    expect(within(detail).getByText('+10.0%')).toBeVisible();
    expect(within(detail).getByText('-8.0%')).toBeVisible();
    expect(within(detail).getByText('-5.0%')).toBeVisible();
    expect(within(detail).getByText('+5.0 %')).toBeVisible();
    expect(within(detail).getByText('-3.0 %')).toBeVisible();
    expect(detail).toHaveTextContent('XLK+15.0%');
    expect(detail).toHaveTextContent('排名分數908077');
    expect(detail).not.toHaveTextContent('標的漲跌');
  });

  it('does not treat a legacy snapshot relative-return field as the asset return', async () => {
    apiClient.get.mockResolvedValue(response([{ ...industry[1], REL20: 0.1 }]));
    render(<MomentumDashboardPage />);
    await screen.findByText('XLE');
    fireEvent.click(assetRows()[0]);
    expect(screen.getByRole('complementary', { name: /明細/ })).not.toHaveTextContent('+10.0%');
    expect(screen.getByRole('complementary', { name: /明細/ })).toHaveTextContent('XLE———');
    expect(screen.getByRole('complementary', { name: /明細/ })).toHaveTextContent('與 SPY 比較———');
  });

  it('shows relative strength and its average separately from the cumulative return chart', async () => {
    apiClient.get.mockResolvedValue(response([{ ...industry[0], relativeTrend60: [
      ['2026-09-24', 100, 98], ['2026-09-25', 105, 99]
    ] }]));
    render(<MomentumDashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: /XLK/ }));
    expect(screen.getByRole('img', { name: /XLK相對 SPY/ })).toBeVisible();
    expect(screen.getByText('20 日均線')).toBeVisible();
    expect(screen.getByText(/線條在 20 日均線上方/)).toBeVisible();
  });

  it('shows RSI and liquidity, then filters constituents ranked across a broader stock pool', async () => {
    const main = response([{ ...industry[0], rsi14: 64, averageDollarVolume20: 20000000 }]);
    const holdings = { status: 'available', access: 'pro', completeness: 'top', coverageWeight: .5,
      holdingsAsOf: null, asOf: '2026-09-25', universe: { scoredCount: 503 },
      sourceName: 'Yahoo Finance', sourceUrl: 'https://finance.yahoo.com/quote/XLK/holdings/',
      rows: [{ symbol: 'AAA', name: 'First Stock', weight: .3, Rank: 90, rsi14: 60, averageDollarVolume20: 20000000 },
        { symbol: 'BBB', name: 'Second Stock', weight: .2, Rank: 60, rsi14: 40, averageDollarVolume20: 30000000 }] };
    apiClient.get.mockImplementation((url) => Promise.resolve(url.includes('/constituents/') ? { data: { data: holdings } } : main));
    render(<MomentumDashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: /XLK/ }));
    expect(screen.getByText('RSI · 14 日')).toBeVisible();
    expect(screen.getByText('64.0')).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: '成分股' }));
    expect(await screen.findByText('主要持股動能排行 · 部分名單')).toBeVisible();
    expect(screen.getByText(/503 檔美股/)).toBeVisible();
    expect(screen.getByText(/來源未提供持股日期/)).toBeVisible();
    fireEvent.change(screen.getByLabelText('最低動能分數'), { target: { value: '80' } });
    expect(screen.getByRole('button', { name: /AAA/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: /BBB/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('最低平均成交額（百萬美元）'), { target: { value: '25' } });
    expect(screen.getByRole('status')).toHaveTextContent('找不到符合的標的');
    fireEvent.change(screen.getByLabelText('最低動能分數'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /BBB/ }));
    expect(within(screen.getByRole('complementary', { name: 'BBB 明細' })).getAllByText('40.0').find(element => element.tagName === 'STRONG')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '← 返回 XLK 成分股' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /BBB/ })).toHaveFocus());
    expect(screen.getByLabelText('最低平均成交額（百萬美元）')).toHaveValue(25);

  });

  it('aborts a constituent request when its ETF detail is closed', async () => {
    apiClient.get.mockImplementation((url) => url.includes('/constituents/') ? new Promise(() => {}) : Promise.resolve(response()));
    render(<MomentumDashboardPage />);
    const asset = await screen.findByRole('button', { name: /XLK/ });
    fireEvent.click(asset);
    fireEvent.click(screen.getByRole('tab', { name: '成分股' }));
    const call = apiClient.get.mock.calls.find(([url]) => url.includes('/constituents/'));
    fireEvent.click(asset);
    expect(call[1].signal.aborted).toBe(true);
  });

  it('lets users expand and collapse a longer list', async () => {
    apiClient.get.mockResolvedValue(response(Array.from({ length: 14 }, (_, index) => ({ ...industry[0], symbol: `ETF${index}` }))));
    render(<MomentumDashboardPage />);
    await screen.findByText('ETF0');
    expect(assetRows()).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: '展開其餘 2 檔' }));
    expect(assetRows()).toHaveLength(14);
    fireEvent.click(screen.getByRole('button', { name: '收合清單' }));
    expect(assetRows()).toHaveLength(12);
  });

  it('shows an honest empty state without invented leaders', async () => {
    apiClient.get.mockResolvedValue({ data: { success: true, data: null } });
    render(<MomentumDashboardPage />);
    expect(await screen.findByText('行情更新中')).toBeInTheDocument();
    expect(screen.queryByText('SPY')).not.toBeInTheDocument();
  });

  it('recovers from a cold-start empty snapshot and stops polling once data arrives', async () => {
    jest.useFakeTimers();
    try {
      apiClient.get.mockResolvedValueOnce({ data: { success: true, data: null } }).mockResolvedValue(response());
      render(<MomentumDashboardPage />);
      await act(async () => {});
      expect(screen.getByText('行情更新中')).toBeVisible();
      await act(async () => { jest.advanceTimersByTime(30000); });
      expect(screen.getByText('XLK')).toBeVisible();
      expect(apiClient.get).toHaveBeenCalledTimes(2);
      await act(async () => { jest.advanceTimersByTime(90000); });
      expect(apiClient.get).toHaveBeenCalledTimes(2);
    } finally { jest.useRealTimers(); }
  });

  it('does not overlap pending refreshes and aborts them on unmount', async () => {
    jest.useFakeTimers();
    try {
      apiClient.get.mockResolvedValueOnce({ data: { success: true, data: null } })
        .mockImplementation(() => new Promise(() => {}));
      const { unmount } = render(<MomentumDashboardPage />);
      await act(async () => {});
      await act(async () => { jest.advanceTimersByTime(90000); });
      expect(apiClient.get).toHaveBeenCalledTimes(2);
      const signal = apiClient.get.mock.calls[1][1].signal;
      unmount();
      expect(signal.aborted).toBe(true);
      await act(async () => { jest.advanceTimersByTime(60000); });
      expect(apiClient.get).toHaveBeenCalledTimes(2);
    } finally { jest.useRealTimers(); }
  });

  it('recovers from a failed request with retry', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('offline'));
    render(<MomentumDashboardPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('行情暫時無法載入');
    fireEvent.click(screen.getByRole('button', { name: '重新載入' }));
    await waitFor(() => expect(screen.getByText('XLK')).toBeInTheDocument());
  });

  it('shows explanations immediately without a guide toggle or repeated caption', async () => {
    render(<MomentumDashboardPage />);
    await screen.findByText('XLK');
    expect(screen.getByText('動能分數是什麼')).toBeVisible();
    expect(screen.getByText(/漲得較多、或跌得較少/)).toBeVisible();
    expect(screen.getByText('色塊與線條怎麼看')).toBeVisible();
    expect(screen.getByText('找出強勢標的')).toBeVisible();
    expect(screen.queryByRole('button', { name: /動能分數怎麼看|如何看分數/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/與同一分頁的其他標的相比/)).not.toBeInTheDocument();
  });

  it('explains factor strategies and growth stocks where the user selects them', async () => {
    render(<MomentumDashboardPage />);
    await screen.findByText('XLK');
    fireEvent.click(screen.getByRole('button', { name: '市場結構' }));
    expect(screen.getByText('動量、品質、低波動等')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '選股策略（因子），60，查看標的' }));
    expect(screen.getByText(/「因子」是選股所依據的特徵/)).toBeVisible();
    expect(screen.getByText('動量選股 · 追隨近期相對強勢股票')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '成長股，70，查看標的' }));
    expect(screen.getByText(/「成長股」是選股類型/)).toBeVisible();
  });

  it('counts distinct symbols and identifies a closed-end fund without calling it an ETF', async () => {
    apiClient.get.mockResolvedValue({ data: { data: { access: { version: 2, plan: 'pro', totalCount: 1 }, asOf: '2026-09-25', data: {
      Industry: [{ symbol: 'DXYZ', name: 'Destiny Tech100', group: 'Thematic', Rank: 40 }],
      Assets: [{ symbol: 'DXYZ' }]
    } } } });
    render(<MomentumDashboardPage />);
    expect(await screen.findByText('Destiny Tech100 · 封閉式基金')).toBeVisible();
    expect(screen.getByText('觀察範圍 · 1 檔標的')).toBeInTheDocument();
    expect(screen.queryByText(/momentumDashboard\./)).not.toBeInTheDocument();
  });
});

const freeResponse = () => {
  const payload = response();
  payload.data.data.access = { version: 2, plan: 'free', totalCount: 200, freeCount: 12 };
  payload.data.data.groups = { Industry: [
    { name: 'Technology', count: 3, averageRank: 75, dailyMove: 0.03 },
    { name: 'Thematic', count: 1, averageRank: 65, dailyMove: 0.01 }
  ] };
  payload.data.data.locked = { Industry: [
    { symbol: 'SMH', name: 'Semiconductors ETF', group: 'Technology' },
    { symbol: 'DXYZ', name: 'Destiny Tech100', group: 'Thematic' }
  ] };
  return payload;
};

describe('Momentum access experience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: null, loading: false });
    apiClient.get.mockResolvedValue(freeResponse());
  });

  it('labels the free subset, uses the complete category summary and tracks upgrade intent', async () => {
    render(<MomentumDashboardPage />);
    expect(await screen.findByText('免費版 · 收盤資料截至')).toBeVisible();
    expect(screen.getByRole('heading', { name: '免費 ETF 動能排行' })).toBeVisible();
    expect(screen.getByText(/固定 12 檔 ETF/)).toBeVisible();
    expect(screen.getByRole('button', { name: '科技，75，查看標的' })).toBeVisible();
    const upgrade = screen.getByRole('link', { name: /解鎖完整排行/ });
    expect(upgrade).toHaveAttribute('href', '/zh-TW/subscription-plans');
    upgrade.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(upgrade);
    expect(trackProductEvent).toHaveBeenCalledWith('momentum_interaction', expect.objectContaining({ action: 'upgrade_click', source: 'ranking' }));
    expect(screen.getByText('觀察範圍 · 200 檔標的')).toBeInTheDocument();
  });

  it('keeps locked search results discoverable without an empty-data or loading state', async () => {
    render(<MomentumDashboardPage />);
    await screen.findByText('XLK');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'SMH' } });
    expect(screen.getByText('SMH')).toBeVisible();
    expect(screen.queryAllByRole('button').filter((button) => button.classList.contains('momentum-row'))).toHaveLength(0);
    expect(screen.getByText('Pro 專屬')).toBeVisible();
    expect(screen.queryByText('行情更新中')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /解鎖完整排行/ })).toBeVisible();
  });

  it('removes the prior account snapshot immediately on logout and ignores its late request', async () => {
    useAuth.mockReturnValue({ user: { id: 'paid', plan: 'pro' }, loading: false });
    apiClient.get.mockResolvedValueOnce(response([{ symbol: 'PAID', name: 'Paid example', group: 'Technology', Rank: 99 }]));
    const { rerender } = render(<MomentumDashboardPage />);
    await screen.findByText('PAID');
    let resolvePending;
    apiClient.get.mockImplementationOnce(() => new Promise((resolve) => { resolvePending = resolve; }));
    useAuth.mockReturnValue({ user: { id: 'other', plan: 'pro' }, loading: false });
    rerender(<MomentumDashboardPage />);
    expect(screen.queryByText('PAID')).not.toBeInTheDocument();
    useAuth.mockReturnValue({ user: null, loading: false });
    apiClient.get.mockResolvedValueOnce(freeResponse());
    rerender(<MomentumDashboardPage />);
    await screen.findByText('免費版 · 收盤資料截至');
    await act(async () => { resolvePending(response([{ symbol: 'LEAK', name: 'Late response', group: 'Technology' }])); });
    expect(screen.queryByText('LEAK')).not.toBeInTheDocument();
    expect(screen.queryByText('PAID')).not.toBeInTheDocument();
  });

  it('does not render a legacy publicly cached payload', async () => {
    const legacy = response();
    delete legacy.data.data.access;
    apiClient.get.mockResolvedValueOnce(legacy);
    render(<MomentumDashboardPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('行情暫時無法載入');
    expect(screen.queryByText('XLK')).not.toBeInTheDocument();
  });

  it('does not show a paywall for server-confirmed Pro access', async () => {
    apiClient.get.mockResolvedValueOnce(response());
    render(<MomentumDashboardPage />);
    await screen.findByText('Pro · 收盤資料截至');
    expect(screen.queryByRole('link', { name: /解鎖完整排行/ })).not.toBeInTheDocument();
  });
});

 test('screener entry is available to both plans and resets during account changes', async () => {
  useAuth.mockReturnValue({ user: { userId: 'member' }, loading: false });
  apiClient.get.mockResolvedValue(response());
  const view = render(<MomentumDashboardPage />);
  expect(await screen.findByTestId('momentum-screen-results')).toHaveTextContent('pro');
  const free = response(); free.data.data.access.plan = 'free';
  apiClient.get.mockResolvedValue(free);
  useAuth.mockReturnValue({ user: null, loading: false });
  view.rerender(<MomentumDashboardPage />);
  expect(screen.queryByTestId('momentum-screen-results')).not.toBeInTheDocument();
  await screen.findByText('XLK');
  expect(screen.getByTestId('momentum-screen-results')).toHaveTextContent('free');
 });
