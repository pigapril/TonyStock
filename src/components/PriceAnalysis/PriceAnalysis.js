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
const PriceAnalysisDescriptionTabs = lazy(() => import('./PriceAnalysisDescriptionTabs'));

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

const renderDescriptionTabsFallback = () => (
  <div className="bottom-description-section" aria-hidden="true">
    <div className="description-tabs-container">
      <div className="description-tabs">
        <button className="description-tab active" type="button" disabled />
        <button className="description-tab" type="button" disabled />
        <button className="description-tab" type="button" disabled />
        <button className="description-tab" type="button" disabled />
      </div>
      <div className="description-tab-content">
        <div className="description-list">
          <div className="analysis-value-skeleton analysis-value-skeleton--wide" />
          <div className="analysis-value-skeleton analysis-value-skeleton--wide" />
          <div className="analysis-value-skeleton analysis-value-skeleton--wide" />
        </div>
      </div>
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
  const [activeChart, setActiveChart] = useState('sd');
  const [activeDescriptionTab, setActiveDescriptionTab] = useState('overview'); // 新增：說明標籤狀態
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
      onPanStart: () => true
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
      }
    },
    limits: {
      x: {
        min: 'original',
        max: 'original'
      }
    }
  }), [isMobile]);

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
  const [loadingHotSearches, setLoadingHotSearches] = useState(false);

  // 新增：快速選擇 Tab 狀態
  const [activeQuickSelectTab, setActiveQuickSelectTab] = useState('hotSearches'); // 'hotSearches', 'freeStocks', 或 'watchlist'
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
      setAnalysisResult({ price: null, sentimentKey: null, sentimentValue: null });
      setDisplayedStockCode('');
    });
  }, [startTransition]);

  useEffect(() => {
    clearPostAnalysisTimers();

    const hasRenderedAnalysis = !loading && (chartData || ulbandData);
    if (!hasRenderedAnalysis) {
      return undefined;
    }

    if (activeChart === 'sd' && chartData && chartRef.current) {
      tooltipTimerRef.current = window.setTimeout(() => {
        const chart = chartRef.current;
        if (!isChartAttached(chart) || !chart.data?.labels?.length) {
          return;
        }

        try {
          const lastIndex = chart.data.labels.length - 1;
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
  }, [activeChart, chartData, clearPostAnalysisTimers, isMobile, isUserInitiated, loading, ulbandData]);

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
            sentimentValue: t(sentimentKey) // 保留欄位以兼容舊資料結構
          });
        } else {
          // 清空時也清空 key 和 value
          setAnalysisResult({ price: null, sentimentKey: null, sentimentValue: null });
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
        openDialog('featureUpgrade', {
          feature: 'stockAccess',
          stockCode: stock,
          allowedStocks: getFreeStockList(),
          upgradeUrl: `/${i18n.language}/subscription-plans`
        });

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
  }, [checkAuthStatus, i18n.language, openDialog, showToast, startTransition, t]); // 確保 t 在依賴項中

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

    switch (analysisPeriod) {
      case 'short':
        return 0.5;
      case 'medium':
        return 1.5;
      case 'long':
      default:
        return 3.5;
    }
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
    const dateToFetch = isAdvancedQuery ? backTestDate : '';

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
  }, [backTestDate, beginAnalysisRequest, fetchStockData, isAdvancedQuery, queueAnalysisEvent, resolveAnalysisYears]);

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
      openDialog('featureUpgrade', {
        feature: 'stockAccess',
        stockCode: displayStockCode,
        allowedStocks: getFreeStockList(),
        upgradeUrl: `/${i18n.language}/subscription-plans`
      });
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
      setLoadingHotSearches(true);
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
      } finally {
        setLoadingHotSearches(false);
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
      openDialog('featureUpgrade', {
        feature: 'stockAccess',
        stockCode: upperClickedCode,
        allowedStocks: getFreeStockList(),
        upgradeUrl: `/${i18n.language}/subscription-plans`
      });
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
      openDialog('featureUpgrade', {
        feature: 'stockAccess',
        stockCode: upperClickedCode,
        allowedStocks: getFreeStockList(),
        upgradeUrl: `/${i18n.language}/subscription-plans`
      });
      return;
    }

    runAnalysisForStock(upperClickedCode, 'freeStockList', t('priceAnalysis.toast.invalidYearsFreeStock'));
  };

  // 新增：處理 Watchlist Tab 點擊事件
  const handleWatchlistTabClick = () => {
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
          t('priceAnalysis.description.tips.point1'),
          t('priceAnalysis.description.tips.point2'),
          t('priceAnalysis.description.tips.point3')
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
      layout: { padding: { left: 10, right: 15, top: 20, bottom: 25 } },
      clip: false
    };

    // 動態添加 time unit (如果 chartData 存在)
    if (chartData?.timeUnit) {
      options.scales.x.time.unit = chartData.timeUnit;
    }

    return options;
  }, [chartAnnotations, chartData?.timeUnit, lineChartZoomOptions, tooltipLabelColorFormatter, tooltipLabelFormatter, tooltipYAlign, xAxisMax, yTickLabelFormatter]);

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
                  <h1 className="analysis-main-title">{t('priceAnalysis.heading')}</h1>
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
                        <Suspense fallback={renderDeferredDatePickerFallback()}>
                          <DeferredBacktestDatePicker
                            backTestDate={backTestDate}
                            setBackTestDate={setBackTestDate}
                            placeholderText={t('priceAnalysis.form.backTestDatePlaceholder')}
                          />
                        </Suspense>
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
                      disabled={loading}
                    >
                      {/* 使用 t() 翻譯按鈕文字 */}
                      {loading
                        ? (isPending ? t('priceAnalysis.form.buttonProcessing') : t('priceAnalysis.form.buttonAnalyzing'))
                        : t('priceAnalysis.form.buttonStartAnalysis')
                      }
                    </button>
                  </div>
                </form>
              </div>

              {/* 快速選擇區塊 (熱門搜尋 + 免費股票清單 + 我的關注) */}
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
                  <button
                    className={`quick-select-tab watchlist-tab ${activeQuickSelectTab === 'watchlist' ? 'active' : ''}`}
                    onClick={handleWatchlistTabClick}
                  >
                    {t('priceAnalysis.quickSelect.tabs.watchlist')}
                  </button>
                </div>

                {/* Tab 內容 */}
                <div className="quick-select-content">
                  {activeQuickSelectTab === 'hotSearches' && (
                    <div className="hot-searches-tab-content">
                      {loadingHotSearches ? (
                        <div className="quick-select-loading-state" aria-live="polite" aria-busy="true">
                          <div className="quick-select-loading-header">
                            <div className="quick-select-loading-title-skeleton quick-select-skeleton-block" />
                            <div className="quick-select-loading-subtitle-skeleton quick-select-skeleton-block" />
                          </div>
                          <div className="quick-select-loading-list">
                            {[0, 1, 2, 3].map((itemIndex) => (
                              <div key={itemIndex} className="quick-select-loading-item">
                                <div className="quick-select-loading-ticker-skeleton quick-select-skeleton-block" />
                                <div className="quick-select-loading-name-skeleton quick-select-skeleton-block" />
                              </div>
                            ))}
                          </div>
                        </div>
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
            </div> {/* 結束 analysis-controls-wrapper */}

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
                  activeChart={activeChart}
                  handleChartSwitch={handleChartSwitch}
                  displayedStockCode={displayedStockCode}
                  analysisResult={analysisResult}
                  analysisSentimentText={analysisSentimentText}
                  getSentimentSuffix={getSentimentSuffix}
                  formatPrice={formatPrice}
                  t={t}
                />
              </Suspense>
            ) : renderChartWorkspaceFallback()}
          </div>


        </div> {/* 結束 content-layout-container */}

        {/* 底部說明區域 */}
        {shouldLoadDescriptionTabs ? (
          <Suspense fallback={renderDescriptionTabsFallback()}>
            <PriceAnalysisDescriptionTabs
              activeDescriptionTab={activeDescriptionTab}
              onSwitchTab={handleDescriptionTabSwitch}
              t={t}
            />
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
