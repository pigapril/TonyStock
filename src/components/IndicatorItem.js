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

function IndicatorItem({ indicatorKey, indicator, selectedTimeRange }) {
  const indicatorName = INDICATOR_NAME_MAP[indicatorKey] || indicatorKey;

  const [historicalData, setHistoricalData] = useState([]);

  useEffect(() => {
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
      });
  }, [indicatorKey, indicatorName]);

  // 過濾數據
  const filteredData = React.useMemo(() => {
    const data = filterDataByTimeRange(historicalData, selectedTimeRange);
    return data;
  }, [historicalData, selectedTimeRange]);

  // 獲取時間單位
  const timeUnit = getTimeUnit(filteredData.map(item => item.date));

  // 構建圖表數據
  const chartData = {
    labels: filteredData.map((item) => item.date),
    datasets: [
      {
        label: '實際數據',
        yAxisID: 'left-axis',
        data: filteredData.map((item) => item.value),
        borderColor: 'rgba(75,192,192,1)',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
      },
      {
        label: '百分等級',
        yAxisID: 'right-axis',
        data: filteredData.map((item) => item.percentileRank),
        borderColor: 'rgba(153,102,255,1)',
        fill: false,
        tension: 0.1,
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
          text: '實際數據',
        },
      },
      'right-axis': {
        position: 'right',
        title: {
          display: true,
          text: '百分等級',
        },
        min: 0,
        max: 100,
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

  return (
    <div className="indicator-item">
      <h3>{indicatorName}</h3>
      {historicalData.length > 0 ? (
        <>
          <p>最新數據: {indicator.value ? indicator.value.toFixed(2) : 'N/A'}</p>
          <p>恐懼貪婪分數: {indicator.percentileRank ? Math.round(indicator.percentileRank) : 'N/A'}</p>
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

// 過濾數據的函數
function filterDataByTimeRange(data, timeRange) {
  const endDate = new Date();
  let startDate;

  switch (timeRange) {
    case '1M':
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case '3M':
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case '6M':
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 6);
      break;
    case '1Y':
      startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    case '5Y':
      startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 5);
      break;
    default:
      startDate = null;
      break;
  }

  if (startDate) {
    return data.filter((item) => item.date >= startDate && item.date <= endDate);
  } else {
    return data;
  }
}

export default IndicatorItem;
