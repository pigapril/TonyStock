import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Link, Route, Routes } from 'react-router-dom'; // 移除 BrowserRouter
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import './App.css';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

// 引入所有需要的圖標，包括 FaHeartbeat 和 FaBars
import { FaChartLine, FaInfoCircle, FaChartBar, FaHeartbeat, FaBars} from 'react-icons/fa';

// 引入 'react-responsive' 的 useMediaQuery
import { useMediaQuery } from 'react-responsive';

import 'chartjs-plugin-crosshair';
import MarketSentimentIndex from './components/MarketSentimentIndex';
import PageContainer from './components/PageContainer';
import ULBandChart from './components/ULBandChart';

import { Analytics } from './utils/analytics';

// 獲取 API 基礎 URL
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'; // 使用環境變數

// 設定 axios 的預設 baseURL
axios.defaults.baseURL = API_BASE_URL;

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'pageview',
        page: {
          path: location.pathname,
          title: document.title
        }
      });
    }
  }, [location]);

  return null;
}

// 在 App 組件之前添加這個新的組件
const Overlay = ({ isVisible, onClick }) => (
  <div 
    className={`overlay ${isVisible ? 'visible' : ''}`}
    onClick={onClick}
  />
);

// 修改 getTimeUnit 函數
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

function App() {
  const [stockCode, setStockCode] = useState('');
  const [years, setYears] = useState('3.5');
  const [yearsError, setYearsError] = useState('');
  const [backTestDate, setBackTestDate] = useState('');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState('');
  const [displayedStockCode, setDisplayedStockCode] = useState('');
  const [activeChart, setActiveChart] = useState('sd'); // 'sd' 或 'ulband'
  const [ulbandData, setUlbandData] = useState(null);
  //const [error, setError] = useState(null);  // 添加 error state

  // 修改這裡，使用 useState 的第二個參數來設置初始值
  const [actualStockCode, setActualStockCode] = useState('SPY');
  const [actualYears, setActualYears] = useState(3.5);
  const [actualBackTestDate, setActualBackTestDate] = useState('');

  const [multiStockData, setMultiStockData] = useState([]);

  // 使用 useMediaQuery 檢測是否為行動裝置
  const isMobile = useMediaQuery({ maxWidth: 768 });

  // 控制側邊欄顯示狀態
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 切換側邊欄的函數
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // 添加新的 closeSidebar 函數
  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const fetchStockData = useCallback(async (stockCode, yearsToUse, backTestDateToUse) => {
    setLoading(true);
    setTimeoutMessage('');

    try {
      const response = await axios.get(`${API_BASE_URL}/api/integrated-analysis`, {
        params: {
          stockCode,
          years: yearsToUse,
          backTestDate: backTestDateToUse
        },
        timeout: 30000
      });

      const { data } = response.data;
      const {
        dates,
        prices,
        sdAnalysis,
        weeklyDates,
        weeklyPrices,
        upperBand,
        lowerBand,
        ma20
      } = data;

      // 設置標準差圖表數據
      setChartData({
        labels: dates,
        datasets: [
          {
            label: 'Price',
            data: prices,
            borderColor: 'blue',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'Trend Line',
            data: sdAnalysis.trendLine,
            borderColor: '#E9972D',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'TL-2SD',
            data: sdAnalysis.tl_minus_2sd,
            borderColor: '#143829',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'TL-SD',
            data: sdAnalysis.tl_minus_sd,
            borderColor: '#2B5B3F',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'TL+SD',
            data: sdAnalysis.tl_plus_sd,
            borderColor: '#C4501B',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'TL+2SD',
            data: sdAnalysis.tl_plus_2sd,
            borderColor: '#A0361B',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          }
        ],
        timeUnit: getTimeUnit(dates)
      });
      
      setDisplayedStockCode(stockCode);

      // 設置超漲超跌通道數據
      setUlbandData({
        dates: weeklyDates,
        prices: weeklyPrices,
        upperBand,
        lowerBand,
        ma20
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      
      // 使用後端提供的錯誤訊息
      if (error.response && error.response.data) {
        setTimeoutMessage(error.response.data.message);
      } else {
        setTimeoutMessage('發生錯誤，請稍後再試');
      }
      
      Analytics.error({
        type: 'API_ERROR',
        errorCode: error.response?.data?.errorCode || 'UNKNOWN_ERROR',
        message: error.response?.data?.message || error.message,
        stockCode,
        years: yearsToUse
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 轉換並驗證年數
    const convertedYears = years
      .replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
      .replace(/[．。]/g, '.');
    const numYears = parseFloat(convertedYears);

    if (isNaN(numYears) || numYears <= 0) {
      setYearsError('請輸入有效的查詢期間（年），且必須大於零。');
      return;
    }

    setYearsError('');
    
    // 使用通用追蹤模組
    Analytics.stockAnalysis.search({
      stockCode: stockCode,
      years: numYears,
      backTestDate: backTestDate
    });
    
    // 更新實際使用的值
    setActualStockCode(stockCode);
    setActualYears(numYears);
    setActualBackTestDate(backTestDate);
    
    fetchStockData(stockCode, numYears, backTestDate);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        await fetchStockData(actualStockCode, actualYears, actualBackTestDate, true);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();

    const intervalId = setInterval(() => {
      fetchStockData(actualStockCode, actualYears, actualBackTestDate);
    }, 12 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [fetchStockData, actualStockCode, actualYears, actualBackTestDate]);

  useEffect(() => {
    // 發送頁面瀏覽
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'pageview',
      page: {
        path: window.location.pathname,
        title: document.title
      }
    });
  }, []);

  // 添新的 useEffect 來获取多个股票的数据
  useEffect(() => {
    const fetchMultiStockData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/multi-stock-data`);
        setMultiStockData(response.data);
      } catch (error) {
        console.error('Error fetching multi-stock data:', error);
      }
    };

    fetchMultiStockData();
  }, []);

  // 创建多个股票图表的函数
  const renderMultiStockCharts = () => {
    return multiStockData.map((stockData, index) => (
      <div key={index} className="card chart-card multi-stock-chart">
        <h3>{`${stockData.stockCode} 分析結果`}</h3>
        <div className="chart-container" style={{ 
            height: '400px',  // 設定與 ULBandChart 相同的高度
            width: '100%'
        }}>
          <Line
            data={{
              labels: stockData.dates,
              datasets: [
                {
                  label: 'Price',
                  data: stockData.prices,
                  borderColor: 'blue',
                  fill: false,
                  pointRadius: 0
                },
                {
                  label: 'Trend Line',
                  data: stockData.trendLine,
                  borderColor: '#E9972D',
                  borderWidth: 2,
                  fill: false,
                  pointRadius: 0
                },
                {
                  label: 'TL-2SD',
                  data: stockData.tl_minus_2sd,
                  borderColor: '#143829',
                  borderWidth: 2,
                  fill: false,
                  pointRadius: 0
                },
                {
                  label: 'TL-SD',
                  data: stockData.tl_minus_sd,
                  borderColor: '#2B5B3F',
                  borderWidth: 2,
                  fill: false,
                  pointRadius: 0
                },
                {
                  label: 'TL+SD',
                  data: stockData.tl_plus_sd,
                  borderColor: '#C4501B',
                  borderWidth: 2,
                  fill: false,
                  pointRadius: 0
                },
                {
                  label: 'TL+2SD',
                  data: stockData.tl_plus_2sd,
                  borderColor: '#A0361B',
                  borderWidth: 2,
                  fill: false,
                  pointRadius: 0
                }
              ]
            }}
            options={{
              plugins: {
                legend: { display: false },
                tooltip: {
                  enabled: false,
                  mode: 'index',
                  intersect: false,
                  external: function(context) {
                    const tooltipModel = context.tooltip;
                    let tooltipEl = document.getElementById('chartjs-tooltip');

                    if (!tooltipEl) {
                      tooltipEl = document.createElement('div');
                      tooltipEl.id = 'chartjs-tooltip';
                      document.body.appendChild(tooltipEl);
                    }

                    if (tooltipModel.opacity === 0) {
                      tooltipEl.style.opacity = 0;
                      return;
                    }

                    if (tooltipModel.body) {
                      const titleLines = tooltipModel.title || [];

                      // 定義我們想要顯示的數據集標籤
                      const desiredLabels = ['TL+2SD', 'TL+SD', 'Trend Line', 'Price', 'TL-SD', 'TL-2SD'];

                      // 過濾並排序數據點
                      const sortedItems = tooltipModel.dataPoints
                        .filter(item => desiredLabels.includes(item.dataset.label))
                        .sort((a, b) => b.raw - a.raw);

                      let innerHtml = `<div class="custom-tooltip">`;
                      innerHtml += `<div class="tooltip-title">${titleLines[0]}</div>`;

                      sortedItems.forEach(item => {
                        const label = item.dataset.label;
                        const value = item.raw.toFixed(2);
                        const color = item.dataset.borderColor;
                        innerHtml += `
                          <div class="tooltip-item" style="display: flex; align-items: center;">
                            <div style="width: 10px; height: 10px; background-color: ${color}; margin-right: 5px;"></div>
                            <span>${label}: ${value}</span>
                          </div>
                        `;
                      });

                      innerHtml += `</div>`;
                      tooltipEl.innerHTML = innerHtml;
                    }

                    const position = context.chart.canvas.getBoundingClientRect();
                    const bodyWidth = document.body.clientWidth;

                    // 計算 tooltip 的寬度（假設最大寬度為200px）
                    const tooltipWidth = Math.min(200, bodyWidth * 0.8);

                    // 計算 tooltip 的左側位置
                    let left = position.left + window.pageXOffset + tooltipModel.caretX;

                    // 檢查是否會超出右邊界
                    if (left + tooltipWidth > bodyWidth) {
                      left = bodyWidth - tooltipWidth;
                    }

                    // 檢查是否會超出左邊界
                    if (left < 0) {
                      left = 0;
                    }

                    tooltipEl.style.opacity = 1;
                    tooltipEl.style.position = 'absolute';
                    tooltipEl.style.left = left + 'px';
                    tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
                    tooltipEl.style.font = tooltipModel.options.bodyFont.string;
                    tooltipEl.style.padding = tooltipModel.options.padding + 'px ' + tooltipModel.options.padding + 'px';
                    tooltipEl.style.pointerEvents = 'none';
                    tooltipEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                    tooltipEl.style.color = 'white';
                    tooltipEl.style.borderRadius = '3px';
                    tooltipEl.style.zIndex = 1000;
                    tooltipEl.style.maxWidth = tooltipWidth + 'px'; // 設置最大寬度
                    tooltipEl.style.width = 'auto'; // 讓寬度自適應內容
                  }
                },
                crosshair: {
                  line: {
                    color: '#F66',
                    width: 1,
                    dashPattern: [5, 5]
                  },
                  sync: {
                    enabled: false
                  },
                  zoom: {
                    enabled: false
                  }
                }
              },
              hover: {
                mode: 'index',
                intersect: false
              },
              scales: { y: { position: 'right' } }
            }}
          />
        </div>
      </div>
    ));
  };

  const location = useLocation();

  useEffect(() => {
    // 重置側邊欄寬度
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.style.width = '250px';
    }
  }, [location]);

  // 修改這個函數來處理全形數字和字母
  const handleStockCodeChange = (e) => {
    const value = e.target.value;
    // 將全形數字和字母轉換為半形
    const convertedValue = value.replace(/[０-９Ａ-Ｚａ-ｚ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0));
    setStockCode(convertedValue.toUpperCase()); // 轉換為大寫
  };

  // 圖表切換追蹤
  const handleChartSwitch = (chartType) => {
    Analytics.stockAnalysis.chartSwitch(chartType);
    setActiveChart(chartType);
  };

  return (
    <div className={`App ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <PageViewTracker />
      <div className="App-inner">
        {/* 側邊欄 */}
        <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <img src="/logo.png" alt="Logo" className="logo" />
            {/*<h2>市場溫度計</h2>*/}
          </div>
          <ul>
            {/* 移除或註釋掉這個 "首頁" 的 li 項
            <li>
              <Link to="/" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaHome />
                <span>首頁</span>
              </Link>
            </li>
            */}
            <li>
              <Link to="/" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaChartLine />
                <span>價格標準差分析</span>
              </Link>
            </li>
            <li>
              <Link to="/market-sentiment" onClick={() => isMobile && setSidebarOpen(false)}>
                <FaHeartbeat />
                <span>市場情緒分析</span>
              </Link>
            </li>
            <li>
              <a href="https://vocus.cc/salon/daily_chart" target="_blank" rel="noopener noreferrer">
                <FaChartBar />
                <span>關鍵圖表</span>
              </a>
            </li>
            <li>
              <a href="https://www.facebook.com/profile.php?id=61565751412240" target="_blank" rel="noopener noreferrer">
                <FaInfoCircle />
                <span>Facebook 關鍵圖表</span>
              </a>
            </li>
          </ul>
        </nav>

        {/* 主內容區域 */}
        <main className="main-content">
          {/* 頂部導航欄 */}
          <header className="top-nav">
            <div className="menu-toggle" onClick={toggleSidebar}>
              <FaBars />
            </div>
            <div className="user-actions">
              {/* <button className="btn-primary">Sign In</button>
              <button className="btn-secondary">Register</button> */}
            </div>
          </header>

          {/* 內容路由 */}
          <div className="content-area">
            <Routes>
              <Route
                path="/"
                element={
                  <PageContainer
                    title="價格標準差分析"
                    description="分析股價長期趨勢，並搭配標準差，當價格漲至最上緣時可能代表過度樂觀；當價格跌至最下緣時可能代表過度悲觀。搭配超漲超跌通道使用，當價格突破通道上下緣時，可能代表超漲或超跌，趨勢或許將持續，可以等再次回到通道時再做買賣。"
                  >
                    <div className="dashboard">
                      <div className="chart-card">
                        <div className="chart-container">
                          <div className="chart-header">
                            <div className="chart-title">
                              {displayedStockCode && `${displayedStockCode} 分析結果`}
                            </div>
                            <div className="chart-tabs">
                              <button
                                className={`chart-tab ${activeChart === 'sd' ? 'active' : ''}`}
                                onClick={() => handleChartSwitch('sd')}
                              >
                                標準差分析
                              </button>
                              <button
                                className={`chart-tab ${activeChart === 'ulband' ? 'active' : ''}`}
                                onClick={() => handleChartSwitch('ulband')}
                              >
                                超漲超跌通道
                              </button>
                            </div>
                          </div>
                          <div className="chart-content">
                            {activeChart === 'sd' && chartData && (
                              <Line
                                data={chartData}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  layout: {
                                    padding: {
                                      left: 10,
                                      right: 30,
                                      top: 20,
                                      bottom: 25
                                    }
                                  },
                                  scales: {
                                    x: {
                                      type: 'time',
                                      time: {
                                        unit: chartData.timeUnit,
                                        displayFormats: {
                                          year: 'yyyy',
                                          month: "MMM ''yy",
                                          day: 'd MMM'
                                        },
                                        tooltipFormat: 'PP'
                                      },
                                      ticks: {
                                        maxTicksLimit: 6,
                                        autoSkip: true,
                                        maxRotation: 0,
                                        minRotation: 0
                                      }
                                    },
                                    y: {
                                      position: 'right',
                                      grid: {
                                        drawBorder: true
                                      }
                                    }
                                  },
                                  plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                      enabled: false,
                                      mode: 'index',
                                      intersect: false,
                                      external: function(context) {
                                        const tooltipModel = context.tooltip;
                                        let tooltipEl = document.getElementById('chartjs-tooltip');

                                        if (!tooltipEl) {
                                          tooltipEl = document.createElement('div');
                                          tooltipEl.id = 'chartjs-tooltip';
                                          document.body.appendChild(tooltipEl);
                                        }

                                        if (tooltipModel.opacity === 0) {
                                          tooltipEl.style.opacity = 0;
                                          return;
                                        }

                                        if (tooltipModel.body) {
                                          const titleLines = tooltipModel.title || [];

                                          // 定義我們想要顯示的數據集標籤
                                          const desiredLabels = ['TL+2SD', 'TL+SD', 'Trend Line', 'Price', 'TL-SD', 'TL-2SD'];

                                          // 過濾並排序數據點
                                          const sortedItems = tooltipModel.dataPoints
                                            .filter(item => desiredLabels.includes(item.dataset.label))
                                            .sort((a, b) => b.raw - a.raw);

                                          let innerHtml = `<div class="custom-tooltip">`;
                                          innerHtml += `<div class="tooltip-title">${titleLines[0]}</div>`;

                                          sortedItems.forEach(item => {
                                            const label = item.dataset.label;
                                            const value = item.raw.toFixed(2);
                                            const color = item.dataset.borderColor;
                                            innerHtml += `
                                              <div class="tooltip-item" style="display: flex; align-items: center;">
                                                <div style="width: 10px; height: 10px; background-color: ${color}; margin-right: 5px;"></div>
                                                <span>${label}: ${value}</span>
                                              </div>
                                            `;
                                          });

                                          innerHtml += `</div>`;
                                          tooltipEl.innerHTML = innerHtml;
                                        }

                                        const position = context.chart.canvas.getBoundingClientRect();
                                        const bodyWidth = document.body.clientWidth;

                                        // 計算 tooltip 的寬度（假設最大寬度為200px）
                                        const tooltipWidth = Math.min(200, bodyWidth * 0.8);

                                        // 計算 tooltip 的左側位置
                                        let left = position.left + window.pageXOffset + tooltipModel.caretX;

                                        // 檢查是否會超出右邊界
                                        if (left + tooltipWidth > bodyWidth) {
                                          left = bodyWidth - tooltipWidth;
                                        }

                                        // 檢查是否會超出左邊界
                                        if (left < 0) {
                                          left = 0;
                                        }

                                        tooltipEl.style.opacity = 1;
                                        tooltipEl.style.position = 'absolute';
                                        tooltipEl.style.left = left + 'px';
                                        tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
                                        tooltipEl.style.font = tooltipModel.options.bodyFont.string;
                                        tooltipEl.style.padding = tooltipModel.options.padding + 'px ' + tooltipModel.options.padding + 'px';
                                        tooltipEl.style.pointerEvents = 'none';
                                        tooltipEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                                        tooltipEl.style.color = 'white';
                                        tooltipEl.style.borderRadius = '3px';
                                        tooltipEl.style.zIndex = 1000;
                                        tooltipEl.style.maxWidth = tooltipWidth + 'px'; // 設置最大寬度
                                        tooltipEl.style.width = 'auto'; // 讓寬度自適應內容
                                      }
                                    },
                                    crosshair: {
                                      line: {
                                        color: '#F66',
                                        width: 1,
                                        dashPattern: [5, 5]
                                      },
                                      sync: {
                                        enabled: false
                                      },
                                      zoom: {
                                        enabled: false
                                      }
                                    }
                                  },
                                  hover: {
                                    mode: 'index',
                                    intersect: false
                                  }
                                }}
                              />
                            )}
                            {activeChart === 'ulband' && ulbandData && (
                              <ULBandChart data={ulbandData} />  // 只傳遞一個 data prop
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="stock-analysis-card">
                        <form onSubmit={handleSubmit}>
                          <div className="input-group">
                            <label>股票代碼：</label>
                            <input
                              className="form-control"
                              type="text"
                              value={stockCode}
                              onChange={handleStockCodeChange}
                              placeholder="例如:2330、AAPL"
                              required
                              style={{ width: '150px' }}
                            />
                          </div>
                          <div className="input-group">
                            <label>查詢期間（年）：</label>
                            <input
                              className="form-control"
                              type="text"
                              value={years}
                              onChange={(e) => {
                                const value = e.target.value;
                                // 允許空值、半形數字、全形數字和小數點
                                if (value === '' || /^[0-9０-９.．。]*$/.test(value)) {
                                  setYears(value);
                                  setYearsError(''); // 清除錯誤訊息
                                }
                              }}
                              placeholder="輸入年數，如 3.5"
                              required
                              style={{ width: '150px' }}
                            />
                            {yearsError && <div className="error-message">{yearsError}</div>}
                          </div>
                          <div className="input-group">
                            <label>回測日期：</label>
                            <DatePicker
                              selected={backTestDate ? new Date(backTestDate) : null}
                              onChange={(date) => setBackTestDate(date ? date.toISOString().split('T')[0] : '')}
                              placeholderText="預設為今日"
                              className="form-control"
                              dateFormat="yyyy/MM/dd"
                              isClearable
                              style={{ width: '150px' }}
                            />
                          </div>
                          <button 
                            className={`btn-primary ${loading ? 'btn-loading' : ''}`}
                            type="submit" 
                            disabled={loading}
                          >
                            {loading ? '分析中' : '開始分析'}
                          </button>
                          {timeoutMessage && <p>{timeoutMessage}</p>}
                        </form>
                      </div>
                    </div>
                    {/* 多個股票圖表 */}
                    <div className="multi-stock-dashboard">
                      {renderMultiStockCharts()}
                    </div>
                  </PageContainer>
                }
              />
              <Route 
                path="/market-sentiment" 
                element={
                  <PageContainer
                    title="市場情緒分析"
                    description="分析市場情緒的目的，是因為當市場極度貪婪時，投資人往往忽視風險，股市泡沫隨之擴大，可能是賣出的時機。而當市場充滿恐懼時，投資人也容易過度悲觀，反而可能是買入的機會。"
                  >
                    <MarketSentimentIndex />
                  </PageContainer>
                } 
              />
            </Routes>
          </div>
        </main>

        {/* 添加遮罩層 */}
        <Overlay isVisible={sidebarOpen && isMobile} onClick={closeSidebar} />
      </div>
    </div>
  );
}

export default App;
