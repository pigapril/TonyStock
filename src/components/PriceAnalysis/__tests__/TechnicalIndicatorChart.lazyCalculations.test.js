import React from 'react';
import { render } from '@testing-library/react';
import TechnicalIndicatorChart from '../TechnicalIndicatorChart';
import {
  calculateKd,
  calculateMacd,
  calculateRsi,
  calculateSma
} from '../technicalIndicators';

jest.mock('react-chartjs-2', () => ({
  Chart: require('react').forwardRef(() => null)
}));
jest.mock('chart.js', () => ({
  BarController: {},
  BarElement: {},
  Chart: { register: jest.fn() }
}));
jest.mock('react-icons/fa', () => ({ FaLock: () => null }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'zh-TW' } })
}));
jest.mock('../technicalIndicators', () => ({
  calculateKd: jest.fn(() => ({ k: [50, 60], d: [50, 60] })),
  calculateMacd: jest.fn(() => ({
    macd: [1, 2],
    signal: [1, 2],
    histogram: [0, 0]
  })),
  calculateRsi: jest.fn(() => [50, 60]),
  calculateSma: jest.fn((prices) => prices.map((price) => price))
}));

const baseProps = {
  onIndicatorChange: jest.fn(),
  canUseAdvanced: false,
  chartRef: React.createRef(),
  dates: ['2026-01-01', '2026-01-02'],
  prices: [100, 101],
  highs: [102, 103],
  lows: [98, 99],
  xRange: null,
  timeUnit: 'day',
  isMobile: false,
  t: (key) => key
};

describe('TechnicalIndicatorChart：只計算目前選擇的指標', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    calculateKd.mockReturnValue({ k: [50, 60], d: [50, 60] });
    calculateMacd.mockReturnValue({
      macd: [1, 2],
      signal: [1, 2],
      histogram: [0, 0]
    });
    calculateRsi.mockReturnValue([50, 60]);
    calculateSma.mockImplementation((prices) => prices.map((price) => price));
  });

  it('預設 MA 只計算五條移動平均線，不預先計算 Pro 指標', () => {
    render(<TechnicalIndicatorChart {...baseProps} activeIndicator="ma" />);

    expect(calculateSma.mock.calls.map(([, period]) => period)).toEqual([5, 10, 20, 60, 120]);
    expect(calculateRsi).not.toHaveBeenCalled();
    expect(calculateMacd).not.toHaveBeenCalled();
    expect(calculateKd).not.toHaveBeenCalled();
  });

  it.each([
    ['rsi', calculateRsi],
    ['macd', calculateMacd],
    ['kd', calculateKd]
  ])('選擇 %s 時只計算該指標', (indicator, calculateSelected) => {
    render(
      <TechnicalIndicatorChart
        {...baseProps}
        activeIndicator={indicator}
        canUseAdvanced
      />
    );

    expect(calculateSelected).toHaveBeenCalledTimes(1);
    expect(calculateSma).not.toHaveBeenCalled();
    if (indicator !== 'rsi') expect(calculateRsi).not.toHaveBeenCalled();
    if (indicator !== 'macd') expect(calculateMacd).not.toHaveBeenCalled();
    if (indicator !== 'kd') expect(calculateKd).not.toHaveBeenCalled();
  });
});
