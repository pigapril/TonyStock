import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import apiClient from '../../api/apiClient';
import MomentumScreenResults from './MomentumScreenResults';
jest.mock('../../api/apiClient', () => ({ get: jest.fn() }));
jest.mock('react-i18next', () => {
  const copy = require('../../locales/zh-TW/translation.json');
  const t = (key, options = {}) => {
    const value = key.split('.').reduce((item, part) => item?.[part], copy) ?? options.defaultValue ?? key;
    return value.replace(/{{(\w+)}}/g, (_, name) => options[name] ?? '');
  };
  return { useTranslation: () => ({ t, i18n: { language: 'zh-TW' } }) };
});
const date = '2026-10-02';
const result = { access: 'pro', status: 'available', asOf: date, criteria: { minGroupScore: 0, minScore: 80, minTurnoverMillion: 0, stage: 'leaders' },
 funds: [{ symbol: 'XLK', group: 'Technology', groupScore: 85, Rank: 90, holdingsStatus: 'full' }],
 stocks: [{ symbol: 'NVDA', name: 'Nvidia', Rank: 95, rsi14: 50, averageDollarVolume20: 10000000, pullback: true, drawdown20: -.05,
 relativeTrend60: [['2026-10-01', 110, 100], [date, 115, 105]],
 funds: [{ symbol: 'XLK', group: 'Technology', weight: .1, completeness: 'full', holdingsAsOf: '2026-10-01', coverageWeight: .99 }] }],
 coverage: { examinedStocks: 5, missingStockData: 1, partialFunds: 0, unavailableFunds: 0 } };
const response = data => ({ data: { data: { access: 'pro', ...data,
 ...(data.status === 'available' && data.access !== 'free' ? { counts: { funds: data.funds.length, stocks: data.stocks.length } } : {}) } } });
const startScreen = () => {
 fireEvent.click(screen.getByRole('button', {name:'開始篩選'}));
 fireEvent.click(screen.getByRole('button', {name:'查看篩選結果'}));
};
beforeEach(() => { jest.clearAllMocks(); apiClient.get.mockResolvedValue(response(result)); });
test('shows candidates, qualifying reasons and stock details after the user requests a screen', async () => {
 render(<MomentumScreenResults plan="pro" asOf={date} fundRows={[{symbol:'XLK',name:'Technology ETF',Rank:90}]} />); startScreen();
 expect(await screen.findByText(/從 1 檔強勢 ETF 中，找到 1 檔強勢候選個股/)).toBeInTheDocument();
 expect(screen.getByText(/近期表現領先大盤 · 平均每日成交額/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button', { name: /NVDA Nvidia/ }));
 expect(screen.getByRole('heading', { name: 'NVDA Nvidia' })).toBeInTheDocument();
 expect(screen.getByText(/2026-10-01/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button', { name: '← 返回篩選結果' }));
 expect(screen.getByRole('button', { name: /NVDA Nvidia/ })).toHaveFocus();
 fireEvent.click(screen.getByRole('tab', {name:'來源 ETF · 1 檔'}));
 fireEvent.click(screen.getByRole('button', { name: /^XLK 科技/ })); expect(screen.getByRole('complementary', {name:'XLK 明細'})).toBeVisible();
 expect(screen.getByRole('tab', {name:'成分股'})).toBeVisible();
});
test('submits changed criteria, hides old results while loading and supports pullback watch', async () => {
 render(<MomentumScreenResults plan="pro" asOf={date} onSelectFund={jest.fn()} />); startScreen(); await screen.findByText('Nvidia');
 fireEvent.click(screen.getByRole('radio', { name: '回調觀察 · RSI 40–60' }));
 let resolve; apiClient.get.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
 fireEvent.click(screen.getByRole('button', { name: '重新篩選' }));
 expect(screen.queryByText('Nvidia')).not.toBeInTheDocument();
 expect(apiClient.get).toHaveBeenLastCalledWith('/api/public/momentum-dashboard/screen', { signal: expect.any(AbortSignal), params: expect.objectContaining({ minScore: '80', stage: 'pullback' }) });
 await act(async () => resolve(response({ ...result, criteria: { ...result.criteria, minScore: 80, stage: 'pullback' }, stocks: [] })));
 expect(screen.getByText(/目前沒有個股符合全部條件/)).toBeInTheDocument();
 expect(screen.getByText(/ETF 與個股 ≥ 80 分/)).toBeInTheDocument();
});
test('explains date mismatch and does not display candidate lists', async () => {
 apiClient.get.mockResolvedValue(response({ status: 'date_mismatch', asOf: date, stockAsOf: '2026-10-01' }));
 render(<MomentumScreenResults plan="pro" asOf={date} onSelectFund={jest.fn()} />); startScreen();
 expect(await screen.findByText(/两份資料|兩份資料/)).toHaveTextContent('2026-10-01');
 expect(screen.queryByText('Nvidia')).not.toBeInTheDocument();
});
test('aborts requests on unmount and ignores late results', async () => {
 let resolve; apiClient.get.mockImplementation(() => new Promise(done => { resolve = done; }));
 const view = render(<MomentumScreenResults plan="pro" asOf={date} onSelectFund={jest.fn()} />); startScreen();
 const signal = apiClient.get.mock.calls[0][1].signal;
 view.unmount(); expect(signal.aborted).toBe(true); await act(async () => resolve(response(result)));
});
test('retries a failed request and updates when the price date changes', async () => {
 apiClient.get.mockRejectedValueOnce(new Error('offline'));
 const view = render(<MomentumScreenResults plan="pro" asOf={date} onSelectFund={jest.fn()} />); startScreen();
 await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: '重新載入' }));
 await screen.findByText('Nvidia'); view.rerender(<MomentumScreenResults plan="pro" asOf="2026-10-05" onSelectFund={jest.fn()} />);
 await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(3));
});

test('uses fixed momentum criteria without asking users to enter score or turnover', async () => {
 render(<MomentumScreenResults plan="pro" asOf={date} onSelectFund={jest.fn()} />); startScreen(); await screen.findByText('Nvidia');
 expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
 expect(screen.getByText('下單前，留意成交額與買賣價差。')).toBeInTheDocument();
 expect(screen.getByText(/平均每日成交額 US/)).toBeInTheDocument();
 expect(apiClient.get).toHaveBeenCalledWith('/api/public/momentum-dashboard/screen', expect.objectContaining({params:expect.objectContaining({minGroupScore:'0', minScore:'80', minTurnoverMillion:'0'})}));
});

test('offers deeper pullbacks with RSI below 30 and displays measured price retreat', async () => {
 render(<MomentumScreenResults plan="pro" asOf={date} onSelectFund={jest.fn()} />); startScreen(); await screen.findByText('Nvidia');
 expect(screen.getByText('距近 20 日最高收盤價回落 5.0%')).toBeInTheDocument();
 apiClient.get.mockResolvedValueOnce(response({...result,criteria:{...result.criteria,stage:'oversold'},stocks:[{...result.stocks[0],pullback:false,oversold:true,rsi14:29}]}));
 fireEvent.click(screen.getByRole('radio', { name: '超賣觀察 · RSI <30' }));
 fireEvent.click(screen.getByRole('button',{name:'重新篩選'}));
 await waitFor(()=>expect(apiClient.get).toHaveBeenLastCalledWith('/api/public/momentum-dashboard/screen',expect.objectContaining({params:expect.objectContaining({stage:'oversold'})})));
 await screen.findByText(/ETF 與個股 ≥ 80 分.*超賣觀察/);
});

test.each(['pro','free'])('starts compact without automatically screening for %s', plan => {
 render(<MomentumScreenResults plan={plan} asOf={date} onSelectFund={jest.fn()} />);
 expect(apiClient.get).not.toHaveBeenCalled();
 expect(screen.queryByLabelText('最低 ETF 與個股分數')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'開始篩選'}));
 expect(screen.getByRole('radio', {name:'強勢候選'})).toBeChecked();
 expect(apiClient.get).not.toHaveBeenCalled();
});

test('free screening shows counts and placeholder shapes with no candidate identities or metrics in the DOM', async () => {
 apiClient.get.mockResolvedValue(response({status:'available',access:'free',asOf:date,criteria:result.criteria,counts:{funds:1,stocks:5}}));
 render(<MomentumScreenResults plan="free" asOf={date} onSelectFund={jest.fn()} />); startScreen();
 await screen.findByText(/從 1 檔強勢 ETF 中，找到 5 檔強勢候選個股/);
 expect(screen.getByRole('link',{name:'升級 Pro'})).toHaveAttribute('href','/zh-TW/subscription-plans');
 expect(document.querySelectorAll('.momentum-screen-placeholder-row')).toHaveLength(3);
 expect(document.querySelector('.momentum-screen-placeholder')).toHaveTextContent('');
 expect(document.querySelector('.momentum-screen-placeholder.momentum-workspace.has-detail .momentum-screen-list')).toBeInTheDocument();
 expect(document.querySelector('.momentum-screen-placeholder .momentum-detail-panel .momentum-preview-chart')).toBeInTheDocument();
 expect(document.querySelector('.momentum-screen-placeholder button')).toBeNull();
 expect(document.body.innerHTML).not.toMatch(/NVDA|Nvidia|XLK|relativeTrend60/);
});

test('free screens with zero candidates do not fabricate blurred results', async () => {
 apiClient.get.mockResolvedValue(response({status:'available',access:'free',asOf:date,criteria:result.criteria,counts:{funds:0,stocks:0}}));
 render(<MomentumScreenResults plan="free" asOf={date} onSelectFund={jest.fn()} />); startScreen();
 await screen.findByText(/從 0 檔強勢 ETF 中，找到 0 檔強勢候選個股/);
 expect(document.querySelector('.momentum-screen-placeholder')).toBeNull();
 expect(screen.getByText(/目前沒有個股符合全部條件/)).toBeInTheDocument();
});

test('closing the panel aborts pending work and reopening does not run it again', async () => {
 apiClient.get.mockImplementation(()=>new Promise(()=>{}));
 render(<MomentumScreenResults plan="pro" asOf={date} onSelectFund={jest.fn()} />); startScreen();
 const signal=apiClient.get.mock.calls[0][1].signal;
 fireEvent.click(screen.getByRole('button',{name:'收合篩選'}));expect(signal.aborted).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'開始篩選'}));expect(apiClient.get).toHaveBeenCalledTimes(1);
});

test('free UI refuses to render paid rows even from a mismatched response', async () => {
 render(<MomentumScreenResults plan="free" asOf={date} onSelectFund={jest.fn()} />); startScreen();
 await screen.findByRole('link',{name:'升級 Pro'});
 expect(screen.queryByText('Nvidia')).not.toBeInTheDocument();
});

test.each(['free', 'pro'])('explains an empty stock list using the accepted wording for %s', async plan => {
 apiClient.get.mockResolvedValue(response({...result,access:plan,funds:['XLK','XLE','XLF'].map(symbol=>({...result.funds[0],symbol})),stocks:[],counts:{funds:3,stocks:0},emptyState:{reason:'stock_conditions',incomplete:false}}));
 render(<MomentumScreenResults plan={plan} asOf={date} onSelectFund={jest.fn()} />); startScreen();
 expect(await screen.findByText('已找到 3 檔強勢 ETF，但目前其成分股中沒有符合條件的個股。')).toBeInTheDocument();
 expect(screen.queryByText('目前沒有個股符合全部條件。')).not.toBeInTheDocument();
});

test('explains the actual maximum score and opens ETF rankings without relaxing the threshold', async () => {
 const showRankings=jest.fn();
 apiClient.get.mockResolvedValue(response({...result,access:'free',counts:{funds:0,stocks:0},emptyState:{reason:'fund_score',highestScore:78,incomplete:true}}));
 render(<MomentumScreenResults plan="free" asOf={date} onShowRankings={showRankings} />); startScreen();
 expect(await screen.findByText('目前已更新的板塊 ETF 尚未達到 80 分，最高為 78 分。')).toBeInTheDocument();
 expect(screen.getByText(/部分標的資料不足/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'查看 ETF 排行'}));
 expect(showRankings).toHaveBeenCalledTimes(1); expect(apiClient.get).toHaveBeenCalledTimes(1);
});

test('switches an empty pullback screen to actual strong candidates on request', async () => {
 apiClient.get.mockResolvedValueOnce(response({...result,stocks:[],criteria:{...result.criteria,stage:'pullback'},emptyState:{reason:'stage_conditions',leaderCount:12,incomplete:false}}));
 render(<MomentumScreenResults plan="pro" asOf={date} />);
 fireEvent.click(screen.getByRole('button',{name:'開始篩選'}));
 fireEvent.click(screen.getByRole('radio',{name:'回調觀察 · RSI 40–60'}));
 fireEvent.click(screen.getByRole('button',{name:'查看篩選結果'}));
 expect(await screen.findByText(/目前有 12 檔強勢候選/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'查看強勢候選'}));
 await screen.findByText('Nvidia');
 expect(screen.getByRole('radio',{name:'強勢候選'})).toBeChecked();
 expect(apiClient.get).toHaveBeenLastCalledWith('/api/public/momentum-dashboard/screen',expect.objectContaining({params:expect.objectContaining({stage:'leaders',minScore:'80'})}));
});

test('shows falling-price guidance when oversold watch is selected', () => {
 render(<MomentumScreenResults plan="pro" asOf={date} />);
 fireEvent.click(screen.getByRole('button',{name:'開始篩選'}));
 expect(screen.queryByText(/這些股票仍可能繼續下跌/)).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('radio',{name:'超賣觀察 · RSI <30'}));
 expect(screen.getByText(/從強勢候選中挑出近期下跌力道較強的股票。這些股票仍可能繼續下跌/)).toBeInTheDocument();
 expect(apiClient.get).not.toHaveBeenCalled();
});

test('explains the selected screen in plain language before requesting results', () => {
 render(<MomentumScreenResults plan="pro" asOf={date} />);
 fireEvent.click(screen.getByRole('button',{name:'開始篩選'}));
 expect(screen.getByText(/先找出近幾個月表現較強/)).toBeInTheDocument();
 expect(screen.queryByText('下單前，留意成交額與買賣價差。')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('radio',{name:'回調觀察 · RSI 40–60'}));
 expect(screen.getByText(/從強勢候選中挑出價格已回落/)).toBeInTheDocument();
 expect(screen.queryByText(/先找出近幾個月表現較強/)).not.toBeInTheDocument();
 expect(apiClient.get).not.toHaveBeenCalled();
});

test.each(['empty', 'free'])('does not show a trading reminder when stock names are not displayed: %s', async state => {
 const data=state==='empty' ? {...result,stocks:[]} : {...result,access:'free',counts:{funds:1,stocks:5}};
 apiClient.get.mockResolvedValue(response(data));
 render(<MomentumScreenResults plan={state==='free'?'free':'pro'} asOf={date} />);startScreen();
 await screen.findByText(/檔強勢候選個股/);
 expect(screen.queryByText('下單前，留意成交額與買賣價差。')).not.toBeInTheDocument();
});

test('keeps completed results and stock selection when switching away and back', async () => {
 const view = render(<MomentumScreenResults plan="pro" active initiallyOpen asOf={date} />);
 expect(apiClient.get).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button', {name:'查看篩選結果'}));
 await screen.findByText('Nvidia');
 fireEvent.click(screen.getByRole('button', {name:/NVDA Nvidia/}));
 expect(screen.getByRole('complementary', {name:'NVDA 明細'})).toBeInTheDocument();
 view.rerender(<MomentumScreenResults plan="pro" active={false} initiallyOpen asOf={date} />);
 view.rerender(<MomentumScreenResults plan="pro" active initiallyOpen asOf={date} />);
 expect(screen.getByRole('complementary', {name:'NVDA 明細'})).toBeInTheDocument();
 expect(apiClient.get).toHaveBeenCalledTimes(1);
});

test('selects the first desktop candidate without moving focus, and refreshes the selection after rescreening', async () => {
 const originalMedia = window.matchMedia;
 window.matchMedia = query => ({ matches: query === '(min-width: 901px)' });
 try {
  const second = {...result.stocks[0], symbol:'MSFT', name:'Microsoft'};
  apiClient.get.mockResolvedValueOnce(response({...result, stocks:[result.stocks[0], second]}));
  render(<MomentumScreenResults plan="pro" initiallyOpen asOf={date} />);
  const submit = screen.getByRole('button', {name:'查看篩選結果'}); submit.focus();
  fireEvent.click(submit);
  expect(await screen.findByRole('complementary', {name:'NVDA 明細'})).toBeInTheDocument();
  expect(screen.getByRole('button', {name:/NVDA Nvidia/})).toHaveAttribute('aria-pressed','true');
  expect(submit).toHaveFocus();
  expect(screen.getByRole('button', {name:'← 返回篩選結果'})).toHaveClass('momentum-detail-back--mobile-only');
  fireEvent.click(screen.getByRole('button', {name:/MSFT Microsoft/}));
  expect(screen.getByRole('complementary', {name:'MSFT 明細'})).toBeInTheDocument();
  apiClient.get.mockResolvedValueOnce(response(result));
  fireEvent.click(screen.getByRole('button', {name:'重新篩選'}));
  expect(await screen.findByRole('complementary', {name:'NVDA 明細'})).toBeInTheDocument();
 } finally { window.matchMedia = originalMedia; }
});

test('waits for a tap on mobile and keeps the return button', async () => {
 const originalMedia = window.matchMedia, originalScroll = window.scrollTo;
 window.scrollTo = jest.fn();
 window.matchMedia = query => ({ matches: query === '(max-width: 900px)' });
 try {
  render(<MomentumScreenResults plan="pro" initiallyOpen asOf={date} />);
  fireEvent.click(screen.getByRole('button', {name:'查看篩選結果'}));
  await screen.findByText('Nvidia');
  expect(screen.queryByRole('complementary', {name:/明細/})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name:/NVDA Nvidia/}));
  expect(screen.getByRole('button', {name:'← 返回篩選結果'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name:'← 返回篩選結果'}));
  expect(screen.queryByRole('complementary', {name:/明細/})).not.toBeInTheDocument();
 } finally { window.matchMedia = originalMedia; window.scrollTo = originalScroll; }
});

test('keeps independent selections and scroll positions for stock and ETF results', async () => {
 const originalMedia = window.matchMedia;
 window.matchMedia = query => ({matches:query === '(min-width: 901px)'});
 try {
  const extraStock = {...result.stocks[0],symbol:'MSFT',name:'Microsoft',funds:[{...result.stocks[0].funds[0],symbol:'XLE',group:'Energy'}]};
  const extraFund = {...result.funds[0],symbol:'XLE',group:'Energy'};
  apiClient.get.mockResolvedValueOnce(response({...result,stocks:[result.stocks[0],extraStock],funds:[result.funds[0],extraFund]}));
  const {container} = render(<MomentumScreenResults plan="pro" initiallyOpen asOf={date} fundRows={[{symbol:'XLK',name:'Technology ETF',Rank:90},{symbol:'XLE',name:'Energy ETF',Rank:85}]} />);
  fireEvent.click(screen.getByRole('button',{name:'查看篩選結果'}));
  await screen.findByRole('complementary',{name:'NVDA 明細'});
  fireEvent.click(screen.getByRole('button',{name:/MSFT Microsoft/}));
  const scroll = container.querySelector('.momentum-screen-list-scroll');scroll.scrollTop = 160;
  fireEvent.click(screen.getByRole('tab',{name:'來源 ETF · 2 檔'}));
  expect(screen.getByRole('complementary',{name:'XLK 明細'})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/MSFT Microsoft/})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/^XLE 能源/}));scroll.scrollTop = 80;
  fireEvent.click(screen.getByRole('tab',{name:'候選個股 · 2 檔'}));
  expect(screen.getByRole('complementary',{name:'MSFT 明細'})).toBeInTheDocument();expect(scroll.scrollTop).toBe(160);
  fireEvent.click(screen.getByRole('tab',{name:'來源 ETF · 2 檔'}));
  expect(screen.getByRole('complementary',{name:'XLE 明細'})).toBeInTheDocument();expect(scroll.scrollTop).toBe(80);
  expect(apiClient.get).toHaveBeenCalledTimes(1);
 } finally {window.matchMedia = originalMedia;}
});

test('opens a source ETF on mobile and returns to its ETF row', async () => {
 const originalMedia = window.matchMedia, originalScroll = window.scrollTo;
 window.matchMedia = query => ({matches:query === '(max-width: 900px)'});window.scrollTo = jest.fn();
 try {
  render(<MomentumScreenResults plan="pro" initiallyOpen asOf={date} fundRows={[{symbol:'XLK',name:'Technology ETF',Rank:90}]} />);
  fireEvent.click(screen.getByRole('button',{name:'查看篩選結果'}));await screen.findByText('Nvidia');
  fireEvent.click(screen.getByRole('button',{name:'XLK (科技)'}));
  expect(screen.getByRole('tab',{name:'來源 ETF · 1 檔'})).toHaveAttribute('aria-selected','true');
  expect(screen.getByRole('complementary',{name:'XLK 明細'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'← 返回篩選結果'}));
  expect(screen.getByRole('button',{name:/^XLK 科技/})).toHaveFocus();
  fireEvent.click(screen.getByRole('tab',{name:'候選個股 · 1 檔'}));
  expect(screen.getByRole('button',{name:/NVDA Nvidia/})).toBeInTheDocument();
  expect(screen.queryByRole('complementary',{name:/明細/})).not.toBeInTheDocument();
 } finally {window.matchMedia = originalMedia;window.scrollTo = originalScroll;}
});

 test('lists only source ETFs with matching stocks and identifies the ETF detail as a source', async () => {
  apiClient.get.mockResolvedValue(response({...result, criteria:{...result.criteria,stage:'oversold'}, funds:[...result.funds,{...result.funds[0],symbol:'CIBR'}]}));
  render(<MomentumScreenResults plan="pro" initiallyOpen asOf={date} fundRows={[{symbol:'XLK',name:'Technology ETF',Rank:90,rsi14:63}]} />);
  fireEvent.click(screen.getByRole('radio',{name:'超賣觀察 · RSI <30'}));
  fireEvent.click(screen.getByRole('button',{name:'查看篩選結果'}));
  await screen.findByText(/從 2 檔強勢 ETF 中，找到 1 檔超賣觀察個股。/);
  fireEvent.click(screen.getByRole('tab',{name:'來源 ETF · 1 檔'}));
  expect(screen.getByText('1 檔成分股入選')).toBeVisible();
  expect(screen.queryByText('CIBR')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/^XLK 科技/}));
  expect(within(screen.getByRole('complementary',{name:'XLK 明細'})).getByText('篩選來源')).toBeVisible();
 });
