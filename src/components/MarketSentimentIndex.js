import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './MarketSentimentIndex.css';
import 'chartjs-adapter-date-fns';
import GaugeChart from 'react-gauge-chart';
import styled from 'styled-components';

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

// 在文件頂部添加這兩個常量
const BUBBLE_RADIUS = 155; // 控制泡泡圍繞的圓的半徑
const BUBBLE_Y_OFFSET = 0; // 控制泡泡的垂直偏移，正值向上移動，負值向下移動

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

// 使用 styled-components 創建自定義的 GaugeChart
const StyledGaugeChart = styled(GaugeChart)`
  .gauge-chart {
    .circle-outer {
      fill: none;
      stroke: #e6e6e6;
      stroke-width: 30;
    }
    .circle-inner {
      fill: none;
      stroke-width: 30;
      filter: url(#innerShadow);
    }
    .circle-inner-0 {
      stroke: url(#gradient-0);
    }
    .circle-inner-1 {
      stroke: url(#gradient-1);
    }
    .circle-inner-2 {
      stroke: url(#gradient-2);
    }
    .circle-inner-3 {
      stroke: url(#gradient-3);
    }
    .circle-inner-4 {
      stroke: url(#gradient-4);
    }
    .needle {
      fill: #464A4F;
    }
    .needle-base {
      fill: #464A4F;
    }
  }
`;

// 修改漸變色定義，從極度恐懼到極度貪婪
const gradients = [
  ['#143829', '#1A432F'],  // 極度恐懼 - 深墨綠色
  ['#2B5B3F', '#326B4A'],  // 恐懼 - 深綠色
  ['#E9972D', '#EBA542'],  // 中性 - 橙黃色
  ['#C4501B', '#D05E2A'],  // 貪婪 - 橙紅色
  ['#A0361B', '#B13D1F']   // 極度貪婪 - 深紅褐色
];

const MarketSentimentIndex = () => {
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1Y');
  const [indicatorsData, setIndicatorsData] = useState({});
  const [historicalData, setHistoricalData] = useState([]);
  const [activeTab, setActiveTab] = useState('composite'); // 新增：用於跟踪當前活動的標籤
  const [viewMode, setViewMode] = useState('overview'); // 修改：默認顯示概覽（最新情緒指數）
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const initialRenderRef = useRef(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchSentimentData() {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/market-sentiment`);
        
        if (isMounted) {
          setSentimentData(response.data);
          setIndicatorsData(response.data.indicators);
          // 使用 setTimeout 確保數據完全載入後再設置 isDataLoaded
          setTimeout(() => {
            setIsDataLoaded(true);
          }, 100);
        }
      } catch (error) {
        if (isMounted) {
          console.error('獲取市場情緒數據時出錯:', error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchSentimentData();

    return () => {
      isMounted = false;
    };
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
        borderColor: '#C78F57',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          
          // 創建垂直漸層，使用相同顏色但不同透明度
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(199, 143, 87, 0)');     // #C78F57 完全透明
          gradient.addColorStop(0.5, 'rgba(199, 143, 87, 0.2)'); // #C78F57 半透明
          gradient.addColorStop(1, 'rgba(199, 143, 87, 0.4)');   // #C78F57 較不透明
          
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'SPY 價格',
        yAxisID: 'right-axis',
        data: filteredData.map((item) => item.spyClose),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          
          // 創建垂直漸層
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(54, 162, 235, 0)');     // 完全透明
          gradient.addColorStop(0.5, 'rgba(54, 162, 235, 0.2)'); // 半透明
          gradient.addColorStop(1, 'rgba(54, 162, 235, 0.4)');   // 較不透明
          
          return gradient;
        },
        fill: true,
        tension: 0.4, // 增加曲線的平滑度
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

  // 修改 GaugeChart 的渲染
  const renderGaugeChart = () => (
    <StyledGaugeChart
      id="gauge-chart"
      nrOfLevels={5}
      colors={[
        '#143829',  // 極度恐懼
        '#2B5B3F',  // 恐懼
        '#E9972D',  // 中性
        '#C4501B',  // 貪婪
        '#A0361B'   // 極度貪婪
      ]}
      percent={sentimentData.totalScore / 100}
      arcWidth={0.3}
      cornerRadius={5}
      animDelay={0}
      hideText={true}
      needleTransitionDuration={!isDataLoaded || initialRenderRef.current ? 0 : 3000}
      needleTransition="easeElastic"
    />
  );

  // 在組件渲染完成後將 initialRenderRef 設為 false
  useEffect(() => {
    if (isDataLoaded) {
      initialRenderRef.current = false;
    }
  }, [isDataLoaded]);

  if (loading) {
    return <div>載入中...</div>;
  }

  if (!sentimentData) {
    return <div>未能獲取市場情緒數據。</div>;
  }

  return (
    <>
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
            <h3>市場情緒綜合指數</h3>
            <div className="view-mode-selector">
              <button
                className={`view-mode-button ${viewMode === 'overview' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('overview')}
              >
                最新情緒指數
              </button>
              <button
                className={`view-mode-button ${viewMode === 'timeline' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('timeline')}
              >
                歷史數據
              </button>
            </div>
            <div className="indicator-chart-container">
              {viewMode === 'overview' ? (
                <div className="gauge-chart">
                  <div 
                    className="gauge-value-bubble"
                    style={{
                      left: `calc(50% + ${Math.cos((sentimentData.totalScore / 100 - 0.5) * Math.PI) * BUBBLE_RADIUS}px)`,
                      bottom: `${Math.sin((sentimentData.totalScore / 100 - 0.5) * Math.PI) * BUBBLE_RADIUS + BUBBLE_Y_OFFSET}px`,
                      transform: `translate(-50%, 50%) rotate(${(sentimentData.totalScore / 100 - 0.5) * 180}deg)`
                    }}
                  >
                    {Math.round(sentimentData.totalScore)}
                  </div>
                  {renderGaugeChart()}
                  <svg width="0" height="0">
                    <defs>
                      <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                        <feOffset in="blur" dx="2" dy="2" result="offsetBlur" />
                        <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
                      </filter>
                      {gradients.map((gradient, index) => (
                        <linearGradient key={index} id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={gradient[0]} />
                          <stop offset="100%" stopColor={gradient[1]} />
                        </linearGradient>
                      ))}
                    </defs>
                  </svg>
                  <div className="gauge-center-value">
                    {Math.round(sentimentData.totalScore)}
                  </div>
                  <div className="gauge-labels">
                    <span className="gauge-label gauge-label-left">極度恐懼</span>
                    <span className="gauge-label gauge-label-right">極度貪婪</span>
                  </div>
                  <div className="last-update-time">
                    最後更新時間: {new Date(sentimentData.compositeScoreLastUpdate).toLocaleDateString('zh-TW')}
                  </div>
                </div>
              ) : (
                <div className="indicator-chart">
                  <Line data={chartData} options={chartOptions} />
                </div>
              )}
            </div>
            <p className="analysis-description">
              綜合多個代表市場情緒的數據，包含AAII投資人調查、VIX指數...等等，用來衡量整體投資市場的氛圍。當數值愈接近100，代表市場極度樂觀；當數值接近0，代表市場極度悲觀。<br /><br />
              回顧歷史數據，例如在金融海嘯期間股市最低點2009年3月、疫情爆發後股市最低點2020年3月、以及聯準會2022年的連續升息期間，市場情緒綜合指數都曾經低於10、甚至接近0，回頭看都是相當好的買點。
            </p>
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
