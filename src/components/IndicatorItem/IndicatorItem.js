import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  TimeScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import './IndicatorItem.css';
import TimeRangeSelector from '../Common/TimeRangeSelector/TimeRangeSelector';
import { filterDataByTimeRange } from '../../utils/timeUtils';
import { getSentiment } from '../../utils/sentimentUtils';
import { useTranslation } from 'react-i18next';
import { useToastManager } from '../Watchlist/hooks/useToastManager';
import { handleApiError } from '../../utils/errorHandler';
import { Toast } from '../Watchlist/components/Toast';
import { formatPrice } from '../../utils/priceUtils';

// 添加這行來定義 API_BASE_URL
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

// 註冊 Chart.js 的元件和插件
ChartJS.register(
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  TimeScale,
  Filler,
  Tooltip,
  Legend
);

// 新增：獲取時間單位的函數
function getTimeUnit(dates) {
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

function IndicatorItem({ indicatorKey, indicator, selectedTimeRange, handleTimeRangeChange, historicalSPYData, isInsideModal }) {
  const { t } = useTranslation();
  const { showToast, toast, hideToast } = useToastManager();
  const indicatorName = useMemo(() => {
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
  }, [indicatorKey, t]);

  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  useEffect(() => {
    const controller = new AbortController(); // 建立 AbortController
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/api/indicator-history`, {
        params: {
          indicator: indicatorKey,
        },
        signal: controller.signal, // 將 signal傳遞給 axios
      })
      .then((response) => {
        // 檢查請求是否已被取消
        if (controller.signal.aborted) {
          return;
        }
        const formattedData = response.data.map((item) => ({
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
        if (axios.isCancel(error)) {
          console.log(`Request for ${indicatorKey} canceled:`, error.message);
        } else {
          handleApiError(error, showToast, t);
          setHistoricalData([]);
        }
      })
      .finally(() => {
        // 檢查請求是否已被取消
        if (controller.signal.aborted) return;
        setLoading(false);
      });

    // Cleanup function
    return () => {
      console.log(`Aborting request for ${indicatorKey}`);
      controller.abort(); // 當 effect 清理時，取消請求
    };
  }, [indicatorKey, t, showToast]); // 移除 indicatorName, 因為它已經是 indicatorKey 的衍伸

  // 過濾數據
  const filteredData = React.useMemo(() => {
    const data = filterDataByTimeRange(historicalData, selectedTimeRange);
    return data;
  }, [historicalData, selectedTimeRange]);

  // 過濾 SPY 數據以匹配當前指標的時間範圍
  const filteredSPYData = React.useMemo(() => {
    return filterDataByTimeRange(historicalSPYData, selectedTimeRange);
  }, [historicalSPYData, selectedTimeRange]);

  // 獲取時間單位
  const timeUnit = getTimeUnit(filteredData.map(item => item.date));

  // 構建圖表數據
  const chartData = useMemo(() => ({
    labels: filteredData.map((item) => item.date),
    datasets: [
      {
        label: indicatorName,
        yAxisID: 'left-axis',
        data: filteredData.map((item) => item.value),
        borderColor: 'rgba(75,192,192,1)',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
      },
      {
        label: t('indicatorItem.fearGreedScoreLabel'),
        yAxisID: 'right-axis',
        data: filteredData.map((item) => item.percentileRank),
        borderColor: 'rgba(153,102,255,1)',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
      },
      {
        label: t('indicatorItem.spyPriceLabel'),
        yAxisID: 'spy-axis',
        data: filteredSPYData.map((item) => ({
          x: item.date,
          y: item.spyClose,
        })),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  }), [filteredData, filteredSPYData, indicatorName, t]);

  // 圖表選項
  const chartOptions = useMemo(() => ({
    scales: {
      x: {
        type: 'time',
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
          display: true,
          text: t('indicatorItem.spyPriceLabel'),
        },
        grid: {
          drawOnChartArea: false,
        },
        display: !isInsideModal,
        ticks: {
          callback: function(value, index, values) {
            return formatPrice(value);
          }
        }
      },
    },
    plugins: {
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
  }), [indicatorName, t, timeUnit, isInsideModal]); // indicatorKey is no longer needed for formatting logic here

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
    <div className="indicator-item">
      <h3>{indicatorName}</h3>
      {!loading ? (
        <>
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
          <div className="indicator-chart">
            {filteredData.length > 0 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div className="chart-placeholder">{t('indicatorItem.noData')}</div>
            )}
          </div>
        </>
      ) : (
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>{t('indicatorItem.loading')}</span>
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
