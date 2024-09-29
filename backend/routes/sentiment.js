const express = require('express');
const router = express.Router();
const axios = require('axios');
const xlsx = require('xlsx'); // 用于读取 Excel 文件
const yahooFinance = require('yahoo-finance2').default;
const path = require('path');
const fs = require('fs');

// Function to fetch and calculate indicators
async function fetchIndicators() {
  let indicators = [];

  // 1. The AAII Investor Sentiment Survey: 5-day average bull-bear spread
  try {
    // 下载 AAII 数据
    const aaiiUrl = 'https://www.aaii.com/files/surveys/sentiment.xls';
    const response = await axios.get(aaiiUrl, { responseType: 'arraybuffer' });
    const workbook = xlsx.read(response.data);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    // 获取最近5期的牛熊差值
    const recentData = jsonData.slice(-5);
    const bullBearSpreads = recentData.map(entry => parseFloat(entry['Bull-Bear Spread']));
    const avgSpread = bullBearSpreads.reduce((a, b) => a + b, 0) / bullBearSpreads.length;

    let score = calculateScore(avgSpread, { type: 'bullBearSpread' });

    indicators.push({
      name: 'AAII Investor Sentiment Survey (Bull-Bear Spread 5-day Avg)',
      value: avgSpread.toFixed(2),
      score,
      isRealData: true
    });
  } catch (error) {
    console.error('Error fetching AAII data:', error);
    indicators.push({
      name: 'AAII Investor Sentiment Survey',
      value: 'N/A',
      score: 5,
      isRealData: false
    });
  }

  // 2. CBOE Equity Put/Call Ratio: 5-day average put/call ratio
  try {
    const putCallUrl = 'https://cdn.cboe.com/api/global/us_indices/daily_prices/SPX_History.csv';
    const response = await axios.get(putCallUrl);
    const csvData = response.data;
    const rows = csvData.split('\n');
    const data = rows.slice(-6, -1).map(row => {
      const cols = row.split(',');
      return parseFloat(cols[6]); // 假设第7列是 Put/Call Ratio
    });
    const avgPutCallRatio = data.reduce((a, b) => a + b, 0) / data.length;
    let score = calculateScore(avgPutCallRatio, { type: 'putCallRatio' });

    indicators.push({
      name: 'CBOE Equity Put/Call Ratio (5-day Avg)',
      value: avgPutCallRatio.toFixed(2),
      score,
      isRealData: true
    });
  } catch (error) {
    console.error('Error fetching Put/Call Ratio data:', error);
    indicators.push({
      name: 'CBOE Equity Put/Call Ratio',
      value: 'N/A',
      score: 5,
      isRealData: false
    });
  }

  // 3. Market Momentum: S&P 500 and its 125-day moving average
  try {
    const spData = await yahooFinance.historical('^GSPC', {
      period1: '1y',
      interval: '1d'
    });
    const closingPrices = spData.map(item => item.close);
    const lastPrice = closingPrices[closingPrices.length - 1];
    const ma125 = calculateMovingAverage(closingPrices, 125);
    let score = lastPrice > ma125 ? 10 : 0;

    indicators.push({
      name: 'Market Momentum (S&P 500 vs 125-day MA)',
      value: `Price: ${lastPrice.toFixed(2)}, MA125: ${ma125.toFixed(2)}`,
      score,
      isRealData: true
    });
  } catch (error) {
    console.error('Error fetching S&P 500 data:', error);
    indicators.push({
      name: 'Market Momentum',
      value: 'N/A',
      score: 5,
      isRealData: false
    });
  }

  // 4. Stock Price Strength: Net new 52-week highs and lows on the NYSE
  try {
    // 需要数据源，这里暂时使用模拟数据
    let netNewHighsLows = 100; // 模拟数据
    let score = calculateScore(netNewHighsLows, { type: 'netNewHighsLows' });

    indicators.push({
      name: 'Stock Price Strength (Net New 52-week Highs/Lows on NYSE)',
      value: netNewHighsLows,
      score,
      isRealData: false
    });
  } catch (error) {
    console.error('Error fetching Stock Price Strength data:', error);
    indicators.push({
      name: 'Stock Price Strength',
      value: 'N/A',
      score: 5,
      isRealData: false
    });
  }

  // 5. Stock Price Breadth: McClellan Volume Summation Index
  try {
    // 需要数据源，这里暂时使用模拟数据
    let mvsIndex = -500; // 模拟数据
    let score = calculateScore(mvsIndex, { type: 'mvsIndex' });

    indicators.push({
      name: 'Stock Price Breadth (McClellan Volume Summation Index)',
      value: mvsIndex,
      score,
      isRealData: false
    });
  } catch (error) {
    console.error('Error fetching McClellan Volume Summation Index data:', error);
    indicators.push({
      name: 'Stock Price Breadth',
      value: 'N/A',
      score: 5,
      isRealData: false
    });
  }

  // 6. Market Volatility: VIX and its 50-day moving average
  try {
    const vixData = await yahooFinance.historical('^VIX', {
      period1: '6mo',
      interval: '1d'
    });
    const closingPrices = vixData.map(item => item.close);
    const lastPrice = closingPrices[closingPrices.length - 1];
    const ma50 = calculateMovingAverage(closingPrices, 50);
    let score = lastPrice < ma50 ? 10 : 0;

    indicators.push({
      name: 'Market Volatility (VIX vs 50-day MA)',
      value: `VIX: ${lastPrice.toFixed(2)}, MA50: ${ma50.toFixed(2)}`,
      score,
      isRealData: true
    });
  } catch (error) {
    console.error('Error fetching VIX data:', error);
    indicators.push({
      name: 'Market Volatility',
      value: 'N/A',
      score: 5,
      isRealData: false
    });
  }

  // 7. Safe Haven Demand: Difference in 20-day stock and bond returns
  try {
    // 获取 S&P 500 和 20年国债 ETF 的价格
    const [spData, bondData] = await Promise.all([
      yahooFinance.historical('^GSPC', { period1: '1mo', interval: '1d' }),
      yahooFinance.historical('TLT', { period1: '1mo', interval: '1d' })
    ]);

    const spReturn = (spData[spData.length - 1].close - spData[0].close) / spData[0].close;
    const bondReturn = (bondData[bondData.length - 1].close - bondData[0].close) / bondData[0].close;
    const returnDifference = spReturn - bondReturn;
    let score = calculateScore(returnDifference, { type: 'safeHavenDemand' });

    indicators.push({
      name: 'Safe Haven Demand (Stock vs Bond 20-day Returns)',
      value: `Difference: ${(returnDifference * 100).toFixed(2)}%`,
      score,
      isRealData: true
    });
  } catch (error) {
    console.error('Error fetching Safe Haven Demand data:', error);
    indicators.push({
      name: 'Safe Haven Demand',
      value: 'N/A',
      score: 5,
      isRealData: false
    });
  }

  // 8. Junk Bond Demand: Yield spread between junk bonds and investment-grade bonds
  try {
    // 使用 BofA 美林高收益债券指数和投资级债券指数的收益率差
    // 需要数据源，这里暂时使用模拟数据
    let yieldSpread = 3.5; // 模拟数据，单位为百分比
    let score = calculateScore(yieldSpread, { type: 'junkBondDemand' });

    indicators.push({
      name: 'Junk Bond Demand (Yield Spread)',
      value: `${yieldSpread}%`,
      score,
      isRealData: false
    });
  } catch (error) {
    console.error('Error fetching Junk Bond Demand data:', error);
    indicators.push({
      name: 'Junk Bond Demand',
      value: 'N/A',
      score: 5,
      isRealData: false
    });
  }

  // 9. CFTC S&P 500 speculative net positions
  try {
    // 下载 CFTC 数据
    // 需要解析 CSV 文件或 API，这里暂时使用模拟数据
    let netPositions = -20000; // 模拟数据
    let score = calculateScore(netPositions, { type: 'cftcNetPositions' });

    indicators.push({
      name: 'CFTC S&P 500 Speculative Net Positions',
      value: netPositions,
      score,
      isRealData: false
    });
  } catch (error) {
    console.error('Error fetching CFTC data:', error);
    indicators.push({
      name: 'CFTC S&P 500 Speculative Net Positions',
      value: 'N/A',
      score: 5,
      isRealData: false
    });
  }

  // 10. NAAIM Exposure Index
  try {
    // 下载 NAAIM 数据
    const naaimUrl = 'https://www.naaim.org/wp-content/uploads/2024/09/USE_Data-since-Inception_2024-09-25.xlsx';
    const response = await axios.get(naaimUrl, { responseType: 'arraybuffer' });
    const workbook = xlsx.read(response.data);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    // 获取最新的 Exposure Index
    const lastEntry = jsonData[jsonData.length - 1];
    const exposureIndex = parseFloat(lastEntry['NAAIM Exposure Index']);
    let score = calculateScore(exposureIndex, { type: 'naaimExposureIndex' });

    indicators.push({
      name: 'NAAIM Exposure Index',
      value: exposureIndex.toFixed(2),
      score,
      isRealData: true
    });
  } catch (error) {
    console.error('Error fetching NAAIM data:', error);
    indicators.push({
      name: 'NAAIM Exposure Index',
      value: 'N/A',
      score: 5,
      isRealData: false
    });
  }

  // Calculate composite score
  let totalScore = indicators.reduce((sum, ind) => sum + ind.score, 0);
  let compositeScore = totalScore / indicators.length;

  return { indicators, compositeScore };
}

// Function to calculate score for each indicator
function calculateScore(value, params) {
  // 根据不同的指标类型定义评分标准
  switch (params.type) {
    case 'bullBearSpread':
      // AAII 牛熊差值，正数表示乐观，负数表示悲观
      if (value >= 20) return 10;
      else if (value >= 0) return 7;
      else if (value >= -20) return 3;
      else return 0;
    case 'putCallRatio':
      // Put/Call Ratio，低于0.7表示乐观，高于1.0表示悲观
      if (value <= 0.7) return 10;
      else if (value <= 0.85) return 7;
      else if (value <= 1.0) return 3;
      else return 0;
    case 'netNewHighsLows':
      // Net New Highs/Lows，正数表示乐观
      if (value >= 100) return 10;
      else if (value >= 0) return 7;
      else if (value >= -100) return 3;
      else return 0;
    case 'mvsIndex':
      // McClellan Volume Summation Index，正数表示乐观
      if (value >= 0) return 10;
      else if (value >= -1000) return 5;
      else return 0;
    case 'safeHavenDemand':
      // Safe Haven Demand，正数表示偏好股票，负数表示偏好债券
      if (value >= 0.02) return 10;
      else if (value >= 0) return 7;
      else if (value >= -0.02) return 3;
      else return 0;
    case 'junkBondDemand':
      // Yield Spread，较低的利差表示高风险偏好
      if (value <= 3) return 10;
      else if (value <= 5) return 7;
      else if (value <= 7) return 3;
      else return 0;
    case 'cftcNetPositions':
      // 净持仓，正数表示看涨
      if (value >= 0) return 10;
      else if (value >= -10000) return 5;
      else return 0;
    case 'naaimExposureIndex':
      // NAAIM Exposure Index，数值越高表示乐观
      if (value >= 80) return 10;
      else if (value >= 50) return 7;
      else if (value >= 20) return 3;
      else return 0;
    default:
      // 对于 Market Momentum 和 VIX 指标，已经在主函数中计算
      return value;
  }
}

// 计算移动平均线
function calculateMovingAverage(data, period) {
  if (data.length < period) return null;
  const subset = data.slice(-period);
  const sum = subset.reduce((a, b) => a + b, 0);
  return sum / period;
}

router.get('/market-sentiment', async (req, res) => {
  try {
    const sentimentData = await fetchIndicators();
    res.json(sentimentData);
  } catch (error) {
    console.error('Error in /api/market-sentiment:', error);
    res.status(500).json({ error: 'Error fetching market sentiment data' });
  }
});

module.exports = router;