import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MarketSentimentIndex.css';
import 'chartjs-adapter-date-fns';
import GaugeChart from 'react-gauge-chart'; // 引入 GaugeChart

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
import IndicatorItem, { INDICATOR_NAME_MAP } from './IndicatorItem';

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

const MarketSentimentIndex = () => {
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1Y');
  const [indicatorsData, setIndicatorsData] = useState({});
  const [historicalData, setHistoricalData] = useState([]);
  const [activeTab, setActiveTab] = useState('composite'); // 新增：用於跟踪當前活動的標籤
  const [viewMode, setViewMode] = useState('timeline'); // 新增：用於跟踪視圖模式

  useEffect(() => {
    async function fetchSentimentData() {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/market-sentiment`);
        console.log('Received sentiment data:', response.data);
        setSentimentData(response.data);
        setIndicatorsData(response.data.indicators);
      } catch (error) {
        console.error('獲取市場情緒數據時出錯:', error.response ? error.response.data : error.message);
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
        const formattedData = response.data
          .filter(item => item.compositeScore != null && item.spyClose != null)
          .map((item) => ({
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
  
  // 獲取時間單位
  const timeUnit = getTimeUnit(filteredData.map(item => item.date));

  // 構建圖表數據
  const chartData = {
    labels: filteredData.map((item) => item.date),
    datasets: [
      {
        label: '市場情緒指數',
        yAxisID: 'left-axis',
        data: filteredData.map((item) => item.compositeScore),
        borderColor: 'rgba(255, 99, 132, 1)', // 改為粉紅色
        backgroundColor: 'rgba(255, 99, 132, 0.2)', // 添加淡粉色背景
        fill: true,
        tension: 0.1,
        pointRadius: 0,
      },
      {
        label: 'SPY 價格',
        yAxisID: 'right-axis',
        data: filteredData.map((item) => item.spyClose),
        borderColor: 'rgba(54, 162, 235, 1)', // 改為藍色
        backgroundColor: 'rgba(54, 162, 235, 0.2)', // 添加淡藍色背景
        fill: true,
        tension: 0.1,
        pointRadius: 0,
      },
    ],
  };

  // 修改圖表選項
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
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
          overScaleMode: 'x',
        },
        zoom: {
          wheel: {
            enabled: false,
          },
          pinch: {
            enabled: false,
          },
          mode: 'x',
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  // 新增：處理標籤切換的函數
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
  };

  // 新增：處理視圖模式切換的函數
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  if (loading) {
    return <div>載入中...</div>;
  }

  if (!sentimentData) {
    return <div>未能獲取市場情緒數據。</div>;
  }

  return (
    <>
      {/* 直接渲染內容，不需要額外的容器 */}
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
      <div className="tabs-grid">
        <button
          className={`tab-button ${activeTab === 'composite' ? 'active' : ''}`}
          onClick={() => handleTabChange('composite')}
        >
          市場情緒綜合指數
        </button>
        {Object.keys(indicatorsData).map((key) => (
          key !== 'Investment Grade Bond Yield' && key !== 'Junk Bond Yield' && (
            <button
              key={key}
              className={`tab-button ${activeTab === key ? 'active' : ''}`}
              onClick={() => handleTabChange(key)}
            >
              {INDICATOR_NAME_MAP[key] || key} {/* 使用 INDICATOR_NAME_MAP 中的中文名稱 */}
            </button>
          )
        ))}
      </div>
      <div className="tab-content">
        {activeTab === 'composite' && (
          <div className="indicator-item">
            <h3>市場情緒綜合指數與 S&P500 ETF</h3>
            <p className="analysis-description">
              綜合多個代表市場情緒的數據，包含AAII投資人調查、VIX指數...等等，用來衡量整體投資市場的氛圍。當數值愈接近100，代表市場極度樂觀；當數值接近0，代表市場極度悲觀。<br /><br />
              回顧歷史數據，例如在金融海嘯期間股市最低點2009年3月、疫情爆發後股市最低點2020年3月、以及聯準會2022年的連續升息期間，市場情緒綜合指數都曾經低於10、甚至接近0，回頭看都是相當好的買點。
            </p>
            <div className="view-mode-selector">
              <button
                className={`view-mode-button ${viewMode === 'overview' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('overview')}
              >
                概覽
              </button>
              <button
                className={`view-mode-button ${viewMode === 'timeline' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('timeline')}
              >
                時間線
              </button>
            </div>
            <div className="indicator-chart-container">
              {viewMode === 'overview' ? (
                <div className="gauge-chart">
                  <div className="gauge-labels">
                    <span className="gauge-label gauge-label-left">極度恐懼</span>
                    <span className="gauge-label gauge-label-right">極度樂觀</span>
                  </div>
                  <GaugeChart
                    id="gauge-chart"
                    nrOfLevels={5}
                    percent={sentimentData.totalScore / 100}
                    textColor="#333"
                    needleColor="#464A4F"
                    colors={["#FF0000", "#FFA500", "#FFFF00", "#00FF00", "#00FF00"]}
                    arcWidth={0.3}
                    cornerRadius={5}
                    animDelay={0}
                    hideText={true}
                    needleBaseColor="#464A4F"
                    needleTransitionDuration={3000}
                    needleTransition="easeElastic"
                  />
                  <p className="gauge-value">最新綜合情緒指標: {sentimentData.totalScore}</p>
                </div>
              ) : (
                <div className="indicator-chart">
                  <Line data={chartData} options={chartOptions} />
                </div>
              )}
            </div>
          </div>
        )}
        {Object.entries(indicatorsData).map(([key, indicator]) => (
          key !== 'Investment Grade Bond Yield' && key !== 'Junk Bond Yield' && activeTab === key && (
            <IndicatorItem
              key={key}
              indicatorKey={key}
              indicator={indicator}
              selectedTimeRange={selectedTimeRange}
            />
          )
        ))}
      </div>
    </>
  );
};

export default MarketSentimentIndex;
