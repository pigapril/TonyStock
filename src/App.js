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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

function App() {
  const [stockCode, setStockCode] = useState('');
  const [years, setYears] = useState(3.5);
  const [backTestDate, setBackTestDate] = useState('');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState('');

  // 定时自动发送请求以避免冷启动
  useEffect(() => {
    const intervalId = setInterval(() => {
      // 发送请求以分析 AAPL 股票数据
      axios.get(`${process.env.REACT_APP_API_URL}?stockCode=AAPL&years=3.5`)
        .then(response => {
          console.log('Periodic fetch for AAPL:', response.data);
        })
        .catch(error => {
          console.error('Error fetching AAPL data:', error);
        });
    }, 12 * 60 * 1000); // 每 12 分钟

    // 清理定时器
    return () => clearInterval(intervalId);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeoutMessage('');

    let formattedStockCode = stockCode;
    if (stockCode.length === 4 && /^\d+$/.test(stockCode)) {
      formattedStockCode += '.TW';
    }

    // 设置超时提示
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
      setTimeoutMessage(''); // 清除超时消息
    }
  };

  return (
    <Router>
      <div className="App" style={{ display: 'flex', height: '100vh' }}>
        <nav style={{ width: '200px', backgroundColor: '#f0f0f0', padding: '20px' }}>
          <h2>StockAnalysisTool</h2>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            <li className="menu-item"><Link to="/">五線標準差分析</Link></li>
            <li className="menu-item"><a href="https://vocus.cc/salon/daily_chart" target="_blank" rel="noopener noreferrer">關鍵圖表</a></li>
            <li className="menu-item"><a href="https://vocus.cc/salon/daily_chart/about" target="_blank" rel="noopener noreferrer">關於我</a></li>
          </ul>
        </nav>
        <main style={{ flex: 1, padding: '20px' }}>
          <Routes>
            <Route path="/" element={
              <>
                <h1>五線標準差分析</h1>
                <form onSubmit={handleSubmit}>
                  <div className="input-container">
                    <div className="input-group">
                      <label>股票代碼：</label>
                      <input
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
                      <label>回測日期（預設為當日）：</label>
                      <input
                        type="date"
                        value={backTestDate}
                        onChange={(e) => setBackTestDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" style={{ marginTop: '20px' }} disabled={loading}>
                    {loading ? '分析中' : '開始分析'}
                  </button>
                </form>
                {timeoutMessage && <p style={{ color: 'lightgray' }}>{timeoutMessage}</p>}
                {chartData && (
                  <>
                    <Line data={chartData} options={{
                      plugins: { legend: { display: false } },
                      scales: {
                        y: {
                          position: 'right'
                        }
                      }
                    }} />
                  </>
                )}
              </>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;