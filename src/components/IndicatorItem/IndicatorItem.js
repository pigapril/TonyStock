import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import './IndicatorItem.css';
import TimeRangeSelector from '../Common/TimeRangeSelector/TimeRangeSelector';
import { filterDataByTimeRange } from '../../utils/timeUtils';
import { getSentiment } from '../../utils/sentimentUtils';
import { useTranslation } from 'react-i18next';
import { useToastManager } from '../Watchlist/hooks/useToastManager';
import { handleApiError } from '../../utils/errorHandler';
import { Toast } from '../Watchlist/components/Toast';
import { formatPrice } from '../../utils/priceUtils';
import enhancedApiClient from '../../utils/enhancedApiClient';
import { ensureHomeChartsRegistered } from '../../utils/homeChartRegistry';

const EARLIEST_HISTORY_DATE = new Date('2010-01-01');
ensureHomeChartsRegistered();

const restrictedWindowMaskPlugin = {
  id: 'restrictedWindowMask',
  beforeEvent(chart, args) {
    const options = chart?.options?.plugins?.restrictedWindowMask;
    const event = args?.event;

    if (!options?.enabled || !options.cutoffDate || !event) {
      return undefined;
    }

    const xScale = chart.scales?.x;
    const chartArea = chart.chartArea;

    if (!xScale || !chartArea) {
      return undefined;
    }

    const cutoffValue = options.cutoffDate instanceof Date
      ? options.cutoffDate
      : new Date(options.cutoffDate);
    const cutoffPixel = xScale.getPixelForValue(cutoffValue);
    const maskStart = Math.max(chartArea.left, Math.min(cutoffPixel, chartArea.right));
    const isInsideMaskedArea = event.x >= maskStart && event.x <= chartArea.right
      && event.y >= chartArea.top && event.y <= chartArea.bottom;

    if (!isInsideMaskedArea) {
      return undefined;
    }

    if (typeof chart.setActiveElements === 'function') {
      chart.setActiveElements([]);
    }

    if (chart.tooltip && typeof chart.tooltip.setActiveElements === 'function') {
      chart.tooltip.setActiveElements([], { x: event.x, y: event.y });
    }

    chart.draw();
    return false;
  },
  afterDatasetsDraw(chart) {
    const options = chart?.options?.plugins?.restrictedWindowMask;

    if (!options?.enabled || !options.cutoffDate) {
      return;
    }

    const xScale = chart.scales?.x;
    const chartArea = chart.chartArea;

    if (!xScale || !chartArea) {
      return;
    }

    const cutoffValue = options.cutoffDate instanceof Date
      ? options.cutoffDate
      : new Date(options.cutoffDate);
    const cutoffPixel = xScale.getPixelForValue(cutoffValue);
    const maskStart = Math.max(chartArea.left, Math.min(cutoffPixel, chartArea.right));

    if (maskStart >= chartArea.right) {
      return;
    }

    const ctx = chart.ctx;

    ctx.save();
    ctx.fillStyle = options.fillColor || '#f8fafc';
    ctx.fillRect(maskStart, chartArea.top, chartArea.right - maskStart, chartArea.bottom - chartArea.top);

    ctx.beginPath();
    ctx.moveTo(maskStart, chartArea.top);
    ctx.lineTo(maskStart, chartArea.bottom);
    ctx.strokeStyle = options.lineColor || 'rgba(37, 99, 235, 0.88)';
    ctx.lineWidth = options.lineWidth || 1.5;
    ctx.stroke();
    ctx.restore();
  }
};

// 新增：獲取時間單位的函數
function getTimeUnit(dates) {
  if (!dates || dates.length < 2) {
    return 'month';
  }

  const start = new Date(dates[0]);
  const end = new Date(dates[dates.length - 1]);
  const yearDiff = end.getFullYear() - start.getFullYear();
  
  if (yearDiff > 1) {
    return 'year';
  } else if (yearDiff === 1 || end.getMonth() - start.getMonth() > 3) {
    return 'month';
  } else {
    return 'day';
  }
}

function getTimeRangeBounds(timeRange, endDate = new Date()) {
  const rangeEnd = new Date(endDate);
  const rangeStart = new Date(endDate);

  switch (timeRange) {
    case '1M':
      rangeStart.setMonth(rangeEnd.getMonth() - 1);
      break;
    case '3M':
      rangeStart.setMonth(rangeEnd.getMonth() - 3);
      break;
    case '6M':
      rangeStart.setMonth(rangeEnd.getMonth() - 6);
      break;
    case '1Y':
      rangeStart.setFullYear(rangeEnd.getFullYear() - 1);
      break;
    case '2Y':
      rangeStart.setFullYear(rangeEnd.getFullYear() - 2);
      break;
    case '3Y':
      rangeStart.setFullYear(rangeEnd.getFullYear() - 3);
      break;
    case '5Y':
      rangeStart.setFullYear(rangeEnd.getFullYear() - 5);
      break;
    case '10Y':
      rangeStart.setFullYear(rangeEnd.getFullYear() - 10);
      break;
    case '20Y':
      rangeStart.setFullYear(rangeEnd.getFullYear() - 20);
      break;
    default:
      return {
        start: new Date(EARLIEST_HISTORY_DATE),
        end: rangeEnd
      };
  }

  return {
    start: rangeStart < EARLIEST_HISTORY_DATE ? new Date(EARLIEST_HISTORY_DATE) : rangeStart,
    end: rangeEnd
  };
}

function IndicatorItem({
  indicatorKey,
  indicator,
  indicatorLabel = null,
  selectedTimeRange,
  handleTimeRangeChange,
  historicalSPYData,
  detailEndpoint = '/api/indicator-history',
  detailQueryParam = 'indicator',
  detailIncludesRange = false,
  benchmarkSeriesLabel = null,
  benchmarkAxisLabel = null,
  isInsideModal,
  isRestrictedPreview = false,
  restrictionCutoffDate = null
}) {
  const { t } = useTranslation();
  const { showToast, toast, hideToast } = useToastManager();
  const indicatorName = useMemo(() => {
    if (indicatorLabel) {
      return indicatorLabel;
    }
    const keyMap = {
      'AAII Bull-Bear Spread': 'indicators.aaiiSpread',
      'CBOE Put/Call Ratio 5-Day Avg': 'indicators.cboeRatio',
      'Market Momentum': 'indicators.marketMomentum',
      'VIX MA50': 'indicators.vixMA50',
      'Safe Haven Demand': 'indicators.safeHaven',
      'Junk Bond Spread': 'indicators.junkBond',
      "S&P 500 COT Index": 'indicators.cotIndex',
      'NAAIM Exposure Index': 'indicators.naaimIndex',
    };
    const translationKey = keyMap[indicatorKey] || indicatorKey;
    return t(translationKey);
  }, [indicatorKey, indicatorLabel, t]);

  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const chartRef = useRef(null);
  const chartContainerRef = useRef(null);
  const restrictionCardRef = useRef(null);
  const [restrictionOverlayPosition, setRestrictionOverlayPosition] = useState({ top: '50%', left: '50%' });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    enhancedApiClient
      .get(detailEndpoint, {
        params: {
          [detailQueryParam]: indicatorKey,
          ...(detailIncludesRange ? { range: selectedTimeRange } : {})
        },
        signal: controller.signal,
      })
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }
        const rawHistory = Array.isArray(response.data)
          ? response.data
          : (response.data?.history || []);
        const formattedData = rawHistory.map((item) => ({
          date: new Date(item.date),
          value: parseFloat(item.value),
          percentileRank:
            item.percentileRank !== null && item.percentileRank !== undefined
              ? parseFloat(item.percentileRank)
              : null,
        }));
        setHistoricalData(formattedData);
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        } else {
          handleApiError(error, showToast, t);
          setHistoricalData([]);
        }
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [detailEndpoint, detailIncludesRange, detailQueryParam, indicatorKey, selectedTimeRange, t, showToast]);

  const filteredData = React.useMemo(() => {
    return filterDataByTimeRange(historicalData, selectedTimeRange);
  }, [historicalData, selectedTimeRange]);

  const filteredSPYData = React.useMemo(() => {
    return filterDataByTimeRange(historicalSPYData, selectedTimeRange);
  }, [historicalSPYData, selectedTimeRange]);

  const hasBenchmarkSeries = useMemo(
    () => filteredSPYData.some((item) => item.spyClose != null),
    [filteredSPYData]
  );

  const latestAvailableTimestamp = useMemo(() => {
    if (historicalData.length === 0) {
      return 0;
    }

    return historicalData[historicalData.length - 1].date.getTime();
  }, [historicalData]);

  const visibleRange = useMemo(() => {
    const domainEnd = isRestrictedPreview ? new Date() : (latestAvailableTimestamp ? new Date(latestAvailableTimestamp) : new Date());
    const { start, end } = getTimeRangeBounds(selectedTimeRange, domainEnd);
    return {
      min: start.getTime(),
      max: end.getTime()
    };
  }, [isRestrictedPreview, latestAvailableTimestamp, selectedTimeRange]);

  const cutoffDateObject = useMemo(() => {
    if (!restrictionCutoffDate) {
      return null;
    }

    return new Date(restrictionCutoffDate);
  }, [restrictionCutoffDate]);

  const chartRestrictionOverlay = useMemo(() => {
    if (!isRestrictedPreview || !cutoffDateObject || !visibleRange.max) {
      return null;
    }

    const cutoffTs = cutoffDateObject.getTime();
    if (cutoffTs >= visibleRange.max) {
      return null;
    }

    const totalRange = visibleRange.max - visibleRange.min;
    if (totalRange <= 0) {
      return null;
    }

    const leftRatio = cutoffTs <= visibleRange.min ? 0 : (cutoffTs - visibleRange.min) / totalRange;
    const hiddenRatio = Math.max(0, 1 - leftRatio);

    return {
      left: `${Math.max(0, leftRatio) * 100}%`,
      width: `${hiddenRatio * 100}%`,
      compact: hiddenRatio < 0.26
    };
  }, [cutoffDateObject, isRestrictedPreview, visibleRange]);

  const updateRestrictionOverlayPosition = useCallback(() => {
    const chart = chartRef.current;
    const chartArea = chart?.chartArea;
    const xScale = chart?.scales?.x;
    const overlayCard = restrictionCardRef.current;

    if (!chart || !chartArea || !xScale || !cutoffDateObject) {
      return;
    }

    const cutoffPixel = xScale.getPixelForValue(cutoffDateObject);
    const maskStart = Math.max(chartArea.left, Math.min(cutoffPixel, chartArea.right));
    const maskedWidth = Math.max(0, chartArea.right - maskStart);
    const cardWidth = overlayCard?.offsetWidth || 160;
    const cardHeight = overlayCard?.offsetHeight || 96;
    const horizontalPadding = 12;
    const verticalPadding = 12;

    const preferredLeft = maskedWidth > 0
      ? maskStart + maskedWidth / 2
      : (chartArea.left + chartArea.right) / 2;
    const preferredTop = (chartArea.top + chartArea.bottom) / 2;
    const minLeft = chartArea.left + (cardWidth / 2) + horizontalPadding;
    const maxLeft = chartArea.right - (cardWidth / 2) - horizontalPadding;
    const minTop = chartArea.top + (cardHeight / 2) + verticalPadding;
    const maxTop = chartArea.bottom - (cardHeight / 2) - verticalPadding;

    const nextLeft = minLeft <= maxLeft
      ? Math.min(Math.max(preferredLeft, minLeft), maxLeft)
      : (chartArea.left + chartArea.right) / 2;
    const nextTop = minTop <= maxTop
      ? Math.min(Math.max(preferredTop, minTop), maxTop)
      : (chartArea.top + chartArea.bottom) / 2;

    setRestrictionOverlayPosition((prev) => (
      prev.top === nextTop && prev.left === nextLeft
        ? prev
        : { top: nextTop, left: nextLeft }
    ));
  }, [cutoffDateObject]);

  const timeUnit = getTimeUnit(filteredData.map(item => item.date));

  const chartData = useMemo(() => ({
    datasets: [
      {
        label: indicatorName,
        yAxisID: 'left-axis',
        data: filteredData.map((item) => ({
          x: item.date,
          y: item.value,
        })),
        borderColor: 'rgba(75,192,192,1)',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
      },
      {
        label: t('indicatorItem.fearGreedScoreLabel'),
        yAxisID: 'right-axis',
        data: filteredData.map((item) => ({
          x: item.date,
          y: item.percentileRank,
        })),
        borderColor: 'rgba(153,102,255,1)',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
      },
      ...(hasBenchmarkSeries ? [{
        label: benchmarkSeriesLabel || benchmarkAxisLabel || t('indicatorItem.spyPriceLabel'),
        yAxisID: 'spy-axis',
        data: filteredSPYData.map((item) => ({
          x: item.date,
          y: item.spyClose,
        })),
        borderColor: 'rgb(66, 66, 66)',
        backgroundColor: 'rgba(255, 255, 255, 0)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      }] : []),
    ],
  }), [benchmarkAxisLabel, benchmarkSeriesLabel, filteredData, filteredSPYData, hasBenchmarkSeries, indicatorName, t]);

  // 圖表選項
  const chartOptions = useMemo(() => ({
    scales: {
      x: {
        type: 'time',
        min: visibleRange.min || undefined,
        max: visibleRange.max || undefined,
        time: {
          unit: timeUnit,
          tooltipFormat: 'yyyy-MM-dd',
          displayFormats: {
            year: 'yyyy',
            month: "MMM''yy",
            day: 'd MMM'
          }
        },
        ticks: {
          maxTicksLimit: 6,
          autoSkip: true,
          maxRotation: 0,
          minRotation: 0
        }
      },
      'left-axis': {
        position: 'left',
        title: {
          display: true,
          text: indicatorName,
        },
        ticks: {
          callback: function(value, index, values) {
            return formatPrice(value);
          }
        }
      },
      'right-axis': {
        position: 'right',
        title: {
          display: true,
          text: t('indicatorItem.fearGreedScoreLabel'),
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function(value, index, values) {
            // Right-axis always shows percentile rank (0-100)
            return Math.round(value) + '%';
          }
        }
      },
      'spy-axis': {
        position: 'right',
        title: {
          display: hasBenchmarkSeries,
          text: benchmarkAxisLabel || benchmarkSeriesLabel || t('indicatorItem.spyPriceLabel'),
        },
        grid: {
          drawOnChartArea: false,
        },
        display: !isInsideModal && hasBenchmarkSeries,
        ticks: {
          callback: function(value, index, values) {
            return formatPrice(value);
          }
        }
      },
    },
    plugins: {
      restrictedWindowMask: {
        enabled: Boolean(isRestrictedPreview && cutoffDateObject),
        cutoffDate: cutoffDateObject,
        fillColor: '#f8fafc',
        lineColor: 'rgba(37, 99, 235, 0.88)',
        lineWidth: 1.5
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(tooltipItem) {
            let label = tooltipItem.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (tooltipItem.parsed.y !== null) {
              if (tooltipItem.dataset.yAxisID === 'right-axis') {
                // Percentile rank on right-axis, round and add %
                label += Math.round(tooltipItem.parsed.y) + '%';
              } else {
                // Other axes (left-axis for indicator value, spy-axis for SPY price)
                label += formatPrice(tooltipItem.parsed.y);
              }
            }
            return label;
          }
        }
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  }), [benchmarkAxisLabel, benchmarkSeriesLabel, cutoffDateObject, hasBenchmarkSeries, indicatorName, isInsideModal, isRestrictedPreview, t, timeUnit, visibleRange.max, visibleRange.min]);

  useEffect(() => {
    if (!chartRestrictionOverlay) {
      return undefined;
    }

    let frameId = requestAnimationFrame(() => {
      updateRestrictionOverlayPosition();
    });

    const node = chartContainerRef.current;
    let observer;

    if (node && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        cancelAnimationFrame(frameId);
        frameId = requestAnimationFrame(() => {
          updateRestrictionOverlayPosition();
        });
      });
      observer.observe(node);
    }

    return () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
    };
  }, [chartData, chartOptions, chartRestrictionOverlay, selectedTimeRange, updateRestrictionOverlayPosition]);

  // 計算市場情緒鍵
  const sentimentKey = useMemo(() =>
    getSentiment(indicator.percentileRank !== null && indicator.percentileRank !== undefined ? Math.round(indicator.percentileRank) : null),
    [indicator.percentileRank]
  );
  // 翻譯市場情緒
  const sentiment = t(sentimentKey);
  // 獲取原始情緒（用於 CSS class）
  const rawSentiment = sentimentKey.split('.').pop();

  const handleMouseEnter = (event) => {
    setIsTooltipVisible(true);
  };

  const handleMouseLeave = () => {
    setIsTooltipVisible(false);
  };

  const handleTouchStartForTooltip = (event) => {
    event.stopPropagation();
    setIsTooltipVisible(true);
  };

  const handleTouchEndForTooltip = () => {
      setIsTooltipVisible(false);
  };

  return (
    <div className={`indicator-item indicator-item--${rawSentiment}`}>
      <h3>{indicatorName}</h3>
      {!loading ? (
        <div className="indicator-item__content">
          <div className="analysis-result">
            <div className="analysis-item">
              <span className="analysis-label">{t('indicatorItem.latestDataLabel')}</span>
              <span className="analysis-value">
                {indicator.value ? indicator.value.toFixed(2) : t('indicatorItem.notAvailable')}
              </span>
            </div>
            <div className="analysis-item"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStartForTooltip}
              onTouchEnd={handleTouchEndForTooltip}
            >
              <span className="analysis-label">
                <span className="interactive-label">{t('indicatorItem.fearGreedScoreLabel')}</span>
              </span>
              <span className="analysis-value">
                {indicator.percentileRank !== null && indicator.percentileRank !== undefined ? Math.round(indicator.percentileRank) : t('indicatorItem.notAvailable')}
              </span>
              {isTooltipVisible && (
                <div 
                  className="tooltip"
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  {t('indicatorItem.fearGreedTooltip')}
                </div>
              )}
            </div>
            <div className="analysis-item">
              <span className="analysis-label">{t('indicatorItem.marketSentimentLabel')}</span>
              <span className={`analysis-value sentiment-${rawSentiment}`}>{sentiment}</span>
            </div>
          </div>
          <TimeRangeSelector
            selectedTimeRange={selectedTimeRange}
            handleTimeRangeChange={handleTimeRangeChange}
          />
          <div ref={chartContainerRef} className="indicator-chart">
            {filteredData.length > 0 ? (
              <>
                <Line ref={chartRef} data={chartData} options={chartOptions} />
                {chartRestrictionOverlay && (
                  <div
                    className={`indicator-chart__restriction${chartRestrictionOverlay.compact ? ' is-compact' : ''}`}
                    style={restrictionOverlayPosition}
                  >
                    <div ref={restrictionCardRef} className="indicator-chart__restrictionCard">
                      <span className="indicator-chart__restrictionEyebrow">
                        {t('marketSentiment.dataLimitation.overlayEyebrow')}
                      </span>
                      <strong className="indicator-chart__restrictionTitle">
                        {chartRestrictionOverlay.compact
                          ? t('marketSentiment.dataLimitation.overlayCompactTitle')
                          : t('marketSentiment.dataLimitation.overlayTitle')}
                      </strong>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="chart-placeholder">{t('indicatorItem.noData')}</div>
            )}
          </div>
        </div>
      ) : (
        <div className="indicator-item__loadingShell" role="status" aria-live="polite">
          <div className="indicator-item__loadingMetrics" aria-hidden="true">
            <div className="indicator-item__loadingMetric">
              <span className="indicator-item__skeleton indicator-item__skeleton--label" />
              <span className="indicator-item__skeleton indicator-item__skeleton--value" />
            </div>
            <div className="indicator-item__loadingMetric">
              <span className="indicator-item__skeleton indicator-item__skeleton--label" />
              <span className="indicator-item__skeleton indicator-item__skeleton--value" />
            </div>
            <div className="indicator-item__loadingMetric">
              <span className="indicator-item__skeleton indicator-item__skeleton--label" />
              <span className="indicator-item__skeleton indicator-item__skeleton--value indicator-item__skeleton--valueShort" />
            </div>
          </div>
          <div className="indicator-item__loadingRange" aria-hidden="true">
            <span className="indicator-item__skeleton indicator-item__skeleton--range" />
          </div>
          <div className="indicator-item__loadingChart" aria-hidden="true">
            <span className="indicator-item__loadingChartGlow" />
            <span className="indicator-item__loadingChartGrid" />
          </div>
        </div>
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
}

export default IndicatorItem;
