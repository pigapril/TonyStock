const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const yfinance = require('yfinance'); // 確保這是正確的導入方式
const yahooFinance = require('yahoo-finance2').default;

const app = express();
app.use(cors({
  origin: ['https://niku-stock.netlify.app', 'http://localhost:3000']
}));
app.use(express.json());

const PORT = process.env.PORT || 5001;

// 定义一个函数来抓取股票数据
async function fetchStockData() {
  const stockCode = 'AAPL';
  const years = 3.5;
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setFullYear(startDate.getFullYear() - years);

  try {
    const result = await yahooFinance.historical(stockCode, {
      period1: startDate.toISOString().split('T')[0],
      period2: endDate.toISOString().split('T')[0],
      headers: {
        'User-Agent': 'curl/7.68.0'
      }
    });
    console.log(`Fetched data for ${stockCode}:`, result);
  } catch (error) {
    console.error('Error fetching stock data:', error);
  }
}

// 移除定时任务
// setInterval(fetchStockData, 10 * 60 * 1000); // 10 分钟

// 更新 /api/stock-data 路由以获取真实数据
app.get('/api/stock-data', async (req, res) => {
  let { stockCode, years, backTestDate } = req.query;
  console.log(`Received request for: ${stockCode}, ${years} years, back test date: ${backTestDate}`);
  
  // 如果是台灣股票代碼（純數字或數字加字母），自動添加 .TW 後綴
  if (/^\d+[A-Z]?$/.test(stockCode) && !stockCode.endsWith('.TW')) {
    stockCode += '.TW';
  }
  
  try {
    const endDate = backTestDate ? new Date(backTestDate) : new Date();
    const startDate = new Date(endDate);
    startDate.setFullYear(endDate.getFullYear() - Math.floor(parseFloat(years)));
    startDate.setMonth(endDate.getMonth() - Math.round((parseFloat(years) % 1) * 12));
    
    console.log(`Requesting data for ${stockCode} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const result = await yahooFinance.historical(stockCode, {
      period1: startDate.toISOString().split('T')[0],
      period2: endDate.toISOString().split('T')[0],
      headers: {
        'User-Agent': 'curl/7.68.0'
      }
    });
    
    if (result.length === 0) {
      throw new Error('No data returned from Yahoo Finance');
    }
    
    console.log(`Received ${result.length} data points for ${stockCode}`);
    
    // 嚴格過濾數據以確保只返回請求的時間範圍內的數據
    const filteredResult = result.filter(quote => {
      const quoteDate = new Date(quote.date);
      return quoteDate >= startDate && quoteDate <= endDate;
    });
    
    console.log(`Filtered to ${filteredResult.length} data points`);
    
    const dates = filteredResult.map(quote => quote.date.toISOString().split('T')[0]);
    const prices = filteredResult.map(quote => quote.close);
    
    const mockData = {
      dates,
      prices,
      trendLine: calculateTrendLine(prices),
      tl_minus_2sd: calculateStandardDeviationLine(prices, -2),
      tl_minus_sd: calculateStandardDeviationLine(prices, -1),
      tl_plus_sd: calculateStandardDeviationLine(prices, 1),
      tl_plus_2sd: calculateStandardDeviationLine(prices, 2)
    };
    
    console.log(`Sending response for ${stockCode} with ${filteredResult.length} data points`);
    res.json(mockData);
  } catch (error) {
    console.error('Error in /api/stock-data:', error);
    if (error.message.includes('Not Found') || error.message.includes('No data returned')) {
      res.status(404).json({ error: `Stock data not found for ${stockCode}. This may be due to an invalid stock code or lack of data for this security.` });
    } else if (error.message.includes('Too Many Requests')) {
      res.status(429).json({ error: 'Too Many Requests. Please try again later.' });
    } else {
      res.status(500).json({ error: `An error occurred while fetching stock data: ${error.message}` });
    }
  }
});

// Add a new route for multi-stock data
app.get('/api/multi-stock-data', (req, res) => {
  // Implement this route or remove it if not needed
  res.json([]);
});

// 定义 calculateTrendLine 函数
function calculateTrendLine(prices) {
  const n = prices.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = prices;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return x.map(xi => slope * xi + intercept);
}

// 修改 calculateStandardDeviation 函数为 calculateStandardDeviationLine
function calculateStandardDeviationLine(prices, multiplier) {
  const trendLine = calculateTrendLine(prices);
  const deviations = prices.map((price, i) => price - trendLine[i]);
  const stdDev = Math.sqrt(deviations.reduce((sum, dev) => sum + dev * dev, 0) / deviations.length);
  
  // 确保所有值都是正数，并且在合理范围内
  const minPrice = Math.min(...prices);
  return trendLine.map(value => Math.max(value + multiplier * stdDev, minPrice * 0.5));
}

// 新增格式化日期的函数
function formatDate(date) {
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Intl.DateTimeFormat('zh-CN', options).format(new Date(date));
}

// Import and use the sentiment routes
const sentimentRoutes = require('./routes/sentiment');
app.use('/api', sentimentRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));