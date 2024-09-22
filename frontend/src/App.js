import React, { useState } from 'react';
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
  TimeScale // 添加 TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns'; // 添加日期適配器
import { zhCN } from 'date-fns/locale'; // 導入中文本地化設置
import './App.css'; // 確保引入 CSS 文件
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale); // 註冊 TimeScale

function App() {
  const [stockCode, setStockCode] = useState('');
  const [years, setYears] = useState(3.5);
  const [chartData, setChartData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}?stockCode=${stockCode}&years=${years}`);
      const data = response.data;
      console.log('Response data:', data);
      setChartData({
        labels: data.dates,
        datasets: [
          {
            label: 'Price',
            data: data.prices,
            borderColor: 'blue', // 藍色
            borderWidth: 2,
            fill: false, // 設置為純線條
            pointRadius: 0 // 隱藏數據點
          },
          {
            label: 'Trend Line',
            data: data.trendLine,
            borderColor: 'lightgray', // 淺灰色
            borderWidth: 2,
            fill: false,
            pointRadius: 0 // 隱藏數據點
          },
          {
            label: 'TL-2SD',
            data: data.tl_minus_2sd,
            borderColor: 'darkgreen', // 深綠色
            borderWidth: 2,
            fill: false,
            pointRadius: 0 // 隱藏數據點
          },
          {
            label: 'TL-SD',
            data: data.tl_minus_sd,
            borderColor: 'lightgreen', // 淺綠色
            borderWidth: 2,
            fill: false,
            pointRadius: 0 // 隱藏數據點
          },
          {
            label: 'TL+SD',
            data: data.tl_plus_sd,
            borderColor: 'lightcoral', // 淺紅
            borderWidth: 2,
            fill: false,
            pointRadius: 0 // 隱藏數據點
          },
          {
            label: 'TL+2SD',
            data: data.tl_plus_2sd,
            borderColor: 'red', // 深紅色
            borderWidth: 2,
            fill: false,
            pointRadius: 0 // 隱藏數據點
          }
        ]
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <Router>
      <div className="App" style={{display: 'flex', height: '100vh'}}>
        <nav style={{width: '200px', backgroundColor: '#f0f0f0', padding: '20px'}}>
          <h2>StockAnalysisTool</h2>
          <ul style={{listStyleType: 'none', padding: 0}}>
            <li><Link to="/">五線標準差分析</Link></li>
            <li><Link to="/watchlist">關鍵圖表</Link></li>
            <li><Link to="/about">關於我</Link></li>
          </ul>
        </nav>
        <main style={{flex: 1, padding: '20px'}}>
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
                        placeholder="輸入股票代碼"
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
                        // 添加日期選擇邏輯
                      />
                    </div>
                  </div>
                  <button type="submit">開始分析</button>
                </form>
                {chartData && <Line data={chartData} options={{}} />}
              </>
            } />
            <Route path="/watchlist" element={<h2>關鍵圖表（待實現）</h2>} />
            <Route path="/about" element={<h2>關於我（待實現）</h2>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;