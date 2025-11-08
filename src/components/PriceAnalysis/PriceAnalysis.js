import React, { useState, useEffect, useCallback, useRef, useMemo, useTransition } from 'react';
import { Line } from 'react-chartjs-2';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import './PriceAnalysis.css';
import PageContainer from '../PageContainer/PageContainer';
import ULBandChart from '../ULBandChart/ULBandChart';
import { Analytics } from '../../utils/analytics';
import { handleApiError } from '../../utils/errorHandler';
import { useMediaQuery } from 'react-responsive';
import Turnstile from 'react-turnstile';
import { formatPrice } from '../../utils/priceUtils';
import { ExpandableDescription } from '../Common/ExpandableDescription/ExpandableDescription';
import { Toast } from '../Watchlist/components/Toast';
import { useToastManager } from '../Watchlist/hooks/useToastManager';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'; // 引入 useLocation 和 useNavigate
import { useAdContext } from '../../components/Common/InterstitialAdModal/AdContext'; // 導入 useAdContext
import { useDebouncedCallback } from 'use-debounce'; // <--- 引入 useDebouncedCallback
import { useTranslation } from 'react-i18next'; // 1. Import useTranslation
import '../Common/global-styles.css';
import AdSense from '../Common/AdSense'; // <--- 新增：引入 AdSense 組件
import zoomPlugin from 'chartjs-plugin-zoom'; // 新增：引入 zoom 插件
import { Chart as ChartJS } from 'chart.js';

import enhancedApiClient from '../../utils/enhancedApiClient';
import { useAuth } from '../Auth/useAuth'; // 新增：引入 useAuth
import { useDialog } from '../Common/Dialog/useDialog'; // 新增：引入 useDialog
import { isStockAllowed, getFreeStockList } from '../../utils/freeStockListUtils'; // 導入免費股票清單檢查函數
import FreeStockList from './FreeStockList'; // 新增：引入免費股票清單組件

// 註冊 zoom 插件
ChartJS.register(zoomPlugin);

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

// 新增輔助函數：從翻譯鍵提取後綴
const getSentimentSuffix = (key) => {
  if (!key) return 'neutral'; // 如果沒有 key，返回 'neutral'
  const parts = key.split('.');
  return parts[parts.length - 1]; // 返回最後一部分，例如 'pessimism'
};

/**
 * 價格標準差分析頁面 (PriceAnalysisPage)
 *
 * 專門負責：1) 抓取API資料 2) 處理表單 3) 顯示標準差圖表 or ULBandChart
 */
export function PriceAnalysis() {
  const { t, i18n } = useTranslation(); // 確保引入並使用 useTranslation
  const currentLang = i18n.language; // 取得當前語言
  const [searchParams] = useSearchParams();
  const location = useLocation(); // <--- 獲取 location 物件
  const navigate = useNavigate(); // <--- 獲取 navigate 函數
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
  const { showToast, toast, hideToast } = useToastManager();
  const { requestAdDisplay } = useAdContext(); // 從 Context 獲取函數
  const { isAuthenticated, user } = useAuth(); // 新增：獲取認證狀態和用戶資訊
  const { openDialog } = useDialog(); // 新增：獲取對話框功能

  // 檢查 Turnstile 功能是否啟用
  const isTurnstileEnabled = process.env.REACT_APP_TURNSTILE_ENABLED === 'true';

  // 從 URL 參數或預設值初始化狀態
  const initialStockCode = searchParams.get('stockCode') || 'SPY';
  const initialYears = searchParams.get('years') || '3.5';
  const initialBackTestDate = searchParams.get('backTestDate') || ''; // 如果需要也可以從 URL 讀取

  // 這裡保留所有原本在 App.js 中標準差分析需要的狀態
  const [stockCode, setStockCode] = useState(''); // 初始值改為空，由 useEffect 決定
  const [displayStockCode, setDisplayStockCode] = useState(''); // 新增：用於輸入框即時顯示
  const [years, setYears] = useState('');       // 初始值改為空
  const [backTestDate, setBackTestDate] = useState(''); // 初始值改為空
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [displayedStockCode, setDisplayedStockCode] = useState('');
  const [activeChart, setActiveChart] = useState('sd');
  const [activeDescriptionTab, setActiveDescriptionTab] = useState('overview'); // 新增：說明標籤狀態
  const [ulbandData, setUlbandData] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(isTurnstileEnabled ? null : 'disabled');
  const [turnstileVisible, setTurnstileVisible] = useState(isTurnstileEnabled);
  // 修改分析結果狀態，包含 key 和 value
  const [analysisResult, setAnalysisResult] = useState({
    price: null,
    sentimentKey: null, // <-- 新增 sentimentKey
    sentimentValue: null // <-- 原 sentiment 改為 sentimentValue
  });
  // 新增狀態來切換簡易/進階查詢
  const [isAdvancedQuery, setIsAdvancedQuery] = useState(false);
  // 新增狀態來記錄分析期間的選擇
  const [analysisPeriod, setAnalysisPeriod] = useState('long'); // 預設為長期
  const [analysisClickCount, setAnalysisClickCount] = useState(0);
  const [showInterstitialAd, setShowInterstitialAd] = useState(false);
  const AD_DISPLAY_THRESHOLD = 3; // <--- 修改閾值為 3
  const [isAdCooldownActive, setIsAdCooldownActive] = useState(false); // 新增：追蹤廣告冷卻狀態
  const cooldownTimeoutRef = useRef(null); // 新增：保存冷卻計時器 ID
  const [isPending, startTransition] = useTransition(); // 添加 useTransition
  const chartRef = useRef(null); // 新增：圖表 ref 用於程式化控制 tooltip


  // 新增：熱門搜尋狀態
  const [hotSearches, setHotSearches] = useState([]);
  const [loadingHotSearches, setLoadingHotSearches] = useState(false);

  // 新增：快速選擇 Tab 狀態
  const [activeQuickSelectTab, setActiveQuickSelectTab] = useState('hotSearches'); // 'hotSearches' 或 'freeStocks'

  // 新增：自動顯示最新數據點的 tooltip
  useEffect(() => {
    // 只在標準差圖表顯示且有數據時執行
    if (!loading && activeChart === 'sd' && chartData && chartRef.current) {
      // 使用 setTimeout 確保圖表已完全渲染
      const timer = setTimeout(() => {
        const chart = chartRef.current;
        // 檢查圖表是否存在、已掛載且有數據
        if (chart && chart.canvas && chart.canvas.parentNode && chart.data && chart.data.labels && chart.data.labels.length > 0) {
          try {
            const lastIndex = chart.data.labels.length - 1;
            
            // 設置活動元素為所有數據集的最後一個數據點
            const activeElements = chart.data.datasets.map((dataset, datasetIndex) => ({
              datasetIndex,
              index: lastIndex
            }));
            
            chart.setActiveElements(activeElements);
            
            // 獲取價格線（datasetIndex = 0）的最後一個數據點位置
            const priceDatasetMeta = chart.getDatasetMeta(0);
            if (priceDatasetMeta && priceDatasetMeta.data[lastIndex]) {
              const priceElement = priceDatasetMeta.data[lastIndex];
              // 使用價格點的實際位置來顯示 tooltip
              chart.tooltip.setActiveElements(activeElements, { 
                x: priceElement.x, 
                y: priceElement.y 
              });
            } else {
              // 如果找不到價格點，使用預設方式
              chart.tooltip.setActiveElements(activeElements);
            }
            
            // 更新圖表以顯示 tooltip
            chart.update('none'); // 使用 'none' 模式避免動畫
          } catch (error) {
            console.warn('Failed to show tooltip:', error);
          }
        }
      }, 300); // 延遲 300ms 確保圖表渲染完成
      
      return () => clearTimeout(timer);
    }
  }, [loading, activeChart, chartData]); // 依賴於 loading、activeChart 和 chartData

  // --- Debounced State Setters ---
  // Debounce setStockCode with a 300ms delay
  const debouncedSetStockCode = useDebouncedCallback((value) => {
    setStockCode(value);
  }, 300);

  // Debounce setYears with a 300ms delay
  const debouncedSetYears = useDebouncedCallback((value) => {
    setYears(value);
  }, 300);
  // --- End Debounced State Setters ---

  // 處理股票代碼的全形/半形轉換 (現在調用 debounced setter)
  const handleStockCodeChange = (e) => {
    const value = e.target.value;
    // 更新 displayStockCode 以立即反映輸入
    setDisplayStockCode(value.toUpperCase());

    const convertedValue = value.replace(/[０-９Ａ-Ｚａ-ｚ]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
    );
    // 調用 debounced 函數來更新實際的 stockCode 狀態
    debouncedSetStockCode(convertedValue.toUpperCase());
  };



  // 處理查詢期間輸入 (現在調用 debounced setter)
  const handleYearsChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^[0-9０-９.．。]*$/.test(value)) {
      // 直接更新 input value (如果需要立即反饋)
      // e.target.value = value; // 可能不需要
      // 調用 debounced 函數來更新狀態
      debouncedSetYears(value);
    }
  };

  // 切換主圖表 (標準差 or ULBand)
  const handleChartSwitch = (chartType) => {
    Analytics.stockAnalysis.chartSwitch(chartType);
    setActiveChart(chartType);
    // 互動式說明：自動切換到對應的說明標籤
    if (chartType === 'sd') {
      setActiveDescriptionTab('sd');
    } else if (chartType === 'ulband') {
      setActiveDescriptionTab('ulband');
    }
  };

  // 處理說明標籤切換
  const handleDescriptionTabSwitch = (tabType) => {
    setActiveDescriptionTab(tabType);
  };

  // 處理 Turnstile 回調
  const handleTurnstileVerify = (response) => {
    console.log("Turnstile verified:", response);
    setTurnstileToken(response);
    setTurnstileVisible(false); // 驗證成功後隱藏
  };

  const handleTurnstileError = (response) => {
    console.error("Turnstile error:", response); // 保留日誌以供調試
    // 建立帶有 errorCode 的錯誤物件，並使用現有的翻譯鍵
    const turnstileError = new Error(t('errors.TURNSTILE_ERROR'));
    turnstileError.errorCode = 'TURNSTILE_ERROR'; // 關鍵：添加 errorCode 屬性
    // 將新的錯誤物件和 t 傳遞給 handleApiError
    handleApiError(turnstileError, showToast, t);
    setTurnstileToken(null); // 清除 token
    setTurnstileVisible(true); // 保持可見以便重試
  };

  const handleTurnstileExpire = () => {
    console.warn("Turnstile expired");
    // 建立帶有 errorCode 的錯誤物件，並使用現有的翻譯鍵
    const turnstileExpiredError = new Error(t('errors.TURNSTILE_EXPIRED'));
    turnstileExpiredError.errorCode = 'TURNSTILE_EXPIRED'; // 關鍵：添加 errorCode 屬性
    // 將新的錯誤物件和 t 傳遞給 handleApiError
    handleApiError(turnstileExpiredError, showToast, t);
    setTurnstileToken(null); // 清除 token
    setTurnstileVisible(true); // 顯示以便重新驗證
  };

  // 資料抓取函式
  const fetchStockData = useCallback(async (stock, yrs, testDate, bypassTurnstile = false, isManualSearch = false) => {
    // 驗證 Turnstile Token (只有在功能啟用時才檢查)
    if (isTurnstileEnabled && !bypassTurnstile && !turnstileToken) {
      // 可以直接調用 showToast 或通過 handleApiError
      // 方式一：直接調用
      // showToast(t('errors.TURNSTILE_REQUIRED'), 'error');
      // 方式二：通過 handleApiError (如果希望統一追蹤)
      const turnstileError = new Error(t('errors.TURNSTILE_REQUIRED'));
      turnstileError.errorCode = 'TURNSTILE_REQUIRED'; // 添加 errorCode
      handleApiError(turnstileError, showToast, t);
      setLoading(false);
      return;
    }

    // setLoading(true) 和清除訊息已移至 handleSubmit

    try {
      const params = { stockCode: stock, years: yrs, backTestDate: testDate };
      if (isManualSearch) { // Add source if it's a manual search
        params.source = 'manual_price_analysis';
      }

      const response = await enhancedApiClient.get('/api/integrated-analysis', {
        params: params,
        headers: { 
          ...(isTurnstileEnabled && !bypassTurnstile && turnstileToken && { 'CF-Turnstile-Token': turnstileToken })
        },
        timeout: 30000
      });

      const { data } = response.data;
      const { dates, prices, sdAnalysis, weeklyDates, weeklyPrices, upperBand, lowerBand, ma20 } = data;

      // 使用 startTransition 包裹耗時的狀態更新
      startTransition(() => {
        setChartData({
          labels: dates,
          datasets: [
            // 使用 t() 翻譯 dataset labels
            { label: t('priceAnalysis.chart.label.price'), data: prices, borderColor: '#000000', borderWidth: 2, fill: false, pointRadius: 0 }, // 價格線顏色維持黑色
            { label: t('priceAnalysis.chart.label.trendLine'), data: sdAnalysis.trendLine, borderColor: '#708090', borderWidth: 2, fill: false, pointRadius: 0 }, // Neutral
            { label: t('priceAnalysis.chart.label.minus2sd'), data: sdAnalysis.tl_minus_2sd, borderColor: '#0000FF', borderWidth: 2, fill: false, pointRadius: 0 }, // extremePessimism
            { label: t('priceAnalysis.chart.label.minus1sd'), data: sdAnalysis.tl_minus_sd, borderColor: '#5B9BD5', borderWidth: 2, fill: false, pointRadius: 0 }, // pessimism
            { label: t('priceAnalysis.chart.label.plus1sd'), data: sdAnalysis.tl_plus_sd, borderColor: '#F0B8CE', borderWidth: 2, fill: false, pointRadius: 0 }, // optimism
            { label: t('priceAnalysis.chart.label.plus2sd'), data: sdAnalysis.tl_plus_2sd, borderColor: '#D24A93', borderWidth: 2, fill: false, pointRadius: 0 }  // extremeOptimism
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

          // 決定 sentimentKey
          let sentimentKey = 'priceAnalysis.sentiment.neutral'; // Default key
          if (lastPrice >= lastTlPlus2Sd) sentimentKey = 'priceAnalysis.sentiment.extremeOptimism';
          else if (lastPrice > lastTlPlusSd) sentimentKey = 'priceAnalysis.sentiment.optimism';
          else if (lastPrice <= lastTlMinus2Sd) sentimentKey = 'priceAnalysis.sentiment.extremePessimism';
          else if (lastPrice < lastTlMinusSd) sentimentKey = 'priceAnalysis.sentiment.pessimism';

          // 同時設定 key 和翻譯後的 value
          setAnalysisResult({
            price: lastPrice.toFixed(2),
            sentimentKey: sentimentKey,
            sentimentValue: t(sentimentKey) // 使用 t() 獲取翻譯值
          });
        } else {
          // 清空時也清空 key 和 value
          setAnalysisResult({ price: null, sentimentKey: null, sentimentValue: null });
        }
      }); // end startTransition

      // 這個更新通常很快，可以在 transition 外部
      setDisplayedStockCode(stock);

    } catch (error) {
      // 錯誤時也用 transition 清空數據
      startTransition(() => {
        setChartData(null);
        setUlbandData(null);
        // 清空時也清空 key 和 value
        setAnalysisResult({ price: null, sentimentKey: null, sentimentValue: null });
        setDisplayedStockCode('');
      });
      // 將 t 傳遞給 handleApiError
      handleApiError(error, showToast, t);
    } finally {
      // 即使 transition 未完成，也結束 Loading 狀態，讓 UI 可以響應
      // 注意：如果 transition 非常慢，Loading 可能會比數據出現早消失
      setLoading(false);
    }
  }, [isTurnstileEnabled, turnstileToken, showToast, startTransition, t, requestAdDisplay, isAdCooldownActive, analysisClickCount]); // 確保 t 在依賴項中

  // 表單送出
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted, checking auth:', { isAuthenticated, user });

    // 新增：檢查登入狀態
    if (!isAuthenticated) {
      console.log('User not authenticated, opening auth dialog');
      openDialog('auth', {
        returnPath: location.pathname,
        message: t('protectedRoute.loginRequired')
      });
      return;
    }

    // 新增：檢查股票代碼限制
    const isTemporaryFreeMode = process.env.REACT_APP_TEMPORARY_FREE_MODE === 'true';
    const userPlan = user?.plan || 'free'; // 從 auth context 獲取實際用戶計劃
    const effectiveUserPlan = isTemporaryFreeMode ? 'pro' : userPlan;
    console.log('Stock check:', { displayStockCode, userPlan, effectiveUserPlan, isTemporaryFreeMode, isAllowed: isStockAllowed(displayStockCode, effectiveUserPlan) });
    
    if (!isStockAllowed(displayStockCode, effectiveUserPlan)) {
      console.log('Stock not allowed, opening dialog');
      // 顯示功能升級對話框
      openDialog('featureUpgrade', {
        feature: 'stockAccess',
        stockCode: displayStockCode,
        allowedStocks: getFreeStockList(),
        upgradeUrl: `/${i18n.language}/subscription-plans`
      });
      return;
    }

    // --- 立即更新 UI 反饋 ---
    setLoading(true);
    startTransition(() => {
        setChartData(null);
        setUlbandData(null);
        // 清空時也清空 key 和 value
        setAnalysisResult({ price: null, sentimentKey: null, sentimentValue: null });
        setDisplayedStockCode('');
    });
    // --- UI 反饋結束 ---

    // --- 調用 Context 的函數來請求廣告 ---
    requestAdDisplay('priceAnalysis', 3);
    // --- 廣告請求結束 ---

    // --- 開始：表單處理邏輯 ---
    let numYears;
    let stockToFetch = displayStockCode;
    let dateToFetch = backTestDate;

    if (isAdvancedQuery) {
      // 驗證 years 狀態
      const convertedYears = years // 使用 state 中的 years
        .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
        .replace(/[．。]/g, '.');
      numYears = parseFloat(convertedYears);

      if (isNaN(numYears) || numYears <= 0) {
        // 對於純前端驗證，可以直接顯示 Toast
        // showToast(t('errors.INVALID_YEARS_INPUT'), 'error'); 
        showToast(t('priceAnalysis.toast.invalidYears'), 'error');
        setLoading(false);
        return;
      }
    } else {
      switch (analysisPeriod) {
        case 'short': numYears = 0.5; break;
        case 'medium': numYears = 1.5; break;
        case 'long': default: numYears = 3.5; break;
      }
    }

    // 延遲分析事件發送
    setTimeout(() => {
      Analytics.stockAnalysis.search({
        stockCode: stockToFetch,
        years: numYears,
        backTestDate: dateToFetch
      });
    }, 0);

    // 觸發數據抓取
    fetchStockData(stockToFetch, numYears, dateToFetch,  false, true);
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
    setDisplayStockCode(fetchStock); // <--- 新增：初始化 displayStockCode
    setBackTestDate(fetchDate);
    if (['0.5', '1.5', '3.5'].includes(fetchYears)) {
        setIsAdvancedQuery(false);
        switch (fetchYears) {
            case '0.5': setAnalysisPeriod('short'); break;
            case '1.5': setAnalysisPeriod('medium'); break;
            case '3.5': setAnalysisPeriod('long'); break;
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
        // 清除舊圖表
        setChartData(null);
        setUlbandData(null);
        // 清空時也清空 key 和 value
        setAnalysisResult({ price: null, sentimentKey: null, sentimentValue: null });
        setDisplayedStockCode('');
        // 執行初始查詢
        fetchStockData(fetchStock, numYears, fetchDate, true);
    } else if (urlYears && (isNaN(numYears) || numYears <= 0)) {
        console.error("Invalid years parameter from URL:", fetchYears);
        // 使用 t() 翻譯錯誤訊息 (假設有此 key)
        // showToast(t('priceAnalysis.toast.invalidUrlYears'), 'error');
        showToast('從 URL 讀取的查詢期間無效。', 'error'); // 暫時保留硬編碼，或添加新 key
        // 清除圖表數據        setChartData(null);
        setUlbandData(null);
        // 清空時也清空 key 和 value
        setAnalysisResult({ price: null, sentimentKey: null, sentimentValue: null });
        setDisplayedStockCode('');
    } else {
        // 非自動查詢情況 (例如直接訪問非 SPY 股票, 刷新非 SPY 股票頁面等)
        // 清除可能殘留的圖表數據 (除非正在手動載入)
        if (!loading) {
             setChartData(null);
             setUlbandData(null);
             // 清空時也清空 key 和 value
             setAnalysisResult({ price: null, sentimentKey: null, sentimentValue: null });
             setDisplayedStockCode('');
        }
    }

    // 新增：useEffect 鉤子以獲取熱門搜尋數據
    const fetchHotSearches = async () => {
      console.log('Fetching hot searches...'); // 添加這行
      setLoadingHotSearches(true);
      try {
        // 使用增強的 API 客戶端，自動處理認證和重試
        const response = await enhancedApiClient.get('/api/hot-searches', { 
          timeout: 15000,
          maxRetries: 2, // 減少重試次數以避免過多請求
          retryDelay: 500 // 較短的重試延遲
        });
        console.log('API response received:', response.data); // 添加這行
        // 假設 API 回應格式為 { data: { top_searches: [...] } }
        if (response.data && response.data.data && Array.isArray(response.data.data.top_searches)) {
          setHotSearches(response.data.data.top_searches);
        } else {
          setHotSearches([]);
          console.warn('Hot searches data is not in expected format:', response.data);
        }
      } catch (error) {
        console.error("Error fetching hot searches:", error); // 添加這行
        setHotSearches([]);
        
        // 只在非 403 錯誤時顯示錯誤提示，避免認證問題時的重複提示
        if (error.response?.status !== 403) {
          handleApiError(error, showToast, t);
        } else {
          console.log('403 error detected, likely authentication issue - not showing toast');
        }
      } finally {
        console.log('Finished fetching hot searches.'); // 添加這行
        setLoadingHotSearches(false);
      }
    };

    fetchHotSearches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, location.state]); // <--- 修改：移除 getStockNameFromFreeList





  // 新增：處理熱門搜尋項目點擊事件
  const handleHotSearchClick = (searchItem) => { // 參數名稱改為 searchItem 以清晰表示它是一個物件
    // 新增：檢查登入狀態
    if (!isAuthenticated) {
      openDialog('auth', {
        returnPath: location.pathname,
        message: t('protectedRoute.loginRequired')
      });
      return;
    }

    // 新增：檢查股票代碼限制
    const isTemporaryFreeMode2 = process.env.REACT_APP_TEMPORARY_FREE_MODE === 'true';
    const userPlan = user?.plan || 'free'; // 從 auth context 獲取實際用戶計劃
    const effectiveUserPlan2 = isTemporaryFreeMode2 ? 'pro' : userPlan;
    const upperClickedCode = searchItem.keyword.toUpperCase();
    if (!isStockAllowed(upperClickedCode, effectiveUserPlan2)) {
      // 顯示功能升級對話框
      openDialog('featureUpgrade', {
        feature: 'stockAccess',
        stockCode: upperClickedCode,
        allowedStocks: getFreeStockList(),
        upgradeUrl: `/${i18n.language}/subscription-plans`
      });
      return;
    }

    // 更新狀態以反映新的股票代碼
    setDisplayStockCode(upperClickedCode);
    setStockCode(upperClickedCode);

    // 準備表單提交所需的參數
    // 這裡我們假設點擊熱門搜尋時，使用預設的分析期間（例如 'long' -> 3.5 年）
    // 並且不使用回測日期，除非有特殊邏輯需要處理
    let numYearsToFetch;
    if (isAdvancedQuery) {
        // 如果在進階模式，且 years 有效，則使用 years 的值
        const convertedYears = years
            .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
            .replace(/[．。]/g, '.');
        const parsedYears = parseFloat(convertedYears);
        if (!isNaN(parsedYears) && parsedYears > 0) {
            numYearsToFetch = parsedYears;
        } else {
            // 如果進階模式下的 years 無效，則退回簡易模式的預設值
            numYearsToFetch = 3.5; // 或者根據 analysisPeriod
            showToast(t('priceAnalysis.toast.invalidYearsHotSearch'), 'warning');
        }
    } else {
        switch (analysisPeriod) {
            case 'short': numYearsToFetch = 0.5; break;
            case 'medium': numYearsToFetch = 1.5; break;
            case 'long': default: numYearsToFetch = 3.5; break;
        }
    }
    const dateToFetch = isAdvancedQuery ? backTestDate : ''; // 進階模式才考慮回測日期

    // --- 立即更新 UI 反饋 ---
    setLoading(true);
    startTransition(() => {
        setChartData(null);
        setUlbandData(null);
        setAnalysisResult({ price: null, sentimentKey: null, sentimentValue: null });
        setDisplayedStockCode(''); // 清空舊的 displayedStockCode，fetchStockData 成功後會更新
    });
    // --- UI 反饋結束 ---

    // --- 調用 Context 的函數來請求廣告 ---
    requestAdDisplay('priceAnalysis', 3);
    // --- 廣告請求結束 ---

    // 延遲分析事件發送
    setTimeout(() => {
        Analytics.stockAnalysis.search({
            stockCode: upperClickedCode,
            years: numYearsToFetch,
            backTestDate: dateToFetch,
            source: 'hotSearch' // 標記來源為熱門搜尋
        });
    }, 0);

    // 直接調用 fetchStockData 執行分析
    fetchStockData(upperClickedCode, numYearsToFetch, dateToFetch, false, true);
  };

  // 新增：處理免費股票清單點擊事件
  const handleFreeStockClick = (ticker) => {
    // 新增：檢查登入狀態
    if (!isAuthenticated) {
      openDialog('auth', {
        returnPath: location.pathname,
        message: t('protectedRoute.loginRequired')
      });
      return;
    }

    // 免費股票清單中的股票都是允許的，但仍然檢查一下
    const isTemporaryFreeMode3 = process.env.REACT_APP_TEMPORARY_FREE_MODE === 'true';
    const userPlan = user?.plan || 'free';
    const effectiveUserPlan3 = isTemporaryFreeMode3 ? 'pro' : userPlan;
    const upperClickedCode = ticker.toUpperCase();
    if (!isStockAllowed(upperClickedCode, effectiveUserPlan3)) {
      // 理論上不應該發生，但為了安全起見
      openDialog('featureUpgrade', {
        feature: 'stockAccess',
        stockCode: upperClickedCode,
        allowedStocks: getFreeStockList(),
        upgradeUrl: `/${i18n.language}/subscription-plans`
      });
      return;
    }

    // 更新狀態以反映新的股票代碼
    setDisplayStockCode(upperClickedCode);
    setStockCode(upperClickedCode);

    // 準備表單提交所需的參數
    let numYearsToFetch;
    if (isAdvancedQuery) {
        const convertedYears = years
            .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
            .replace(/[．。]/g, '.');
        const parsedYears = parseFloat(convertedYears);
        if (!isNaN(parsedYears) && parsedYears > 0) {
            numYearsToFetch = parsedYears;
        } else {
            numYearsToFetch = 3.5;
            showToast(t('priceAnalysis.toast.invalidYearsFreeStock'), 'warning');
        }
    } else {
        switch (analysisPeriod) {
            case 'short': numYearsToFetch = 0.5; break;
            case 'medium': numYearsToFetch = 1.5; break;
            case 'long': default: numYearsToFetch = 3.5; break;
        }
    }
    const dateToFetch = isAdvancedQuery ? backTestDate : '';

    // --- 立即更新 UI 反饋 ---
    setLoading(true);
    startTransition(() => {
        setChartData(null);
        setUlbandData(null);
        setAnalysisResult({ price: null, sentimentKey: null, sentimentValue: null });
        setDisplayedStockCode('');
    });
    // --- UI 反饋結束 ---

    // --- 調用 Context 的函數來請求廣告 ---
    requestAdDisplay('priceAnalysis', 3);
    // --- 廣告請求結束 ---

    // 延遲分析事件發送
    setTimeout(() => {
        Analytics.stockAnalysis.search({
            stockCode: upperClickedCode,
            years: numYearsToFetch,
            backTestDate: dateToFetch,
            source: 'freeStockList' // 標記來源為免費股票清單
        });
    }, 0);

    // 直接調用 fetchStockData 執行分析
    fetchStockData(upperClickedCode, numYearsToFetch, dateToFetch, false, true);
  };

  // 切換簡易/進階查詢模式
  const toggleQueryMode = () => {
    setIsAdvancedQuery(!isAdvancedQuery);
    // 切換模式時，如果從進階切回簡易，可能需要重置年份為預設值或清空錯誤
    if (!isAdvancedQuery) {
        // 可以選擇是否將 years state 設回 analysisPeriod 對應的值
        // switch (analysisPeriod) {
        //     case 'short': setYears('0.5'); break;
        //     case 'medium': setYears('1.5'); break;
        //     case 'long': default: setYears('3.5'); break;
        // }
    } else {
        // 從簡易切到進階時，將 analysisPeriod 對應的值填入 years 輸入框
        switch (analysisPeriod) {
            case 'short': setYears('0.5'); break;
            case 'medium': setYears('1.5'); break;
            case 'long': default: setYears('3.5'); break;
        }
    }
  };

  // 定義用於結構化數據的 JSON-LD
  const priceAnalysisJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": t('priceAnalysis.jsonLd.name'),
    "description": t('priceAnalysis.jsonLd.description'),
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "url": `${window.location.origin}/${currentLang}/priceanalysis`,
    "inLanguage": currentLang,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${window.location.origin}/${currentLang}/priceanalysis?stockCode={stockCode}&years={years}&backTestDate={backTestDate}`,
      "query-input": "required name=stockCode,years,backTestDate"
    }
  }), [t, currentLang]);

  // 優化 Line Chart Options
  const lineChartOptions = useMemo(() => {
    // 計算 x 軸的最大值，在最後一個數據點後增加 10% 的空間
    let xAxisMax = undefined;
    if (chartData?.labels && chartData.labels.length > 0) {
      const lastDate = new Date(chartData.labels[chartData.labels.length - 1]);
      const firstDate = new Date(chartData.labels[0]);
      const timeRange = lastDate - firstDate;
      // 手機版增加更多空間以容納標籤
      const spaceRatio = isMobile ? 0.15 : 0.1;
      xAxisMax = new Date(lastDate.getTime() + timeRange * spaceRatio);
    }

    // 用於追蹤長按狀態的變數
    let longPressTimer = null;
    let isLongPress = false;
    let touchStartTime = 0;

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
          },
          ...(xAxisMax && { max: xAxisMax }) // 動態設置 x 軸最大值
        },
        y: { 
          position: 'right', 
          grid: { drawBorder: true },
          ticks: {
            callback: function(value, index, ticks) {
              // 獲取所有數據集的最後一個值
              if (!chartData?.datasets) return value;
              
              const lastIndex = chartData.labels.length - 1;
              const dataValues = chartData.datasets
                .map(dataset => dataset.data?.[lastIndex])
                .filter(v => v !== undefined && v !== null)
                .sort((a, b) => a - b); // 排序以找出最大最小值
              
              if (dataValues.length === 0) return value;
              
              const minDataValue = dataValues[0];
              const maxDataValue = dataValues[dataValues.length - 1];
              
              // 如果刻度值在數據值範圍之間，則隱藏
              if (value > minDataValue && value < maxDataValue) {
                return '';
              }
              
              return value;
            }
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          // 手機版：只在長按時啟用 tooltip；桌面版：總是啟用
          enabled: !isMobile,
          mode: 'index',
          intersect: false,
          usePointStyle: true,
          position: 'nearest',
          backgroundColor: '#ffffff',
          titleColor: '#000000',
          bodyColor: '#000000',
          borderColor: '#cccccc',
          borderWidth: 1,
          yAlign: function(context) {
            // 動態判斷 tooltip 應該顯示在上方還是下方
            if (!context.tooltip || !context.tooltip.dataPoints || context.tooltip.dataPoints.length === 0) {
              return 'top';
            }
            
            // 找到價格線的數據點（datasetIndex = 0）
            const pricePoint = context.tooltip.dataPoints.find(point => point.datasetIndex === 0);
            if (!pricePoint || !pricePoint.element) return 'top';
            
            // 獲取圖表區域的高度
            const chartArea = context.chart.chartArea;
            if (!chartArea) return 'top';
            
            const chartHeight = chartArea.bottom - chartArea.top;
            const chartMiddle = chartArea.top + (chartHeight / 2);
            
            // 使用價格點的 Y 座標來判斷（這個值對同一數據點是固定的）
            const priceY = pricePoint.element.y;
            
            // 如果價格點在圖表上半部，tooltip 顯示在下方（yAlign: 'top'）
            // 如果價格點在圖表下半部，tooltip 顯示在上方（yAlign: 'bottom'）
            return priceY < chartMiddle ? 'top' : 'bottom';
          },
          xAlign: 'center',
          caretSize: 6,
          caretPadding: 35,
          displayColors: true,
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

        annotation: {
          annotations: (() => {
            const annotations = {};
            
            // 只在有數據時添加 annotations
            if (chartData?.labels && chartData.labels.length > 0 && chartData.datasets) {
              const lastIndex = chartData.labels.length - 1;
              const lastDate = chartData.labels[lastIndex];
              
              // 為所有線條添加虛線和標籤
              chartData.datasets.forEach((dataset, index) => {
                if (dataset.data && dataset.data.length > 0) {
                  const lastValue = dataset.data[lastIndex];
                  
                  // 添加虛線
                  annotations[`line-${index}`] = {
                    type: 'line',
                    yMin: lastValue,
                    yMax: lastValue,
                    xMin: lastDate,
                    xMax: xAxisMax || lastDate,
                    borderColor: dataset.borderColor || '#999',
                    borderWidth: index === 0 ? 2 : 1,
                    borderDash: [5, 5]
                  };
                  
                  // 為所有線條添加標籤
                  annotations[`label-${index}`] = {
                    type: 'label',
                    drawTime: 'afterDraw',
                    xScaleID: 'x',
                    yScaleID: 'y',
                    xValue: xAxisMax || lastDate,
                    yValue: lastValue,
                    backgroundColor: dataset.borderColor || '#999',
                    color: '#fff',
                    content: `${formatPrice(lastValue)}`,
                    font: {
                      size: isMobile ? 12 : 12,
                      weight: 'bold'
                    },
                    padding: {
                      top: 2,
                      bottom: 2,
                      left: 5,
                      right: 5
                    },
                    borderRadius: 3,
                    position: {
                      x: 'end',
                      y: 'center'
                    },
                    xAdjust: index === 0 ? 2 : 35, // 價格線（index=0）更靠右
                    yAdjust: 0
                  };
                }
              });
            }
            
            return annotations;
          })()
        },
        // 新增：縮放和平移配置
        zoom: {
          zoom: {
            wheel: {
              enabled: true, // 啟用滾輪縮放
              speed: 0.1,
            },
            pinch: {
              enabled: true, // 啟用雙指捏合縮放
            },
            mode: 'x', // 只在 x 軸縮放
          },
          pan: {
            enabled: true,
            mode: 'x', // 只在 x 軸平移
            threshold: 10,
            // 手機版：單指滑動平移（非長按狀態）
            onPanStart: ({ chart, event }) => {
              if (isMobile && event.touches) {
                const touchCount = event.touches.length;
                // 單指且非長按狀態時允許平移
                if (touchCount === 1 && !isLongPress) {
                  return true;
                }
                // 雙指總是允許平移
                return touchCount >= 2;
              }
              // 桌面版或滑鼠事件，允許平移
              return true;
            },
          },
          limits: {
            x: {
              min: 'original',
              max: 'original',
            },
          },
        }
      },
      interaction: { mode: 'index', intersect: false },
      hover: { mode: 'index', intersect: false },
      layout: { padding: { left: 10, right: 25, top: 20, bottom: 25 } },
      clip: false,
      // 手機版：添加自定義觸控事件處理
      ...(isMobile && {
        onTouchStart: (event, activeElements, chart) => {
          const touches = event.native?.touches;
          if (touches && touches.length === 1) {
            touchStartTime = Date.now();
            isLongPress = false;
            
            // 設置長按計時器（500ms）
            longPressTimer = setTimeout(() => {
              isLongPress = true;
              // 啟用 tooltip
              chart.options.plugins.tooltip.enabled = true;
              
              // 獲取觸控點位置並顯示 tooltip
              const touch = touches[0];
              const rect = chart.canvas.getBoundingClientRect();
              const x = touch.clientX - rect.left;
              const y = touch.clientY - rect.top;
              
              // 找到最接近的數據點
              const elements = chart.getElementsAtEventForMode(
                { x, y, native: event.native },
                'index',
                { intersect: false },
                false
              );
              
              if (elements.length > 0) {
                chart.setActiveElements(elements);
                chart.tooltip.setActiveElements(elements, { x, y });
                chart.update('none');
              }
            }, 500);
          }
        },
        onTouchMove: (event, activeElements, chart) => {
          const touches = event.native?.touches;
          if (touches && touches.length === 1) {
            // 如果是長按狀態，更新 tooltip 位置
            if (isLongPress) {
              const touch = touches[0];
              const rect = chart.canvas.getBoundingClientRect();
              const x = touch.clientX - rect.left;
              const y = touch.clientY - rect.top;
              
              const elements = chart.getElementsAtEventForMode(
                { x, y, native: event.native },
                'index',
                { intersect: false },
                false
              );
              
              if (elements.length > 0) {
                chart.setActiveElements(elements);
                chart.tooltip.setActiveElements(elements, { x, y });
                chart.update('none');
              }
            } else {
              // 如果移動了，取消長按計時器
              if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
              }
            }
          }
        },
        onTouchEnd: (event, activeElements, chart) => {
          // 清除長按計時器
          if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
          
          // 重置狀態
          isLongPress = false;
          touchStartTime = 0;
          
          // 隱藏 tooltip
          chart.options.plugins.tooltip.enabled = false;
          chart.setActiveElements([]);
          chart.tooltip.setActiveElements([]);
          chart.update('none');
        },
      }),
    };

    // 動態添加 time unit (如果 chartData 存在)
    if (chartData?.timeUnit) {
      options.scales.x.time.unit = chartData.timeUnit;
    }

    return options;
  // 依賴 isMobile、chartData?.timeUnit 和 chartData?.labels (安全訪問)
  }, [isMobile, chartData?.timeUnit, chartData?.labels]);

  // 建立 ExpandableDescription 的 sections (使用 useMemo 和 t)
  const expandableSections = useMemo(() => [
    {
      title: t('priceAnalysis.explanation.sd.title'), // 翻譯標題
      type: "list",
      content: [ // 翻譯列表內容
        t('priceAnalysis.explanation.sd.l1'),
        t('priceAnalysis.explanation.sd.l2'),
        t('priceAnalysis.explanation.sd.l3'),
        t('priceAnalysis.explanation.sd.l4'),
      ],
    },
    {
      title: t('priceAnalysis.explanation.ulBand.title'), // 翻譯標題
      type: "list",
      content: [ // 翻譯列表內容
        t('priceAnalysis.explanation.ulBand.l1'),
        t('priceAnalysis.explanation.ulBand.l2'),
        t('priceAnalysis.explanation.ulBand.l3'),
      ],
    },
    {
      title: t('priceAnalysis.explanation.combined.title'),
      type: "list",
      content: [
        t('priceAnalysis.explanation.combined.l1'),
        t('priceAnalysis.explanation.combined.l2'),
      ]
    },
  ], [t]); // 添加 t 作為依賴

  return (
    <PageContainer
      // 使用 t() 翻譯 PageContainer props
      title={t('priceAnalysis.pageTitle')}
      description={t('priceAnalysis.pageDescription')}
      keywords={t('priceAnalysis.keywords')}
      ogImage="/images/price-analysis-og.png"
      ogUrl={`${window.location.origin}/${currentLang}/priceanalysis`}
      ogType="website"
      jsonLd={priceAnalysisJsonLd}
    >

      <div className="price-analysis-view">
        <div className="content-layout-container"> {/* 新增：佈局容器 */}
          <div className="dashboard">
            
            {/* 將 stock-analysis-card 和 hot-searches-section 包裹在 analysis-controls-wrapper 中 */}
            <div className="analysis-controls-wrapper stock-analysis-card">
              <div className="stock-analysis-card">
              <div className="title-group">
                <h1 className="analysis-main-title">{t('priceAnalysis.pageTitle')}</h1>
                <h4 className="analysis-subtitle">{t('priceAnalysis.form.title')}</h4>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  {/* 使用 t() 翻譯 label */}
                  <label>{t('priceAnalysis.form.stockCodeLabel')}</label>
                  <input
                    type="text"
                    className="form-control"
                    onChange={handleStockCodeChange}
                    // 使用 t() 翻譯 placeholder
                    placeholder={t('priceAnalysis.form.stockCodePlaceholder')}
                    required
                    // 保持 defaultValue 或 value 的邏輯不變 (如果需要)
                    value={displayStockCode} // 改為受控組件
                  />
                </div>

                {/* 簡易查詢欄位容器 */}
                {!isAdvancedQuery && (
                  <div className="input-group query-mode-inputs">
                    {/* 使用 t() 翻譯 label */}
                    <label>{t('priceAnalysis.form.analysisPeriodLabel')}</label>
                    <select
                      className="form-control"
                      value={analysisPeriod}
                      onChange={(e) => setAnalysisPeriod(e.target.value)}
                    >
                      {/* 使用 t() 翻譯 options */}
                      <option value="short">{t('priceAnalysis.form.periodShort')}</option>
                      <option value="medium">{t('priceAnalysis.form.periodMedium')}</option>
                      <option value="long">{t('priceAnalysis.form.periodLong')}</option>
                    </select>
                  </div>
                )}

                {/* 進階查詢欄位容器 */}
                {isAdvancedQuery && (
                  <div className="input-group query-mode-inputs advanced-query-mode-inputs">
                    <div className="input-group">
                      {/* 使用 t() 翻譯 label */}
                      <label>{t('priceAnalysis.form.analysisPeriodLabel')}</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="form-control"
                        onChange={handleYearsChange}
                        // 使用 t() 翻譯 placeholder
                        placeholder={t('priceAnalysis.form.yearsPlaceholder')}
                        required
                        // 保持 defaultValue 或 value 的邏輯不變
                        defaultValue={years} // 根據原始碼，這裡使用 defaultValue
                      />
                    </div>
                    <div className="input-group">
                      {/* 使用 t() 翻譯 label */}
                      <label>{t('priceAnalysis.form.backTestDateLabel')}</label>
                      <DatePicker
                        selected={backTestDate ? new Date(backTestDate) : null}
                        onChange={(date) => setBackTestDate(date ? date.toISOString().split('T')[0] : '')}
                        // 使用 t() 翻譯 placeholder
                        placeholderText={t('priceAnalysis.form.backTestDatePlaceholder')}
                        className="form-control"
                        dateFormat="yyyy/MM/dd"
                        isClearable
                        popperPlacement="auto"
                        popperProps={{
                          strategy: 'fixed', // <--- 新增：讓彈出框使用固定定位
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 按鈕組：切換模式按鈕和分析按鈕並排 */}
                <div className="button-group">
                  <button
                    type="button"
                    className="btn-secondary query-mode-button"
                    onClick={toggleQueryMode}
                  >
                    {/* 使用 t() 翻譯按鈕文字 */}
                    {isAdvancedQuery ? t('priceAnalysis.form.switchToSimple') : t('priceAnalysis.form.switchToAdvanced')}
                  </button>

                  <button
                    className={`btn-primary analysis-button ${loading ? 'btn-loading' : ''}`}
                    type="submit"
                    disabled={loading || (isTurnstileEnabled && !turnstileToken)}
                  >
                    {/* 使用 t() 翻譯按鈕文字 */}
                    {loading
                      ? (isPending ? t('priceAnalysis.form.buttonProcessing') : t('priceAnalysis.form.buttonAnalyzing'))
                      : (isTurnstileEnabled && !turnstileToken)
                        ? t('priceAnalysis.form.buttonCompleteVerification')
                        : t('priceAnalysis.form.buttonStartAnalysis')
                    }
                  </button>
                </div>
                {isTurnstileEnabled && turnstileVisible && (
                  <div className="turnstile-container">
                    <Turnstile
                      sitekey={process.env.REACT_APP_TURNSTILE_SITE_KEY}
                      onSuccess={handleTurnstileVerify}
                      onError={handleTurnstileError}
                      onExpire={handleTurnstileExpire}
                      refreshExpired="auto"
                    />
                  </div>
                )}
              </form>
            </div>

            {/* 快速選擇區塊 (熱門搜尋 + 免費股票清單) */}
            <div className="quick-select-section">
              {/* Tab 導航 */}
              <div className="quick-select-tabs">
                <button
                  className={`quick-select-tab ${activeQuickSelectTab === 'hotSearches' ? 'active' : ''}`}
                  onClick={() => setActiveQuickSelectTab('hotSearches')}
                >
                  {t('priceAnalysis.quickSelect.tabs.hotSearches')}
                </button>
                <button
                  className={`quick-select-tab ${activeQuickSelectTab === 'freeStocks' ? 'active' : ''}`}
                  onClick={() => setActiveQuickSelectTab('freeStocks')}
                >
                  {t('priceAnalysis.quickSelect.tabs.freeStocks')}
                </button>
              </div>

              {/* Tab 內容 */}
              <div className="quick-select-content">
                {activeQuickSelectTab === 'hotSearches' && (
                  <div className="hot-searches-tab-content">
                    {loadingHotSearches ? (
                      <p className="loading-text">{t('common.loading')}</p>
                    ) : hotSearches.length > 0 ? (
                      <div className="hot-search-list">
                        {hotSearches.map((searchItem, index) => (
                          <div
                            key={index}
                            className="hot-search-item"
                            onClick={() => handleHotSearchClick(searchItem)}
                            role="button"
                            tabIndex={0}
                            onKeyPress={(e) => e.key === 'Enter' && handleHotSearchClick(searchItem)}
                          >
                            <div className="hot-search-info">
                              <span className="hot-search-ticker">{searchItem.keyword}</span>
                              {searchItem.name && searchItem.name !== searchItem.keyword && (
                                <span className="hot-search-name">{searchItem.name}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-data-text">{t('priceAnalysis.hotSearches.noData')}</p>
                    )}
                  </div>
                )}

                {activeQuickSelectTab === 'freeStocks' && (
                  <div className="free-stocks-tab-content">
                    <FreeStockList 
                      onStockSelect={handleFreeStockClick}
                      className="integrated-free-stock-list"
                    />
                  </div>
                )}
              </div>
            </div>
          </div> {/* 結束 analysis-controls-wrapper */}

            {/* 主圖表區塊 */}
            <div className="chart-card">
              <div className="chart-container">
                {/* 只有在 loading 或有數據時才顯示圖表標頭 */}
                {(loading || chartData || ulbandData) && (
                  <div className="chart-header">
                    <div className="analysis-result">
                      <div className="analysis-item">
                        {/* 使用 t() 翻譯 label */}
                        <span className="analysis-label">{t('priceAnalysis.result.stockCode')}</span>
                        <span className="analysis-value">
                          {displayedStockCode}
                        </span>
                      </div>
                      <div className="analysis-item">
                        {/* 使用 t() 翻譯 label */}
                        <span className="analysis-label">{t('priceAnalysis.result.stockPrice')}</span>
                        <span className="analysis-value">
                          ${formatPrice(analysisResult.price)}
                        </span>
                      </div>
                      <div className="analysis-item">
                        {/* 使用 t() 翻譯 label */}
                        <span className="analysis-label">{t('priceAnalysis.result.marketSentiment')}</span>
                        {/* 修改 className：使用 getSentimentSuffix 提取後綴 */}
                        <span className={`analysis-value sentiment-${getSentimentSuffix(analysisResult.sentimentKey)}`}>
                          {analysisResult.sentimentValue}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="chart-content">
                  {/* 圖表 Tabs */}
                  {(chartData || ulbandData || loading) && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                      <div className="chart-tabs">
                        <button
                          className={`chart-tab ${activeChart === 'sd' ? 'active' : ''}`}
                          onClick={() => handleChartSwitch('sd')}
                          disabled={loading}
                        >
                          {t('priceAnalysis.chart.tabs.sd')}
                        </button>
                        <button
                          className={`chart-tab ${activeChart === 'ulband' ? 'active' : ''}`}
                          onClick={() => handleChartSwitch('ulband')}
                          disabled={loading}
                        >
                          {t('priceAnalysis.chart.tabs.ulband')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Loading 指示器 */}
                  {loading && (
                    <div className="chart-loading-indicator">
                      <div className="loading-spinner">
                        <div className="spinner"></div>
                        {/* 使用 t() 翻譯 Loading 文字 */}
                        <span>{isPending ? t('priceAnalysis.chart.loading.generating') : t('priceAnalysis.chart.loading.fetching')}</span>
                      </div>
                    </div>
                  )}

                  {/* 圖表 (僅在非 loading 狀態下顯示) */}
                  {!loading && activeChart === 'sd' && chartData && (
                    <Line
                      ref={chartRef}
                      data={chartData}
                      options={lineChartOptions} // <--- 使用 useMemo 優化後的 options
                    />
                  )}
                  {!loading && activeChart === 'ulband' && ulbandData && (
                    // 使用 Memoized 版本
                    <MemoizedULBandChart data={ulbandData} />
                  )}

                  {/* 佔位符 */}
                  {!loading && !chartData && !ulbandData && (
                     // 使用 t() 翻譯佔位符文字
                     <div className="chart-placeholder">{t('priceAnalysis.prompt.enterSymbol')}</div>
                  )}
                </div>
              </div>
            </div>
          </div>


        </div> {/* 結束 content-layout-container */}

        {/* 底部說明區域 */}
        <div className="bottom-description-section">
          <div className="description-tabs-container">
            {/* 標籤導航 */}
            <div className="description-tabs">
              <button 
                className={`description-tab ${activeDescriptionTab === 'overview' ? 'active' : ''}`}
                onClick={() => handleDescriptionTabSwitch('overview')}
              >
                {t('priceAnalysis.description.tabs.overview')}
              </button>
              <button 
                className={`description-tab ${activeDescriptionTab === 'sd' ? 'active' : ''}`}
                onClick={() => handleDescriptionTabSwitch('sd')}
              >
                {t('priceAnalysis.description.tabs.sd')}
              </button>
              <button 
                className={`description-tab ${activeDescriptionTab === 'ulband' ? 'active' : ''}`}
                onClick={() => handleDescriptionTabSwitch('ulband')}
              >
                {t('priceAnalysis.description.tabs.ulband')}
              </button>
              <button 
                className={`description-tab ${activeDescriptionTab === 'tips' ? 'active' : ''}`}
                onClick={() => handleDescriptionTabSwitch('tips')}
              >
                {t('priceAnalysis.description.tabs.tips')}
              </button>
            </div>
            
            {/* 標籤內容 */}
            <div className="description-tab-content">
              {activeDescriptionTab === 'overview' && (
                <div className="tab-content-overview">
                  <h3>{t('priceAnalysis.description.overview.title')}</h3>
                  <p>{t('priceAnalysis.description.overview.content')}</p>
                  <div className="overview-links">
                    <a href="https://sentimentinsideout.com/articles/1.%E7%94%A8%E6%A8%82%E6%B4%BB%E4%BA%94%E7%B7%9A%E8%AD%9C%E5%88%86%E6%9E%90%E5%83%B9%E6%A0%BC%E8%B6%A8%E5%8B%A2%E8%88%87%E6%83%85%E7%B7%92" target="_blank" rel="noopener noreferrer">
                      {t('priceAnalysis.description.overview.readMore')}
                    </a>
                  </div>
                </div>
              )}
              
              {activeDescriptionTab === 'sd' && (
                <div className="tab-content-sd">
                  <h3>{t('priceAnalysis.description.sd.title')}</h3>
                  <ul className="description-list">
                    <li>{t('priceAnalysis.description.sd.point1')}</li>
                    <li>{t('priceAnalysis.description.sd.point2')}</li>
                    <li>{t('priceAnalysis.description.sd.point3')}</li>
                    <li>{t('priceAnalysis.description.sd.point4')}</li>
                  </ul>
                </div>
              )}
              
              {activeDescriptionTab === 'ulband' && (
                <div className="tab-content-ulband">
                  <h3>{t('priceAnalysis.description.ulband.title')}</h3>
                  <ul className="description-list">
                    <li>{t('priceAnalysis.description.ulband.point1')}</li>
                    <li>{t('priceAnalysis.description.ulband.point2')}</li>
                    <li>{t('priceAnalysis.description.ulband.point3')}</li>
                  </ul>
                </div>
              )}
              
              {activeDescriptionTab === 'tips' && (
                <div className="tab-content-tips">
                  <h3>{t('priceAnalysis.description.tips.title')}</h3>
                  <ul className="description-list">
                    <li>{t('priceAnalysis.description.tips.point1')}</li>
                    <li>{t('priceAnalysis.description.tips.point2')}</li>
                    <li>{t('priceAnalysis.description.tips.point3')}</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
