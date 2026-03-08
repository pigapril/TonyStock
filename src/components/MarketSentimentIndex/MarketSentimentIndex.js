import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { handleApiError } from '../../utils/errorHandler';
import { Analytics } from '../../utils/analytics';
import { useAuth } from '../Auth/useAuth';
import './MarketSentimentIndex.css';
import 'chartjs-adapter-date-fns';


import MarketSentimentDescriptionSection from './MarketSentimentDescriptionSection';
import MarketSentimentGauge from './MarketSentimentGauge';

import RestrictedMarketSentimentGauge from './RestrictedMarketSentimentGauge/RestrictedMarketSentimentGauge';
import RestrictedCompositionView from './RestrictedCompositionView/RestrictedCompositionView';
import DataRestrictionTutorial from './DataRestrictionTutorial/DataRestrictionTutorial';
import { FeatureUpgradeDialog } from '../Common/Dialog/FeatureUpgradeDialog';
import PageContainer from '../PageContainer/PageContainer';
import TimeRangeSelector from '../Common/TimeRangeSelector/TimeRangeSelector';
import { filterDataByTimeRange } from '../../utils/timeUtils';
import { getSentiment } from '../../utils/sentimentUtils';
import { useAdContext } from '../Common/InterstitialAdModal/AdContext';
import { useTranslation } from 'react-i18next';
import { useToastManager } from '../Watchlist/hooks/useToastManager';
import { Toast } from '../Watchlist/components/Toast';
import { useDataLimitationToast } from './hooks/useDataLimitationToast';
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

function buildSparklinePath(points, width = 148, height = 52, padding = 6) {
  if (!points || points.length === 0) {
    return '';
  }

  const values = points.map((point) => point.percentileRank ?? point.value ?? 0);

  if (points.length === 1) {
    const y = height / 2;
    return `M ${padding} ${y} L ${width - padding} ${y}`;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) {
    const y = height / 2;
    return points.map((_, index) => {
      const x = padding + (index / (points.length - 1)) * (width - padding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
  }

  return points.map((point, index) => {
    const value = values[index];
    const x = padding + (index / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

function getHistoricLowLabel(date, currentLang) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return currentLang === 'zh-TW'
    ? `${year}/${month} 恐慌低點`
    : `${year}/${month} panic low`;
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

const INDICATOR_WORKSPACE_COPY = {
  'AAII Bull-Bear Spread': {
    zh: '觀察散戶情緒是否過度偏向多方或空方。',
    en: 'Tracks whether retail sentiment is leaning too bullish or too bearish.'
  },
  'CBOE Put/Call Ratio 5-Day Avg': {
    zh: '反映市場避險需求與短期防禦情緒。',
    en: 'Reflects hedging demand and short-term defensive positioning.'
  },
  'Market Momentum': {
    zh: '衡量價格相對長期趨勢的位置與延伸程度。',
    en: 'Measures how far price has stretched relative to its long-term trend.'
  },
  'VIX MA50': {
    zh: '用波動率壓力判斷市場是否處於恐慌狀態。',
    en: 'Uses volatility pressure to gauge whether markets are under stress.'
  },
  'Safe Haven Demand': {
    zh: '比較風險資產與避險資產之間的資金流向。',
    en: 'Compares flows between risk assets and safe-haven assets.'
  },
  'Junk Bond Spread': {
    zh: '信用利差顯示投資人承擔風險的意願。',
    en: 'Credit spreads reveal how willing investors are to take risk.'
  },
  'S&P 500 COT Index': {
    zh: '從期貨部位看大型資金對股市的偏向。',
    en: 'Shows how large futures traders are positioned in equities.'
  },
  'NAAIM Exposure Index': {
    zh: '主動型經理人的曝險程度可反映專業資金信心。',
    en: 'Active manager exposure helps reveal professional risk appetite.'
  }
};

const getDefaultTimeRangeByViewport = () => {
  if (typeof window !== 'undefined' && window.innerWidth <= 768) {
    return '5Y';
  }

  return '10Y';
};

const MarketSentimentIndex = () => {
  const { t, i18n } = useTranslation();
  const { showToast, toast, hideToast } = useToastManager();
  const { user, checkAuthStatus } = useAuth();

  // 數據限制 Toast 提醒
  const {
    isFreeUser,
    showHistoricalDataToast,
    showUpgradeToast
  } = useDataLimitationToast(showToast);
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showTutorial, setShowTutorial] = useState(false);
  const [upgradeDialog, setUpgradeDialog] = useState({ isOpen: false, type: null, context: {} });
  const [selectedTimeRange, setSelectedTimeRange] = useState(() => getDefaultTimeRangeByViewport());
  const selectedTimeRangeRef = useRef(getDefaultTimeRangeByViewport());
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

  // 新增滑桿相關狀態
  const [sliderMinMax, setSliderMinMax] = useState([0, 0]); // [minTimestamp, maxTimestamp]
  const [currentSliderRange, setCurrentSliderRange] = useState([0, 0]); // [startTimestamp, endTimestamp]

  const [heroView, setHeroView] = useState('current');
  const [selectedIndicatorKey, setSelectedIndicatorKey] = useState(null);
  const [isMobileIndicatorSheetOpen, setIsMobileIndicatorSheetOpen] = useState(false);
  const gaugePanelRef = useRef(null);
  const [gaugePanelHeight, setGaugePanelHeight] = useState(null);
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
    selectedTimeRangeRef.current = selectedTimeRange;
  }, [selectedTimeRange]);

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

        if (formattedData.length > 0) {
          // 設定最早可顯示的日期為 2010年1月1日
          const earliestDate = new Date('2010-01-01');
          const minTs = Math.max(formattedData[0].date.getTime(), earliestDate.getTime());
          const maxTs = formattedData[formattedData.length - 1].date.getTime();
          setSliderMinMax([minTs, maxTs]);
          // 初始化 currentSliderRange
          const initialRange = filterDataByTimeRange(formattedData, selectedTimeRangeRef.current);
          if (initialRange.length > 0) {
            setCurrentSliderRange([initialRange[0].date.getTime(), initialRange[initialRange.length - 1].date.getTime()]);
          } else {
            setCurrentSliderRange([minTs, maxTs]);
          }
        }

      } catch (error) {
        handleApiError(error, showToast, t);
      }
    }

    fetchHistoricalData();
  }, [showToast, t]);

  // 當 selectedTimeRange 或 historicalData 變動時，更新滑桿的範圍
  useEffect(() => {
    if (historicalData.length === 0) return;

    const newFilteredRange = filterDataByTimeRange(historicalData, selectedTimeRange);
    if (newFilteredRange.length > 0) {
      setCurrentSliderRange([
        newFilteredRange[0].date.getTime(),
        newFilteredRange[newFilteredRange.length - 1].date.getTime()
      ]);
    } else if (sliderMinMax[0] !== 0 && sliderMinMax[1] !== 0) { // Fallback to full range if filter result is empty
      setCurrentSliderRange(sliderMinMax);
    }
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
    const canLoadIndicatorTrends = isProUser || Boolean(sentimentData && !sentimentData.isRestricted);

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
        const results = await Promise.all(
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

            const latestDate = normalized[normalized.length - 1].date;
            const thresholdDate = new Date(latestDate);
            thresholdDate.setMonth(thresholdDate.getMonth() - 3);
            const last3Months = normalized.filter((item) => item.date >= thresholdDate);

            return [key, last3Months];
          })
        );

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
  const timeUnit = useMemo(() => getTimeUnit(filteredData.map(item => item.date)), [filteredData]);

  // 構建圖表數據
  const chartData = useMemo(() => ({
    labels: filteredData.map((item) => item.date),
    datasets: [
      {
        label: t('marketSentiment.chart.compositeIndexLabel'),
        yAxisID: 'left-axis',
        data: filteredData.map((item) => item.compositeScore),
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
        data: filteredData.map((item) => item.spyClose),
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
      },
    ],
  }), [currentLang, filteredData, historicalLowPoints, t]);



  const handleRestrictedFeatureClick = useCallback((feature) => {
    Analytics.marketSentiment.restrictedFeatureClicked({
      feature,
      userPlan: effectiveUserPlan
    });

    // 顯示對應的 toast 提醒
    showUpgradeToast(feature);

    // 短暫延遲後顯示升級對話框
    setTimeout(() => {
      setUpgradeDialog({
        isOpen: true,
        type: 'marketSentimentAccess',
        context: {
          feature,
          source: 'marketSentimentIndex'
        }
      });
    }, 1500); // 1.5秒後顯示對話框，讓用戶先看到 toast
  }, [effectiveUserPlan, showUpgradeToast]);

  // Tutorial 處理函數
  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
    localStorage.setItem('marketSentiment_tutorialSeen', 'true');
  }, []);

  const handleTutorialUpgrade = useCallback(() => {
    handleCloseTutorial();
    Analytics.marketSentiment.upgradeClicked({
      source: 'marketSentimentTutorial'
    });
    window.location.href = `/${i18n.language}/subscription-plans`;
  }, [handleCloseTutorial, i18n.language]);

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
    window.location.href = `/${i18n.language}/subscription-plans`;
  }, [upgradeDialog.context, handleUpgradeDialogClose, i18n.language]);

  // 修改圖表選項
  const chartOptions = useMemo(() => ({
    scales: {
      x: {
        type: 'time',
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
  }), [currentLang, timeUnit, t]);

  // 在組件渲染完成後將 initialRenderRef 設為 false
  useEffect(() => {
    if (isDataLoaded) {
      initialRenderRef.current = false;
    }
  }, [isDataLoaded]);

  // 免費用戶首次進入時顯示 tutorial 和數據限制提醒
  useEffect(() => {
    if (!isProUser && isDataLoaded && heroView === 'history') {
      // 立即顯示數據限制提醒
      showHistoricalDataToast();

      // 檢查是否需要顯示 tutorial
      const hasSeenTutorial = localStorage.getItem('marketSentiment_tutorialSeen');
      if (!hasSeenTutorial) {
        const timer = setTimeout(() => {
          setShowTutorial(true);
        }, 1000); // 延遲1秒顯示，讓用戶先看到內容
        return () => clearTimeout(timer);
      }
    }
  }, [isProUser, isDataLoaded, heroView, showHistoricalDataToast]);







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
  const gaugeExplainerCopy = useMemo(() => ({
    title: t('marketSentiment.gauge.explainer.title'),
    subtitle: t('marketSentiment.gauge.explainer.subtitle'),
    sections: ['section1', 'section2', 'section3'].map((sectionKey) => ({
      title: t(`marketSentiment.gauge.explainer.${sectionKey}.title`),
      body: t(`marketSentiment.gauge.explainer.${sectionKey}.body`)
    }))
  }), [t]);
  const summaryPanelStyle = !isMobileViewport && gaugePanelHeight && gaugePanelHeight > 560
    ? { height: `${gaugePanelHeight}px`, maxHeight: `${gaugePanelHeight}px` }
    : undefined;

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

  const getIndicatorWorkspaceSummary = useCallback((key) => {
    const copy = INDICATOR_WORKSPACE_COPY[key];
    if (!copy) {
      return currentLang === 'zh-TW'
        ? '用來補足整體市場情緒的另一個觀察維度。'
        : 'Adds another lens for understanding the current market mood.';
    }
    return currentLang === 'zh-TW' ? copy.zh : copy.en;
  }, [currentLang]);

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

  const getIndicatorLabel = useCallback((key) => {
    return t(INDICATOR_TRANSLATION_KEY_MAP[key] || key);
  }, [t]);

  useEffect(() => {
    const node = gaugePanelRef.current;
    if (!node || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setGaugePanelHeight(Math.round(entry.contentRect.height));
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, [sentimentData, isDataLoaded, comparisonSnapshots]);

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

              <div className="gauge-sentiment-container">
                {heroView === 'current' ? (
                  isProUser || (sentimentData && !sentimentData.isRestricted) ? (
                  <div className="gauge-sentiment-layout">
                    <div ref={gaugePanelRef} className="gauge-panel-slot">
                      <MarketSentimentGauge
                        sentimentData={sentimentData}
                        isDataLoaded={isDataLoaded}
                        initialRenderRef={initialRenderRef}
                        showAnalysisResult={false}
                        showLastUpdate={true}
                        supplementaryContent={(comparisonSnapshots.previousDay || comparisonSnapshots.previousWeek || comparisonSnapshots.previousMonth || comparisonSnapshots.previousQuarter) ? (
                          <div className="panel-reference-block" aria-label={t('marketSentiment.gauge.comparison.ariaLabel')}>
                            <span className="panel-reference-label">
                              {currentLang === 'zh-TW' ? '近期參考' : 'Recent Reference'}
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
                          </div>
                        ) : null}
                      />
                    </div>

                    <div
                      className={`panel-market-summary ${isMobileSummaryExpanded ? 'is-expanded' : ''}`}
                      style={summaryPanelStyle}
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
                  <RestrictedMarketSentimentGauge
                    onUpgradeClick={() => handleRestrictedFeatureClick('gauge')}
                  />
                  )
                ) : (
                  <div className="hero-history-workspace">
                    <div className="history-workspace__controls hero-history-workspace__controls">
                      <TimeRangeSelector
                        selectedTimeRange={selectedTimeRange}
                        handleTimeRangeChange={handleTimeRangeChange}
                      />
                    </div>

                    <div className="indicator-chart hero-history-workspace__chart">
                      <Line data={chartData} options={chartOptions} />
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
                  {currentLang === 'zh-TW' ? '哪些指標在推動情緒' : 'Which indicators are driving sentiment'}
                </h2>
                <p className="market-workspace__description">
                  {currentLang === 'zh-TW'
                    ? 'SIO 恐懼貪婪指標由多個情緒子指標組成。你可以在這裡查看目前是哪些指標正在推動市場情緒，以及它們各自反映了什麼。'
                    : 'The SIO Fear & Greed Index is built from multiple sentiment sub-indicators. Explore which signals are driving market sentiment right now and what each of them is reflecting.'}
                </p>
              </div>
            </div>

            <div className="market-workspace__body">
              <div className="indicators-workspace">
                {isProUser || (sentimentData && !sentimentData.isRestricted) ? (
                  <>
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
                                  <span className="indicator-summary-card__summary">
                                    {getIndicatorWorkspaceSummary(key)}
                                  </span>
                                </div>
                                <div className="indicator-summary-card__scoreColumn">
                                  <span className="indicator-summary-card__score">
                                    {percentile != null ? `${percentile}%` : '-'}
                                  </span>
                                  <span className={`indicator-summary-card__sentiment sentiment-${tone}`}>
                                    {t(sentimentKey)}
                                  </span>
                                </div>
                              </div>
                              <div className="indicator-summary-card__sparkline" aria-hidden="true">
                                {indicatorTrendData[key]?.length > 1 ? (
                                  <svg
                                    className="indicator-summary-card__sparklineSvg"
                                    viewBox="0 0 148 52"
                                    preserveAspectRatio="none"
                                  >
                                    <path
                                      className="indicator-summary-card__sparklineTrack"
                                      d="M 6 26 L 142 26"
                                    />
                                    <path
                                      className={`indicator-summary-card__sparklinePath sentiment-${tone}`}
                                      d={buildSparklinePath(indicatorTrendData[key])}
                                    />
                                  </svg>
                                ) : (
                                  <span className="indicator-summary-card__sparklineEmpty">
                                    {currentLang === 'zh-TW' ? '載入近 3 個月趨勢中' : 'Loading 3M trend'}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
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
                          />
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <RestrictedCompositionView
                    onUpgradeClick={() => handleRestrictedFeatureClick('composition')}
                    indicatorCount={Object.keys(indicatorsData).length}
                  />
                )}
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
                      {currentLang === 'zh-TW' ? '指標詳情' : 'Indicator detail'}
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

      {/* Tutorial for free users */}
      {showTutorial && (
        <DataRestrictionTutorial
          onClose={handleCloseTutorial}
          onUpgradeClick={handleTutorialUpgrade}
        />
      )}
    </PageContainer>
  );
};

export default MarketSentimentIndex;
