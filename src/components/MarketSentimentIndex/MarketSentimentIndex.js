import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleApiError } from '../../utils/errorHandler';
import { Analytics } from '../../utils/analytics';
import { useAuth } from '../Auth/useAuth';
import './MarketSentimentIndex.css';
import 'chartjs-adapter-date-fns';


import MarketSentimentDescriptionSection from './MarketSentimentDescriptionSection';
import MarketSentimentGauge from './MarketSentimentGauge';
import { FeatureUpgradeDialog } from '../Common/Dialog/FeatureUpgradeDialog';
import PageContainer from '../PageContainer/PageContainer';
import TimeRangeSelector from '../Common/TimeRangeSelector/TimeRangeSelector';
import { getSentiment } from '../../utils/sentimentUtils';
import { useAdContext } from '../Common/InterstitialAdModal/AdContext';
import { useTranslation } from 'react-i18next';
import { useToastManager } from '../Watchlist/hooks/useToastManager';
import { Toast } from '../Watchlist/components/Toast';
import { formatPrice } from '../../utils/priceUtils';
import enhancedApiClient from '../../utils/enhancedApiClient';
import { getCompositeComparisonSnapshots } from './comparisonSnapshots';

// 引入必要的 Chart.js 元件和插件
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

// 引入 Line 組件
import { Line } from 'react-chartjs-2';

// 引入 IndicatorItem 組件
import IndicatorItem from '../IndicatorItem/IndicatorItem';

// 引入 rc-slider 和其樣式
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

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

function hasExtremeFearMarkerDataset(chart) {
  return chart?.data?.datasets?.some((dataset) => dataset?.pulseMarker);
}

function stopExtremeFearPulse(chart) {
  if (chart?.$extremeFearPulseFrame) {
    cancelAnimationFrame(chart.$extremeFearPulseFrame);
    chart.$extremeFearPulseFrame = null;
  }
}

function startExtremeFearPulse(chart) {
  if (!chart || chart.$extremeFearPulseFrame || !hasExtremeFearMarkerDataset(chart)) {
    return;
  }

  const tick = () => {
    if (!chart?.ctx) {
      stopExtremeFearPulse(chart);
      return;
    }

    if (!document.hidden) {
      chart.draw();
    }

    chart.$extremeFearPulseFrame = requestAnimationFrame(tick);
  };

  chart.$extremeFearPulseFrame = requestAnimationFrame(tick);
}

const extremeFearPulsePlugin = {
  id: 'extremeFearPulse',
  afterInit(chart) {
    startExtremeFearPulse(chart);
  },
  afterUpdate(chart) {
    if (hasExtremeFearMarkerDataset(chart)) {
      startExtremeFearPulse(chart);
    } else {
      stopExtremeFearPulse(chart);
    }
  },
  afterDatasetsDraw(chart) {
    const markerDatasetIndex = chart.data.datasets.findIndex((dataset) => dataset?.pulseMarker);

    if (markerDatasetIndex === -1) {
      return;
    }

    const datasetMeta = chart.getDatasetMeta(markerDatasetIndex);
    const points = datasetMeta?.data || [];

    if (!points.length) {
      return;
    }

    const ctx = chart.ctx;
    const pulse = (Math.sin(performance.now() / 420) + 1) / 2;

    ctx.save();

    points.forEach((point) => {
      if (!point || point.skip) {
        return;
      }

      const { x, y } = point.getProps(['x', 'y'], true);
      const outerRadius = 10 + pulse * 4;
      const innerRadius = 6 + pulse * 2;

      ctx.beginPath();
      ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245, 158, 11, ${0.08 + pulse * 0.14})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(249, 115, 22, ${0.28 + pulse * 0.28})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.restore();
  },
  beforeDestroy(chart) {
    stopExtremeFearPulse(chart);
  }
};

ChartJS.register(extremeFearPulsePlugin);

const restrictedWindowMaskPlugin = {
  id: 'restrictedWindowMask',
  beforeEvent(chart, args) {
    const options = chart?.options?.plugins?.restrictedWindowMask;
    const event = args?.event;

    if (!options?.enabled || !options.cutoffDate || !event) {
      return undefined;
    }

    const xScale = chart.scales?.x;
    const chartArea = chart.chartArea;

    if (!xScale || !chartArea) {
      return undefined;
    }

    const cutoffValue = options.cutoffDate instanceof Date
      ? options.cutoffDate
      : new Date(options.cutoffDate);
    const cutoffPixel = xScale.getPixelForValue(cutoffValue);
    const maskStart = Math.max(chartArea.left, Math.min(cutoffPixel, chartArea.right));
    const isInsideMaskedArea = event.x >= maskStart && event.x <= chartArea.right
      && event.y >= chartArea.top && event.y <= chartArea.bottom;

    if (!isInsideMaskedArea) {
      return undefined;
    }

    if (typeof chart.setActiveElements === 'function') {
      chart.setActiveElements([]);
    }

    if (chart.tooltip && typeof chart.tooltip.setActiveElements === 'function') {
      chart.tooltip.setActiveElements([], { x: event.x, y: event.y });
    }

    chart.draw();
    return false;
  },
  afterDatasetsDraw(chart) {
    const options = chart?.options?.plugins?.restrictedWindowMask;

    if (!options?.enabled || !options.cutoffDate) {
      return;
    }

    const xScale = chart.scales?.x;
    const chartArea = chart.chartArea;

    if (!xScale || !chartArea) {
      return;
    }

    const cutoffValue = options.cutoffDate instanceof Date
      ? options.cutoffDate
      : new Date(options.cutoffDate);
    const cutoffPixel = xScale.getPixelForValue(cutoffValue);
    const maskStart = Math.max(chartArea.left, Math.min(cutoffPixel, chartArea.right));

    if (maskStart >= chartArea.right) {
      return;
    }

    const ctx = chart.ctx;

    ctx.save();
    ctx.fillStyle = options.fillColor || '#f8fafc';
    ctx.fillRect(maskStart, chartArea.top, chartArea.right - maskStart, chartArea.bottom - chartArea.top);

    ctx.beginPath();
    ctx.moveTo(maskStart, chartArea.top);
    ctx.lineTo(maskStart, chartArea.bottom);
    ctx.strokeStyle = options.lineColor || 'rgba(37, 99, 235, 0.88)';
    ctx.lineWidth = options.lineWidth || 1.5;
    ctx.stroke();
    ctx.restore();
  }
};

ChartJS.register(restrictedWindowMaskPlugin);

// 新增：獲取時間單位的函數
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

function groupHistoricLows(data) {
  return data.reduce((groups, item) => {
    const lastGroup = groups[groups.length - 1];

    if (!lastGroup) {
      groups.push([item]);
      return groups;
    }

    const lastItem = lastGroup[lastGroup.length - 1];
    const diffDays = (item.date.getTime() - lastItem.date.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays <= 45) {
      lastGroup.push(item);
    } else {
      groups.push([item]);
    }

    return groups;
  }, []);
}



// 創建一個映射，將原始 key 映射到翻譯鍵中使用的簡化 key
const INDICATOR_TRANSLATION_KEY_MAP = {
  'AAII Bull-Bear Spread': 'indicators.aaiiSpread',
  'CBOE Put/Call Ratio 5-Day Avg': 'indicators.cboeRatio',
  'Market Momentum': 'indicators.marketMomentum',
  'VIX MA50': 'indicators.vixMA50',
  'Safe Haven Demand': 'indicators.safeHaven',
  'Junk Bond Spread': 'indicators.junkBond',
  "S&P 500 COT Index": 'indicators.cotIndex',
  'NAAIM Exposure Index': 'indicators.naaimIndex',
};

function getTrendDirection(delta, threshold = 3) {
  if (delta > threshold) {
    return 'up';
  }

  if (delta < -threshold) {
    return 'down';
  }

  return 'flat';
}

const getDefaultTimeRangeByViewport = () => {
  if (typeof window !== 'undefined' && window.innerWidth <= 768) {
    return '5Y';
  }

  return '10Y';
};

const EARLIEST_HISTORY_DATE = new Date('2010-01-01');

const getTimeRangeBounds = (timeRange, endDate = new Date()) => {
  const rangeEnd = new Date(endDate);
  const rangeStart = new Date(endDate);

  switch (timeRange) {
    case '1M':
      rangeStart.setMonth(rangeEnd.getMonth() - 1);
      break;
    case '3M':
      rangeStart.setMonth(rangeEnd.getMonth() - 3);
      break;
    case '6M':
      rangeStart.setMonth(rangeEnd.getMonth() - 6);
      break;
    case '1Y':
      rangeStart.setFullYear(rangeEnd.getFullYear() - 1);
      break;
    case '2Y':
      rangeStart.setFullYear(rangeEnd.getFullYear() - 2);
      break;
    case '3Y':
      rangeStart.setFullYear(rangeEnd.getFullYear() - 3);
      break;
    case '5Y':
      rangeStart.setFullYear(rangeEnd.getFullYear() - 5);
      break;
    case '10Y':
      rangeStart.setFullYear(rangeEnd.getFullYear() - 10);
      break;
    case '20Y':
      rangeStart.setFullYear(rangeEnd.getFullYear() - 20);
      break;
    default:
      return {
        start: new Date(EARLIEST_HISTORY_DATE),
        end: rangeEnd
      };
  }

  return {
    start: rangeStart < EARLIEST_HISTORY_DATE ? new Date(EARLIEST_HISTORY_DATE) : rangeStart,
    end: rangeEnd
  };
};

const MarketSentimentIndex = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { showToast, toast, hideToast } = useToastManager();
  const { user, checkAuthStatus } = useAuth();
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradeDialog, setUpgradeDialog] = useState({ isOpen: false, type: null, context: {} });
  const [selectedTimeRange, setSelectedTimeRange] = useState(() => getDefaultTimeRangeByViewport());
  const [indicatorsData, setIndicatorsData] = useState({});
  const [indicatorTrendData, setIndicatorTrendData] = useState({});
  const [historicalData, setHistoricalData] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const initialRenderRef = useRef(true);
  const { requestAdDisplay } = useAdContext();
  const currentLang = i18n.language;

  // 檢查用戶計劃
  const isTemporaryFreeMode = process.env.REACT_APP_TEMPORARY_FREE_MODE === 'true';
  const userPlan = user?.plan || 'free';
  const effectiveUserPlan = isTemporaryFreeMode ? 'pro' : userPlan;
  const isProUser = effectiveUserPlan === 'pro';
  const isRestrictedPreview = Boolean(sentimentData?.isRestricted);

  // 新增滑桿相關狀態
  const [sliderMinMax, setSliderMinMax] = useState([0, 0]); // [minTimestamp, maxTimestamp]
  const [currentSliderRange, setCurrentSliderRange] = useState([0, 0]); // [startTimestamp, endTimestamp]

  const [heroView, setHeroView] = useState('current');
  const [selectedIndicatorKey, setSelectedIndicatorKey] = useState(null);
  const [isMobileIndicatorSheetOpen, setIsMobileIndicatorSheetOpen] = useState(false);
  const historyChartRef = useRef(null);
  const historyChartContainerRef = useRef(null);
  const historyOverlayCardRef = useRef(null);
  const [historyOverlayPosition, setHistoryOverlayPosition] = useState({ top: '50%', left: '50%' });
  const [historyOverlayMode, setHistoryOverlayMode] = useState('hidden');
  const [isMobileViewport, setIsMobileViewport] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ));
  const [isMobileSummaryExpanded, setIsMobileSummaryExpanded] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      setIsMobileIndicatorSheetOpen(false);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    if (!isMobileViewport || !isMobileIndicatorSheetOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileIndicatorSheetOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileIndicatorSheetOpen, isMobileViewport]);

  useEffect(() => {
    let isMounted = true;

    async function fetchSentimentData() {
      try {
        setLoading(true);

        // 根據用戶計劃選擇不同的端點
        // 在臨時免費模式下，所有用戶都使用 Pro 端點
        const shouldUsePro = isTemporaryFreeMode || isProUser;
        const endpoint = shouldUsePro ? '/api/market-sentiment' : '/api/market-sentiment-free';
        const response = await enhancedApiClient.get(endpoint);

        if (isMounted) {
          setSentimentData(response.data);
          setIndicatorsData(response.data.indicators);
          setTimeout(() => {
            setIsDataLoaded(true);
          }, 100);
        }
      } catch (error) {
        // ✅ 修正 403 處理邏輯
        if (error.response?.status === 403) {
          console.warn('MarketSentiment: 403 Forbidden on Pro endpoint. Falling back to Free data.');

          // 1. 同步用戶狀態
          if (checkAuthStatus) {
            checkAuthStatus().catch(err => {
              console.error('Failed to refresh auth status:', err);
            });
          }

          // 2. 顯示升級對話框 (保持不變)
          setUpgradeDialog({
            isOpen: true,
            type: 'marketSentimentAccess',
            context: {
              feature: 'currentData',
              source: 'apiError'
            }
          });

          // 3. 【關鍵修正】自動降級：嘗試抓取免費版資料作為背景顯示
          try {
            const freeResponse = await enhancedApiClient.get('/api/market-sentiment-free');
            if (isMounted && freeResponse.data) {
              setSentimentData(freeResponse.data);
              setIndicatorsData(freeResponse.data.indicators);
              setIsDataLoaded(true);
            }
          } catch (fallbackError) {
            console.error('Failed to fetch fallback free data:', fallbackError);
            setSentimentData(null); // 真的失敗才設為 null
          }
        } else {
          handleApiError(error, showToast, t);
          setSentimentData(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchSentimentData();

    return () => {
      isMounted = false;
    };
  }, [checkAuthStatus, isProUser, isTemporaryFreeMode, showToast, t]);

  useEffect(() => {
    async function fetchHistoricalData() {
      try {
        const response = await enhancedApiClient.get('/api/composite-historical-data');
        const formattedData = response.data
          .filter(item => item.compositeScore != null && item.spyClose != null)
          .map((item) => ({
            date: new Date(item.date),
            compositeScore: parseFloat(item.compositeScore),
            spyClose: parseFloat(item.spyClose),
          }));
        setHistoricalData(formattedData);
      } catch (error) {
        handleApiError(error, showToast, t);
      }
    }

    fetchHistoricalData();
  }, [showToast, t]);

  const latestAvailableHistoryTimestamp = useMemo(() => {
    if (historicalData.length === 0) {
      return 0;
    }

    return historicalData[historicalData.length - 1].date.getTime();
  }, [historicalData]);

  const latestHistoryDomainEnd = useMemo(() => {
    if (historicalData.length === 0) {
      return 0;
    }

    return isRestrictedPreview ? Date.now() : latestAvailableHistoryTimestamp;
  }, [historicalData, isRestrictedPreview, latestAvailableHistoryTimestamp]);

  useEffect(() => {
    if (historicalData.length === 0 || latestHistoryDomainEnd === 0) {
      return;
    }

    const minTs = Math.max(historicalData[0].date.getTime(), EARLIEST_HISTORY_DATE.getTime());
    const maxTs = Math.max(latestHistoryDomainEnd, minTs);

    setSliderMinMax([minTs, maxTs]);
  }, [historicalData, latestHistoryDomainEnd]);

  // 當 selectedTimeRange 或歷史可視範圍變動時，更新滑桿範圍
  useEffect(() => {
    if (historicalData.length === 0 || sliderMinMax[1] === 0) {
      return;
    }

    const { start, end } = getTimeRangeBounds(selectedTimeRange, new Date(sliderMinMax[1]));
    const startTs = Math.max(start.getTime(), sliderMinMax[0]);
    const endTs = Math.min(end.getTime(), sliderMinMax[1]);

    setCurrentSliderRange([startTs, endTs]);
  }, [selectedTimeRange, historicalData, sliderMinMax]);

  useEffect(() => {
    const keys = Object.keys(indicatorsData).filter(
      (key) => key !== 'Investment Grade Bond Yield' && key !== 'Junk Bond Yield'
    );

    if (keys.length === 0) {
      return;
    }

    if (!selectedIndicatorKey || !indicatorsData[selectedIndicatorKey]) {
      setSelectedIndicatorKey(keys[0]);
    }
  }, [indicatorsData, selectedIndicatorKey]);

  useEffect(() => {
    const canLoadIndicatorTrends = Boolean(sentimentData);

    if (!canLoadIndicatorTrends) {
      setIndicatorTrendData({});
      return;
    }

    const indicatorKeys = Object.keys(indicatorsData).filter(
      (key) => key !== 'Investment Grade Bond Yield' && key !== 'Junk Bond Yield'
    );

    if (indicatorKeys.length === 0) {
      return;
    }

    let cancelled = false;

    async function fetchIndicatorTrendData() {
      try {
        const settledResults = await Promise.allSettled(
          indicatorKeys.map(async (key) => {
            const response = await enhancedApiClient.get('/api/indicator-history', {
              params: { indicator: key }
            });

            const normalized = response.data
              .map((item) => ({
                date: new Date(item.date),
                value: item.value != null ? parseFloat(item.value) : null,
                percentileRank: item.percentileRank != null ? parseFloat(item.percentileRank) : null
              }))
              .filter((item) => item.percentileRank != null)
              .sort((a, b) => a.date - b.date);

            if (normalized.length === 0) {
              return [key, []];
            }

            return [key, normalized];
          })
        );

        const results = settledResults.flatMap((result, index) => {
          if (result.status === 'fulfilled') {
            return [result.value];
          }

          const error = result.reason;
          const isCanceled = error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError';

          if (!isCanceled) {
            console.error(`Failed to fetch indicator trend data for ${indicatorKeys[index]}:`, error);
          }

          return [];
        });

        if (!cancelled) {
          setIndicatorTrendData(Object.fromEntries(results));
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch indicator trend data:', error);
        }
      }
    }

    fetchIndicatorTrendData();

    return () => {
      cancelled = true;
    };
  }, [indicatorsData, isProUser, sentimentData]);

  const handleTimeRangeChange = (e) => {
    Analytics.marketSentiment.changeTimeRange({
      timeRange: e.target.value,
      currentIndicator: 'composite'
    });
    setSelectedTimeRange(e.target.value);
  };

  const filteredData = useMemo(() => {
    if (!historicalData || historicalData.length === 0 || currentSliderRange[0] === 0) {
      return [];
    }
    return historicalData.filter(item => {
      const itemTime = item.date.getTime();
      return itemTime >= currentSliderRange[0] && itemTime <= currentSliderRange[1];
    });
  }, [historicalData, currentSliderRange]);

  const restrictionCutoffDate = useMemo(() => {
    if (sentimentData?.restrictionCutoffDate) {
      return new Date(sentimentData.restrictionCutoffDate);
    }

    if (isRestrictedPreview && latestAvailableHistoryTimestamp) {
      return new Date(latestAvailableHistoryTimestamp);
    }

    return null;
  }, [isRestrictedPreview, latestAvailableHistoryTimestamp, sentimentData?.restrictionCutoffDate]);

  const formattedRestrictionCutoffDate = useMemo(() => {
    if (!restrictionCutoffDate) {
      return '';
    }

    return restrictionCutoffDate.toLocaleDateString(currentLang === 'zh-TW' ? 'zh-TW' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, [currentLang, restrictionCutoffDate]);

  const historyRestrictionWindow = useMemo(() => {
    if (!isRestrictedPreview || !restrictionCutoffDate || currentSliderRange[1] === 0) {
      return null;
    }

    const [rangeStart, rangeEnd] = currentSliderRange;
    const cutoffTs = restrictionCutoffDate.getTime();

    if (cutoffTs >= rangeEnd) {
      return null;
    }

    const totalRange = rangeEnd - rangeStart;
    if (totalRange <= 0) {
      return null;
    }

    return {
      rangeStart,
      rangeEnd,
      fullyLocked: cutoffTs <= rangeStart
    };
  }, [currentSliderRange, isRestrictedPreview, restrictionCutoffDate]);

  const historicalLowPoints = useMemo(() => {
    if (historicalData.length === 0) {
      return [];
    }

    const extremeLows = historicalData.filter((item) => item.compositeScore <= 5);
    const source = extremeLows.length > 0
      ? extremeLows
      : [...historicalData].sort((a, b) => a.compositeScore - b.compositeScore).slice(0, 12);

    return groupHistoricLows(source)
      .map((group) => group.reduce(
        (lowest, item) => (item.compositeScore < lowest.compositeScore ? item : lowest),
        group[0]
      ))
      .sort((a, b) => b.date - a.date)
      .slice(0, 4)
      .map((item) => ({
        date: item.date,
        label: item.date.toLocaleDateString(currentLang === 'zh-TW' ? 'zh-TW' : 'en-US', { year: 'numeric', month: 'short' }),
        value: Math.round(item.compositeScore),
        meta: item.date.toLocaleDateString(currentLang === 'zh-TW' ? 'zh-TW' : 'en-US')
      }));
  }, [currentLang, historicalData]);

  // 獲取時間單位
  const timeUnit = useMemo(() => {
    if (filteredData.length < 2) {
      return 'month';
    }

    return getTimeUnit(filteredData.map(item => item.date));
  }, [filteredData]);

  // 構建圖表數據
  const chartData = useMemo(() => ({
    datasets: [
      {
        label: t('marketSentiment.chart.compositeIndexLabel'),
        yAxisID: 'left-axis',
        data: filteredData.map((item) => ({
          x: item.date,
          y: item.compositeScore
        })),
        borderColor: '#9D00FF',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;

          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);

          // 0% (頂部 - 極度樂觀): #D24A93 (rgb(210, 74, 147))
          gradient.addColorStop(0, 'rgba(210, 74, 147, 0.6)');
          // 25% (樂觀): #F0B8CE (rgb(240, 184, 206)), alpha 0.4
          gradient.addColorStop(0.25, 'rgba(240, 184, 206, 0.5)');
          // 50% (中性):rgb(255, 255, 255) (rgb(112, 128, 144))
          gradient.addColorStop(0.5, 'rgb(166, 170, 210, 0.4)');
          // 75% (悲觀):rgb(121, 91, 213) (rgb(91, 155, 213))
          gradient.addColorStop(0.75, 'rgba(91, 155, 213, 0.3)');
          // 100% (底部 - 極度悲觀): #0000FF (rgb(0, 0, 255))
          gradient.addColorStop(1, 'rgba(0, 0, 255, 0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: t('marketSentiment.chart.spyPriceLabel'),
        yAxisID: 'right-axis',
        data: filteredData.map((item) => ({
          x: item.date,
          y: item.spyClose
        })),
        borderColor: 'rgb(66, 66, 66)',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;

          // 創建垂直漸層
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(54, 162, 235, 0)');     // 完全透明
          gradient.addColorStop(0.5, 'rgba(42, 42, 42, 0)'); // 半透明
          gradient.addColorStop(1, 'rgba(128, 128, 129, 0)');   // 較不透明

          return gradient;
        },
        fill: true,
        tension: 0.4, // 增加曲線的平滑度
        pointRadius: 0,
      },
      {
        label: currentLang === 'zh-TW' ? '過往極端恐懼低點' : 'Past extreme fear lows',
        yAxisID: 'left-axis',
        pulseMarker: true,
        order: 10,
        data: historicalLowPoints
          .filter((item) => filteredData.some((entry) => entry.date.getTime() === item.date.getTime()))
          .map((item) => ({
            x: item.date,
            y: item.value,
            meta: item.meta
          })),
        showLine: false,
        pointRadius: 6,
        pointHoverRadius: 9,
        pointHitRadius: 14,
        pointBorderWidth: 3,
        pointHoverBorderWidth: 4,
        pointBackgroundColor: '#fff7ed',
        pointBorderColor: '#f97316',
        pointHoverBackgroundColor: '#ffedd5',
        pointHoverBorderColor: '#ea580c',
        pointStyle: 'circle',
        parsing: false,
      },
    ],
  }), [currentLang, filteredData, historicalLowPoints, t]);



  const navigateToSubscriptionPlans = useCallback((feature, source) => {
    const state = {
      reason: 'market_sentiment_latest_data',
      feature,
      from: `/${i18n.language}/market-sentiment`,
      message: t('subscription.marketSentimentContext.notification'),
      context: {
        cutoffDate: formattedRestrictionCutoffDate
      },
      source
    };

    navigate(`/${i18n.language}/subscription-plans`, { state });
  }, [formattedRestrictionCutoffDate, i18n.language, navigate, t]);

  const handleRestrictedFeatureClick = useCallback((feature, source = 'marketSentimentIndex') => {
    Analytics.marketSentiment.restrictedFeatureClicked({
      feature,
      userPlan: effectiveUserPlan
    });

    navigateToSubscriptionPlans(feature, source);
  }, [effectiveUserPlan, navigateToSubscriptionPlans]);

  // 新的升級對話框處理函數
  const handleUpgradeDialogClose = useCallback(() => {
    setUpgradeDialog({ isOpen: false, type: null, context: {} });
  }, []);

  const handleUpgradeDialogUpgrade = useCallback(() => {
    Analytics.marketSentiment.upgradeClicked({
      source: upgradeDialog.context.source || 'marketSentimentUpgradeDialog',
      feature: upgradeDialog.context.feature
    });
    handleUpgradeDialogClose();
    navigateToSubscriptionPlans(upgradeDialog.context.feature || 'currentData', upgradeDialog.context.source || 'marketSentimentUpgradeDialog');
  }, [handleUpgradeDialogClose, navigateToSubscriptionPlans, upgradeDialog.context]);

  // 修改圖表選項
  const chartOptions = useMemo(() => ({
    scales: {
      x: {
        type: 'time',
        min: currentSliderRange[0] || undefined,
        max: currentSliderRange[1] || undefined,
        time: {
          unit: timeUnit,
          tooltipFormat: 'yyyy-MM-dd',
          displayFormats: {
            year: 'yyyy',
            month: "MMM''yy",
            day: 'd MMM'
          }
        },
        ticks: {
          maxTicksLimit: 6,
          autoSkip: true,
          maxRotation: 45,
          minRotation: 0
        }
      },
      'left-axis': {
        position: 'left',
        title: {
          display: true,
          text: t('marketSentiment.chart.compositeIndexAxisLabel'),
        },
        ticks: {
          callback: function (value, index, values) {
            return formatPrice(value);
          }
        }
      },
      'right-axis': {
        position: 'right',
        title: {
          display: true,
          text: t('marketSentiment.chart.spyPriceAxisLabel'),
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function (value, index, values) {
            return formatPrice(value);
          }
        }
      },
    },
    plugins: {
      restrictedWindowMask: {
        enabled: Boolean(isRestrictedPreview && restrictionCutoffDate),
        cutoffDate: restrictionCutoffDate,
        fillColor: '#f8fafc',
        lineColor: 'rgba(37, 99, 235, 0.88)',
        lineWidth: 1.5
      },
      legend: {
        labels: {
          usePointStyle: true,
          generateLabels: (chart) => {
            const defaultLabels = ChartJS.defaults.plugins.legend.labels.generateLabels(chart);

            return defaultLabels.map((label) => {
              const dataset = chart.data.datasets?.[label.datasetIndex];

              if (dataset?.pulseMarker) {
                return {
                  ...label,
                  fillStyle: dataset.pointBackgroundColor,
                  strokeStyle: dataset.pointBorderColor,
                  lineWidth: dataset.pointBorderWidth,
                  pointStyle: 'circle'
                };
              }

              return label;
            });
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function (tooltipItem) {
            let label = tooltipItem.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (tooltipItem.dataset.label === (currentLang === 'zh-TW' ? '過往極端恐懼低點' : 'Past extreme fear lows')) {
              const rawPoint = tooltipItem.raw || {};
              return `${label}${rawPoint.meta || ''} (${formatPrice(tooltipItem.parsed.y)})`;
            }
            if (tooltipItem.parsed.y !== null) {
              label += formatPrice(tooltipItem.parsed.y);
            }
            return label;
          }
        }
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
          overScaleMode: 'x',
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: 'x',
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  }), [currentLang, currentSliderRange, isRestrictedPreview, restrictionCutoffDate, timeUnit, t]);

  // 在組件渲染完成後將 initialRenderRef 設為 false
  useEffect(() => {
    if (isDataLoaded) {
      initialRenderRef.current = false;
    }
  }, [isDataLoaded]);

  // 定義用於結構化數據的 JSON-LD
  const marketSentimentJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": t('marketSentiment.pageTitle'), // 使用翻譯的頁面標題
    "description": t('marketSentiment.pageDescription'), // 使用翻譯的頁面描述
    "url": `${window.location.origin}/${currentLang}/market-sentiment`,
    "inLanguage": currentLang,
    "keywords": t('marketSentiment.keywords'), // 新增：關鍵字
    "mainEntity": {
      "@type": "Article",
      "headline": t('marketSentiment.heading'), // 使用翻譯的主要標題
      "author": {
        "@type": "Organization",
        "name": "Sentiment Inside Out"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Sentiment Inside Out",
        "logo": {
          "@type": "ImageObject",
          "url": `${window.location.origin}/logo.png` // 假設您在 public 資料夾有 logo.png
        }
      },
      "datePublished": sentimentData?.compositeScoreLastUpdate ? new Date(sentimentData.compositeScoreLastUpdate).toISOString() : new Date().toISOString(),
      "dateModified": sentimentData?.compositeScoreLastUpdate ? new Date(sentimentData.compositeScoreLastUpdate).toISOString() : new Date().toISOString(),
      "image": `${window.location.origin}/images/market-sentiment-og.png` // 主要圖片
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${window.location.origin}/${currentLang}/market-sentiment?timeRange={timeRange}&indicator={indicator}`,
      "query-input": "required name=timeRange,indicator"
    }
  }), [t, currentLang, sentimentData?.compositeScoreLastUpdate]);

  const handleSliderChange = (newRange) => {
    setCurrentSliderRange(newRange);
    // Analytics event for slider change can be added here if needed
    /* Analytics.marketSentiment.sliderRangeChanged({
      startDate: new Date(newRange[0]).toISOString().split('T')[0],
      endDate: new Date(newRange[1]).toISOString().split('T')[0],
      currentIndicator: 'composite'
    }); */
  };

  const currentCompositeScore = sentimentData?.totalScore != null ? Math.round(sentimentData.totalScore) : null;
  const currentCompositeSentimentKey = useMemo(
    () => getSentiment(currentCompositeScore),
    [currentCompositeScore]
  );
  const currentCompositeSentimentLabel = useMemo(
    () => t(currentCompositeSentimentKey),
    [currentCompositeSentimentKey, t]
  );
  const gaugeExplainerVariant = isRestrictedPreview ? 'snapshot' : 'current';
  const gaugeExplainerCopy = useMemo(() => ({
    title: t(`marketSentiment.gauge.explainer.${gaugeExplainerVariant}.title`, {
      date: formattedRestrictionCutoffDate,
      score: currentCompositeScore,
      sentiment: currentCompositeSentimentLabel
    }),
    subtitle: t(`marketSentiment.gauge.explainer.${gaugeExplainerVariant}.subtitle`, {
      date: formattedRestrictionCutoffDate,
      score: currentCompositeScore,
      sentiment: currentCompositeSentimentLabel
    }),
    sections: ['section1', 'section2', 'section3'].map((sectionKey) => ({
      title: t(`marketSentiment.gauge.explainer.${gaugeExplainerVariant}.${sectionKey}.title`, {
        date: formattedRestrictionCutoffDate,
        score: currentCompositeScore,
        sentiment: currentCompositeSentimentLabel
      }),
      body: t(`marketSentiment.gauge.explainer.${gaugeExplainerVariant}.${sectionKey}.body`, {
        date: formattedRestrictionCutoffDate,
        score: currentCompositeScore,
        sentiment: currentCompositeSentimentLabel
      })
    }))
  }), [currentCompositeScore, currentCompositeSentimentLabel, formattedRestrictionCutoffDate, gaugeExplainerVariant, t]);

  const comparisonSnapshots = useMemo(() => {
    return getCompositeComparisonSnapshots({
      currentScore: currentCompositeScore,
      historicalData,
      referenceDate: sentimentData?.compositeScoreLastUpdate,
      t
    });
  }, [currentCompositeScore, historicalData, sentimentData?.compositeScoreLastUpdate, t]);

  const indicatorEntries = useMemo(() => {
    return Object.entries(indicatorsData).filter(
      ([key]) => key !== 'Investment Grade Bond Yield' && key !== 'Junk Bond Yield'
    );
  }, [indicatorsData]);

  const sortedIndicatorEntries = useMemo(() => {
    return [...indicatorEntries].sort(([, a], [, b]) => {
      const aDistance = Math.abs((a?.percentileRank ?? 50) - 50);
      const bDistance = Math.abs((b?.percentileRank ?? 50) - 50);
      return bDistance - aDistance;
    });
  }, [indicatorEntries]);

  const selectedIndicatorEntry = useMemo(() => {
    if (!selectedIndicatorKey) {
      return sortedIndicatorEntries[0] || null;
    }

    return sortedIndicatorEntries.find(([key]) => key === selectedIndicatorKey) || sortedIndicatorEntries[0] || null;
  }, [selectedIndicatorKey, sortedIndicatorEntries]);

  const handleIndicatorCardSelect = useCallback((key) => {
    setSelectedIndicatorKey(key);

    if (isMobileViewport) {
      setIsMobileIndicatorSheetOpen(true);
    }
  }, [isMobileViewport]);

  const getIndicatorLabel = useCallback((key) => {
    return t(INDICATOR_TRANSLATION_KEY_MAP[key] || key);
  }, [t]);

  const getIndicatorDetailSummary = useCallback((key) => {
    const translationKey = INDICATOR_TRANSLATION_KEY_MAP[key];
    if (!translationKey) {
      return currentLang === 'zh-TW'
        ? '這個指標提供另一個觀察市場情緒的角度，重點不是單看高低，而是看它是否已經反映出市場過度一致的樂觀或悲觀。'
        : 'This indicator adds another way to read market sentiment. The point is not just the level itself, but whether it shows the crowd has become too one-sided in optimism or fear.';
    }
    const descriptionKey = translationKey.replace(/^indicators\./, '');
    return t(`marketSentiment.descriptions.${descriptionKey}.detailDescription`);
  }, [currentLang, t]);

  const indicatorTrendSummaries = useMemo(() => {
    const trendEndDate = isRestrictedPreview && restrictionCutoffDate
      ? restrictionCutoffDate
      : (latestAvailableHistoryTimestamp ? new Date(latestAvailableHistoryTimestamp) : new Date());
    const { start, end } = getTimeRangeBounds('1M', trendEndDate);
    const startTs = start.getTime();
    const endTs = end.getTime();

    return Object.fromEntries(
      Object.entries(indicatorTrendData).map(([key, points]) => {
        const trendPoints = (points || []).filter((point) => {
          const pointTs = point.date instanceof Date ? point.date.getTime() : new Date(point.date).getTime();
          return pointTs >= startTs && pointTs <= endTs && point.percentileRank != null;
        });

        if (trendPoints.length < 2) {
          return [key, {
            direction: 'flat',
            label: t('marketSentiment.indicators.trend.flat'),
            icon: '→'
          }];
        }

        const firstPoint = trendPoints[0];
        const lastPoint = trendPoints[trendPoints.length - 1];
        const direction = getTrendDirection((lastPoint.percentileRank ?? 0) - (firstPoint.percentileRank ?? 0));

        return [key, {
          direction,
          label: t(`marketSentiment.indicators.trend.${direction}`),
          icon: direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
        }];
      })
    );
  }, [indicatorTrendData, isRestrictedPreview, latestAvailableHistoryTimestamp, restrictionCutoffDate, t]);

  const indicatorSentimentDistribution = useMemo(() => {
    const counts = {
      extremeFear: 0,
      fear: 0,
      neutral: 0,
      greed: 0,
      extremeGreed: 0
    };

    indicatorEntries.forEach(([, indicator]) => {
      if (indicator?.percentileRank == null) {
        return;
      }

      const sentimentKey = getSentiment(Math.round(indicator.percentileRank));
      const tone = sentimentKey.split('.').pop();

      if (Object.prototype.hasOwnProperty.call(counts, tone)) {
        counts[tone] += 1;
      }
    });

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    const fearSide = counts.extremeFear + counts.fear;
    const greedSide = counts.greed + counts.extremeGreed;

    let insightKey = 'mixed';

    if (fearSide - greedSide >= 2) {
      insightKey = 'fearDominant';
    } else if (greedSide - fearSide >= 2) {
      insightKey = 'greedDominant';
    } else if (counts.neutral >= Math.max(fearSide, greedSide)) {
      insightKey = 'balanced';
    }

    return {
      counts,
      total,
      insightKey
    };
  }, [indicatorEntries]);

  const updateHistoryOverlayPosition = useCallback(() => {
    const chart = historyChartRef.current;
    const chartArea = chart?.chartArea;
    const xScale = chart?.scales?.x;
    const overlayCard = historyOverlayCardRef.current;

    if (!chart || !chartArea || !xScale || !restrictionCutoffDate || !historyRestrictionWindow) {
      return;
    }

    const cutoffPixel = xScale.getPixelForValue(restrictionCutoffDate);
    const maskStart = Math.max(chartArea.left, Math.min(cutoffPixel, chartArea.right));
    const maskedWidth = Math.max(0, chartArea.right - maskStart);
    const nextMode = (() => {
      if (maskedWidth >= 220 || historyRestrictionWindow.fullyLocked) {
        return 'expanded';
      }
      if (maskedWidth >= 120) {
        return 'compact';
      }
      if (maskedWidth >= 84) {
        return 'minimal';
      }
      return 'hidden';
    })();

    setHistoryOverlayMode((prev) => (prev === nextMode ? prev : nextMode));

    if (nextMode === 'hidden') {
      return;
    }

    const cardWidth = overlayCard?.offsetWidth || (nextMode === 'minimal' ? 116 : nextMode === 'compact' ? 176 : 248);
    const cardHeight = overlayCard?.offsetHeight || (nextMode === 'minimal' ? 36 : nextMode === 'compact' ? 88 : 164);
    const horizontalPadding = 12;
    const verticalPadding = 12;

    const preferredLeft = maskedWidth > 0
      ? maskStart + maskedWidth / 2
      : (chartArea.left + chartArea.right) / 2;
    const preferredTop = (chartArea.top + chartArea.bottom) / 2;

    const minLeft = chartArea.left + (cardWidth / 2) + horizontalPadding;
    const maxLeft = chartArea.right - (cardWidth / 2) - horizontalPadding;
    const minTop = chartArea.top + (cardHeight / 2) + verticalPadding;
    const maxTop = chartArea.bottom - (cardHeight / 2) - verticalPadding;

    const nextLeft = minLeft <= maxLeft
      ? Math.min(Math.max(preferredLeft, minLeft), maxLeft)
      : (chartArea.left + chartArea.right) / 2;
    const nextTop = minTop <= maxTop
      ? Math.min(Math.max(preferredTop, minTop), maxTop)
      : (chartArea.top + chartArea.bottom) / 2;

    setHistoryOverlayPosition((prev) => (
      prev.top === nextTop && prev.left === nextLeft
        ? prev
        : { top: nextTop, left: nextLeft }
    ));
  }, [historyRestrictionWindow, restrictionCutoffDate]);

  useEffect(() => {
    if (heroView !== 'history' || !historyRestrictionWindow) {
      setHistoryOverlayMode('hidden');
    }
  }, [heroView, historyRestrictionWindow]);

  useEffect(() => {
    if (heroView !== 'history') {
      return undefined;
    }

    let frameId = requestAnimationFrame(() => {
      updateHistoryOverlayPosition();
    });

    const node = historyChartContainerRef.current;
    let observer;

    if (node && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        cancelAnimationFrame(frameId);
        frameId = requestAnimationFrame(() => {
          updateHistoryOverlayPosition();
        });
      });
      observer.observe(node);
    }

    return () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
    };
  }, [chartData, chartOptions, currentSliderRange, heroView, historyOverlayMode, historyRestrictionWindow, updateHistoryOverlayPosition]);

  // 1. 檢查載入狀態
  if (loading) {
    return (
      <div
        className="loading-container"
        style={{
          minHeight: '60vh', // 設定最小高度，減少頁腳跳動。你可以根據實際內容調整此值
          display: 'flex',
          flexDirection: 'column', // 讓文字在 spinner 下方
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px', // 增加一些內邊距，讓視覺效果好一點
        }}
      >
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  // 2. 新增：在載入完成後，檢查 sentimentData 是否存在
  // 如果 API 請求失敗，sentimentData 會是 null
  if (!sentimentData) {
    return (
      <div
        className="error-container"
        style={{
          minHeight: '60vh', // 同樣設定最小高度
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          textAlign: 'center', // 確保錯誤訊息文字居中
        }}
      >
        <span>{t('marketSentiment.error.fetchFailed')}</span>
      </div>
    );
  }

  return (
    <PageContainer
      title={t('marketSentiment.pageTitle')} // 更新：使用新的翻譯鍵
      description={t('marketSentiment.pageDescription')} // 更新：使用新的翻譯鍵
      keywords={t('marketSentiment.keywords')} // 更新：使用新的翻譯鍵
      ogImage="/images/market-sentiment-og.png"
      ogUrl={`${window.location.origin}/${currentLang}/market-sentiment`}
      jsonLd={marketSentimentJsonLd}
    >
      <div className="market-sentiment-view">
        <div className="composite-page-layout">
          <section className="overview-hero">
            <div className="left-panel">
              <div className="panel-header">
                <h1 className="panel-title">
                  <span className="panel-title-brand">Sentiment Inside Out (SIO)</span>
                  <span className="panel-title-index">
                    {currentLang === 'zh-TW' ? '恐懼貪婪指標' : 'Fear & Greed Index'}
                  </span>
                </h1>
                <p className="panel-description">{t('marketSentiment.pageSubtitle')}</p>
              </div>

              <div className="hero-workspace__tabs" role="tablist" aria-label={currentLang === 'zh-TW' ? '綜合情緒視角切換' : 'Composite sentiment views'}>
                <button
                  className={`hero-workspace__tab ${heroView === 'current' ? 'active' : ''}`}
                  onClick={() => setHeroView('current')}
                  role="tab"
                  aria-selected={heroView === 'current'}
                >
                  {currentLang === 'zh-TW' ? '最新市場情緒' : 'Latest market sentiment'}
                </button>
                <button
                  className={`hero-workspace__tab ${heroView === 'history' ? 'active' : ''}`}
                  onClick={() => {
                    setHeroView('history');
                    requestAdDisplay('marketSentimentHeroHistory', 1);
                  }}
                  role="tab"
                  aria-selected={heroView === 'history'}
                >
                  {currentLang === 'zh-TW' ? '歷史趨勢' : 'History'}
                </button>
              </div>

              {isRestrictedPreview && (
                <div className="market-sentiment-delay-banner">
                  <div className="market-sentiment-delay-banner__copy">
                    <h2 className="market-sentiment-delay-banner__title">
                      {t('marketSentiment.dataLimitation.bannerTitle', { date: formattedRestrictionCutoffDate })}
                    </h2>
                    <p className="market-sentiment-delay-banner__body">
                      {t('marketSentiment.dataLimitation.bannerBody')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="market-sentiment-delay-banner__button"
                    onClick={() => handleRestrictedFeatureClick('currentData', 'marketSentimentDelayBanner')}
                  >
                    {t('marketSentiment.dataLimitation.upgradeForLatest')}
                  </button>
                </div>
              )}

              <div className="gauge-sentiment-container">
                {heroView === 'current' ? (
                  <div className="gauge-sentiment-layout">
                    <div className="gauge-panel-slot">
                      <MarketSentimentGauge
                        sentimentData={sentimentData}
                        isDataLoaded={isDataLoaded}
                        initialRenderRef={initialRenderRef}
                        showAnalysisResult={false}
                        showLastUpdate={true}
                        headlineText={isRestrictedPreview
                          ? t('marketSentiment.dataLimitation.snapshotGaugeHeadline', { date: formattedRestrictionCutoffDate })
                          : t('marketSentiment.dataLimitation.currentGaugeHeadline')}
                        supplementaryContent={(comparisonSnapshots.previousDay || comparisonSnapshots.previousWeek || comparisonSnapshots.previousMonth || comparisonSnapshots.previousQuarter) ? (
                          <div className="panel-reference-block" aria-label={t('marketSentiment.gauge.comparison.ariaLabel')}>
                            <span className="panel-reference-label">
                              {isRestrictedPreview
                                ? t('marketSentiment.dataLimitation.historicalSnapshotLabel', { date: formattedRestrictionCutoffDate })
                                : (currentLang === 'zh-TW' ? '近期參考' : 'Recent Reference')}
                            </span>
                            <div className="panel-comparison-strip">
                              {comparisonSnapshots.previousDay && (
                                <div className="panel-comparison-card">
                                  <span className="panel-comparison-label">
                                    {t('marketSentiment.gauge.comparison.previousDay')}
                                  </span>
                                  <div className="panel-comparison-valueGroup">
                                    <span className="panel-comparison-score">
                                      {comparisonSnapshots.previousDay.score}
                                    </span>
                                    <span className={`panel-comparison-sentiment sentiment-${comparisonSnapshots.previousDay.sentimentKey.split('.').pop()}`}>
                                      {comparisonSnapshots.previousDay.sentimentLabel}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {comparisonSnapshots.previousWeek && (
                                <div className="panel-comparison-card">
                                  <span className="panel-comparison-label">
                                    {t('marketSentiment.gauge.comparison.previousWeek')}
                                  </span>
                                  <div className="panel-comparison-valueGroup">
                                    <span className="panel-comparison-score">
                                      {comparisonSnapshots.previousWeek.score}
                                    </span>
                                    <span className={`panel-comparison-sentiment sentiment-${comparisonSnapshots.previousWeek.sentimentKey.split('.').pop()}`}>
                                      {comparisonSnapshots.previousWeek.sentimentLabel}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {comparisonSnapshots.previousMonth && (
                                <div className="panel-comparison-card">
                                  <span className="panel-comparison-label">
                                    {t('marketSentiment.gauge.comparison.previousMonth')}
                                  </span>
                                  <div className="panel-comparison-valueGroup">
                                    <span className="panel-comparison-score">
                                      {comparisonSnapshots.previousMonth.score}
                                    </span>
                                    <span className={`panel-comparison-sentiment sentiment-${comparisonSnapshots.previousMonth.sentimentKey.split('.').pop()}`}>
                                      {comparisonSnapshots.previousMonth.sentimentLabel}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {comparisonSnapshots.previousQuarter && (
                                <div className="panel-comparison-card panel-comparison-card--desktopOnly">
                                  <span className="panel-comparison-label">
                                    {t('marketSentiment.gauge.comparison.previousQuarter')}
                                  </span>
                                  <div className="panel-comparison-valueGroup">
                                    <span className="panel-comparison-score">
                                      {comparisonSnapshots.previousQuarter.score}
                                    </span>
                                    <span className={`panel-comparison-sentiment sentiment-${comparisonSnapshots.previousQuarter.sentimentKey.split('.').pop()}`}>
                                      {comparisonSnapshots.previousQuarter.sentimentLabel}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                            {isRestrictedPreview && (
                              <div className="panel-reference-cta">
                                <p className="panel-reference-cta__text">
                                  {t('marketSentiment.dataLimitation.currentCardNote')}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : null}
                      />
                    </div>

                    <div
                      className={`panel-market-summary ${isMobileSummaryExpanded ? 'is-expanded' : ''}`}
                    >
                      {isMobileViewport && (
                        <button
                          type="button"
                          className="panel-market-summary__toggle"
                          onClick={() => setIsMobileSummaryExpanded((prev) => !prev)}
                          aria-expanded={isMobileSummaryExpanded}
                        >
                          <span className="panel-market-summary__toggleLabel">
                            {gaugeExplainerCopy.title}
                          </span>
                          <span className="panel-market-summary__toggleIcon" aria-hidden="true">
                            {isMobileSummaryExpanded ? '−' : '+'}
                          </span>
                        </button>
                      )}
                      <div className="panel-explainer-card">
                        <h3 className="panel-explainer-title">
                          {gaugeExplainerCopy.title}
                        </h3>
                        <p className="panel-explainer-subtitle">
                          {gaugeExplainerCopy.subtitle}
                        </p>
                        <div className="panel-explainer-sections">
                          {gaugeExplainerCopy.sections.map((section) => (
                            <div key={section.title} className="panel-explainer-section">
                              <h4 className="panel-explainer-sectionTitle">{section.title}</h4>
                              <p className="panel-explainer-body">
                                {section.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="hero-history-workspace">
                    <div className="history-workspace__controls hero-history-workspace__controls">
                      <TimeRangeSelector
                        selectedTimeRange={selectedTimeRange}
                        handleTimeRangeChange={handleTimeRangeChange}
                      />
                      {isRestrictedPreview && (
                        <p className="history-workspace__restriction-note">
                          {selectedTimeRange === '3M' || selectedTimeRange === '1M'
                            ? t('marketSentiment.dataLimitation.historyShortRangeNote', { date: formattedRestrictionCutoffDate })
                            : t('marketSentiment.dataLimitation.historyRangeNote', { date: formattedRestrictionCutoffDate })}
                        </p>
                      )}
                    </div>

                    <div ref={historyChartContainerRef} className="indicator-chart hero-history-workspace__chart">
                      <Line ref={historyChartRef} data={chartData} options={chartOptions} />
                      {historyRestrictionWindow && historyOverlayMode !== 'hidden' && (
                        <div
                          className={`history-restriction-overlay is-${historyOverlayMode}${historyRestrictionWindow.fullyLocked ? ' is-fully-locked' : ''}`}
                          style={historyOverlayPosition}
                        >
                          {historyOverlayMode === 'minimal' ? (
                            <button
                              ref={historyOverlayCardRef}
                              type="button"
                              className="history-restriction-overlay__pill"
                              onClick={() => handleRestrictedFeatureClick('currentData', 'marketSentimentHistoryOverlayMinimal')}
                            >
                              {t('marketSentiment.dataLimitation.overlayMinimalLabel')}
                            </button>
                          ) : (
                            <div ref={historyOverlayCardRef} className="history-restriction-overlay__card">
                              {historyOverlayMode === 'expanded' && (
                                <span className="history-restriction-overlay__eyebrow">
                                  {t('marketSentiment.dataLimitation.overlayEyebrow')}
                                </span>
                              )}
                              <strong className="history-restriction-overlay__title">
                                {historyOverlayMode === 'compact'
                                  ? t('marketSentiment.dataLimitation.overlayCompactTitle')
                                  : t('marketSentiment.dataLimitation.overlayTitle')}
                              </strong>
                              {historyOverlayMode === 'expanded' && (
                                <p className="history-restriction-overlay__body">
                                  {t('marketSentiment.dataLimitation.overlayBody', { date: formattedRestrictionCutoffDate })}
                                </p>
                              )}
                              <button
                                type="button"
                                className="history-restriction-overlay__button"
                                onClick={() => handleRestrictedFeatureClick('currentData', 'marketSentimentHistoryOverlay')}
                              >
                                {t('marketSentiment.dataLimitation.unlockLatestCta')}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {historicalData.length > 0 && sliderMinMax[1] > sliderMinMax[0] && (
                      <div className="slider-container hero-history-workspace__slider">
                        <Slider
                          range
                          min={sliderMinMax[0]}
                          max={sliderMinMax[1]}
                          value={currentSliderRange[0] === 0 ? sliderMinMax : currentSliderRange}
                          onChange={handleSliderChange}
                          allowCross={false}
                          trackStyle={[{ backgroundColor: '#C78F57' }]}
                          handleStyle={[{ borderColor: '#C78F57', backgroundColor: 'white' }, { borderColor: '#C78F57', backgroundColor: 'white' }]}
                          railStyle={{ backgroundColor: '#e9e9e9' }}
                        />
                        <div className="slider-labels">
                          <span>{currentSliderRange[0] !== 0 ? new Date(currentSliderRange[0]).toLocaleDateString(currentLang, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</span>
                          <span>{currentSliderRange[1] !== 0 ? new Date(currentSliderRange[1]).toLocaleDateString(currentLang, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</span>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

            </div>
          </section>

          <section className="market-workspace">
            <div className="market-workspace__header">
              <div className="market-workspace__intro">
                <h2 className="market-workspace__title">
                  {isRestrictedPreview
                    ? t('marketSentiment.indicators.snapshotTitle')
                    : t('marketSentiment.indicators.currentTitle')}
                </h2>
                <p className="market-workspace__description">
                  {isRestrictedPreview
                    ? t('marketSentiment.indicators.snapshotDescription', { date: formattedRestrictionCutoffDate })
                    : t('marketSentiment.indicators.currentDescription')}
                </p>
              </div>
            </div>

              <div className="market-workspace__body">
                <div className="indicators-workspace">
                  {isRestrictedPreview && (
                    <div className="market-workspace__restriction">
                      <div className="market-workspace__restrictionCopy">
                        <span className="market-workspace__restrictionEyebrow">
                          {t('marketSentiment.dataLimitation.compositionEyebrow')}
                        </span>
                        <p className="market-workspace__restrictionText">
                          {t('marketSentiment.dataLimitation.compositionBody', { date: formattedRestrictionCutoffDate })}
                        </p>
                      </div>
                    </div>
                  )}

                    <div className="indicators-workspace__list">
                      <div className="indicator-card-list">
                        {sortedIndicatorEntries.map(([key, ind]) => {
                          const sentimentKey = getSentiment(ind?.percentileRank ? Math.round(ind.percentileRank) : null);
                          const tone = sentimentKey.split('.').pop();
                          const percentile = ind?.percentileRank != null ? Math.round(ind.percentileRank) : null;
                          const isSelected = selectedIndicatorEntry?.[0] === key;

                          return (
                            <button
                              key={key}
                              type="button"
                              className={`indicator-summary-card ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => handleIndicatorCardSelect(key)}
                            >
                              <div className="indicator-summary-card__top">
                                <div className="indicator-summary-card__heading">
                                  <span className="indicator-summary-card__name">{getIndicatorLabel(key)}</span>
                                </div>
                                <div className="indicator-summary-card__scoreColumn">
                                  <span className="indicator-summary-card__score">
                                    {percentile != null ? `${percentile}%` : '-'}
                                  </span>
                                </div>
                              </div>
                              <div className="indicator-summary-card__meter" aria-hidden="true">
                                <div
                                  className={`indicator-summary-card__meterFill sentiment-${tone}`}
                                  style={{ width: `${Math.max(0, Math.min(percentile ?? 0, 100))}%` }}
                                />
                              </div>
                              <div className="indicator-summary-card__footer">
                                <span className={`indicator-summary-card__sentiment sentiment-${tone}`}>
                                  {t(sentimentKey)}
                                </span>
                                <span className={`indicator-summary-card__trend trend-${indicatorTrendSummaries[key]?.direction || 'flat'}`}>
                                  <span className="indicator-summary-card__trendIcon" aria-hidden="true">
                                    {indicatorTrendSummaries[key]?.icon || '→'}
                                  </span>
                                  <span>{indicatorTrendSummaries[key]?.label || t('marketSentiment.indicators.trend.flat')}</span>
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="indicator-distribution-card">
                        <span className="indicator-distribution-card__eyebrow">
                          {t(`marketSentiment.indicators.summary.${isRestrictedPreview ? 'snapshotEyebrow' : 'currentEyebrow'}`, {
                            date: formattedRestrictionCutoffDate
                          })}
                        </span>
                        <p className="indicator-distribution-card__text">
                          {t(`marketSentiment.indicators.summary.${isRestrictedPreview ? 'snapshotLine' : 'currentLine'}`, {
                            date: formattedRestrictionCutoffDate,
                            total: indicatorSentimentDistribution.total,
                            extremeFear: indicatorSentimentDistribution.counts.extremeFear,
                            fear: indicatorSentimentDistribution.counts.fear,
                            neutral: indicatorSentimentDistribution.counts.neutral,
                            greed: indicatorSentimentDistribution.counts.greed,
                            extremeGreed: indicatorSentimentDistribution.counts.extremeGreed
                          })}
                        </p>
                        <p className="indicator-distribution-card__insight">
                          {t(`marketSentiment.indicators.summary.${isRestrictedPreview ? 'snapshotInsight' : 'currentInsight'}.${indicatorSentimentDistribution.insightKey}`, {
                            date: formattedRestrictionCutoffDate
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="indicators-workspace__detail">
                      {selectedIndicatorEntry && (
                        <>
                          <div className="indicators-workspace__detailIntro">
                            <h3 className="indicators-workspace__detailTitle">
                              {getIndicatorLabel(selectedIndicatorEntry[0])}
                            </h3>
                            <p className="indicators-workspace__detailSummary">
                              {getIndicatorDetailSummary(selectedIndicatorEntry[0])}
                            </p>
                          </div>
                          <IndicatorItem
                            key={selectedIndicatorEntry[0]}
                            indicatorKey={selectedIndicatorEntry[0]}
                            indicator={selectedIndicatorEntry[1]}
                            selectedTimeRange={selectedTimeRange}
                            handleTimeRangeChange={handleTimeRangeChange}
                            historicalSPYData={historicalData}
                            isRestrictedPreview={isRestrictedPreview}
                            restrictionCutoffDate={sentimentData?.restrictionCutoffDate}
                          />
                        </>
                      )}
                    </div>
                </div>
              </div>
          </section>

          {isMobileViewport && isMobileIndicatorSheetOpen && selectedIndicatorEntry && (
            <div
              className="indicator-mobile-sheet-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="indicator-mobile-sheet-title"
              onClick={() => setIsMobileIndicatorSheetOpen(false)}
            >
              <div
                className="indicator-mobile-sheet"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="indicator-mobile-sheet__grabber" aria-hidden="true" />
                  <div className="indicator-mobile-sheet__header">
                  <div className="indicator-mobile-sheet__headerText">
                    <span className="indicator-mobile-sheet__eyebrow">
                      {isRestrictedPreview
                        ? t('marketSentiment.indicators.mobileEyebrowSnapshot', { date: formattedRestrictionCutoffDate })
                        : t('marketSentiment.indicators.mobileEyebrowCurrent')}
                    </span>
                    <h3
                      id="indicator-mobile-sheet-title"
                      className="indicator-mobile-sheet__title"
                    >
                      {getIndicatorLabel(selectedIndicatorEntry[0])}
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="indicator-mobile-sheet__close"
                    onClick={() => setIsMobileIndicatorSheetOpen(false)}
                    aria-label={currentLang === 'zh-TW' ? '關閉指標詳情' : 'Close indicator detail'}
                  >
                    ×
                  </button>
                </div>

                <div className="indicator-mobile-sheet__body">
                  <div className="indicators-workspace__detailIntro indicators-workspace__detailIntro--sheet">
                    <h3 className="indicators-workspace__detailTitle">
                      {getIndicatorLabel(selectedIndicatorEntry[0])}
                    </h3>
                    <p className="indicators-workspace__detailSummary">
                      {getIndicatorDetailSummary(selectedIndicatorEntry[0])}
                    </p>
                  </div>
                  <IndicatorItem
                    key={`mobile-${selectedIndicatorEntry[0]}`}
                    indicatorKey={selectedIndicatorEntry[0]}
                    indicator={selectedIndicatorEntry[1]}
                    selectedTimeRange={selectedTimeRange}
                    handleTimeRangeChange={handleTimeRangeChange}
                    historicalSPYData={historicalData}
                    isRestrictedPreview={isRestrictedPreview}
                    restrictionCutoffDate={sentimentData?.restrictionCutoffDate}
                  />
                </div>
              </div>
            </div>
          )}

          <MarketSentimentDescriptionSection
            activeIndicator={selectedIndicatorEntry ? selectedIndicatorEntry[0] : 'composite'}
            currentView="indicators"
            indicatorsData={indicatorsData}
            className="learn-layout"
          />
        </div>
      </div>
      {/* Feature Upgrade Dialog */}
      <FeatureUpgradeDialog
        isOpen={upgradeDialog.isOpen}
        type={upgradeDialog.type}
        context={upgradeDialog.context}
        onClose={handleUpgradeDialogClose}
        onUpgrade={handleUpgradeDialogUpgrade}
      />

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </PageContainer>
  );
};

export default MarketSentimentIndex;
