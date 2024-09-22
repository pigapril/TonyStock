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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale); // 註冊 TimeScale

function App() {
  const [stockCode, setStockCode] = useState('');
  const [years, setYears] = useState(3.5);
  const [chartData, setChartData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.get(`http://localhost:5001/api/stock-data?stockCode=${stockCode}&years=${years}`);
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
            borderColor: 'lightcoral', // 淺紅色
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
    <div className="App">
      <h1>Stock Analysis Tool</h1>
      <form onSubmit={handleSubmit}>
        <h4 className="input-label">請輸入股票代碼，如 aapl</h4> {/* 使用 h4 並添加類名 */}
        <input
          type="text"
          value={stockCode}
          onChange={(e) => setStockCode(e.target.value)}
          placeholder="Enter stock code"
          required
        />
        <div className="input-spacing" /> {/* 添加間距 */}

        <h4 className="input-label">請輸入查詢年數</h4> {/* 新增日期欄位標題 */}
        <input
          type="number"
          value={years}
          onChange={(e) => setYears(e.target.value)}
          step="0.5"
          min="0.5"
          max="5"
          required
        />
        <button type="submit">Analyze</button>
      </form>
      {chartData && <Line 
        data={chartData} 
        options={{
          plugins: {
            legend: {
              display: false // 隱藏圖例
            }
          },
          scales: {
            x: {
              type: 'time', // 使用時間軸
              time: {
                unit: 'month', // 顯示月份
                displayFormats: {
                  month: 'yyyy-MM' // 格式化為 YYYY-MM
                }
              },
              adapters: {
                date: {
                  locale: zhCN // 使用中文本地化設置
                }
              },
              grid: {
                display: false // 隱藏縱線
              }
            },
            y: {
              beginAtZero: false,
              suggestedMin: Math.min(...chartData.datasets.flatMap(d => d.data)) * 0.9,
              suggestedMax: Math.max(...chartData.datasets.flatMap(d => d.data)) * 1.1,
              grid: {
                display: true // 保留橫線
              }
            }
          }
        }}
      />}
    </div>
  );
}

export default App;