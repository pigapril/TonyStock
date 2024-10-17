import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MarketSentimentIndex.css';
import 'chartjs-adapter-date-fns';

// 引入必要的 Chart.js 元件和插件
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

// 引入 Line 組件
import { Line } from 'react-chartjs-2';

// 引入 IndicatorItem 組件
import IndicatorItem from './IndicatorItem';

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

// 時間範圍選項
const TIME_RANGES = [
  { value: '1M', label: '最近1個月' },
  { value: '3M', label: '最近3個月' },
  { value: '6M', label: '最近6個月' },
  { value: '1Y', label: '最近1年' },
  { value: '5Y', label: '最近5年' },
  { value: 'ALL', label: '全部' },
];

// 添加這行來定義 API_BASE_URL
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

const MarketSentimentIndex = () => {
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1Y');
  const [indicatorsData, setIndicatorsData] = useState({});
  const [historicalData, setHistoricalData] = useState([]);

  useEffect(() => {
    async function fetchSentimentData() {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/market-sentiment`);
        setSentimentData(response.data);
        setIndicatorsData(response.data.indicators);
      } catch (error) {
        console.error('獲取市場情緒數據時出錯:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSentimentData();
  }, []);

  useEffect(() => {
    async function fetchHistoricalData() {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/composite-historical-data`);
        // 假設後端返回的數據格式為 [{ date: 'YYYY-MM-DD', compositeScore: Number, spyClose: Number }, ...]
        const formattedData = response.data.map((item) => ({
          date: new Date(item.date),
          compositeScore: parseFloat(item.compositeScore),
          spyClose: parseFloat(item.spyClose),
        }));
        setHistoricalData(formattedData);
      } catch (error) {
        console.error('獲取歷史綜合指數數據時出錯:', error);
      }
    }

    fetchHistoricalData();
  }, []);

  const handleTimeRangeChange = (e) => {
    setSelectedTimeRange(e.target.value);
  };

  const filterDataByTimeRange = (data, timeRange) => {
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
  };

  const filteredData = filterDataByTimeRange(historicalData, selectedTimeRange);

  // 構建圖表數據
  const chartData = {
    labels: filteredData.map((item) => item.date),
    datasets: [
      {
        label: '市場情緒指數',
        yAxisID: 'left-axis',
        data: filteredData.map((item) => item.compositeScore),
        borderColor: 'rgba(75,192,192,1)',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
      },
      {
        label: 'SPY 價格',
        yAxisID: 'right-axis',
        data: filteredData.map((item) => item.spyClose),
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
          unit: 'month',
          tooltipFormat: 'yyyy-MM-dd',
          displayFormats: {
            day: 'yyyy-MM-dd',
            month: 'yyyy-MM',
            year: 'yyyy',
          },
        },
      },
      'left-axis': {
        position: 'left',
        title: {
          display: true,
          text: '市場情緒指數',
        },
      },
      'right-axis': {
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

  if (loading) {
    return <div>載入中...</div>;
  }

  if (!sentimentData) {
    return <div>未能獲取市場情緒數據。</div>;
  }

  return (
    <div className="market-sentiment-index">
      <h2>市場情緒指數</h2>
      <p>市場情緒指數綜合了多項指標，旨在衡量市場參與者的情緒狀態。</p>

      {/* 期間切換選項 */}
      <div className="time-range-selector">
        <label htmlFor="timeRange">選擇期間：</label>
        <select id="timeRange" value={selectedTimeRange} onChange={handleTimeRangeChange}>
          {TIME_RANGES.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </div>

      {/* 綜合指數與 SPY 圖表 */}
      <div className="indicator-item">
        <h3>市場情緒指數與 SPY 價格走勢圖</h3>
        <div className="indicator-chart">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* 顯示各項指標 */}
      <div className="indicator-list">
        {Object.entries(indicatorsData).map(([key, indicator]) => {
          // 排除不需要顯示的指標，例如 "Investment Grade Bond Yield" 和 "Junk Bond Yield"
          if (key === 'Investment Grade Bond Yield' || key === 'Junk Bond Yield') {
            return null;
          }
          return (
            <IndicatorItem
              key={key}
              indicatorKey={key}
              indicator={indicator}
              selectedTimeRange={selectedTimeRange}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MarketSentimentIndex;
