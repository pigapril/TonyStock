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
import { FaChartLine, FaInfoCircle, FaChartBar, FaCircle } from 'react-icons/fa';
import 'chartjs-plugin-crosshair';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

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
                            // 使用 FaCircle 來創建帶顏色的圖標
                            const iconColor = context.dataset.borderColor;
                            const icon = <FaCircle style={{ color: iconColor }} />;
                            return `${icon} ${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                          },
                          afterBody: function (tooltipItems) {
                            // 按照數值從大到小排序
                            tooltipItems.sort((a, b) => b.parsed.y - a.parsed.y);
                            
                            // 將排序後的項目轉換為字符串數組，並加上顏色圖標
                            return tooltipItems.map(item => {
                              const iconColor = item.dataset.borderColor;
                              const icon = <FaCircle style={{ color: iconColor }} />;
                              const label = item.dataset.label;
                              const value = item.parsed.y.toFixed(2);
                              return `${icon} ${label}: ${value}`;
                            });
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