import React, { useMemo } from 'react';
import { Chart } from 'react-chartjs-2';
import { BarController, BarElement, Chart as ChartJS } from 'chart.js';
import { FaLock } from 'react-icons/fa';
import { calculateKd, calculateMacd, calculateRsi, calculateSma } from './technicalIndicators';

ChartJS.register(BarController, BarElement);

const INDICATORS = [
  { key: 'rsi', label: 'RSI' },
  { key: 'macd', label: 'MACD' },
  { key: 'kd', label: 'KD' },
  { key: 'ma', labelKey: 'priceAnalysis.indicators.ma' }
];

const COLORS = {
  price: '#242a32',
  primary: '#3b6fd4',
  secondary: '#d24a93',
  ma5: '#d58b36',
  ma10: '#d24a93',
  ma20: '#3b6fd4',
  ma60: '#7054bc',
  ma120: '#25877e',
  positive: 'rgba(29, 143, 127, 0.55)',
  negative: 'rgba(210, 74, 147, 0.48)'
};

const line = (label, values, color, width = 1.8) => ({
  label,
  data: values,
  borderColor: color,
  borderWidth: width,
  pointRadius: 0,
  pointHoverRadius: 3,
  fill: false,
  spanGaps: false,
  tension: 0
});

function TechnicalIndicatorChart({
  activeIndicator,
  onIndicatorChange,
  canUseAdvanced,
  chartRef,
  dates,
  prices,
  highs,
  lows,
  xRange,
  timeUnit,
  isMobile,
  t
}) {
  const series = useMemo(() => ({
    rsi: calculateRsi(prices),
    macd: calculateMacd(prices),
    kd: calculateKd(prices, highs, lows),
    ma5: calculateSma(prices, 5),
    ma10: calculateSma(prices, 10),
    ma20: calculateSma(prices, 20),
    ma60: calculateSma(prices, 60),
    ma120: calculateSma(prices, 120)
  }), [prices, highs, lows]);
  const missingKdRange = activeIndicator === 'kd'
    && (!Array.isArray(highs) || !Array.isArray(lows)
      || highs.length !== prices.length || lows.length !== prices.length);
  const readySeries = {
    rsi: series.rsi,
    macd: series.macd.signal,
    kd: series.kd.d,
    ma: series.ma5
  };
  const hasIndicatorData = readySeries[activeIndicator]?.some((value) => value !== null);

  const chartData = useMemo(() => {
    let datasets;
    if (activeIndicator === 'macd') {
      datasets = [
        {
          type: 'bar',
          label: t('priceAnalysis.indicators.histogram'),
          data: series.macd.histogram,
          backgroundColor: series.macd.histogram.map((value) => (
            value !== null && value < 0 ? COLORS.negative : COLORS.positive
          )),
          borderWidth: 0,
          barPercentage: 1,
          categoryPercentage: 1
        },
        line('MACD', series.macd.macd, COLORS.primary),
        line(t('priceAnalysis.indicators.signal'), series.macd.signal, COLORS.secondary)
      ];
    } else if (activeIndicator === 'kd') {
      datasets = [
        line('K', series.kd.k, COLORS.primary),
        line('D', series.kd.d, COLORS.secondary)
      ];
    } else if (activeIndicator === 'ma') {
      datasets = [
        line(t('priceAnalysis.chart.label.price'), prices, COLORS.price, 1.6),
        line('MA5', series.ma5, COLORS.ma5),
        line('MA10', series.ma10, COLORS.ma10),
        line('MA20', series.ma20, COLORS.ma20),
        line('MA60', series.ma60, COLORS.ma60),
        line('MA120', series.ma120, COLORS.ma120)
      ];
    } else {
      datasets = [line('RSI(14)', series.rsi, COLORS.primary, 2)];
    }
    return { labels: dates, datasets };
  }, [activeIndicator, dates, prices, series, t]);

  const options = useMemo(() => {
    const first = new Date(dates[0]).getTime();
    const last = new Date(dates[dates.length - 1]).getTime();
    const extendedMax = Number.isFinite(first) && Number.isFinite(last)
      ? last + ((last - first) * (isMobile ? 0.15 : 0.1))
      : undefined;
    const hasRange = Number.isFinite(xRange?.min) && Number.isFinite(xRange?.max);
    let visibleMin = Infinity;
    let visibleMax = -Infinity;
    if (hasRange && (activeIndicator === 'ma' || activeIndicator === 'macd')) {
      dates.forEach((date, index) => {
        const time = new Date(date).getTime();
        if (!Number.isFinite(time) || time < xRange.min || time > xRange.max) return;
        chartData.datasets.forEach((dataset) => {
          const value = dataset.data?.[index];
          if (!Number.isFinite(value)) return;
          visibleMin = Math.min(visibleMin, value);
          visibleMax = Math.max(visibleMax, value);
        });
      });
    }
    if (activeIndicator === 'macd' && Number.isFinite(visibleMin)) {
      visibleMin = Math.min(visibleMin, 0);
      visibleMax = Math.max(visibleMax, 0);
    }
    let visibleYRange = null;
    if (Number.isFinite(visibleMin) && Number.isFinite(visibleMax)) {
      const padding = Math.max((visibleMax - visibleMin) * 0.08, Math.abs(visibleMax) * 0.003, 0.01);
      visibleYRange = {
        min: activeIndicator === 'ma' ? Math.max(0, visibleMin - padding) : visibleMin - padding,
        max: visibleMax + padding
      };
    }
    const annotations = activeIndicator === 'rsi' || activeIndicator === 'kd' ? {
      upper: { type: 'line', yMin: activeIndicator === 'kd' ? 80 : 70, yMax: activeIndicator === 'kd' ? 80 : 70, borderColor: '#d5dbe3', borderDash: [4, 4], borderWidth: 1 },
      lower: { type: 'line', yMin: activeIndicator === 'kd' ? 20 : 30, yMax: activeIndicator === 'kd' ? 20 : 30, borderColor: '#d5dbe3', borderDash: [4, 4], borderWidth: 1 }
    } : activeIndicator === 'macd' ? {
      zero: { type: 'line', yMin: 0, yMax: 0, borderColor: '#cbd3dd', borderWidth: 1 }
    } : {};

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      elements: { point: { radius: 0 } },
      plugins: {
        legend: { display: false },
        annotation: { annotations },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (context) => `${context.dataset.label}: ${Number(context.parsed.y).toFixed(2)}`
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          // MACD 的柱狀資料會讓 Chart.js 預設開啟 offset；關掉才能和上方線圖對齊。
          offset: false,
          time: {
            unit: timeUnit || 'month',
            tooltipFormat: 'yyyy/MM/dd',
            displayFormats: { day: 'MM/dd', month: 'yyyy/MM', year: 'yyyy' }
          },
          ticks: { maxTicksLimit: isMobile ? 4 : 6, maxRotation: 0, minRotation: 0 },
          grid: { display: false },
          // MACD 前幾筆還沒有值，但時間軸仍須從主圖第一天開始。
          ...(hasRange
            ? { min: xRange.min, max: xRange.max }
            : { ...(Number.isFinite(first) ? { min: first } : {}), ...(Number.isFinite(extendedMax) ? { max: extendedMax } : {}) })
        },
        y: {
          position: 'right',
          ...(activeIndicator === 'rsi' || activeIndicator === 'kd' ? { min: 0, max: 100 } : {}),
          ...(visibleYRange || {}),
          ...(activeIndicator === 'macd' ? { beginAtZero: true } : {}),
          ticks: { maxTicksLimit: 5, font: { size: 11 } },
          grid: { color: '#edf0f4' }
        }
      },
      layout: { padding: { left: 10, right: 15, top: 5, bottom: 0 } }
    };
  }, [activeIndicator, chartData, dates, isMobile, timeUnit, xRange]);

  const legend = activeIndicator === 'macd'
    ? [['MACD', COLORS.primary], [t('priceAnalysis.indicators.signal'), COLORS.secondary], [t('priceAnalysis.indicators.histogram'), COLORS.positive]]
    : activeIndicator === 'kd'
      ? [['K', COLORS.primary], ['D', COLORS.secondary]]
    : activeIndicator === 'ma'
      ? [[t('priceAnalysis.chart.label.price'), COLORS.price], ['MA5', COLORS.ma5], ['MA10', COLORS.ma10], ['MA20', COLORS.ma20], ['MA60', COLORS.ma60], ['MA120', COLORS.ma120]]
      : [['RSI(14)', COLORS.primary]];

  return (
    <section className="pa-indicator" aria-label={t('priceAnalysis.indicators.title')}>
      <div className="pa-indicator__header">
        <div>
          <h2 className="pa-indicator__title">{t('priceAnalysis.indicators.title')}</h2>
          <p className="pa-indicator__description">{t(`priceAnalysis.indicators.description.${activeIndicator}`)}</p>
        </div>
        <div className="pa-indicator__switch" role="group" aria-label={t('priceAnalysis.indicators.choose')}>
          {INDICATORS.map(({ key, label, labelKey }) => (
            <button
              key={key}
              type="button"
              className={`pa-indicator__option${activeIndicator === key ? ' is-active' : ''}${!canUseAdvanced && key !== 'ma' ? ' is-locked' : ''}`}
              aria-pressed={activeIndicator === key}
              aria-label={!canUseAdvanced && key !== 'ma' ? t('priceAnalysis.indicators.lockedOption', { indicator: label }) : undefined}
              onClick={() => onIndicatorChange(key)}
            >
              {labelKey ? t(labelKey) : label}
              {!canUseAdvanced && key !== 'ma' && <FaLock aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>
      <div className="pa-indicator__legend" aria-hidden="true">
        {legend.map(([label, color]) => (
          <span key={label} className="pa-indicator__legend-item">
            <i style={{ backgroundColor: color }} />{label}
          </span>
        ))}
      </div>
      <div className="pa-indicator__plot">
        {hasIndicatorData ? (
          <Chart key={activeIndicator} ref={chartRef} type="line" data={chartData} options={options} />
        ) : (
          <p className="pa-indicator__empty">
            {t(missingKdRange ? 'priceAnalysis.indicators.missingRange' : 'priceAnalysis.indicators.insufficient')}
          </p>
        )}
      </div>
    </section>
  );
}

export default TechnicalIndicatorChart;
