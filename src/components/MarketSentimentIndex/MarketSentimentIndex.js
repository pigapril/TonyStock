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
import { Helmet } from 'react-helmet-async';
import { useAdContext } from '../Common/InterstitialAdModal/AdContext';
import { useTranslation } from 'react-i18next';
import { useToastManager } from '../Watchlist/hooks/useToastManager';
import { Toast } from '../Watchlist/components/Toast';
import { useDataLimitationToast } from './hooks/useDataLimitationToast';
import { formatPrice } from '../../utils/priceUtils';
import enhancedApiClient from '../../utils/enhancedApiClient';

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

// 引入 EmotionTag 組件
import EmotionTag from '../Common/EmotionTag';

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


// 在文件頂部添加這兩個常量
const BUBBLE_RADIUS = 155; // 控制泡泡圍繞的圓的半徑
const BUBBLE_Y_OFFSET = 0; // 控制泡泡的垂直偏移，正值向上移動，負值向下移動

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

// 新增：創建一個映射，將原始 key 映射到描述翻譯鍵中使用的簡化 key
const INDICATOR_DESCRIPTION_KEY_MAP = {
  'AAII Bull-Bear Spread': 'aaiiSpread',
  'CBOE Put/Call Ratio 5-Day Avg': 'cboeRatio',
  'Market Momentum': 'marketMomentum',
  'VIX MA50': 'vixMA50',
  'Safe Haven Demand': 'safeHaven',
  'Junk Bond Spread': 'junkBond',
  "S&P 500 COT Index": 'cotIndex',
  'NAAIM Exposure Index': 'naaimIndex',
};

const MarketSentimentIndex = () => {
  const { t, i18n } = useTranslation();
  const { showToast, toast, hideToast } = useToastManager();
  const { user, isAuthenticated } = useAuth();
  
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
  const [selectedTimeRange, setSelectedTimeRange] = useState('10Y');
  const [indicatorsData, setIndicatorsData] = useState({});
  const [historicalData, setHistoricalData] = useState([]);
  const [activeTab, setActiveTab] = useState('composite');
  const [viewMode, setViewMode] = useState('overview');
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

  // 新增：漸進式導覽步驟狀態 - 免費用戶預設顯示歷史趨勢
  const [compositeStep, setCompositeStep] = useState(isProUser ? 'composition' : 'history');
  // 新增：組成項目點擊後的 Modal 狀態
  const [selectedIndicatorKey, setSelectedIndicatorKeyInternal] = useState(null);

  // Throttling 相關 Refs
  const lastCallTimeRef = useRef(0);
  const throttleTimeoutRef = useRef(null);
  const THROTTLE_DELAY = 2000; // 1 秒的延遲

  // Throttled setSelectedIndicatorKey
  const setSelectedIndicatorKey = useCallback((newKey) => {
    const now = Date.now();
    clearTimeout(throttleTimeoutRef.current);

    if (now - lastCallTimeRef.current < THROTTLE_DELAY) {
      throttleTimeoutRef.current = setTimeout(() => {
        setSelectedIndicatorKeyInternal(newKey);
        lastCallTimeRef.current = Date.now();
      }, THROTTLE_DELAY - (now - lastCallTimeRef.current));
    } else {
      setSelectedIndicatorKeyInternal(newKey);
      lastCallTimeRef.current = now;
    }
  }, [THROTTLE_DELAY]);

  // Refs for swipe gesture
  const touchStartXRef = useRef(null);
  const touchEndXRef = useRef(null);
  const MIN_SWIPE_DISTANCE = 50;
  const currentModalContentRef = useRef(null);

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
        // 如果是訪問被拒絕的錯誤，顯示升級對話框
        if (error.response?.status === 403) {
          setUpgradeDialog({
            isOpen: true,
            type: 'marketSentimentAccess',
            context: {
              feature: 'currentData',
              source: 'apiError'
            }
          });
        } else {
          handleApiError(error, showToast, t);
        }
        setSentimentData(null);
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
  }, [showToast, t, isProUser]);

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
          const minTs = formattedData[0].date.getTime();
          const maxTs = formattedData[formattedData.length - 1].date.getTime();
          setSliderMinMax([minTs, maxTs]);
          // 初始化 currentSliderRange
          const initialRange = filterDataByTimeRange(formattedData, selectedTimeRange);
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

  // Keyboard and Swipe navigation for Modal
  useEffect(() => {
    if (!selectedIndicatorKey) {
      return;
    }

    const keys = Object.keys(indicatorsData);
    if (keys.length === 0 || !indicatorsData[selectedIndicatorKey]) {
      return;
    }
    const currentIndex = keys.indexOf(selectedIndicatorKey);
    if (currentIndex === -1) {
      return;
    }
    const prevIndicatorKey = keys[(currentIndex - 1 + keys.length) % keys.length];
    const nextIndicatorKey = keys[(currentIndex + 1) % keys.length];

    const handleKeyDown = (event) => {
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedIndicatorKey(prevIndicatorKey);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedIndicatorKey(nextIndicatorKey);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedIndicatorKeyInternal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const modalContentElement = currentModalContentRef.current;
    const handleTouchStart = (e) => {
      let target = e.target;
      while (target && target !== modalContentElement) {
        const style = window.getComputedStyle(target);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && target.scrollHeight > target.clientHeight) {
          touchStartXRef.current = null;
          return;
        }
        if (target.tagName === 'BUTTON' || target.tagName === 'A' || typeof target.onclick === 'function') {
          touchStartXRef.current = null;
          return;
        }
        // 新增：如果事件目標在圖表或 tooltip 相關元素內部，則不觸發 modal 切換
        if (target.classList &&
          (target.classList.contains('indicator-chart') ||
            target.classList.contains('tooltip') ||
            target.closest('.indicator-chart') ||
            target.closest('.tooltip'))
        ) {
          touchStartXRef.current = null;
          return;
        }
        target = target.parentElement;
      }
      if (e.targetTouches.length === 1) {
        touchStartXRef.current = e.targetTouches[0].clientX;
        touchEndXRef.current = e.targetTouches[0].clientX;
      } else {
        touchStartXRef.current = null;
      }
    };
    const handleTouchMove = (e) => {
      if (touchStartXRef.current === null || e.targetTouches.length !== 1) {
        return;
      }
      touchEndXRef.current = e.targetTouches[0].clientX;
    };
    const handleTouchEnd = () => {
      if (touchStartXRef.current === null || touchEndXRef.current === null) {
        return;
      }
      const distance = touchStartXRef.current - touchEndXRef.current;
      const isLeftSwipe = distance > MIN_SWIPE_DISTANCE;
      const isRightSwipe = distance < -MIN_SWIPE_DISTANCE;
      if (isLeftSwipe) {
        setSelectedIndicatorKey(nextIndicatorKey);
      } else if (isRightSwipe) {
        setSelectedIndicatorKey(prevIndicatorKey);
      }
      touchStartXRef.current = null;
      touchEndXRef.current = null;
    };

    if (modalContentElement) {
      modalContentElement.addEventListener('touchstart', handleTouchStart, { passive: true });
      modalContentElement.addEventListener('touchmove', handleTouchMove, { passive: true });
      modalContentElement.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (modalContentElement) {
        modalContentElement.removeEventListener('touchstart', handleTouchStart);
        modalContentElement.removeEventListener('touchmove', handleTouchMove);
        modalContentElement.removeEventListener('touchend', handleTouchEnd);
      }
      clearTimeout(throttleTimeoutRef.current);
    };
  }, [selectedIndicatorKey, indicatorsData, setSelectedIndicatorKey, currentModalContentRef, MIN_SWIPE_DISTANCE]);

  const handleTimeRangeChange = (e) => {
    Analytics.marketSentiment.changeTimeRange({
      timeRange: e.target.value,
      currentIndicator: activeTab
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
    ],
  }), [filteredData, t]);



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
    window.location.href = '/subscription';
  }, [handleCloseTutorial]);

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
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function (tooltipItem) {
            let label = tooltipItem.dataset.label || '';
            if (label) {
              label += ': ';
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
  }), [timeUnit, t]);

  // 新增：處理標籤切換的函數
  const handleTabChange = (tabKey) => {
    Analytics.marketSentiment.switchIndicator({
      indicatorName: tabKey,
      fromIndicator: activeTab
    });
    setActiveTab(tabKey);
  };

  // 修改：處理視圖模式切換的函數
  const handleViewModeChange = (mode) => {
    requestAdDisplay('marketSentimentViewModeChange', 1);
    Analytics.marketSentiment.switchViewMode({
      viewMode: mode,
      currentIndicator: activeTab
    });
    setViewMode(mode);
  };



  // 在組件渲染完成後將 initialRenderRef 設為 false
  useEffect(() => {
    if (isDataLoaded) {
      initialRenderRef.current = false;
    }
  }, [isDataLoaded]);

  // 免費用戶首次進入時顯示 tutorial 和數據限制提醒
  useEffect(() => {
    if (!isProUser && isDataLoaded && compositeStep === 'history') {
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
  }, [isProUser, isDataLoaded, compositeStep, showHistoricalDataToast]);







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
      currentIndicator: activeTab
    }); */
  };

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

  // 計算綜合指數的情緒鍵和翻譯
  // 只有在 sentimentData 確定存在後才執行這些計算
  const compositeSentimentKey = getSentiment(sentimentData.totalScore ? Math.round(sentimentData.totalScore) : null);
  const compositeSentiment = t(compositeSentimentKey);
  const compositeRawSentiment = compositeSentimentKey.split('.').pop(); // 用於 CSS class

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
        <div className="tabs-grid">
          <button
            className={`tab-button ${activeTab === 'composite' ? 'active' : ''}`}
            onClick={() => handleTabChange('composite')}
          >
            {t('marketSentiment.tabs.compositeIndex')}
          </button>
          {Object.keys(indicatorsData).map((key) => (
            key !== 'Investment Grade Bond Yield' && key !== 'Junk Bond Yield' && (
              <button
                key={key}
                className={`tab-button ${activeTab === key ? 'active' : ''}`}
                onClick={() => handleTabChange(key)}
              >
                {t(INDICATOR_TRANSLATION_KEY_MAP[key] || key)}
              </button>
            )
          ))}
        </div>
        <div className="content-layout-container">
          {activeTab === 'composite' ? (
            <>
              {/* 左側面板 */}
              <div className="left-panel">

                <div className="panel-header">
                  <h1 className="panel-title">
                    <span className="panel-title-brand">Sentiment Inside Out (SIO)</span>
                    <span className="panel-title-index">
                      {currentLang === 'zh-TW' ? '恐懼貪婪指標' : 'Fear & Greed Index'}
                    </span>
                  </h1>
                  <div className="panel-subtitle-container">
                    <p className="panel-subtitle">{t('marketSentiment.pageSubtitle')}</p>
                  </div>
                </div>

                <div className="gauge-sentiment-container">
                  {isProUser || (sentimentData && !sentimentData.isRestricted) ? (
                    <>
                      <MarketSentimentGauge
                        sentimentData={sentimentData}
                        isDataLoaded={isDataLoaded}
                        initialRenderRef={initialRenderRef}
                        showAnalysisResult={false}
                        showLastUpdate={false}
                      />

                      {/* Current Market Sentiment 和 Last Update Time */}
                      <div className="panel-subtitle-container">
                        <span className="panel-subtitle">
                          {currentLang === 'zh-TW' ? '目前的股市情緒是：' : 'Current Market Sentiment:'}
                        </span>
                        <span className={`panel-sentiment-value sentiment-${sentimentData && sentimentData.totalScore != null ? getSentiment(Math.round(sentimentData.totalScore)).split('.').pop() : 'neutral'}`}>
                          {sentimentData && sentimentData.totalScore != null ? t(getSentiment(Math.round(sentimentData.totalScore))) : t('sentiment.neutral')}
                        </span>
                        {/* Last Update Time - 在 Current Market Sentiment 下方 */}
                        {sentimentData && sentimentData.compositeScoreLastUpdate && (
                          <div className="panel-last-update-time">
                            {t('marketSentiment.lastUpdateLabel')}: {' '}
                            {new Date(sentimentData.compositeScoreLastUpdate).toLocaleDateString(
                              currentLang === 'zh-TW' ? 'zh-TW' : 'en-US'
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <RestrictedMarketSentimentGauge 
                      onUpgradeClick={() => handleRestrictedFeatureClick('gauge')}
                    />
                  )}
                </div>

              </div>

              {/* 右側面板 - 可切換內容 */}
              <div className="right-panel">
                <div className="view-mode-selector-container">
                  <button
                    className={`view-mode-button ${compositeStep === 'composition' ? 'active' : ''}`}
                    onClick={() => {
                      setCompositeStep('composition');
                      requestAdDisplay('marketSentimentCompositeComposition', 1);
                    }}
                  >
                    {t('marketSentiment.cta.composition')}
                  </button>
                  <button
                    className={`view-mode-button ${compositeStep === 'history' ? 'active' : ''}`}
                    onClick={() => {
                      setCompositeStep('history');
                      requestAdDisplay('marketSentimentCompositeHistory', 1);
                      // 免費用戶切換到歷史數據時顯示提醒
                      if (isFreeUser) {
                        showHistoricalDataToast();
                      }
                    }}
                  >
                    {t('marketSentiment.cta.history')}
                  </button>
                </div>

                <div className="content-area">
                  {compositeStep === 'history' && (
                    <div className="history-view">
                      <TimeRangeSelector
                        selectedTimeRange={selectedTimeRange}
                        handleTimeRangeChange={handleTimeRangeChange}
                      />
                      <div className="indicator-chart">
                        <Line data={chartData} options={chartOptions} />
                      </div>
                      {historicalData.length > 0 && sliderMinMax[1] > sliderMinMax[0] && (
                        <div className="slider-container">
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

                  {compositeStep === 'composition' && (
                    <div className="composition-view">
                      {isProUser || (sentimentData && !sentimentData.isRestricted) ? (
                        <div className="composition-list">
                          {Object.entries(indicatorsData).map(([key, ind], index) => {
                            const sentimentKey = getSentiment(ind.percentileRank ? Math.round(ind.percentileRank) : null);
                            const raw = sentimentKey.split('.').pop();
                            return (
                              <div
                                key={key}
                                className="composition-item"
                                onClick={() => setSelectedIndicatorKey(key)}
                                role="button"
                                tabIndex={0}
                              >
                                <span className="composition-name">{t(INDICATOR_TRANSLATION_KEY_MAP[key] || key)}</span>
                                <div className="composition-analysis-value">
                                  <div className="composition-bar-wrapper">
                                    <div
                                      className={`composition-bar sentiment-${raw}`}
                                      style={{ width: `${ind.percentileRank || 0}%` }}
                                    ></div>
                                  </div>
                                  <span className="composition-score-text">{ind.percentileRank ? `${Math.round(ind.percentileRank)}%` : '-'}</span>
                                </div>
                                <EmotionTag
                                  sentimentType={raw}
                                  sentimentText={t(sentimentKey)}
                                  percentileValue={null}
                                  isLoading={loading}
                                  onTagClick={() => setSelectedIndicatorKey(key)}
                                  showConnectionLine={false}
                                  animationDelay={index * 100}
                                  className="composition-emotion-tag"
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <RestrictedCompositionView 
                          onUpgradeClick={() => handleRestrictedFeatureClick('composition')}
                          indicatorCount={Object.keys(indicatorsData).length}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="tab-content">
              {activeTab !== 'composite' && indicatorsData[activeTab] && (
                <IndicatorItem
                  key={activeTab}
                  indicatorKey={activeTab}
                  indicator={indicatorsData[activeTab]}
                  selectedTimeRange={selectedTimeRange}
                  handleTimeRangeChange={handleTimeRangeChange}
                  historicalSPYData={historicalData}
                />
              )}
            </div>
          )}
        </div>

        {/* 新的底部說明區域 */}
        <MarketSentimentDescriptionSection
          activeIndicator={activeTab}
          currentView={compositeStep}
          indicatorsData={indicatorsData}
          className="bottom-layout"
        />
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
      {selectedIndicatorKey && (() => {
        const keys = Object.keys(indicatorsData);
        if (keys.length === 0) return null;
        const idx = keys.indexOf(selectedIndicatorKey);
        if (idx === -1) return null;

        const prevKeyForArrows = keys[(idx - 1 + keys.length) % keys.length];
        const nextKeyForArrows = keys[(idx + 1) % keys.length];

        return (
          <div
            className="composition-modal-overlay"
            onClick={() => setSelectedIndicatorKeyInternal(null)}
          >
            <div className="composition-carousel">
              <div
                className="composition-modal prev"
                onClick={e => { e.stopPropagation(); setSelectedIndicatorKey(prevKeyForArrows); }}
              >
                <IndicatorItem
                  indicatorKey={prevKeyForArrows}
                  indicator={indicatorsData[prevKeyForArrows]}
                  selectedTimeRange={selectedTimeRange}
                  handleTimeRangeChange={handleTimeRangeChange}
                  historicalSPYData={historicalData}
                  isInsideModal={true}
                />
              </div>
              <div
                className="carousel-arrow carousel-arrow--left"
                onClick={e => { e.stopPropagation(); setSelectedIndicatorKey(prevKeyForArrows); }}
              >◀</div>
              <div
                className="composition-modal current"
                onClick={e => e.stopPropagation()}
                ref={currentModalContentRef}
              >
                <button
                  className="modal-close-btn"
                  onClick={() => setSelectedIndicatorKeyInternal(null)}
                >×</button>
                <IndicatorItem
                  indicatorKey={selectedIndicatorKey}
                  indicator={indicatorsData[selectedIndicatorKey]}
                  selectedTimeRange={selectedTimeRange}
                  handleTimeRangeChange={handleTimeRangeChange}
                  historicalSPYData={historicalData}
                  isInsideModal={true}
                />
                <div className="modal-description">
                  <MarketSentimentDescriptionSection
                    activeIndicator={selectedIndicatorKey}
                    currentView="latest"
                    indicatorsData={indicatorsData}
                    className="side-layout"
                  />
                </div>
              </div>
              <div
                className="carousel-arrow carousel-arrow--right"
                onClick={e => { e.stopPropagation(); setSelectedIndicatorKey(nextKeyForArrows); }}
              >▶</div>
              <div
                className="composition-modal next"
                onClick={e => { e.stopPropagation(); setSelectedIndicatorKey(nextKeyForArrows); }}
              >
                <IndicatorItem
                  indicatorKey={nextKeyForArrows}
                  indicator={indicatorsData[nextKeyForArrows]}
                  selectedTimeRange={selectedTimeRange}
                  handleTimeRangeChange={handleTimeRangeChange}
                  historicalSPYData={historicalData}
                  isInsideModal={true}
                />
              </div>
            </div>
          </div>
        );
      })()}



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