import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import apiClient from '../../api/apiClient';
import { useAuth } from '../Auth/useAuth';
import MomentumDashboardPage from './MomentumDashboardPage';
import { trackProductEvent } from '../../utils/productAnalytics';
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
  beforeEach(() => { jest.clearAllMocks(); useAuth.mockReturnValue({ user: null, loading: false }); apiClient.get.mockResolvedValue(response()); });

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

  it('filters by sector, expands details inline and clears the filter', async () => {
    render(<MomentumDashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: '科技，81，查看標的' }));
    expect(screen.queryByText('XLE')).not.toBeInTheDocument();
    fireEvent.click(assetRows()[0]);
    expect(assetRows()[0]).toHaveAttribute('aria-expanded', 'true');
    expect(trackProductEvent).toHaveBeenCalledWith('momentum_interaction', expect.objectContaining({ action: 'asset_open', asset_symbol: 'XLK' }));
    expect(assetRows()[0].nextElementSibling).toHaveTextContent('$140.00');
    expect(screen.getByText('120 交易日')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /在 Yahoo Finance 查看標的資料/ })).toHaveAttribute('href', 'https://finance.yahoo.com/quote/XLK/');
    fireEvent.click(screen.getByRole('button', { name: /返回全部標的/ }));
    expect(screen.getByText('XLE')).toBeInTheDocument();
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
    const detail = assetRows()[0].nextElementSibling;
    expect(within(detail).getByText('+15.0%')).toBeVisible();
    expect(within(detail).getByText('+10.0%')).toBeVisible();
    expect(within(detail).getByText('-8.0%')).toBeVisible();
    expect(within(detail).getByText('-5.0%')).toBeVisible();
    expect(detail).not.toHaveTextContent('個百分點');
    expect(detail).toHaveTextContent('本標的+15.0%');
    expect(detail).toHaveTextContent('動能分數 90');
    expect(detail).not.toHaveTextContent('標的漲跌');
  });

  it('does not treat a legacy snapshot relative-return field as the asset return', async () => {
    apiClient.get.mockResolvedValue(response([{ ...industry[1], REL20: 0.1 }]));
    render(<MomentumDashboardPage />);
    await screen.findByText('XLE');
    fireEvent.click(assetRows()[0]);
    expect(assetRows()[0].nextElementSibling).not.toHaveTextContent('+10.0%');
    expect(assetRows()[0].nextElementSibling).toHaveTextContent('此期間漲跌資料暫缺');
    expect(assetRows()[0].nextElementSibling).not.toHaveTextContent('SPY —');
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

  it('keeps the comparison period visible and moves interpretation notes into optional help', async () => {
    render(<MomentumDashboardPage />);
    await screen.findByText('XLK');
    expect(screen.getByRole('button', { name: '近期動能強弱' })).toBeInTheDocument();
    expect(screen.queryByText(/先比較分類，再查看個別標的/)).not.toBeInTheDocument();
    expect(screen.getByText(/分數與色彩不代表買賣時點/)).not.toBeVisible();
    expect(screen.getByText(/近 1、3、6 個月綜合排名/)).toBeVisible();
    const guide = screen.getByRole('button', { name: '如何看分數' });
    expect(guide).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(guide);
    expect(guide).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/不是上漲 80%/)).toBeVisible();
    expect(screen.queryByText(/熱錢/)).not.toBeInTheDocument();
    expect(screen.getByText('使用方式')).toBeVisible();
    expect(screen.getByText(/分數與色彩不代表買賣時點/)).toBeVisible();
    fireEvent.click(guide);
    expect(guide).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(/分數與色彩不代表買賣時點/)).not.toBeVisible();
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
