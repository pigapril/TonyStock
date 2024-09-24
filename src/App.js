import React, { useState, useEffect } from 'react';
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
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import { FaChartLine, FaInfoCircle, FaChartBar } from 'react-icons/fa';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

function App() {
  const [stockCode, setStockCode] = useState('');
  const [years, setYears] = useState(3.5);
  const [backTestDate, setBackTestDate] = useState('');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState('');

  // 新增函数以获取股票数据
  const fetchStockData = async (stockCode) => {
    setLoading(true);
    setTimeoutMessage('');

    const timeoutId = setTimeout(() => {
      setTimeoutMessage('抓資料中，再等一下~');
    }, 2000);

    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}?stockCode=${stockCode}&years=${years}&backTestDate=${backTestDate}`);
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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setTimeoutMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeoutMessage('');

    let formattedStockCode = stockCode;
    if (stockCode.length === 4 && /^\d+$/.test(stockCode)) {
      formattedStockCode += '.TW';
    }

    const timeoutId = setTimeout(() => {
      setTimeoutMessage('抓資料中，再等一下~');
    }, 2000);

    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}?stockCode=${formattedStockCode}&years=${years}&backTestDate=${backTestDate}`);
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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setTimeoutMessage('');
    }
  };

  // 定时自动发送请求以避免冷启动
  useEffect(() => {
    // 初始请求 AAPL 数据
    fetchStockData('AAPL');

    const intervalId = setInterval(() => {
      fetchStockData('AAPL');
    }, 12 * 60 * 1000); // 每 12 分钟

    return () => clearInterval(intervalId);
  }, []);

  return (
    <Router>
      <div className="App">
        <nav className="sidebar">
          <div className="logo">K</div>
          <ul>
            <li>
              <Link to="/">
                <FaChartLine />
                <span>五線標準差分析</span> {/* 更新为新文本 */}
              </Link>
            </li>
            <li>
              <a href="https://vocus.cc/salon/daily_chart" target="_blank" rel="noopener noreferrer">
                <FaChartBar />
                <span>關鍵圖表</span> {/* 更新为新文本 */}
              </a>
            </li>
            <li>
              <a href="https://vocus.cc/salon/daily_chart/about" target="_blank" rel="noopener noreferrer">
                <FaInfoCircle />
                <span>關於我</span> {/* 更新为新文本 */}
              </a>
            </li>
          </ul>
        </nav>
        <main className="main-content">
          <header>
            <h1>五線標準差分析</h1>
            <div className="search-bar">
              <input type="text" placeholder="Search" />
            </div>
          </header>
          <div className="dashboard">
            <div className="card chart-card">
              <h2>Analysis Result</h2>
              {chartData && (
                <Line data={chartData} options={{
                  plugins: { legend: { display: false } },
                  scales: { y: { position: 'right' } }
                }} />
              )}
            </div>
            <div className="card stock-analysis-card">
              <h2>Stock Analysis</h2>
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