import React, { useState, useEffect } from 'react';
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
import TimeRangeSelector from './Common/TimeRangeSelector/TimeRangeSelector';
import { filterDataByTimeRange } from '../utils/timeUtils';
import { getSentiment } from '../utils/sentimentUtils';

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

// 只保留 INDICATOR_NAME_MAP
export const INDICATOR_NAME_MAP = {
  'AAII Bull-Bear Spread': 'AAII 投資人情緒調查',
  'CBOE Put/Call Ratio 5-Day Avg': 'CBOE 買/賣權比例',
  'Market Momentum': 'S&P500 市場動能',
  'VIX MA50': 'VIX 恐慌指數',
  'Safe Haven Demand': '債券避險需求',
  'Junk Bond Spread': '垃圾債殖利率差',
  "S&P 500 COT Index": '期貨投機淨持倉指數',
  'NAAIM Exposure Index': 'NAAIM 經理人曝險指數',
};

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

function IndicatorItem({ indicatorKey, indicator, selectedTimeRange, handleTimeRangeChange, historicalSPYData }) {
  const indicatorName = INDICATOR_NAME_MAP[indicatorKey] || indicatorKey;
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/api/indicator-history`, {
        params: {
          indicator: indicatorKey,
        },
      })
      .then((response) => {
        console.log(`Received data for ${indicatorKey}:`, response.data);
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
        console.error(`獲取 ${indicatorName} 的歷史數據時出錯:`, error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [indicatorKey, indicatorName]);

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
  const chartData = {
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
        label: `${indicatorName}(百分等級)`,
        yAxisID: 'right-axis',
        data: filteredData.map((item) => item.percentileRank),
        borderColor: 'rgba(153,102,255,1)',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
      },
      {
        label: 'SPY 價格',
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
  };

  // 圖表選項
  const chartOptions = {
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
      },
      'right-axis': {
        position: 'right',
        title: {
          display: true,
          text: `${indicatorName}(百分等級)`,
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      'spy-axis': {
        position: 'right',
        title: {
          display: true,
          text: 'SPY 價格',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  // 計算市場情緒
  const sentiment = indicator.percentileRank ? getSentiment(Math.round(indicator.percentileRank)) : 'N/A';

  const handleMouseEnter = (event) => {
    setIsTooltipVisible(true);
  };

  const handleMouseLeave = () => {
    setIsTooltipVisible(false);
  };

  const handleTouchStart = (event) => {
    setIsTooltipVisible(true);
  };

  const handleTouchEnd = () => {
      setIsTooltipVisible(false);
  };

  return (
    <div className="indicator-item">
      <h3>{indicatorName}</h3>
      {!loading ? (
        <>
          <div className="analysis-result">
            <div className="analysis-item">
              <span className="analysis-label">最新數據</span>
              <span className="analysis-value">
                {indicator.value ? indicator.value.toFixed(2) : 'N/A'}
              </span>
            </div>
            <div className="analysis-item"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <span className="analysis-label">
                <span className="interactive-label">恐懼貪婪分數</span>
              </span>
              <span className="analysis-value">
                {indicator.percentileRank ? Math.round(indicator.percentileRank) : 'N/A'}
              </span>
              {isTooltipVisible && (
                <div className="tooltip">
                  為方便統一衡量不同指標，將實際數值依據歷史位階轉換為百分標準，作為恐懼貪婪分數(0~100)。分數愈高代表市場愈貪婪；分數愈低代表市場愈恐懼
                </div>
              )}
            </div>
            <div className="analysis-item">
              <span className="analysis-label">市場情緒</span>
              <span className={`analysis-value sentiment-${sentiment}`}>{sentiment}</span>
            </div>
          </div>
          <TimeRangeSelector
            selectedTimeRange={selectedTimeRange}
            handleTimeRangeChange={handleTimeRangeChange}
          />
          <div className="indicator-chart">
            <Line data={chartData} options={chartOptions} />
          </div>
        </>
      ) : (
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>載入中...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default IndicatorItem;
