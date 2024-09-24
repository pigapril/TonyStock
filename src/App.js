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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

function App() {
  const [stockCode, setStockCode] = useState('');
  const [years, setYears] = useState(3.5);
  const [backTestDate, setBackTestDate] = useState('');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState('');
  const [displayedStockCode, setDisplayedStockCode] = useState('');

  // 將 fetchStockData 函數移出 useCallback
  const fetchStockData = async (stockCode, isUserAction = false) => {
    setLoading(true);
    setTimeoutMessage('');

    const timeoutId = setTimeout(() => {
      setTimeoutMessage('抓資料中，再等一下~');
    }, 2000);

    try {
      const yearsToUse = isUserAction ? years : 3.5;
      const backTestDateToUse = isUserAction ? backTestDate : '';

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
          // ... 其他數據集
        ]
      });
      setDisplayedStockCode(stockCode);
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
    let formattedStockCode = stockCode;
    if (stockCode.length === 4 && /^\d+$/.test(stockCode)) {
      formattedStockCode += '.TW';
    }
    await fetchStockData(formattedStockCode, true);
  };

  useEffect(() => {
    const initialFetch = async () => {
      await fetchStockData('AAPL', false);
    };

    initialFetch();

    const intervalId = setInterval(() => {
      fetchStockData('AAPL', false);
    }, 12 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []); // 空依賴數組，確保只在組件加載時執行一次

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