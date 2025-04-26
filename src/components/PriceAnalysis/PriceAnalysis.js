import React, { useState, useEffect, useCallback, useRef, useMemo, useTransition } from 'react';
import { Line } from 'react-chartjs-2';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import './PriceAnalysis.css';
import axios from 'axios';
import PageContainer from '../PageContainer';
import ULBandChart from '../ULBandChart';
import { Analytics } from '../../utils/analytics';
import { handleApiError } from '../../utils/errorHandler';
import { useMediaQuery } from 'react-responsive';
import Turnstile from 'react-turnstile';
import { formatPrice } from '../Common/priceUtils';
import { ExpandableDescription } from '../Common/ExpandableDescription/ExpandableDescription';
import { Toast } from '../Watchlist/components/Toast';
import { useToastManager } from '../Watchlist/hooks/useToastManager';
import { useSearchParams, useLocation } from 'react-router-dom'; // 引入 useLocation
import { useAdContext } from '../../contexts/AdContext'; // 導入 useAdContext

// 假設在 .env 檔或 config 有定義 REACT_APP_API_BASE_URL
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

// 輔助函數：決定 X 軸顯示的 timeUnit
function getTimeUnit(dates) {
  const start = new Date(dates[0]);
  const end = new Date(dates[dates.length - 1]);
  const yearDiff = end.getFullYear() - start.getFullYear();

  if (yearDiff > 1) {
    return 'year';
  } else if (yearDiff === 1 || end.getMonth() - start.getMonth() > 3) {
    return 'month';
  } else {
    return 'day';
  }
}

// 在組件外部或文件末尾創建 Memoized 版本
const MemoizedULBandChart = React.memo(ULBandChart);
const MemoizedExpandableDescription = React.memo(ExpandableDescription);

/**
 * 價格標準差分析頁面 (PriceAnalysisPage)
 *
 * 專門負責：1) 抓取API資料 2) 處理表單 3) 顯示標準差圖表 or ULBandChart
 */
export function PriceAnalysis() {
  const [searchParams] = useSearchParams();
  const location = useLocation(); // <--- 獲取 location 物件
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
  const { showToast, toast, hideToast } = useToastManager();
  const { requestAdDisplay } = useAdContext(); // 從 Context 獲取函數

  // 從 URL 參數或預設值初始化狀態
  const initialStockCode = searchParams.get('stockCode') || 'SPY';
  const initialYears = searchParams.get('years') || '3.5';
  const initialBackTestDate = searchParams.get('backTestDate') || ''; // 如果需要也可以從 URL 讀取

  // 這裡保留所有原本在 App.js 中標準差分析需要的狀態
  const [stockCode, setStockCode] = useState(''); // 初始值改為空，由 useEffect 決定
  const [years, setYears] = useState('');       // 初始值改為空
  const [yearsError, setYearsError] = useState('');
  const [backTestDate, setBackTestDate] = useState(''); // 初始值改為空
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState('');
  const [displayedStockCode, setDisplayedStockCode] = useState('');
  const [activeChart, setActiveChart] = useState('sd');
  const [ulbandData, setUlbandData] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileVisible, setTurnstileVisible] = useState(true);
  // 新增分析結果狀態
  const [analysisResult, setAnalysisResult] = useState({
    price: null,
    sentiment: null
  });
  // 新增狀態來切換簡易/進階查詢
  const [isAdvancedQuery, setIsAdvancedQuery] = useState(false);
  // 新增狀態來記錄分析期間的選擇
  const [analysisPeriod, setAnalysisPeriod] = useState('長期'); // 預設為長期
  const [analysisClickCount, setAnalysisClickCount] = useState(0);
  const [showInterstitialAd, setShowInterstitialAd] = useState(false);
  const AD_DISPLAY_THRESHOLD = 3; // <--- 修改閾值為 3
  const [isAdCooldownActive, setIsAdCooldownActive] = useState(false); // 新增：追蹤廣告冷卻狀態
  const cooldownTimeoutRef = useRef(null); // 新增：保存冷卻計時器 ID
  const [isPending, startTransition] = useTransition(); // 添加 useTransition

  // 處理股票代碼的全形/半形轉換
  const handleStockCodeChange = (e) => {
    const value = e.target.value;
    const convertedValue = value.replace(/[０-９Ａ-Ｚａ-ｚ]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
    );
    setStockCode(convertedValue.toUpperCase());
  };

  // 切換主圖表 (標準差 or ULBand)
  const handleChartSwitch = (chartType) => {
    Analytics.stockAnalysis.chartSwitch(chartType);
    setActiveChart(chartType);
  };

  // 處理 Turnstile 回調
  const handleTurnstileSuccess = useCallback((token) => {
    setTurnstileToken(token);
    setTimeout(() => {
      setTurnstileVisible(false);
    }, 1000);
  }, []);

  // 資料抓取函式
  const fetchStockData = useCallback(async (stock, yrs, testDate, bypassTurnstile = false) => {
    // 驗證 Turnstile Token
    if (!bypassTurnstile && !turnstileToken) {
      handleApiError(new Error('請先完成驗證'), showToast);
      setLoading(false); // 結束 Loading
      return;
    }

    // setLoading(true) 和清除訊息已移至 handleSubmit

    try {
      const response = await axios.get(`${API_BASE_URL}/api/integrated-analysis`, {
        params: { stockCode: stock, years: yrs, backTestDate: testDate },
        headers: { 'CF-Turnstile-Token': bypassTurnstile ? undefined : turnstileToken },
        timeout: 30000
      });

      const { data } = response.data;
      const { dates, prices, sdAnalysis, weeklyDates, weeklyPrices, upperBand, lowerBand, ma20 } = data;

      // 使用 startTransition 包裹耗時的狀態更新
      startTransition(() => {
        setChartData({
          labels: dates,
          datasets: [
            { label: '價格', data: prices, borderColor: 'blue', borderWidth: 2, fill: false, pointRadius: 0 },
            { label: '趨勢線', data: sdAnalysis.trendLine, borderColor: '#E9972D', borderWidth: 2, fill: false, pointRadius: 0 },
            { label: '-2個標準差', data: sdAnalysis.tl_minus_2sd, borderColor: '#143829', borderWidth: 2, fill: false, pointRadius: 0 },
            { label: '-1個標準差', data: sdAnalysis.tl_minus_sd, borderColor: '#2B5B3F', borderWidth: 2, fill: false, pointRadius: 0 },
            { label: '+1個標準差', data: sdAnalysis.tl_plus_sd, borderColor: '#C4501B', borderWidth: 2, fill: false, pointRadius: 0 },
            { label: '+2個標準差', data: sdAnalysis.tl_plus_2sd, borderColor: '#A0361B', borderWidth: 2, fill: false, pointRadius: 0 }
          ],
          timeUnit: getTimeUnit(dates)
        });

        setUlbandData({ dates: weeklyDates, prices: weeklyPrices, upperBand, lowerBand, ma20 });

        // 計算情緒分析
        if (prices && prices.length > 0 && sdAnalysis) {
          const lastPrice = prices[prices.length - 1];
          const { trendLine, tl_plus_2sd, tl_plus_sd, tl_minus_sd, tl_minus_2sd } = sdAnalysis;
          const lastTlPlus2Sd = tl_plus_2sd[tl_plus_2sd.length - 1];
          const lastTlMinus2Sd = tl_minus_2sd[tl_minus_2sd.length - 1];
          const lastTlPlusSd = tl_plus_sd[tl_plus_sd.length - 1];
          const lastTlMinusSd = tl_minus_sd[tl_minus_sd.length - 1];

          let sentiment = '中性';
          if (lastPrice >= lastTlPlus2Sd) sentiment = '極度樂觀';
          else if (lastPrice > lastTlPlusSd) sentiment = '樂觀';
          else if (lastPrice <= lastTlMinus2Sd) sentiment = '極度悲觀';
          else if (lastPrice < lastTlMinusSd) sentiment = '悲觀';

          setAnalysisResult({ price: lastPrice.toFixed(2), sentiment: sentiment });
        } else {
          setAnalysisResult({ price: null, sentiment: null }); // 清空
        }
      }); // end startTransition

      // 這個更新通常很快，可以在 transition 外部
      setDisplayedStockCode(stock);

    } catch (error) {
      // 錯誤時也用 transition 清空數據
      startTransition(() => {
        setChartData(null);
        setUlbandData(null);
        setAnalysisResult({ price: null, sentiment: null });
        setDisplayedStockCode('');
      });
      if (error.code === 'ECONNABORTED') {
        setTimeoutMessage('分析超時，請稍後重試或縮短歷史查詢期間。');
      } else {
        const errorData = handleApiError(error, showToast);
        // 確保即使 errorData.message 未定義也有訊息
        setTimeoutMessage(errorData?.message || '分析時發生錯誤，請稍後再試。');
      }
    } finally {
      // 即使 transition 未完成，也結束 Loading 狀態，讓 UI 可以響應
      // 注意：如果 transition 非常慢，Loading 可能會比數據出現早消失
      setLoading(false);
    }
  }, [turnstileToken, showToast, startTransition]); // 添加 startTransition 依賴

  // 表單送出
  const handleSubmit = (e) => {
    e.preventDefault();

    // --- 立即更新 UI 反饋 ---
    setLoading(true);
    setTimeoutMessage('');
    setYearsError('');
    // 立即清除舊圖表數據，讓 Loading 指示器顯示
    setChartData(null);
    setUlbandData(null);
    setAnalysisResult({ price: null, sentiment: null });
    setDisplayedStockCode('');
    // --- UI 反饋結束 ---

    // --- 調用 Context 的函數來請求廣告 (假設此函數很快) ---
    requestAdDisplay('priceAnalysis', 3);
    // --- 廣告請求結束 ---

    // --- 開始：表單處理邏輯 ---
    let numYears;
    let stockToFetch = stockCode; // 使用局部變數
    let dateToFetch = backTestDate;

    if (isAdvancedQuery) {
      const convertedYears = years
        .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
        .replace(/[．。]/g, '.');
      numYears = parseFloat(convertedYears);

      if (isNaN(numYears) || numYears <= 0) {
        setYearsError('請輸入有效的查詢期間（年），且必須大於零。');
        setLoading(false); // 驗證失敗，結束 Loading
        return;
      }
    } else {
      switch (analysisPeriod) {
        case '短期': numYears = 0.5; break;
        case '中期': numYears = 1.5; break;
        case '長期': default: numYears = 3.5; break;
      }
    }

    // 延遲分析事件發送，不阻塞 UI
    setTimeout(() => {
      Analytics.stockAnalysis.search({
        stockCode: stockToFetch,
        years: numYears,
        backTestDate: dateToFetch
      });
    }, 0);

    // 觸發數據抓取 (內部會處理 loading 狀態)
    fetchStockData(stockToFetch, numYears, dateToFetch, false);
    // --- 結束：表單處理邏輯 ---
  };

  // 初始化資料 (componentDidMount 或 URL/location.state 變化時)
  useEffect(() => {
    const isFromWatchlist = location.state?.fromWatchlist;
    const urlStockCode = searchParams.get('stockCode');
    const urlYears = searchParams.get('years');
    const urlBackTestDate = searchParams.get('backTestDate');

    // 確定要使用的股票代碼、年份和日期 (從 URL 或預設值)
    let fetchStock = urlStockCode || 'SPY';
    let fetchYears = urlYears || '3.5';
    let fetchDate = urlBackTestDate || '';

    // 更新 state 以反映 URL/預設值，讓表單顯示正確
    setStockCode(fetchStock);
    setBackTestDate(fetchDate);
    if (['0.5', '1.5', '3.5'].includes(fetchYears)) {
        setIsAdvancedQuery(false);
        switch (fetchYears) {
            case '0.5': setAnalysisPeriod('短期'); break;
            case '1.5': setAnalysisPeriod('中期'); break;
            case '3.5': setAnalysisPeriod('長期'); break;
            default: break;
        }
        setYears(fetchYears);
    } else {
        setIsAdvancedQuery(true);
        setYears(fetchYears);
    }
    if (fetchDate) {
        setIsAdvancedQuery(true);
    }

    // 驗證執行分析所需的參數
    const numYears = parseFloat(fetchYears);
    const areParamsSufficientForFetch = fetchStock && !isNaN(numYears) && numYears > 0;

    // 判斷是否應該自動執行初始查詢
    let shouldAutoFetch = false;
    if (areParamsSufficientForFetch) {
        // 如果參數有效，檢查是否來自 Watchlist 或 股票代碼是 SPY
        if (isFromWatchlist || fetchStock.toUpperCase() === 'SPY') {
             shouldAutoFetch = true;
        }
    }

    // 根據判斷結果執行操作
    if (shouldAutoFetch) {
        // 清除舊圖表，避免顯示上一次的結果
        setChartData(null);
        setUlbandData(null);
        setAnalysisResult({ price: null, sentiment: null });
        setDisplayedStockCode(''); // 清除舊代碼
        setTimeoutMessage(''); // 清除舊訊息
        setYearsError(''); // 清除舊錯誤
        // 執行初始查詢，bypassTurnstile 為 true
        fetchStockData(fetchStock, numYears, fetchDate, true);
    } else if (urlYears && (isNaN(numYears) || numYears <= 0)) {
        // 如果 URL 明確提供了無效的年份參數 (即使不自動查詢也要處理)
        console.error("Invalid years parameter from URL:", fetchYears);
        showToast('從 URL 讀取的查詢期間無效。', 'error');
        // 清除圖表數據
        setChartData(null);
        setUlbandData(null);
        setAnalysisResult({ price: null, sentiment: null });
        setDisplayedStockCode('');
        setTimeoutMessage('');
        setYearsError('查詢期間參數無效。'); // 在表單中顯示錯誤
    } else {
        // 非自動查詢情況 (例如直接訪問非 SPY 股票, 刷新非 SPY 股票頁面等)
        // 清除可能殘留的圖表數據 (除非正在手動載入)
        if (!loading) {
             setChartData(null);
             setUlbandData(null);
             setAnalysisResult({ price: null, sentiment: null });
             setDisplayedStockCode(''); // 清除舊代碼
             setTimeoutMessage(''); // 清除舊訊息
             // 保留 yearsError，因為可能是使用者手動輸入錯誤後刷新
        }
    }

    // 可選：清除 location state
    // if (location.state?.fromWatchlist) {
    //     // 注意：直接使用 navigate 可能會觸發此 useEffect 重新運行，需要謹慎
    //     // window.history.replaceState({}, document.title) // 另一種方式，不觸發 React Router 更新
    // }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, location.state]); // 依賴 location.state

  // 切換簡易/進階查詢模式
  const toggleQueryMode = () => {
    setIsAdvancedQuery(!isAdvancedQuery);
    // 切換模式時，如果從進階切回簡易，可能需要重置年份為預設值或清空錯誤
    if (!isAdvancedQuery) {
        setYearsError(''); // 清除可能存在的年份錯誤
        // 可以選擇是否將 years state 設回 analysisPeriod 對應的值
        // switch (analysisPeriod) {
        //     case '短期': setYears('0.5'); break;
        //     case '中期': setYears('1.5'); break;
        //     case '長期': default: setYears('3.5'); break;
        // }
    } else {
        // 從簡易切到進階時，將 analysisPeriod 對應的值填入 years 輸入框
        switch (analysisPeriod) {
            case '短期': setYears('0.5'); break;
            case '中期': setYears('1.5'); break;
            case '長期': default: setYears('3.5'); break;
        }
    }
  };

  // 定義用於結構化數據的 JSON-LD
  const priceAnalysisJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "樂活五線譜",
    "description": "利用標準差分析股價趨勢，判斷市場情緒。分析當前股價是否過度樂觀或悲觀。利用股價均值回歸的統計特性，追蹤長期趨勢、判斷股價所處位置。",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "url": "https://sentimentinsideout.com/priceanalysis",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://sentimentinsideout.com/priceanalysis?stockCode={stockCode}&years={years}&backTestDate={backTestDate}",
      "query-input": "required name=stockCode,years,backTestDate"
    }
  };

  // 優化 Line Chart Options
  const lineChartOptions = useMemo(() => {
    // 基本配置
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          time: {
            // unit 會在下方動態添加
            displayFormats: { day: 'MM/dd', week: 'MM/dd', month: 'yyyy/MM', quarter: 'yyyy/[Q]Q', year: 'yyyy' },
            tooltipFormat: 'yyyy/MM/dd'
          },
          ticks: {
            maxTicksLimit: isMobile ? 4 : 6,
            autoSkip: true,
            maxRotation: isMobile ? 45 : 0,
            minRotation: isMobile ? 45 : 0,
            font: { size: isMobile ? 10 : 12 }
          }
        },
        y: { position: 'right', grid: { drawBorder: true } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          usePointStyle: true,
          callbacks: {
            labelColor: (context) => ({
              backgroundColor: context.dataset.borderColor,
              borderColor: context.dataset.borderColor,
              borderWidth: 0
            }),
            label: (context) => `${context.dataset.label || ''}: ${formatPrice(context.parsed.y)}`
          },
          itemSort: (a, b) => b.parsed.y - a.parsed.y
        },
        crosshair: {
          line: { color: '#F66', width: 1, dashPattern: [5, 5] },
          sync: { enabled: false },
          zoom: { enabled: false }
        }
      },
      interaction: { mode: 'index', intersect: false },
      hover: { mode: 'index', intersect: false },
      layout: { padding: { left: 10, right: 30, top: 20, bottom: 25 } }
    };

    // 動態添加 time unit (如果 chartData 存在)
    if (chartData?.timeUnit) {
      options.scales.x.time.unit = chartData.timeUnit;
    }

    return options;
  // 依賴 isMobile 和 chartData?.timeUnit (安全訪問)
  }, [isMobile, chartData?.timeUnit]);

  return (
    <PageContainer 
      title="樂活五線譜 - 價格趨勢分析"
      description="利用股價均值回歸的特性，分析價格趨勢，並判斷當前市場情緒是否過度樂觀或是悲觀，提升進出場的勝率。"
      keywords="樂活五線譜,價格趨勢分析,股價分析,市場情緒,均值回歸,超買超賣,樂活通道"
      ogImage="/images/price-analysis-og.png"
      ogUrl="https://sentimentinsideout.com/priceanalysis"
      ogType="website"
      jsonLd={priceAnalysisJsonLd}
    >
      <h1>樂活五線譜</h1>
      <div className="dashboard">
        
        {/* 將 stock-analysis-card 移到 chart-card 上方 */}
        <div className="stock-analysis-card">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>股票代碼：</label>
              <input
                className="form-control"
                type="text"
                value={stockCode}
                onChange={handleStockCodeChange}
                placeholder="例如:2330、AAPL"
                required
              />
            </div>

            {/* 簡易查詢欄位容器 */}
            {!isAdvancedQuery && (
              <div className="input-group query-mode-inputs">
                <label>分析期間：</label>
                <select
                  className="form-control"
                  value={analysisPeriod}
                  onChange={(e) => setAnalysisPeriod(e.target.value)}
                >
                  <option value="短期">短期 (0.5年)</option>
                  <option value="中期">中期 (1.5年)</option>
                  <option value="長期">長期 (3.5年)</option>
                </select>
              </div>
            )}

            {/* 進階查詢欄位容器 */}
            {isAdvancedQuery && (
              <div className="input-group query-mode-inputs advanced-query-mode-inputs">
                <div className="input-group">
                  <label>分析期間：</label>
                  <input
                    className="form-control"
                    type="text"
                    value={years}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^[0-9０-９.．。]*$/.test(value)) {
                        setYears(value);
                      }
                    }}
                    placeholder="輸入年數，如 3.5"
                    required
                  />
                  {yearsError && <div className="error-message">{yearsError}</div>}
                </div>
                <div className="input-group">
                  <label>回測日期：</label>
                  <DatePicker
                    selected={backTestDate ? new Date(backTestDate) : null}
                    onChange={(date) => setBackTestDate(date ? date.toISOString().split('T')[0] : '')}
                    placeholderText="預設今天"
                    className="form-control"
                    dateFormat="yyyy/MM/dd"
                    isClearable
                    popperPlacement="auto"
                  />
                </div>
              </div>
            )}

            {/* 進階/簡易 查詢切換按鈕 (保持在下方) */}
            <div className="input-group">
              <button
                type="button"
                className="btn-secondary query-mode-button"
                onClick={toggleQueryMode}
              >
                {isAdvancedQuery ? '簡易設定' : '進階設定'}
              </button>
            </div>

            <button
              className={`btn-primary analysis-button ${loading ? 'btn-loading' : ''}`}
              type="submit"
              disabled={loading || !turnstileToken}
            >
              {loading ? (isPending ? '處理數據中...' : '分析中...') : turnstileToken ? '開始分析' : '請完成下方驗證'}
            </button>
            {turnstileVisible && (
              <div className="turnstile-container">
                <Turnstile
                  sitekey={process.env.REACT_APP_TURNSTILE_SITE_KEY}
                  onSuccess={handleTurnstileSuccess}
                  onError={() => {
                    setTurnstileToken(null);
                    handleApiError(new Error('驗證失敗，請重試'), showToast);
                  }}
                  onExpire={() => {
                    setTurnstileToken(null);
                    handleApiError(new Error('驗證已過期，請重新驗證'), showToast);
                  }}
                  refreshExpired="auto"
                />
              </div>
            )}
          </form>
        </div>

        {/* 主圖表區塊 */}
        <div className="chart-card">
          {/* 顯示超時或 API 錯誤訊息 */}
          {timeoutMessage && !loading && (
            <div className="error-message chart-error-message">{timeoutMessage}</div>
          )}
          <div className="chart-container">
            {/* 只有在 loading 或有數據時才顯示圖表標頭 */}
            {(loading || chartData || ulbandData) && (
              <div className="chart-header">
                <div className="analysis-result">
                  <div className="analysis-item">
                    <span className="analysis-label">股票代碼</span>
                    <span className="analysis-value">
                      {displayedStockCode}
                    </span>
                  </div>
                  <div className="analysis-item">
                    <span className="analysis-label">股票價格</span>
                    <span className="analysis-value">
                      ${formatPrice(analysisResult.price)}
                    </span>
                  </div>
                  <div className="analysis-item">
                    <span className="analysis-label">市場情緒</span>
                    <span className={`analysis-value sentiment-${analysisResult.sentiment}`}>
                      {analysisResult.sentiment}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="chart-content">
              {/* 圖表 Tabs */}
              {(chartData || ulbandData || loading) && ( // 只有在有數據或載入中才顯示 Tabs
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                  <div className="chart-tabs">
                    <button
                      className={`chart-tab ${activeChart === 'sd' ? 'active' : ''}`}
                      onClick={() => handleChartSwitch('sd')}
                      disabled={loading} // 載入中禁用切換
                    >
                      樂活五線譜
                    </button>
                    <button
                      className={`chart-tab ${activeChart === 'ulband' ? 'active' : ''}`}
                      onClick={() => handleChartSwitch('ulband')}
                      disabled={loading} // 載入中禁用切換
                    >
                      樂活通道
                    </button>
                  </div>
                </div>
              )}

              {/* Loading 指示器 */}
              {loading && (
                <div className="chart-loading-indicator">
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    {/* 根據 isPending 顯示不同文本 */}
                    <span>{isPending ? '圖表生成中...' : 'Loading...'}</span>
                  </div>
                </div>
              )}

              {/* 圖表 (僅在非 loading 狀態下顯示) */}
              {!loading && activeChart === 'sd' && chartData && (
                <Line
                  data={chartData}
                  options={lineChartOptions} // <--- 使用 useMemo 優化後的 options
                />
              )}
              {!loading && activeChart === 'ulband' && ulbandData && (
                // 使用 Memoized 版本
                <MemoizedULBandChart data={ulbandData} />
              )}
            </div>
          </div>

          {/* 可選：當沒有數據且不在載入時顯示佔位符 */}
          {!loading && !chartData && !ulbandData && !timeoutMessage && !yearsError && (
             <div className="chart-placeholder">請輸入條件並點擊「開始分析」。</div>
          )}
        </div>
      </div>

      {/* 將 ExpandableDescription 移到 dashboard 下方 */}
      <MemoizedExpandableDescription
        shortDescription={
          <>
            分析當前股價是否過度樂觀或悲觀。利用股價均值回歸的統計特性，追蹤長期趨勢、判斷股價所處位置。<br />
            詳細使用方式請參考文章：
            <a href="https://sentimentinsideout.com/articles/1.%E7%94%A8%E6%A8%82%E6%B4%BB%E4%BA%94%E7%B7%9A%E8%AD%9C%E5%88%86%E6%9E%90%E5%83%B9%E6%A0%BC%E8%B6%A8%E5%8B%A2%E8%88%87%E6%83%85%E7%B7%92" target="_blank" rel="noopener noreferrer">
              用樂活五線譜分析價格趨勢與情緒
            </a>
          </>
        }
        sections={[
          {
            title: "樂活五線譜",
            type: "list",
            content: [
              "中間的趨勢線為長期移動平均線，是評估股價長期趨勢的基準，以此為基準，上下分別添加兩個標準差。",
              "愈遠離中間的趨勢線，代表股價愈遠離長期平均值，回歸趨勢線的機率將逐漸增加。",
              "當股價觸及最上緣，表示股價短期內強烈超買，市場極度樂觀，有回調的風險。",
              "當股價觸及最下緣，表示股價短期內強烈超賣，市場極度悲觀，有反彈的機會。",
            ],
          },
          {
            title: "樂活通道",
            type: "list",
            content: [
              "樂活通道是更敏感的指標，用來輔助判斷短期內的超買超賣。",
              "當股價突破樂活通道上緣時，表示短期可能過熱。",
              "當股價跌破樂活通道下緣時，表示短期可能過冷。",
            ],
          },
          {
            title: "兩者搭配使用",
            type: "list",
            content: [
              "當股價觸及五線譜的最上緣或是最下緣時，若同時也突破了樂活通道，可能代表趨勢的延續，可以等回到通道內再進行操作。",
              "建議使用在指數型ETF或具有趨勢性的大型股票，搭配基本面分析，不應該單獨作為買賣依據。"
            ]
          },
        ]}
        expandButtonText="了解更多"
        collapseButtonText="收合"
      />

      {/* 條件式渲染 Toast 元件 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </PageContainer>
  );
} 