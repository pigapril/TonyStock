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

// 引入所有需要的圖標，包括 FaHeartbeat 和 FaBars
import { FaChartLine, FaInfoCircle, FaChartBar, FaHeartbeat, FaBars} from 'react-icons/fa';

// 引入 'react-responsive' 的 useMediaQuery
import { useMediaQuery } from 'react-responsive';

import 'chartjs-plugin-crosshair';
import MarketSentimentIndex from './components/MarketSentimentIndex';

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

function App() {
  const [stockCode, setStockCode] = useState('');
  const [years, setYears] = useState('3.5');
  const [yearsError, setYearsError] = useState('');
  const [backTestDate, setBackTestDate] = useState('');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState('');
  const [displayedStockCode, setDisplayedStockCode] = useState('');

  // 修改這裡，使用 useState 的第二個參數來設置初始值
  const [actualStockCode, setActualStockCode] = useState('AAPL');
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

  // 用於發送到後端的格式化函數
  const formatBackendStockCode = (code) => {
    const upperCaseCode = code.toUpperCase();
    if (/^\d+[A-Z]?$/.test(upperCaseCode) && !upperCaseCode.endsWith('.TW')) {
      return upperCaseCode + '.TW';
    }
    return upperCaseCode;
  };

  const fetchStockData = useCallback(async (stockCode, yearsToUse, backTestDateToUse) => {
    setLoading(true);
    setTimeoutMessage('');

    const timeoutId = setTimeout(() => {
      setTimeoutMessage('抓資料中，再等一下~');
    }, 2000);

    try {
      const formattedStockCode = formatBackendStockCode(stockCode);
      console.log('Fetching data from:', `${API_BASE_URL}/api/stock-data`);
      console.log('Params:', { stockCode: formattedStockCode, years: yearsToUse, backTestDate: backTestDateToUse });
      
      const response = await axios.get(`${API_BASE_URL}/api/stock-data`, {
        params: {
          stockCode: formattedStockCode,
          years: yearsToUse,
          backTestDate: backTestDateToUse
        }
      });
      
      console.log('Response:', response);
      const data = response.data;
      console.log('Response data:', data);
      
      // 確保數據長度與請求的年數符
      const expectedDataPoints = Math.round(yearsToUse * 252); // 假設每年約有252個交易日
      console.log(`Expected data points: ${expectedDataPoints}, Actual data points: ${data.dates.length}`);
      
      if (Math.abs(data.dates.length - expectedDataPoints) > 10) { // 允許少量誤差
        console.warn(`Data length (${data.dates.length}) does not match expected length (${expectedDataPoints})`);
      }

      setChartData({
        labels: data.dates,
        datasets: [
          {
            label: 'Price',
            data: data.prices,
            borderColor: 'blue',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'Trend Line',
            data: data.trendLine,
            borderColor: 'black',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'TL-2SD',
            data: data.tl_minus_2sd,
            borderColor: 'darkgreen',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'TL-SD',
            data: data.tl_minus_sd,
            borderColor: 'lightgreen',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'TL+SD',
            data: data.tl_plus_sd,
            borderColor: 'lightcoral',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'TL+2SD',
            data: data.tl_plus_2sd,
            borderColor: 'red',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          }
        ]
      });
      setDisplayedStockCode(stockCode); // 使用原始的 stockCode，不包含 .TW
      
      // 清除超時訊息
      setTimeoutMessage('');
    } catch (error) {
      console.error('Error fetching data:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response');
      setTimeoutMessage('抓取數據時發生錯誤，請稍後再試。');
    } finally {
      clearTimeout(timeoutId);
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
    // 更新實際使用的值
    setActualStockCode(stockCode);
    setActualYears(numYears);
    setActualBackTestDate(backTestDate);
    
    // 調用 fetchStockData 函數
    fetchStockData(stockCode, numYears, backTestDate);
  };

  useEffect(() => {
    fetchStockData(actualStockCode, actualYears, actualBackTestDate);

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
                borderColor: 'black',
                borderWidth: 2,
                fill: false,
                pointRadius: 0
              },
              {
                label: 'TL-2SD',
                data: stockData.tl_minus_2sd,
                borderColor: 'green',
                borderWidth: 2,
                fill: false,
                pointRadius: 0
              },
              {
                label: 'TL-SD',
                data: stockData.tl_minus_sd,
                borderColor: 'lightgreen',
                borderWidth: 2,
                fill: false,
                pointRadius: 0
              },
              {
                label: 'TL+SD',
                data: stockData.tl_plus_sd,
                borderColor: 'lightcoral',
                borderWidth: 2,
                fill: false,
                pointRadius: 0
              },
              {
                label: 'TL+2SD',
                data: stockData.tl_plus_2sd,
                borderColor: 'red',
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
                  tooltipEl.style.opacity = 1;
                  tooltipEl.style.position = 'absolute';
                  tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 'px';
                  tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
                  tooltipEl.style.font = tooltipModel.options.bodyFont.string;
                  tooltipEl.style.padding = tooltipModel.options.padding + 'px ' + tooltipModel.options.padding + 'px';
                  tooltipEl.style.pointerEvents = 'none';
                  tooltipEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                  tooltipEl.style.color = 'white';
                  tooltipEl.style.borderRadius = '3px';
                  tooltipEl.style.zIndex = 1000;
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
                  <div className="page-container">
                    <h2>價格標準差分析</h2>
                    <p className="analysis-description">
                      分析股價長期趨勢，並搭配標準差。當價格漲至最上緣時可能代表過度樂觀；當價格跌至最下緣時可能代表過度悲觀。
                    </p>
                    <div className="dashboard">
                      <div className="chart-card">
                        <h3>{displayedStockCode ? `${displayedStockCode} 分析結果` : '分析結果'}</h3>
                        <div className="chart-container">
                          {chartData && (
                            <Line
                              data={chartData}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
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
                                      tooltipEl.style.opacity = 1;
                                      tooltipEl.style.position = 'absolute';
                                      tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 'px';
                                      tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
                                      tooltipEl.style.font = tooltipModel.options.bodyFont.string;
                                      tooltipEl.style.padding = tooltipModel.options.padding + 'px ' + tooltipModel.options.padding + 'px';
                                      tooltipEl.style.pointerEvents = 'none';
                                      tooltipEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                                      tooltipEl.style.color = 'white';
                                      tooltipEl.style.borderRadius = '3px';
                                      tooltipEl.style.zIndex = 1000;
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
                          )}
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
                              placeholder="輸入股票代碼"
                              required
                              style={{ width: '110px' }}
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
                              style={{ width: '110px' }}
                            />
                            {yearsError && <div className="error-message">{yearsError}</div>}
                          </div>
                          <div className="input-group">
                            <label>回測日期：</label>
                            <input
                              className="form-control"
                              type="date"
                              value={backTestDate}
                              onChange={(e) => setBackTestDate(e.target.value)}
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
                  </div>
                }
              />
              <Route 
                path="/market-sentiment" 
                element={
                  <div className="page-container">
                    <h2>市場情緒分析</h2>
                    <MarketSentimentIndex />
                  </div>
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
