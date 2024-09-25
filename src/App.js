import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, useLocation, Link } from 'react-router-dom';
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
import { FaChartLine, FaInfoCircle, FaChartBar } from 'react-icons/fa';
import 'chartjs-plugin-crosshair';

// 添加這行來獲取 API 基礎 URL
console.log('API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

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

function App() {
  const [stockCode, setStockCode] = useState('');
  const [years, setYears] = useState(3.5);
  const [backTestDate, setBackTestDate] = useState('');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState('');
  const [displayedStockCode, setDisplayedStockCode] = useState('');

  const [actualStockCode, setActualStockCode] = useState('AAPL');
  const [actualYears, setActualYears] = useState(3.5);
  const [actualBackTestDate, setActualBackTestDate] = useState('');

  const fetchStockData = useCallback(async (stockCode, yearsToUse, backTestDateToUse) => {
    setLoading(true);
    setTimeoutMessage('');

    const timeoutId = setTimeout(() => {
      setTimeoutMessage('抓資料中，再等一下~');
    }, 2000);

    try {
      console.log('Fetching data from:', `${API_BASE_URL}/api/stock-data`);
      console.log('Params:', { stockCode, years: yearsToUse, backTestDate: backTestDateToUse });
      
      const response = await axios.get(`${API_BASE_URL}/api/stock-data`, {
        params: {
          stockCode,
          years: yearsToUse,
          backTestDate: backTestDateToUse
        }
      });
      
      console.log('Response:', response);
      const data = response.data;
      console.log('Response data:', data);
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
      setDisplayedStockCode(stockCode.replace('.TW', ''));
    } catch (error) {
      console.error('Error fetching data:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setTimeoutMessage('');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    let formattedStockCode = stockCode;
    if (stockCode.length === 4 && /^\d+$/.test(stockCode)) {
      formattedStockCode += '.TW';
    }
    setActualStockCode(formattedStockCode);
    setActualYears(years);
    setActualBackTestDate(backTestDate);
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

  return (
    <Router>
      <PageViewTracker />
      <div className="App">
        <nav className="sidebar">
          <div className="logo">K</div>
          <ul>
            <li>
              <Link to="/">
                <FaChartLine />
                <span>五線標準差分析</span>
              </Link>
            </li>
            <li>
              <a href="https://vocus.cc/salon/daily_chart" target="_blank" rel="noopener noreferrer">
                <FaChartBar />
                <span>關鍵圖表</span>
              </a>
            </li>
            <li>
              <a href="https://vocus.cc/salon/daily_chart/about" target="_blank" rel="noopener noreferrer">
                <FaInfoCircle />
                <span>關於我</span>
              </a>
            </li>
          </ul>
        </nav>
        <main className="main-content">
          <header>
            <h1>五線標準差分析</h1>
            {timeoutMessage && <div>{timeoutMessage}</div>}
          </header>
          <div className="dashboard">
            <div className="card chart-card">
              <h2>{displayedStockCode ? `${displayedStockCode} 分析結果` : '分析結果'}</h2>
              {chartData && (
                <Line
                  data={chartData}
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
              )}
            </div>
            <div className="card stock-analysis-card">
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label>股票代碼：</label>
                  <input
                    className="form-control"
                    type="text"
                    value={stockCode}
                    onChange={(e) => setStockCode(e.target.value)}
                    placeholder="如:0050、AAPL"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>查詢期間：</label>
                  <input
                    className="form-control"
                    type="number"
                    value={years}
                    onChange={(e) => setYears(e.target.value)}
                    step="0.5"
                    min="0.5"
                    max="5"
                    required
                  />
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
                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? '分析中' : '開始分析'}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;