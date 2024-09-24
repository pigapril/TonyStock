import React, { useState, useEffect, useCallback } from 'react';
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
import { BrowserRouter as Router, Link } from 'react-router-dom';
import { FaChartLine, FaInfoCircle, FaChartBar } from 'react-icons/fa';
import 'chartjs-plugin-crosshair';
import { FaCircle } from 'react-icons/fa'; // 引入實心圖標

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

function App() {
  const [stockCode, setStockCode] = useState('');
  const [years, setYears] = useState(3.5);
  const [backTestDate, setBackTestDate] = useState('');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState('');
  const [displayedStockCode, setDisplayedStockCode] = useState('');

  // 新增用於抓取數據的狀態變量
  const [actualStockCode, setActualStockCode] = useState('AAPL');
  const [actualYears, setActualYears] = useState(3.5);
  const [actualBackTestDate, setActualBackTestDate] = useState('');

  const fetchStockData = useCallback(async (stockCode, yearsToUse, backTestDateToUse, isUserAction = false) => {
    setLoading(true);
    setTimeoutMessage('');

    const timeoutId = setTimeout(() => {
      setTimeoutMessage('抓資料中，再等一下~');
    }, 2000);

    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}?stockCode=${stockCode}&years=${yearsToUse}&backTestDate=${backTestDateToUse}`);
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
    // 設置實際抓取參數
    setActualStockCode(formattedStockCode);
    setActualYears(years);
    setActualBackTestDate(backTestDate);
  };

  useEffect(() => {
    fetchStockData(actualStockCode, actualYears, actualBackTestDate); // 使用實際抓取參數

    const intervalId = setInterval(() => {
      fetchStockData(actualStockCode, actualYears, actualBackTestDate); // 使用實際抓取參數
    }, 12 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [fetchStockData, actualStockCode, actualYears, actualBackTestDate]); // 添加所有依賴

  return (
    <Router>
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
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                          label: function (context) {
                            let label = <FaCircle style={{ color: context.dataset.borderColor }} />; // 使用實心圖標
                            if (context.dataset.label) {
                              label += ` ${context.dataset.label}: `;
                            }
                            if (context.parsed.y !== null) {
                              label += context.parsed.y.toFixed(2);
                            }
                            return label;
                          },
                          afterBody: function (tooltipItems) {
                            const order = ['TL+2SD', 'TL+SD', 'Trend Line', 'TL-SD', 'TL-2SD', 'Price'];
                            tooltipItems.sort((a, b) => {
                              return order.indexOf(a.dataset.label) - order.indexOf(b.dataset.label);
                            });

                            const priceIndex = tooltipItems.findIndex(item => item.dataset.label === 'Price');
                            if (priceIndex !== -1) {
                              const priceItem = tooltipItems.splice(priceIndex, 1)[0];
                              const priceValue = priceItem.parsed.y;
                              let inserted = false;

                              for (let i = 0; i < tooltipItems.length; i++) {
                                if (tooltipItems[i].parsed.y > priceValue) {
                                  tooltipItems.splice(i, 0, priceItem);
                                  inserted = true;
                                  break;
                                }
                              }

                              if (!inserted) {
                                tooltipItems.unshift(priceItem);
                              }

                              if (tooltipItems.length === 0 || priceValue < tooltipItems[tooltipItems.length - 1].parsed.y) {
                                tooltipItems.push(priceItem);
                              }
                            }
                          }
                        }
                      },
                      crosshair: {
                        line: {
                          color: '#F66',  // 虛線顏色
                          width: 1,       // 虛線寬度
                          dashPattern: [5, 5]  // 虛線樣式
                        },
                        sync: {
                          enabled: false  // 禁用同步
                        },
                        zoom: {
                          enabled: false  // 禁用縮放
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
              {/* <h2>Stock Analysis</h2>  // 移除這一行 */}
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