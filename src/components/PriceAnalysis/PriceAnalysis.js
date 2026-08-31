import React, { useState, useEffect, useCallback, useRef, useMemo, useTransition, lazy, Suspense } from 'react';
import './PriceAnalysis.css';
import PageContainer from '../PageContainer/PageContainer';
import { Analytics } from '../../utils/analytics';
import { handleApiError } from '../../utils/errorHandler';
import { useMediaQuery } from 'react-responsive';
import { formatPrice } from '../../utils/priceUtils';
import { Toast } from '../Watchlist/components/Toast';
import { useToastManager } from '../Watchlist/hooks/useToastManager';
import { useSearchParams, useLocation } from 'react-router-dom'; // 引入 useLocation
import { useAdContext } from '../../components/Common/InterstitialAdModal/AdContext'; // 導入 useAdContext
import { useDebouncedCallback } from 'use-debounce'; // <--- 引入 useDebouncedCallback
import { useTranslation } from 'react-i18next'; // 1. Import useTranslation
import '../Common/global-styles.css';
import { useDeferredFeature } from '../../hooks/useDeferredFeature';
import { ensureChartZoomRegistered } from '../../utils/chartZoomRegistry';

import enhancedApiClient from '../../utils/enhancedApiClient';
import { useAuth } from '../Auth/useAuth'; // 新增：引入 useAuth
import { useDialog } from '../Common/Dialog/useDialog'; // 新增：引入 useDialog
import { isStockAllowed, getFreeStockList } from '../../utils/freeStockListUtils'; // 導入免費股票清單檢查函數
import FreeStockList from './FreeStockList'; // 新增：引入免費股票清單組件
import watchlistService from '../Watchlist/services/watchlistService'; // 新增：引入 watchlist service

const DeferredBacktestDatePicker = lazy(() => import('./DeferredBacktestDatePicker'));
const PriceAnalysisChartWorkspace = lazy(() => import('./PriceAnalysisChartWorkspace'));
const PriceAnalysisDescription = lazy(() => import('./PriceAnalysisDescription'));
const PriceAnalysisTour = lazy(() => import('./PriceAnalysisTour'));

const TOUR_STORAGE_KEY = 'sio.priceAnalysis.tourSeen.v2';

// 期長預設值。下拉、初始化、實際送出的年數三個地方都吃這一份，避免各寫一次而走鐘。
const PERIOD_YEARS = { short: '0.5', medium: '1.5', long: '3.5' };
const YEARS_TO_PERIOD = { '0.5': 'short', '1.5': 'medium', '3.5': 'long' };

function hasSeenTour() {
  try {
    return window.localStorage.getItem(TOUR_STORAGE_KEY) === '1';
  } catch (error) {
    // 讀不到就當作看過，寧可少跑導覽也不要每次都跳
    return true;
  }
}

ensureChartZoomRegistered();

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

// 新增輔助函數：從翻譯鍵提取後綴
const getSentimentSuffix = (key) => {
  if (!key) return 'neutral'; // 如果沒有 key，返回 'neutral'
  const parts = key.split('.');
  return parts[parts.length - 1]; // 返回最後一部分，例如 'pessimism'
};

// 樂活通道位置：用週線序列的最後一筆比對通道上下緣，與通道圖看到的畫面一致。
// 沒有通道資料（例如未請求 ULBand）時回傳 null，呼叫端要能接受。
export const getChannelState = (weeklyPrices, upperBand, lowerBand) => {
  if (!Array.isArray(weeklyPrices) || !Array.isArray(upperBand) || !Array.isArray(lowerBand)) {
    return null;
  }
  const lastIndex = Math.min(weeklyPrices.length, upperBand.length, lowerBand.length) - 1;
  if (lastIndex < 0) return null;

  // 先擋掉 null/undefined/空字串：Number(null) 是 0，會讓缺值的通道上緣
  // 變成「價格突破 0」而誤報 above。
  const toNumber = (value) => (
    value === null || value === undefined || value === '' ? NaN : Number(value)
  );
  const price = toNumber(weeklyPrices[lastIndex]);
  const upper = toNumber(upperBand[lastIndex]);
  const lower = toNumber(lowerBand[lastIndex]);
  if (!Number.isFinite(price) || !Number.isFinite(upper) || !Number.isFinite(lower)) {
    return null;
  }

  if (price > upper) return 'above';
  if (price < lower) return 'below';
  return 'inside';
};

// 五線譜位階與樂活通道同向到達極端時，才算「兩者同步」。
// 2026-08 回測：只有恐懼側這個組合在歷史上有統計意義，貪婪側沒有，
// 所以兩側共用同一個判定、但文案分開（見 priceAnalysis.combined.*）。
export const getCombinedStateKey = (sentimentKey, channelState) => {
  const level = getSentimentSuffix(sentimentKey);
  if (level === 'extremeFear') {
    return channelState === 'below' ? 'fearConfirmed' : 'fearOnly';
  }
  if (level === 'extremeGreed') {
    return channelState === 'above' ? 'greedConfirmed' : 'greedOnly';
  }
  return null;
};

const PRICE_CHART_LABEL_KEYS = [
  'priceAnalysis.chart.label.price',
  'priceAnalysis.chart.label.trendLine',
  'priceAnalysis.chart.label.minus2sd',
  'priceAnalysis.chart.label.minus1sd',
  'priceAnalysis.chart.label.plus1sd',
  'priceAnalysis.chart.label.plus2sd'
];

const renderDeferredDatePickerFallback = () => (
  <div className="price-analysis-date-picker-skeleton" aria-hidden="true" />
);

const renderChartWorkspaceFallback = () => (
  <div className="chart-card">
    <div className="chart-container">
      <div className="chart-header chart-header--skeleton" aria-hidden="true">
        <div className="analysis-result analysis-result--skeleton">
          <div className="analysis-item">
            <span className="analysis-label" />
            <span className="analysis-value-skeleton" />
          </div>
          <div className="analysis-item">
            <span className="analysis-label" />
            <span className="analysis-value-skeleton" />
          </div>
          <div className="analysis-item">
            <span className="analysis-label" />
            <span className="analysis-value-skeleton analysis-value-skeleton--wide" />
          </div>
        </div>
      </div>
      <div className="chart-content">
        <div className="chart-tabs-row chart-tabs-row--skeleton" aria-hidden="true">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <div className="chart-tabs">
              <button className="chart-tab" type="button" disabled>SD</button>
              <button className="chart-tab" type="button" disabled>UL</button>
            </div>
          </div>
        </div>
        <div className="chart-loading-indicator chart-loading-indicator--deferred">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>Preparing chart…</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const renderDescriptionFallback = () => (
  <div className="bottom-description-section" aria-hidden="true">
    <div className="description-card">
      <div className="analysis-value-skeleton analysis-value-skeleton--wide" />
      <div className="analysis-value-skeleton analysis-value-skeleton--wide" />
    </div>
  </div>
);

function isChartAttached(chart) {
  const canvas = chart?.canvas;
  const ownerDocument = canvas?.ownerDocument;

  return Boolean(canvas && ownerDocument?.contains(canvas));
}

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
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
  const { showToast, toast, hideToast } = useToastManager();
  const { requestAdDisplay } = useAdContext(); // 從 Context 獲取函數
  const { isAuthenticated, user, checkAuthStatus } = useAuth(); // 新增：獲取認證狀態和用戶資訊
  const { openDialog } = useDialog(); // 新增：獲取對話框功能

  // 從 URL 參數或預設值初始化狀態
  // 這裡保留所有原本在 App.js 中標準差分析需要的狀態
  const [, setStockCode] = useState(''); // 初始值改為空，由 useEffect 決定
  const [displayStockCode, setDisplayStockCode] = useState(''); // 新增：用於輸入框即時顯示
  const [years, setYears] = useState('');       // 初始值改為空
  const [backTestDate, setBackTestDate] = useState(''); // 初始值改為空
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [displayedStockCode, setDisplayedStockCode] = useState('');
  // 通道圖要跟隨的 x 範圍。一律「讀主圖當下的 scale」再存起來，
  // 不自己另外算，這樣兩張圖不會各自漂移。
  const [showTour, setShowTour] = useState(false);
  const [bandXRange, setBandXRange] = useState(null);

  // 主圖縮放/平移完成後，把它「實際的」軸範圍抄給通道圖。
  const syncBandRange = useCallback(() => {
    const scale = chartRef.current?.scales?.x;
    if (scale && Number.isFinite(scale.min) && Number.isFinite(scale.max)) {
      setBandXRange({ min: scale.min, max: scale.max });
    }
  }, []);
  const [ulbandData, setUlbandData] = useState(null);
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
  // 上一次「送出分析時」的期長 + 回測日期組合。記在送出的當下而不是結果回來的
  // 當下，載入中改設定才不會被吃掉。
  const lastRunSignatureRef = useRef('long|');

  // 市場代號 → 顯示徽章（旗幟 + 短碼）
  const marketBadgeFor = useCallback((market) => {
    const key = (market || '').toUpperCase();
    switch (key) {
      case 'TW': return { flag: '🇹🇼', label: 'TW' };
      case 'HK': return { flag: '🇭🇰', label: 'HK' };
      case 'US': return { flag: '🇺🇸', label: 'US' };
      case 'JP': return { flag: '🇯🇵', label: 'JP' };
      case 'CN': return { flag: '🇨🇳', label: 'CN' };
      case 'KR': return { flag: '🇰🇷', label: 'KR' };
      default: return key ? { flag: '', label: key } : null;
    }
  }, []);

  // Autocomplete 下拉狀態：使用者輸入中文公司名稱時提供建議
  const [stockSuggestions, setStockSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);
  const stockInputWrapperRef = useRef(null);
  const suggestionItemRefs = useRef([]);
  const [isPending, startTransition] = useTransition(); // 添加 useTransition
  const chartRef = useRef(null); // 新增：圖表 ref 用於程式化控制 tooltip
  const ulbandChartRef = useRef(null); // ULBand 圖表 ref
  const chartCardRef = useRef(null); // 圖表卡片 ref 用於滾動
  const tooltipTimerRef = useRef(null);
  const scrollTimerRef = useRef(null);
  const analyticsTimerRef = useRef(null);

  const analysisSentimentText = useMemo(() => {
    if (!analysisResult.sentimentKey) return null;
    return t(analysisResult.sentimentKey);
  }, [analysisResult.sentimentKey, t]);

  const localizedChartData = useMemo(() => {
    if (!chartData) return null;

    return {
      ...chartData,
      datasets: chartData.datasets.map((dataset, index) => ({
        ...dataset,
        label: t(dataset.labelKey || PRICE_CHART_LABEL_KEYS[index] || dataset.label)
      }))
    };
  }, [chartData, t]);
  const xAxisMax = useMemo(() => {
    if (!chartData?.labels || chartData.labels.length === 0) {
      return undefined;
    }

    const lastDate = new Date(chartData.labels[chartData.labels.length - 1]);
    const firstDate = new Date(chartData.labels[0]);
    const timeRange = lastDate - firstDate;
    const spaceRatio = isMobile ? 0.15 : 0.1;

    return new Date(lastDate.getTime() + timeRange * spaceRatio);
  }, [chartData?.labels, isMobile]);

  const chartAnnotations = useMemo(() => {
    const annotations = {};

    if (!chartData?.labels || chartData.labels.length === 0 || !chartData.datasets) {
      return annotations;
    }

    const lastIndex = chartData.labels.length - 1;
    const lastDate = chartData.labels[lastIndex];

    chartData.datasets.forEach((dataset, index) => {
      if (!dataset.data || dataset.data.length === 0) {
        return;
      }

      const lastValue = dataset.data[lastIndex];

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
          size: 12,
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
        xAdjust: index === 0 ? 2 : 35,
        yAdjust: 0
      };
    });

    return annotations;
  }, [chartData?.datasets, chartData?.labels, xAxisMax]);
  const yTickLabelFormatter = useCallback((value) => {
    if (!chartData?.datasets || !chartData?.labels?.length) {
      return value;
    }

    const lastIndex = chartData.labels.length - 1;
    const dataValues = chartData.datasets
      .map((dataset) => dataset.data?.[lastIndex])
      .filter((v) => v !== undefined && v !== null)
      .sort((a, b) => a - b);

    if (dataValues.length === 0) {
      return value;
    }

    const minDataValue = dataValues[0];
    const maxDataValue = dataValues[dataValues.length - 1];

    if (value > minDataValue && value < maxDataValue) {
      return '';
    }

    return formatPrice(value);
  }, [chartData?.datasets, chartData?.labels]);
  const tooltipLabelFormatter = useCallback((context) => `${context.dataset.label || ''}: ${formatPrice(context.parsed.y)}`, []);
  const tooltipLabelColorFormatter = useCallback((context) => ({
    backgroundColor: context.dataset.borderColor,
    borderColor: context.dataset.borderColor,
    borderWidth: 0
  }), []);
  const tooltipYAlign = useCallback((context) => {
    if (!context.tooltip || !context.tooltip.dataPoints || context.tooltip.dataPoints.length === 0) {
      return 'top';
    }

    const pricePoint = context.tooltip.dataPoints.find(point => point.datasetIndex === 0);
    if (!pricePoint || !pricePoint.element) return 'top';

    const chartArea = context.chart.chartArea;
    if (!chartArea) return 'top';

    const chartHeight = chartArea.bottom - chartArea.top;
    const chartMiddle = chartArea.top + (chartHeight / 2);
    const priceY = pricePoint.element.y;

    return priceY < chartMiddle ? 'top' : 'bottom';
  }, []);
  const lineChartZoomOptions = useMemo(() => ({
    pan: {
      enabled: !isMobile,
      mode: 'x',
      modifierKey: undefined,
      onPanStart: () => true,
      onPanComplete: () => syncBandRange()
    },
    zoom: {
      wheel: {
        enabled: !isMobile,
        speed: 0.1
      },
      pinch: {
        enabled: isMobile
      },
      mode: 'x',
      onZoomStart: ({ event }) => {
        if (isMobile && event && event.touches && event.touches.length === 2) {
          event.preventDefault();
          return true;
        }
        return true;
      },
      onZoomComplete: () => syncBandRange()
    },
    limits: {
      x: {
        min: 'original',
        max: 'original'
      }
    }
  }), [isMobile, syncBandRange]);

  const hasAnalysisContent = Boolean(loading || chartData || ulbandData);
  const shouldLoadChartWorkspace = useDeferredFeature({
    timeoutMs: 1200,
    useIdleCallback: true,
    triggerOnInteraction: true
  });
  const shouldRenderChartWorkspace = shouldLoadChartWorkspace || hasAnalysisContent;
  const shouldLoadDescriptionTabs = useDeferredFeature({
    timeoutMs: 1500,
    useIdleCallback: true,
    triggerOnInteraction: true
  });
  const shouldPrefetchWatchlist = useDeferredFeature({
    timeoutMs: 4000,
    useIdleCallback: true,
    triggerOnInteraction: false
  });


  // 新增：熱門搜尋狀態
  const [hotSearches, setHotSearches] = useState([]);

  // 新增：快速選擇 Tab 狀態
  const [activeQuickSelectTab, setActiveQuickSelectTab] = useState('freeStocks'); // 'freeStocks' 或 'watchlist'
  // 用戶一旦手動切過 tab，就不再自動把免費用戶導回免費清單
  const userManuallyChangedTabRef = useRef(false);
  const [isUserInitiated, setIsUserInitiated] = useState(false); // 追蹤是否為用戶主動操作

  // 新增：Watchlist 狀態（改為保留分類結構）
  const [watchlistCategories, setWatchlistCategories] = useState([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);
  const [hasLoadedWatchlist, setHasLoadedWatchlist] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState({}); // 新增：記錄哪些分類被收合
  const clearPostAnalysisTimers = useCallback(() => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }

    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }

    if (analyticsTimerRef.current) {
      clearTimeout(analyticsTimerRef.current);
      analyticsTimerRef.current = null;
    }
  }, []);

  const resetAnalysisOutputs = useCallback(() => {
    startTransition(() => {
      setChartData(null);
      setUlbandData(null);
      setAnalysisResult({ price: null, sentimentKey: null, sentimentValue: null, channelState: null });
      setDisplayedStockCode('');
      setBandXRange(null); // 換標的時不要沿用上一檔的範圍
    });
  }, [startTransition]);

  useEffect(() => {
    clearPostAnalysisTimers();

    const hasRenderedAnalysis = !loading && (chartData || ulbandData);
    if (!hasRenderedAnalysis) {
      return undefined;
    }

    if (chartData && chartRef.current) {
      tooltipTimerRef.current = window.setTimeout(() => {
        const chart = chartRef.current;
        if (!isChartAttached(chart) || !chart.data?.labels?.length) {
          return;
        }

        try {
          const lastIndex = chart.data.labels.length - 1;

          if (isMobile && chart.scales?.x && typeof chart.zoomScale === 'function') {
            const fullMin = chart.scales.x.min;
            const fullMax = chart.scales.x.max;
            if (Number.isFinite(fullMin) && Number.isFinite(fullMax) && fullMax > fullMin) {
              // 手機螢幕窄，整段期間擠在一起看不出東西，預設收掉最舊的 30%。
              // 用 zoomScale 保留 'original' 為完整範圍，使用者仍可縮回去。
              const zoomedMin = fullMax - (fullMax - fullMin) * 0.7;
              chart.zoomScale('x', { min: zoomedMin, max: fullMax }, 'default');
            }
          }
          syncBandRange();

          const activeElements = chart.data.datasets.map((dataset, datasetIndex) => ({
            datasetIndex,
            index: lastIndex
          }));

          chart.setActiveElements(activeElements);

          const priceDatasetMeta = chart.getDatasetMeta(0);
          if (priceDatasetMeta?.data?.[lastIndex]) {
            const priceElement = priceDatasetMeta.data[lastIndex];
            chart.tooltip.setActiveElements(activeElements, {
              x: priceElement.x,
              y: priceElement.y
            });
          } else {
            chart.tooltip.setActiveElements(activeElements);
          }

          chart.update('none');
        } catch (error) {
          console.warn('Failed to show tooltip:', error);
        }
      }, 220);
    }

    if (isMobile && isUserInitiated && chartCardRef.current) {
      scrollTimerRef.current = window.setTimeout(() => {
        if (chartCardRef.current) {
          const rect = chartCardRef.current.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          const bottomPadding = 100;
          const scrollTarget = window.pageYOffset + rect.bottom - windowHeight + bottomPadding;
          window.scrollTo({
            top: scrollTarget,
            behavior: 'smooth'
          });
        }
        setIsUserInitiated(false);
      }, 120);
    }

    return clearPostAnalysisTimers;
  }, [chartData, clearPostAnalysisTimers, isMobile, isUserInitiated, loading, ulbandData]);

  useEffect(() => clearPostAnalysisTimers, [clearPostAnalysisTimers]);

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

  // 取得股票名稱搜尋建議（debounced）
  // 不顯示「搜尋中」狀態：避免讓使用者以為一定要等下拉才能繼續操作
  // 舊結果在新結果回來前保留，避免閃爍與「下拉消失再出現」的視覺干擾
  const fetchStockSuggestions = useCallback(async (rawValue) => {
    const value = (rawValue || '').trim();
    if (!value) {
      setStockSuggestions([]);
      setHighlightedSuggestion(-1);
      return;
    }
    try {
      // 走乾淨的公開搜尋端點（不耦合 watchlist、不需登入、無 getUserWatchlist hydration）
      const response = await enhancedApiClient.get('/api/stock-search', {
        params: { keyword: value }
      });
      const results = response?.data?.data?.results ?? [];
      const limited = Array.isArray(results) ? results.slice(0, 10) : [];
      setStockSuggestions(limited);
      setHighlightedSuggestion(limited.length > 0 ? 0 : -1);
    } catch (err) {
      // 失敗時保留舊結果，不主動清空
    }
  }, []);

  const debouncedFetchSuggestions = useDebouncedCallback(fetchStockSuggestions, 250);

  // 處理股票代碼的全形/半形轉換 (現在調用 debounced setter)
  const handleStockCodeChange = (e) => {
    const value = e.target.value;
    const hasNonAscii = /[^\x00-\x7F]/.test(value);

    // 含中文：保留原樣顯示，不做大寫轉換
    if (hasNonAscii) {
      setDisplayStockCode(value);
      debouncedSetStockCode(value);
    } else {
      // 純 ASCII：維持原本的全形 → 半形 + 大寫轉換
      setDisplayStockCode(value.toUpperCase());
      const convertedValue = value.replace(/[０-９Ａ-Ｚａ-ｚ]/g, (char) =>
        String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
      );
      debouncedSetStockCode(convertedValue.toUpperCase());
    }

    // 統一觸發條件：去除空白後 ≥ 2 字元即顯示建議（中文、數字、英文一致行為）
    const trimmed = value.trim();
    if (trimmed.length >= 2) {
      setShowSuggestions(true);
      debouncedFetchSuggestions(trimmed);
    } else {
      setShowSuggestions(false);
      setStockSuggestions([]);
    }
  };

  // runAnalysisForStock 宣告在後面，這裡用 ref 規避 TDZ；render 時會同步最新版本
  const runAnalysisForStockRef = useRef(null);

  // 統一 stockAccess 升級對話框的 props：附帶「先查免費標的」與「直接查某檔免費標的」兩個引導
  const buildStockAccessDialogProps = useCallback((stockCode) => ({
    feature: 'stockAccess',
    stockCode,
    allowedStocks: getFreeStockList(),
    upgradeUrl: `/${i18n.language}/subscription-plans`,
    onBrowseFreeStocks: () => {
      userManuallyChangedTabRef.current = true;
      setActiveQuickSelectTab('freeStocks');
    },
    onPickFreeStock: (ticker) => {
      runAnalysisForStockRef.current?.(
        ticker,
        'upgradeDialogFreeChip',
        t('priceAnalysis.toast.invalidYearsFreeStock')
      );
    }
  }), [i18n.language, t]);

  // 免費用戶（且尚未手動切過 tab）預設停在「免費清單」tab，讓新用戶第一眼看到可查的標的
  useEffect(() => {
    if (!user) return;
    if (userManuallyChangedTabRef.current) return;
    const isTemporaryFreeMode = process.env.REACT_APP_TEMPORARY_FREE_MODE === 'true';
    const isFreeUser = !isTemporaryFreeMode && (user?.plan || 'free') !== 'pro';
    if (isFreeUser) {
      setActiveQuickSelectTab('freeStocks');
    }
  }, [user]);

  // 點選建議：填入代號後立即啟動分析，與熱門搜尋 / 自選股 / 免費清單的點選行為一致
  const handleSuggestionSelect = useCallback((suggestion) => {
    if (!suggestion?.symbol) return;
    const symbol = String(suggestion.symbol).toUpperCase();
    setDisplayStockCode(symbol);
    setStockCode(symbol);
    debouncedSetStockCode.cancel?.();
    debouncedFetchSuggestions.cancel?.();
    setStockSuggestions([]);
    setShowSuggestions(false);
    setHighlightedSuggestion(-1);

    // 與 handleSubmit 對齊：未登入彈登入對話框
    if (!isAuthenticated) {
      openDialog('auth', {
        returnPath: location.pathname,
        message: t('protectedRoute.loginRequired')
      });
      return;
    }

    // 與 handleSubmit 對齊：權限不足彈升級對話框
    const isTemporaryFreeMode = process.env.REACT_APP_TEMPORARY_FREE_MODE === 'true';
    const userPlan = user?.plan || 'free';
    const effectiveUserPlan = isTemporaryFreeMode ? 'pro' : userPlan;
    if (!isStockAllowed(symbol, effectiveUserPlan)) {
      openDialog('featureUpgrade', buildStockAccessDialogProps(symbol));
      return;
    }

    runAnalysisForStockRef.current?.(symbol, 'autocompleteSelect');
  }, [
    debouncedFetchSuggestions,
    debouncedSetStockCode,
    isAuthenticated,
    openDialog,
    location.pathname,
    t,
    user,
    buildStockAccessDialogProps
  ]);

  // 鍵盤導覽：方向鍵移動高亮、Enter 選取、Esc 關閉
  const handleStockInputKeyDown = useCallback((e) => {
    // IME composing 中的 Enter 應交給輸入法確認文字，不視為選建議
    if (e.nativeEvent?.isComposing || e.keyCode === 229) {
      return;
    }

    if (!showSuggestions || stockSuggestions.length === 0) {
      if (e.key === 'Escape') setShowSuggestions(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedSuggestion((prev) => (prev + 1) % stockSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedSuggestion((prev) =>
        prev <= 0 ? stockSuggestions.length - 1 : prev - 1
      );
    } else if (e.key === 'Enter') {
      if (highlightedSuggestion >= 0 && highlightedSuggestion < stockSuggestions.length) {
        // 攔截 Enter 避免在選建議時直接送出 form
        e.preventDefault();
        handleSuggestionSelect(stockSuggestions[highlightedSuggestion]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
    }
  }, [highlightedSuggestion, showSuggestions, stockSuggestions, handleSuggestionSelect]);

  // 高亮項變更時自動捲入視窗
  useEffect(() => {
    if (highlightedSuggestion < 0) return;
    const node = suggestionItemRefs.current[highlightedSuggestion];
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedSuggestion]);

  // 點擊輸入框外部時關閉建議下拉
  useEffect(() => {
    if (!showSuggestions) return undefined;
    const handleClickOutside = (event) => {
      if (stockInputWrapperRef.current && !stockInputWrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);



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

  // 期長下拉：短/中/長之外多一個「自訂」，選了才在旁邊長出年數輸入框。
  // 自訂的年數要按 Enter 才送出（邊打邊送會每個字打一次 API），其餘選項即時重算。
  const handlePeriodSelectChange = (e) => {
    const value = e.target.value;
    if (value === 'custom') {
      debouncedSetYears.cancel?.();
      // 預填目前期長的年數，並同步簽章：切到自訂的當下窗口沒變，
      // 不該白打一次 API，等使用者改完年數按 Enter 再送。
      setYears(PERIOD_YEARS[analysisPeriod]);
      setIsAdvancedQuery(true);
      lastRunSignatureRef.current = `custom|${backTestDate}`;
      return;
    }
    setIsAdvancedQuery(false);
    setAnalysisPeriod(value);
  };

  // 資料抓取函式
  const fetchStockData = useCallback(async (stock, yrs, testDate, isManualSearch = false) => {
    // setLoading(true) 和清除訊息已移至 handleSubmit

    try {
      const params = { stockCode: stock, years: yrs, backTestDate: testDate };
      if (isManualSearch) { // Add source if it's a manual search
        params.source = 'manual_price_analysis';
      }

      const response = await enhancedApiClient.get('/api/integrated-analysis', {
        params: params,
        timeout: 30000
      });

      const { data } = response.data;
      const { dates, prices, sdAnalysis, weeklyDates, weeklyPrices, upperBand, lowerBand, ma20 } = data;

      // 使用 startTransition 包裹耗時的狀態更新
      startTransition(() => {
        setChartData({
          labels: dates,
          datasets: [
            // 保留翻譯 key，讓切換語言時可即時重繪圖表文字
            { labelKey: PRICE_CHART_LABEL_KEYS[0], label: PRICE_CHART_LABEL_KEYS[0], data: prices, borderColor: '#000000', borderWidth: 2, fill: false, pointRadius: 0 }, // 價格線顏色維持黑色
            { labelKey: PRICE_CHART_LABEL_KEYS[1], label: PRICE_CHART_LABEL_KEYS[1], data: sdAnalysis.trendLine, borderColor: '#708090', borderWidth: 2, fill: false, pointRadius: 0 }, // Neutral
            { labelKey: PRICE_CHART_LABEL_KEYS[2], label: PRICE_CHART_LABEL_KEYS[2], data: sdAnalysis.tl_minus_2sd, borderColor: '#0000FF', borderWidth: 2, fill: false, pointRadius: 0 }, // extremePessimism
            { labelKey: PRICE_CHART_LABEL_KEYS[3], label: PRICE_CHART_LABEL_KEYS[3], data: sdAnalysis.tl_minus_sd, borderColor: '#5B9BD5', borderWidth: 2, fill: false, pointRadius: 0 }, // pessimism
            { labelKey: PRICE_CHART_LABEL_KEYS[4], label: PRICE_CHART_LABEL_KEYS[4], data: sdAnalysis.tl_plus_sd, borderColor: '#F0B8CE', borderWidth: 2, fill: false, pointRadius: 0 }, // optimism
            { labelKey: PRICE_CHART_LABEL_KEYS[5], label: PRICE_CHART_LABEL_KEYS[5], data: sdAnalysis.tl_plus_2sd, borderColor: '#D24A93', borderWidth: 2, fill: false, pointRadius: 0 }  // extremeOptimism
          ],
          timeUnit: getTimeUnit(dates)
        });

        setUlbandData({ dates: weeklyDates, prices: weeklyPrices, upperBand, lowerBand, ma20 });

        // 計算情緒分析
        if (prices && prices.length > 0 && sdAnalysis) {
          const lastPrice = prices[prices.length - 1];
          const { tl_plus_2sd, tl_plus_sd, tl_minus_sd, tl_minus_2sd } = sdAnalysis;
          const lastTlPlus2Sd = tl_plus_2sd[tl_plus_2sd.length - 1];
          const lastTlMinus2Sd = tl_minus_2sd[tl_minus_2sd.length - 1];
          const lastTlPlusSd = tl_plus_sd[tl_plus_sd.length - 1];
          const lastTlMinusSd = tl_minus_sd[tl_minus_sd.length - 1];

          // 決定 sentimentKey
          let sentimentKey = 'priceAnalysis.sentiment.neutral'; // Default key
          if (lastPrice >= lastTlPlus2Sd) sentimentKey = 'priceAnalysis.sentiment.extremeGreed';
          else if (lastPrice > lastTlPlusSd) sentimentKey = 'priceAnalysis.sentiment.greed';
          else if (lastPrice <= lastTlMinus2Sd) sentimentKey = 'priceAnalysis.sentiment.extremeFear';
          else if (lastPrice < lastTlMinusSd) sentimentKey = 'priceAnalysis.sentiment.fear';

          // 同時設定 key 和翻譯後的 value
          setAnalysisResult({
            price: formatPrice(lastPrice),
            sentimentKey: sentimentKey,
            sentimentValue: t(sentimentKey), // 保留欄位以兼容舊資料結構
            channelState: getChannelState(weeklyPrices, upperBand, lowerBand)
          });
        } else {
          // 清空時也清空 key 和 value
          setAnalysisResult({ price: null, sentimentKey: null, sentimentValue: null, channelState: null });
        }
      }); // end startTransition

      // 這個更新通常很快，可以在 transition 外部
      setDisplayedStockCode(stock);

    } catch (error) {
      // ✅ 新增：403 錯誤攔截 (後端 SSOT 判定無權限)
      if (error.response?.status === 403) {
        console.warn('PriceAnalysis: 403 Forbidden detected, refreshing auth status and showing upgrade dialog.');

        // 1. 強制刷新前端用戶狀態 (修正 stale cache)
        if (checkAuthStatus) {
          checkAuthStatus().catch(err => {
            console.error('Failed to refresh auth status:', err);
          });
        }

        // 2. 顯示升級對話框 (取代原本的錯誤 Toast)
        openDialog('featureUpgrade', buildStockAccessDialogProps(stock));

      // 3. 清除 Loading 狀態並退出，不執行 handleApiError
      setLoading(false);
      return;
      }

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
  }, [checkAuthStatus, openDialog, showToast, startTransition, t, buildStockAccessDialogProps]); // 確保 t 在依賴項中

  const resolveAnalysisYears = useCallback((invalidYearsMessage) => {
    if (isAdvancedQuery) {
      const convertedYears = years
        .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
        .replace(/[．。]/g, '.');
      const parsedYears = parseFloat(convertedYears);

      if (!isNaN(parsedYears) && parsedYears > 0) {
        return parsedYears;
      }

      if (invalidYearsMessage) {
        showToast(invalidYearsMessage, 'warning');
      }
      return 3.5;
    }

    return parseFloat(PERIOD_YEARS[analysisPeriod] ?? PERIOD_YEARS.long);
  }, [analysisPeriod, isAdvancedQuery, showToast, years]);

  const queueAnalysisEvent = useCallback((payload) => {
    if (analyticsTimerRef.current) {
      clearTimeout(analyticsTimerRef.current);
    }

    analyticsTimerRef.current = window.setTimeout(() => {
      Analytics.stockAnalysis.search(payload);
      analyticsTimerRef.current = null;
    }, 0);
  }, []);

  const beginAnalysisRequest = useCallback(() => {
    clearPostAnalysisTimers();
    setLoading(true);
    resetAnalysisOutputs();
    requestAdDisplay('priceAnalysis', 3);
  }, [clearPostAnalysisTimers, requestAdDisplay, resetAnalysisOutputs]);

  const runAnalysisForStock = useCallback((nextStockCode, source, invalidYearsMessage) => {
    const upperClickedCode = nextStockCode.toUpperCase();
    const numYearsToFetch = resolveAnalysisYears(invalidYearsMessage);
    // 回測日期現在是獨立設定（收合面板裡自成一欄），不再綁在「進階模式」下，
    // 否則只設日期、沒改期長的使用者會發現日期被默默丟掉。
    const dateToFetch = backTestDate;

    lastRunSignatureRef.current = `${isAdvancedQuery ? 'custom' : analysisPeriod}|${backTestDate}`;
    setIsUserInitiated(true);
    setDisplayStockCode(upperClickedCode);
    setStockCode(upperClickedCode);
    beginAnalysisRequest();
    queueAnalysisEvent({
      stockCode: upperClickedCode,
      years: numYearsToFetch,
      backTestDate: dateToFetch,
      source
    });
    fetchStockData(upperClickedCode, numYearsToFetch, dateToFetch, true);
  }, [analysisPeriod, backTestDate, beginAnalysisRequest, fetchStockData, isAdvancedQuery, queueAnalysisEvent, resolveAnalysisYears]);

  // 同步最新的 runAnalysisForStock 至 ref，讓較早宣告的 handleSuggestionSelect 可以呼叫
  runAnalysisForStockRef.current = runAnalysisForStock;

  // 期長與回測日期都是單值控制項，改了就直接重算——像 Google Finance 換 1D/5D
  // 一樣，不需要再按一次「開始分析」。自訂年數不在簽章裡：那是逐字輸入，
  // 要按 Enter 才送出。ref 記著上一次送出的組合，所以首次掛載不觸發。
  const analysisSignature = `${isAdvancedQuery ? 'custom' : analysisPeriod}|${backTestDate}`;
  useEffect(() => {
    if (lastRunSignatureRef.current === analysisSignature) {
      return undefined;
    }

    // 還沒有結果時先不動 ref：等第一份結果進來這個 effect 會再跑一次，那時才補送。
    if (!displayedStockCode) {
      return undefined;
    }

    // 與其他觸發路徑一致：未登入就彈登入框，而不是改了設定卻默默沒反應
    if (!isAuthenticated) {
      openDialog('auth', {
        returnPath: location.pathname,
        message: t('protectedRoute.loginRequired')
      });
      return undefined;
    }

    // 連續改設定時只跑最後一次，避免一路打 API
    const timer = window.setTimeout(() => {
      runAnalysisForStockRef.current?.(displayedStockCode, 'settingsChange');
    }, 250);
    return () => window.clearTimeout(timer);
  }, [analysisSignature, displayedStockCode, isAuthenticated, openDialog, location.pathname, t]);


  const fetchWatchlistStocks = useCallback(async () => {
    if (loadingWatchlist || hasLoadedWatchlist) {
      return;
    }

    if (!isAuthenticated || !user) {
      setWatchlistCategories([]);
      setHasLoadedWatchlist(false);
      return;
    }

    const isTemporaryFreeMode = process.env.REACT_APP_TEMPORARY_FREE_MODE === 'true';
    const userPlan = user?.plan || 'free';
    const isPro = isTemporaryFreeMode || userPlan === 'pro';

    if (!isPro) {
      setWatchlistCategories([]);
      setHasLoadedWatchlist(false);
      return;
    }

    setLoadingWatchlist(true);
    try {
      const categories = await watchlistService.getCategoriesLite();

      const validCategories = [];
      if (Array.isArray(categories)) {
        categories.forEach(category => {
          if (category.stocks && Array.isArray(category.stocks) && category.stocks.length > 0) {
            validCategories.push({
              id: category.id,
              name: category.name,
              stocks: category.stocks.map(stock => {
                const stockCode = stock.symbol || stock.stockCode || stock.stockSymbol;
                const stockName = currentLang === 'zh-TW'
                  ? (stock.name || stock.nameEn || stock.stockName)
                  : (stock.nameEn || stock.name || stock.stockName);

                return {
                  stockCode: stockCode,
                  name: (stockName && stockName !== stockCode) ? stockName : ''
                };
              })
            });
          }
        });
      }

      setWatchlistCategories(validCategories);
      setHasLoadedWatchlist(true);
    } catch (error) {
      console.error('Failed to fetch watchlist:', error);
      setWatchlistCategories([]);
    } finally {
      setLoadingWatchlist(false);
    }
  }, [currentLang, hasLoadedWatchlist, isAuthenticated, loadingWatchlist, user]);

  useEffect(() => {
    if (!shouldPrefetchWatchlist) {
      return;
    }

    if (loading || (!chartData && !ulbandData)) {
      return;
    }

    if (!isAuthenticated || !user) {
      return;
    }

    const isTemporaryFreeMode = process.env.REACT_APP_TEMPORARY_FREE_MODE === 'true';
    const userPlan = user?.plan || 'free';
    const isPro = isTemporaryFreeMode || userPlan === 'pro';

    if (!isPro) {
      return;
    }

    fetchWatchlistStocks();
  }, [chartData, fetchWatchlistStocks, isAuthenticated, loading, shouldPrefetchWatchlist, ulbandData, user]);

  // 表單送出
  const handleSubmit = (e) => {
    e.preventDefault();

    // 新增：檢查登入狀態
    if (!isAuthenticated) {
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

    if (!isStockAllowed(displayStockCode, effectiveUserPlan)) {
      // 顯示功能升級對話框
      openDialog('featureUpgrade', buildStockAccessDialogProps(displayStockCode));
      return;
    }

    const stockToFetch = displayStockCode;

    if (isAdvancedQuery) {
      const convertedYears = years
        .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
        .replace(/[．。]/g, '.');
      const numYears = parseFloat(convertedYears);

      if (isNaN(numYears) || numYears <= 0) {
        showToast(t('priceAnalysis.toast.invalidYears'), 'error');
        return;
      }
    }

    runAnalysisForStock(stockToFetch, 'manual_price_analysis');
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
    if (YEARS_TO_PERIOD[fetchYears]) {
      setIsAdvancedQuery(false);
      const initialPeriod = YEARS_TO_PERIOD[fetchYears];
      setAnalysisPeriod(initialPeriod);
      lastRunSignatureRef.current = `${initialPeriod}|${fetchDate}`;
      setYears(fetchYears);
    } else {
      setIsAdvancedQuery(true);
      setYears(fetchYears);
      lastRunSignatureRef.current = `custom|${fetchDate}`;
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
      clearPostAnalysisTimers();
      setLoading(true);
      setDisplayStockCode(fetchStock.toUpperCase());
      resetAnalysisOutputs();
      // 執行初始查詢
      fetchStockData(fetchStock, numYears, fetchDate);
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
      try {
        // 使用增強的 API 客戶端，自動處理認證和重試
        const response = await enhancedApiClient.get('/api/hot-searches', {
          timeout: 15000,
          maxRetries: 2, // 減少重試次數以避免過多請求
          retryDelay: 500 // 較短的重試延遲
        });
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
        }
      }
    };

    fetchHotSearches();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, location.state, isAuthenticated, user, fetchStockData, clearPostAnalysisTimers, resetAnalysisOutputs, showToast, t]); // <--- 修改：新增依賴項

  // 新增：當 watchlist 資料載入完成時，預設全部收合
  useEffect(() => {
    if (watchlistCategories.length > 0) {
      const initialCollapsedState = {};
      watchlistCategories.forEach(category => {
        initialCollapsedState[category.id] = true; // 預設全部收合
      });
      setCollapsedCategories(initialCollapsedState);
    }
  }, [watchlistCategories]);





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
      openDialog('featureUpgrade', buildStockAccessDialogProps(upperClickedCode));
      return;
    }

    runAnalysisForStock(upperClickedCode, 'hotSearch', t('priceAnalysis.toast.invalidYearsHotSearch'));
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
      openDialog('featureUpgrade', buildStockAccessDialogProps(upperClickedCode));
      return;
    }

    runAnalysisForStock(upperClickedCode, 'freeStockList', t('priceAnalysis.toast.invalidYearsFreeStock'));
  };

  // 新增：處理 Watchlist Tab 點擊事件
  const handleWatchlistTabClick = () => {
    userManuallyChangedTabRef.current = true;
    // 檢查登入狀態
    if (!isAuthenticated) {
      openDialog('auth', {
        returnPath: location.pathname,
        message: t('priceAnalysis.watchlistQuickAccess.loginRequired')
      });
      return;
    }

    // 檢查是否為 Pro 用戶
    const isTemporaryFreeMode = process.env.REACT_APP_TEMPORARY_FREE_MODE === 'true';
    const userPlan = user?.plan || 'free';
    const isPro = isTemporaryFreeMode || userPlan === 'pro';

    if (!isPro) {
      openDialog('featureUpgrade', {
        feature: 'watchlist',
        upgradeUrl: `/${i18n.language}/subscription-plans`
      });
      return;
    }

    // Pro 用戶可以切換到 watchlist tab
    setActiveQuickSelectTab('watchlist');

    if (!hasLoadedWatchlist && !loadingWatchlist) {
      fetchWatchlistStocks();
    }
  };

  // 新增：切換 Watchlist 分類收合狀態（帶智能滾動）
  const toggleCategoryCollapse = (categoryId, event) => {
    const isCurrentlyCollapsed = collapsedCategories[categoryId];

    setCollapsedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));

    // 如果是展開操作，滾動到該分類標題
    if (isCurrentlyCollapsed && event?.currentTarget) {
      setTimeout(() => {
        try {
          const element = event.currentTarget;
          if (!element) return;

          const container = element.closest('.quick-select-content');
          if (container && element.offsetTop !== undefined) {
            const elementTop = element.offsetTop;
            container.scrollTo({
              top: elementTop - 8, // 8px 的頂部間距
              behavior: 'smooth'
            });
          }
        } catch (error) {
          console.warn('Smart scroll failed:', error);
        }
      }, 50); // 等待 DOM 更新
    }
  };

  // 新增：處理 Watchlist 股票點擊事件
  const handleWatchlistStockClick = (stockCode) => {
    // 防禦性檢查
    if (!stockCode) {
      console.error('Stock code is undefined');
      return;
    }

    const upperClickedCode = stockCode.toUpperCase();

    runAnalysisForStock(upperClickedCode, 'watchlist');
  };

  // 切換簡易/進階查詢模式

  // 定義用於結構化數據的 JSON-LD
  const priceAnalysisJsonLd = useMemo(() => {
    const appSchema = {
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
    };

    const faqItems = [
      {
        question: t('priceAnalysis.description.overview.title'),
        answer: t('priceAnalysis.description.overview.content')
      },
      {
        question: t('priceAnalysis.description.sd.title'),
        answer: [
          t('priceAnalysis.description.sd.point1'),
          t('priceAnalysis.description.sd.point2'),
          t('priceAnalysis.description.sd.point3'),
          t('priceAnalysis.description.sd.point4')
        ].join(' ')
      },
      {
        question: t('priceAnalysis.description.ulband.title'),
        answer: [
          t('priceAnalysis.description.ulband.point1'),
          t('priceAnalysis.description.ulband.point2'),
          t('priceAnalysis.description.ulband.point3')
        ].join(' ')
      },
      {
        question: t('priceAnalysis.description.tips.title'),
        answer: [
          t('priceAnalysis.description.tips.usage'),
          t('priceAnalysis.description.tips.limitation')
        ].join(' ')
      }
    ];

    return {
      "@context": "https://schema.org",
      "@graph": [
        appSchema,
        {
          "@type": "FAQPage",
          "mainEntity": faqItems.map((item) => ({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": item.answer
            }
          }))
        }
      ]
    };
  }, [t, currentLang]);

  // 優化 Line Chart Options
  const hasBandBelow = Boolean(ulbandData);
  const lineChartOptions = useMemo(() => {
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
            // 通道圖就疊在正下方且共用時間軸，兩個日期軸會重複又吃掉高度，
            // 所以有通道圖時主圖只留刻度線、不畫文字。
            display: !hasBandBelow,
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
            callback: yTickLabelFormatter
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          usePointStyle: true,
          position: 'nearest',
          backgroundColor: '#ffffff',
          titleColor: '#000000',
          bodyColor: '#000000',
          borderColor: '#cccccc',
          borderWidth: 1,
          yAlign: tooltipYAlign,
          xAlign: 'center',
          caretSize: 6,
          caretPadding: 35,
          displayColors: true,
          callbacks: {
            labelColor: tooltipLabelColorFormatter,
            label: tooltipLabelFormatter
          },
          itemSort: (a, b) => b.parsed.y - a.parsed.y
        },

        annotation: {
          annotations: chartAnnotations
        },
        zoom: lineChartZoomOptions
      },
      interaction: { mode: 'index', intersect: false },
      hover: { mode: 'index', intersect: false },
      layout: { padding: { left: 10, right: 15, top: 20, bottom: hasBandBelow ? 4 : 25 } },
      clip: false
    };

    // 動態添加 time unit (如果 chartData 存在)
    if (chartData?.timeUnit) {
      options.scales.x.time.unit = chartData.timeUnit;
    }

    return options;
  }, [chartAnnotations, chartData?.timeUnit, hasBandBelow, isMobile, lineChartZoomOptions, tooltipLabelColorFormatter, tooltipLabelFormatter, tooltipYAlign, xAxisMax, yTickLabelFormatter]);

  // 首次造訪才跑導覽，而且要等預設分析跑出來——第三步要指的就是那張圖。
  useEffect(() => {
    if (showTour || loading || !chartData || hasSeenTour()) {
      return undefined;
    }
    const timer = window.setTimeout(() => setShowTour(true), 900);
    return () => window.clearTimeout(timer);
  }, [chartData, loading, showTour]);

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
        <div className="content-layout-container">
          <div className="dashboard">

            {/* 左側清單：窄欄、無外框、整欄延伸 */}
            <aside className="pa-sidenav">
              <div className="quick-select-section">
                {/* Tab 導航 */}
                <div className="quick-select-tabs">
                  <button
                    className={`quick-select-tab ${activeQuickSelectTab === 'freeStocks' ? 'active' : ''}`}
                    onClick={() => { userManuallyChangedTabRef.current = true; setActiveQuickSelectTab('freeStocks'); }}
                  >
                    {t('priceAnalysis.quickSelect.tabs.freeStocks')}
                  </button>
                  <button
                    className={`quick-select-tab watchlist-tab ${activeQuickSelectTab === 'watchlist' ? 'active' : ''}`}
                    onClick={handleWatchlistTabClick}
                  >
                    {t('priceAnalysis.quickSelect.tabs.watchlist')}
                  </button>
                </div>

                {/* Tab 內容 */}
                <div className="quick-select-content">

                  {activeQuickSelectTab === 'freeStocks' && (
                    <div className="free-stocks-tab-content">
                      <FreeStockList
                        onStockSelect={handleFreeStockClick}
                        defaultExpandedRegionKey={i18n.language?.startsWith('zh') ? 'asiaPacific' : 'americas'}
                        className="integrated-free-stock-list"
                      />
                    </div>
                  )}

                  {activeQuickSelectTab === 'watchlist' && (
                    <div className="watchlist-tab-content">
                      {loadingWatchlist ? (
                        <div className="quick-select-loading-state watchlist-loading-state" aria-live="polite" aria-busy="true">
                          <div className="quick-select-loading-header">
                            <div className="quick-select-loading-title-skeleton quick-select-skeleton-block" />
                            <div className="quick-select-loading-subtitle-skeleton quick-select-skeleton-block" />
                          </div>
                          {[0, 1].map((groupIndex) => (
                            <div key={groupIndex} className="quick-select-loading-group watchlist-loading-group">
                              <div className="quick-select-loading-title-skeleton watchlist-loading-category-skeleton quick-select-skeleton-block" />
                              <div className="quick-select-loading-list watchlist-loading-list">
                                {[0, 1, 2].map((itemIndex) => (
                                  <div key={itemIndex} className="quick-select-loading-item watchlist-loading-item">
                                    <div className="quick-select-loading-ticker-skeleton quick-select-skeleton-block" />
                                    <div className="quick-select-loading-name-skeleton quick-select-skeleton-block" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : watchlistCategories.length > 0 ? (
                        <div className="watchlist-categories-container">
                          {watchlistCategories.map((category) => (
                            <div key={category.id} className="watchlist-category-group">
                              <h4
                                className={`watchlist-category-title collapsible ${collapsedCategories[category.id] ? 'collapsed' : ''}`}
                                onClick={(e) => toggleCategoryCollapse(category.id, e)}
                                role="button"
                                tabIndex={0}
                                onKeyPress={(e) => e.key === 'Enter' && toggleCategoryCollapse(category.id, e)}
                              >
                                <span className="category-title-text">{category.name}</span>
                                <span className="category-count-badge">{category.stocks.length}</span>
                                <svg
                                  className={`collapse-icon ${collapsedCategories[category.id] ? 'collapsed' : ''}`}
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                >
                                  <path
                                    d="M4 6L8 10L12 6"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </h4>
                              {!collapsedCategories[category.id] && (
                                <div className="watchlist-stock-list">
                                  {category.stocks.map((stock, index) => (
                                    <div
                                      key={`${category.id}-${stock.stockCode}-${index}`}
                                      className="watchlist-stock-item"
                                      onClick={() => handleWatchlistStockClick(stock.stockCode)}
                                      role="button"
                                      tabIndex={0}
                                      onKeyPress={(e) => e.key === 'Enter' && handleWatchlistStockClick(stock.stockCode)}
                                    >
                                      <div className="watchlist-stock-info">
                                        <span className="watchlist-stock-ticker">{stock.stockCode}</span>
                                        {stock.name && stock.name !== stock.stockCode && (
                                          <span className="watchlist-stock-name">{stock.name}</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="watchlist-empty-state">
                          <p className="no-data-text">{t('priceAnalysis.watchlistQuickAccess.noData')}</p>
                          <p className="hint-text">{t('priceAnalysis.watchlistQuickAccess.addStocksHint')}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </aside>

            <div className="pa-main">
              {/* 頂部查詢列：搜尋獨佔一列，期長與進階做在 pill 內右側（直接影響結果的東西不往下放） */}
              <div className="pa-topbar">
                <form className="pa-searchbar" onSubmit={handleSubmit} role="search">
                  <span className="pa-searchbar__icon" aria-hidden="true">🔍</span>

                  <div className="stock-input-wrapper" ref={stockInputWrapperRef}>
                    <input
                      type="text"
                      className="form-control"
                      onChange={handleStockCodeChange}
                      onKeyDown={handleStockInputKeyDown}
                      onFocus={() => {
                        if (stockSuggestions.length > 0) setShowSuggestions(true);
                      }}
                      // 使用 t() 翻譯 placeholder
                      placeholder={t('priceAnalysis.form.stockCodePlaceholder')}
                      required
                      autoComplete="off"
                      role="combobox"
                      aria-expanded={showSuggestions && stockSuggestions.length > 0}
                      aria-controls="stock-suggestions-listbox"
                      aria-activedescendant={
                        highlightedSuggestion >= 0
                          ? `stock-suggestion-${highlightedSuggestion}`
                          : undefined
                      }
                      // 保持 defaultValue 或 value 的邏輯不變 (如果需要)
                      value={displayStockCode} // 改為受控組件
                    />
                    {showSuggestions && stockSuggestions.length > 0 && (
                      <ul
                        id="stock-suggestions-listbox"
                        className="stock-suggestions"
                        role="listbox"
                      >
                        {stockSuggestions.map((s, idx) => (
                          <li
                            key={`${s.symbol}-${s.market || ''}`}
                            id={`stock-suggestion-${idx}`}
                            ref={(node) => {
                              suggestionItemRefs.current[idx] = node;
                            }}
                            className={`stock-suggestion-item${
                              idx === highlightedSuggestion ? ' is-highlighted' : ''
                            }`}
                            role="option"
                            aria-selected={idx === highlightedSuggestion}
                            onMouseEnter={() => setHighlightedSuggestion(idx)}
                            onMouseDown={(e) => {
                              // 用 mousedown 避免 input 先觸發 blur 關閉下拉
                              e.preventDefault();
                              handleSuggestionSelect(s);
                            }}
                          >
                            <span className="stock-suggestion-symbol">{s.symbol}</span>
                            <span className="stock-suggestion-name">{s.name}</span>
                            {(() => {
                              const badge = marketBadgeFor(s.market);
                              if (!badge || !badge.flag) return null;
                              return (
                                <span
                                  className="stock-suggestion-market"
                                  role="img"
                                  aria-label={badge.label}
                                  title={badge.label}
                                >
                                  {badge.flag}
                                </span>
                              );
                            })()}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="pa-searchbar__controls">
                    {loading ? <span className="pa-searchbar__spinner" aria-label={t('priceAnalysis.form.buttonAnalyzing')} /> : null}

                    <select
                      className="pa-period-select"
                      aria-label={t('priceAnalysis.form.analysisPeriodLabel')}
                      value={isAdvancedQuery ? 'custom' : analysisPeriod}
                      onChange={handlePeriodSelectChange}
                    >
                      <option value="short">{t('priceAnalysis.form.periodShort')}</option>
                      <option value="medium">{t('priceAnalysis.form.periodMedium')}</option>
                      <option value="long">{t('priceAnalysis.form.periodLong')}</option>
                      <option value="custom">{t('priceAnalysis.form.periodCustom')}</option>
                    </select>

                    {isAdvancedQuery ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        className="pa-years-input"
                        aria-label={t('priceAnalysis.form.yearsPlaceholder')}
                        placeholder={t('priceAnalysis.form.yearsPlaceholder')}
                        onChange={handleYearsChange}
                        defaultValue={years}
                      />
                    ) : null}

                    <Suspense fallback={renderDeferredDatePickerFallback()}>
                      <DeferredBacktestDatePicker
                        backTestDate={backTestDate}
                        setBackTestDate={setBackTestDate}
                        placeholderText={t('priceAnalysis.form.backTestDatePlaceholder')}
                      />
                    </Suspense>
                  </div>
                </form>

                {/* 熱門：沒資料就整列不存在，不留空框 */}
                {hotSearches.length > 0 ? (
                  <div className="pa-hot-row">
                    <span className="pa-hot-row__label">{t('priceAnalysis.quickSelect.tabs.hotSearches')}</span>
                    <div className="pa-hot-row__items">
                      {hotSearches.map((searchItem, index) => (
                        <button
                          type="button"
                          key={`${searchItem.keyword}-${index}`}
                          className="pa-hot-chip"
                          onClick={() => handleHotSearchClick(searchItem)}
                        >
                          <span className="pa-hot-chip__ticker">{searchItem.keyword}</span>
                          {searchItem.name && searchItem.name !== searchItem.keyword ? (
                            <span className="pa-hot-chip__name">{searchItem.name}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>


              {/* 主圖表區塊 */}
              {shouldRenderChartWorkspace ? (
                <Suspense fallback={renderChartWorkspaceFallback()}>
                  <PriceAnalysisChartWorkspace
                    isMobile={isMobile}
                    loading={loading}
                    isPending={isPending}
                    chartRef={chartRef}
                    ulbandChartRef={ulbandChartRef}
                    chartCardRef={chartCardRef}
                    chartData={chartData}
                    localizedChartData={localizedChartData}
                    lineChartOptions={lineChartOptions}
                    ulbandData={ulbandData}
                    bandXRange={bandXRange}
                    onAfterZoom={syncBandRange}
                    displayedStockCode={displayedStockCode}
                    analysisResult={analysisResult}
                    analysisSentimentText={analysisSentimentText}
                    getSentimentSuffix={getSentimentSuffix}
                    combinedStateKey={getCombinedStateKey(analysisResult.sentimentKey, analysisResult.channelState)}
                    formatPrice={formatPrice}
                    t={t}
                  />
                </Suspense>
              ) : renderChartWorkspaceFallback()}

              {/* 說明區塊：跟圖表同一欄，左欄整條讓給清單往下發展 */}
              {shouldLoadDescriptionTabs ? (
                <Suspense fallback={renderDescriptionFallback()}>
                  <PriceAnalysisDescription t={t} />
                </Suspense>
              ) : null}
            </div>
          </div>


        </div> {/* 結束 content-layout-container */}

        {showTour ? (
          <Suspense fallback={null}>
            <PriceAnalysisTour t={t} onFinish={() => setShowTour(false)} />
          </Suspense>
        ) : null}
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
