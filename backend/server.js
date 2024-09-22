const express = require('express');
   const cors = require('cors');
   const axios = require('axios');
   require('dotenv').config();
   const yfinance = require('yfinance'); // 確保這是正確的導入方式
   const yahooFinance = require('yahoo-finance2').default;

   const app = express();
   app.use(cors({
     origin: 'https://bejewelled-griffin-6c36fd.netlify.app'
   }));
   app.use(express.json());

   const PORT = process.env.PORT || 5001;

   // 更新 /api/stock-data 路由以獲取真實數據
   app.get('/api/stock-data', async (req, res) => {
     const { stockCode, years, backTestDate } = req.query;
     console.log(`Fetching data for: ${stockCode} for ${years} years, back test date: ${backTestDate || 'today'}`);
     try {
       const endDate = backTestDate ? new Date(backTestDate) : new Date();
       const startDate = new Date(endDate);
       startDate.setFullYear(startDate.getFullYear() - parseFloat(years));
       
       // 使用 yahoo-finance2 獲取歷史數據
       const result = await yahooFinance.historical(stockCode, {
         period1: startDate.toISOString().split('T')[0],
         period2: endDate.toISOString().split('T')[0]
       });
       console.log('Fetched quotes:', result);

       // 檢查日期格式
       const dates = result.map(quote => {
         console.log('Original date:', quote.date); // 日誌輸出原始日期
         return quote.date.toISOString().split('T')[0]; // 返回 YYYY-MM-DD 格式的字符串
       });
       
       const prices = result.map(quote => quote.close);
       const mockData = {
         dates,
         prices,
         trendLine: calculateTrendLine(prices),
         tl_minus_2sd: calculateStandardDeviationLine(prices, -2),
         tl_minus_sd: calculateStandardDeviationLine(prices, -1),
         tl_plus_sd: calculateStandardDeviationLine(prices, 1),
         tl_plus_2sd: calculateStandardDeviationLine(prices, 2)
       };
       
       // 添加日志，检查计算的结果
       console.log('Calculated data:', {
         trendLine: mockData.trendLine.slice(0, 5),
         tl_minus_2sd: mockData.tl_minus_2sd.slice(0, 5),
         tl_minus_sd: mockData.tl_minus_sd.slice(0, 5),
         tl_plus_sd: mockData.tl_plus_sd.slice(0, 5),
         tl_plus_2sd: mockData.tl_plus_2sd.slice(0, 5)
       });
       
       res.json(mockData);
     } catch (error) {
       console.error('Error fetching stock data:', error);
       res.status(500).json({ error: 'An error occurred while fetching stock data' });
     }
   });
    
   // 定義 calculateTrendLine 函數
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

   // 新增格式化日期的函數
   function formatDate(date) {
     const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
     return new Intl.DateTimeFormat('zh-CN', options).format(new Date(date));
   }

   app.listen(PORT, () => console.log(`Server running on port ${PORT}`));