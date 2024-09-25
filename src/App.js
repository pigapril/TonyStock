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
                          title: function(tooltipItems) {
                            return tooltipItems[0].label;
                          },
                          label: function() {
                            return '';
                          },
                          afterBody: function (tooltipItems) {
                            const colorMap = {
                              'TL+2SD': 'red',
                              'TL+SD': 'lightcoral',
                              'Trend Line': 'black',
                              'Price': 'blue',
                              'TL-SD': 'lightgreen',
                              'TL-2SD': 'darkgreen'
                            };

                            tooltipItems.sort((a, b) => b.parsed.y - a.parsed.y);
                            
                            return tooltipItems.map(item => {
                              const label = item.dataset.label;
                              const value = item.parsed.y.toFixed(2);
                              const color = colorMap[label] || 'gray';
                              return `<div style="display: flex; align-items: center;">
                                        <div style="width: 10px; height: 10px; background-color: ${color}; margin-right: 5px;"></div>
                                        <span>${label}: ${value}</span>
                                      </div>`;
                            }).join('');
                          }
                        },
                        titleFont: { size: 14 },
                        bodyFont: { size: 12 },
                        bodySpacing: 4,
                        padding: 10,
                        displayColors: false,
                        enabled: true,
                        external: function(context) {
                          let tooltipEl = document.getElementById('chartjs-tooltip');

                          if (!tooltipEl) {
                            tooltipEl = document.createElement('div');
                            tooltipEl.id = 'chartjs-tooltip';
                            tooltipEl.innerHTML = '<table></table>';
                            document.body.appendChild(tooltipEl);
                          }

                          const tooltipModel = context.tooltip;

                          if (tooltipModel.opacity === 0) {
                            tooltipEl.style.opacity = 0;
                            return;
                          }

                          tooltipEl.classList.remove('above', 'below', 'no-transform');
                          if (tooltipModel.yAlign) {
                            tooltipEl.classList.add(tooltipModel.yAlign);
                          } else {
                            tooltipEl.classList.add('no-transform');
                          }

                          function getBody(bodyItem) {
                            return bodyItem.lines;
                          }

                          if (tooltipModel.body) {
                            const titleLines = tooltipModel.title || [];
                            const bodyLines = tooltipModel.body.map(getBody);

                            let innerHtml = '<thead>';

                            titleLines.forEach(function(title) {
                              innerHtml += '<tr><th>' + title + '</th></tr>';
                            });
                            innerHtml += '</thead><tbody>';

                            bodyLines.forEach(function(body, i) {
                              innerHtml += '<tr><td>' + body + '</td></tr>';
                            });
                            innerHtml += '</tbody>';

                            let tableRoot = tooltipEl.querySelector('table');
                            tableRoot.innerHTML = innerHtml;
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