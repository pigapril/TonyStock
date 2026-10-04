import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import IndicatorItem from '../IndicatorItem';
import enhancedApiClient from '../../../utils/enhancedApiClient';
import zhTW from '../../../locales/zh-TW/translation.json';

let mockChartProps;
jest.mock('react-chartjs-2', () => {
  const React = require('react');
  return { Line: React.forwardRef((props, ref) => { mockChartProps = props; return <div data-testid="chart" />; }) };
});
jest.mock('../../../utils/enhancedApiClient', () => ({ get: jest.fn() }));
jest.mock('../../../utils/homeChartRegistry', () => ({ ensureHomeChartsRegistered: jest.fn() }));
jest.mock('../../Watchlist/hooks/useToastManager', () => {
  const showToast = jest.fn();
  return { useToastManager: () => ({ showToast, toast: null, hideToast: jest.fn() }) };
});
jest.mock('../../Common/TimeRangeSelector/TimeRangeSelector', () => () => null);
jest.mock('../../../utils/timeUtils', () => ({ filterDataByTimeRange: (rows) => rows }));
jest.mock('react-i18next', () => {
  const dict = require('../../../locales/zh-TW/translation.json');
  const t = (key, values = {}) => {
    const text = key.split('.').reduce((value, part) => value?.[part], dict) || key;
    return text.replace('{{date}}', values.date || '');
  };
  return { useTranslation: () => ({ t }) };
});

const renderIndicator = (props = {}) => render(<IndicatorItem
  indicatorKey="S&P 500 COT Index"
  indicator={{ date: '2026-09-29', value: 45, percentileRank: 50 }}
  selectedTimeRange="1M" handleTimeRangeChange={jest.fn()}
  historicalSPYData={[
    { date: new Date('2026-09-23'), spyClose: 660 },
    { date: new Date('2026-09-30'), spyClose: 675 }
  ]} {...props} />);

beforeEach(() => {
  enhancedApiClient.get.mockResolvedValue({ data: [
    { date: '2026-09-22', value: 40, percentileRank: 30 },
    { date: '2026-09-29', value: 45, percentileRank: 50 }
  ] });
});

it('shows the summary reading date independently of the newest SPY date', async () => {
  renderIndicator();
  await screen.findByTestId('chart');
  expect(screen.getByText(/更新日期/)).toHaveTextContent('2026-09-29');
  expect(screen.getByText('2026-09-29')).toHaveAttribute('datetime', '2026-09-29');
  expect(mockChartProps.options.scales.x.max).toBe(new Date('2026-09-30').getTime());
});

it('aligns all datasets and shows the last known indicator with its actual date', async () => {
  renderIndicator();
  await screen.findByTestId('chart');
  const { data, options } = mockChartProps;
  expect(data.datasets[0].data.map((row) => row.x)).toEqual(data.datasets[2].data.map((row) => row.x));
  expect(data.datasets[0].data[1].y).toBeNull();
  expect(options.interaction).toEqual({ mode: 'index', axis: 'x', intersect: false });
  const items = [{ dataIndex: 1 }];
  expect(options.plugins.tooltip.callbacks.title(items)).toBe('2026-09-23');
  const lines = options.plugins.tooltip.callbacks.afterBody.call({ chart: { isDatasetVisible: () => true } }, items);
  expect(lines[0]).toContain(': 40 (');
  expect(lines[0]).toContain('資料日期 2026-09-22');
  expect(lines[2]).toBe('SPY 價格: 660');
  expect(lines[2]).not.toContain('資料日期');
});

it('does not substitute a history or benchmark date for an unknown summary date', async () => {
  renderIndicator({ indicator: { date: null, value: null, percentileRank: null } });
  await waitFor(() => expect(screen.getByText(/更新日期/)).toHaveTextContent(zhTW.indicatorItem.notAvailable));
});

it('blocks tooltip interactions inside the restricted period', async () => {
  renderIndicator({ isRestrictedPreview: true, restrictionCutoffDate: '2026-09-29' });
  await screen.findByTestId('chart');
  const chart = {
    options: mockChartProps.options,
    scales: { x: { getPixelForValue: () => 100 } },
    chartArea: { left: 0, right: 200, top: 0, bottom: 100 },
    setActiveElements: jest.fn(), tooltip: { setActiveElements: jest.fn() }, draw: jest.fn()
  };
  expect(mockChartProps.plugins[0].beforeEvent(chart, { event: { x: 150, y: 50 } })).toBe(false);
  expect(chart.tooltip.setActiveElements).toHaveBeenCalledWith([], { x: 150, y: 50 });
});
