import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  TimeScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import './IndicatorItem.css';

// 添加這行來定義 API_BASE_URL
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

// 註冊 Chart.js 的元件和插件
ChartJS.register(
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  TimeScale,
  Filler,
  Tooltip,
  Legend
);

// 指標名稱映射
const INDICATOR_NAME_MAP = {
  'AAII Bull-Bear Spread': 'AAII 投資者情緒調查淨看多',
  'CBOE Put/Call Ratio 5-Day Avg': 'CBOE 買權/賣權比率 5 日均值',
  'Market Momentum': '市場動能',
  'VIX MA50': 'VIX 指數的 50 日移動平均線',
  'Safe Haven Demand': '避險需求',
  'Junk Bond Spread': '垃圾債收益率利差',
  "S&P 500 COT Index": '標普 500 期貨投機淨持倉指數',
  'NAAIM Exposure Index': 'NAAIM 投資經理人曝險指數',
};

// 指標敘述映射
const INDICATOR_DESCRIPTION_MAP = {
  'AAII Bull-Bear Spread':
    'AAII 投資者情緒調查淨看多值。計算方式為看多者百分比減去看空者百分比，並以近四週數值做平均減少波動。正值表示樂觀情緒，負值表示悲觀情緒。',
  'CBOE Put/Call Ratio 5-Day Avg':
    'CBOE 買賣權比率的 5 日平均值。計算方式為買入賣權（看空）合約數量除以買入買權（看多）合約數量。比率越低，表示投資者預期市場上漲，情緒偏樂觀。',
  'Market Momentum':
    '市場動能指標通過比較S&P500指數與其125日移動平均線，計算當前價格相對於長期平均水平的百分比差異。正值表示上升趨勢，負值表示下降趨勢。',
  'VIX MA50':
    'VIX 指數的 50 日移動平均線，反映市場對未來波動率的預期。VIX 趨勢上升表示市場預期波動加大，情緒較為悲觀；下降則表示預期波動減小，情緒較為樂觀。',
  'Safe Haven Demand':
    '避險需求指標衡量資金在股市（SPY ETF）與債市（IEF ETF）之間的流動。計算過去20日內股債回報率差異。正值表示資金入股市，情緒樂觀；負值表示流入債市，情緒悲觀。',
  'Junk Bond Spread':
    '垃圾債券收益率與投資級債券收益率的利差。利差越小，表示風險偏好情緒上升，投資者願意承擔更多風險；利差越大，表示避險情緒上升，市場情緒偏悲觀。',
  "S&P 500 COT Index":
    'S&P 500 期貨投機淨持倉指數，反映投機者與避險者之間的持倉差異。淨多頭表示市場樂觀，淨空頭表示市場悲觀。',
  'NAAIM Exposure Index':
    'NAAIM 投資經理人曝險指數，以近四週數值做平均來減少波動，反映專業投資經理對美國股市的曝險程度。值越高，代表投資經理對市場更有信心，情緒樂觀。',
};

// 使用 API_BASE_URL 進行 API 調用
// 例如：
// axios.get(`${API_BASE_URL}/api/indicator-history`)

function IndicatorItem({ indicatorKey, indicator, selectedTimeRange }) {
  const indicatorName = INDICATOR_NAME_MAP[indicatorKey] || indicatorKey;
  const indicatorDescription = INDICATOR_DESCRIPTION_MAP[indicatorKey] || '';

  const [historicalData, setHistoricalData] = useState([]);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/indicator-history`, {
        params: {
          indicator: indicatorKey,
        },
      })
      .then((response) => {
        console.log(`Received data for ${indicatorKey}:`, response.data);
        const formattedData = response.data.map((item) => ({
          date: new Date(item.date),
          value: parseFloat(item.value),
          percentileRank:
            item.percentileRank !== null && item.percentileRank !== undefined
              ? parseFloat(item.percentileRank)
              : null,
        }));
        setHistoricalData(formattedData);
      })
      .catch((error) => {
        console.error(`獲取 ${indicatorName} 的歷史數據時出錯:`, error);
      });
  }, [indicatorKey, indicatorName]); // 添加 indicatorName 作為依賴

  // 過濾數據
  const filteredData = React.useMemo(() => {
    const data = filterDataByTimeRange(historicalData, selectedTimeRange);
    return data;
  }, [historicalData, selectedTimeRange]);

  // 構建圖表數據
  const chartData = {
    labels: filteredData.map((item) => item.date),
    datasets: [
      {
        label: '實際值',
        yAxisID: 'left-axis',
        data: filteredData.map((item) => item.value),
        borderColor: 'rgba(75,192,192,1)',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
      },
      {
        label: '百分位數排名',
        yAxisID: 'right-axis',
        data: filteredData.map((item) => item.percentileRank),
        borderColor: 'rgba(153,102,255,1)',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
      },
    ],
  };

  // 圖表選項
  const chartOptions = {
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'month',
          tooltipFormat: 'yyyy-MM-dd',
          displayFormats: {
            day: 'yyyy-MM-dd',
            month: 'yyyy-MM',
            year: 'yyyy',
          },
        },
      },
      'left-axis': {
        position: 'left',
        title: {
          display: true,
          text: '實際值',
        },
      },
      'right-axis': {
        position: 'right',
        title: {
          display: true,
          text: '百分位數排名',
        },
        min: 0,
        max: 100,
      },
    },
    plugins: {
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  // 計算加權分數和貢獻百分比
  const fearGreedScore =
    indicator.weightedScore !== null && indicator.weightedScore !== undefined
      ? Math.round(parseFloat(indicator.weightedScore))
      : 'N/A';

  return (
    <div className="indicator-item">
      <h3>{indicatorName}</h3>
      {historicalData.length > 0 ? (
        <>
          <p>{indicatorDescription}</p>
          <p>恐懼貪婪分數: {fearGreedScore}</p>
          <div className="indicator-chart">
            <Line data={chartData} options={chartOptions} />
          </div>
        </>
      ) : (
        <p>暫無數據</p>
      )}
    </div>
  );
}

// 過濾數據的函數
function filterDataByTimeRange(data, timeRange) {
  const endDate = new Date();
  let startDate;

  switch (timeRange) {
    case '1M':
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case '3M':
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case '6M':
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 6);
      break;
    case '1Y':
      startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    case '5Y':
      startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 5);
      break;
    default:
      startDate = null;
      break;
  }

  if (startDate) {
    return data.filter((item) => item.date >= startDate && item.date <= endDate);
  } else {
    return data;
  }
}

export default IndicatorItem;
