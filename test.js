const axios = require('axios');

(async () => {
  try {
    const stockCode = 'AAPL'; // 替換為你想測試的股票代碼
    const years = 0.1; // 測試的年份
    const fromDate = new Date(new Date().setFullYear(new Date().getFullYear() - years)).toISOString().split('T')[0];
    const toDate = new Date().toISOString().split('T')[0];

    const response = await axios.get(`https://www.google.com/finance/quote/${stockCode}:NASDAQ`);
    console.log('Fetched data:', response.data);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
})();