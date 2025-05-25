import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { handleApiError } from '../../utils/errorHandler';
import { Analytics } from '../../utils/analytics';
import './MarketSentimentIndex.css';
import 'chartjs-adapter-date-fns';
import GaugeChart from 'react-gauge-chart';
import styled from 'styled-components';
import { ExpandableDescription } from '../Common/ExpandableDescription/ExpandableDescription';
import PageContainer from '../PageContainer/PageContainer';
import TimeRangeSelector from '../Common/TimeRangeSelector/TimeRangeSelector';
import { filterDataByTimeRange } from '../../utils/timeUtils';
import { getSentiment } from '../../utils/sentimentUtils';
import { Helmet } from 'react-helmet-async';
import { useAdContext } from '../Common/InterstitialAdModal/AdContext';
import { useTranslation } from 'react-i18next';
import { useToastManager } from '../Watchlist/hooks/useToastManager';
import { Toast } from '../Watchlist/components/Toast';
import { formatPrice } from '../../utils/priceUtils';

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

// 添加這行來定義 API_BASE_URL
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

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

// 使用 styled-components 創建自定義的 GaugeChart
const StyledGaugeChart = styled(GaugeChart)`
  .gauge-chart {
    .circle-outer {
      fill: none;
      stroke: #e6e6e6;
      stroke-width: 30;
    }
    .circle-inner {
      fill: none;
      stroke-width: 30;
      filter: url(#innerShadow);
    }
    .circle-inner-0 {
      stroke: url(#gradient-0);
    }
    .circle-inner-1 {
      stroke: url(#gradient-1);
    }
    .circle-inner-2 {
      stroke: url(#gradient-2);
    }
    .circle-inner-3 {
      stroke: url(#gradient-3);
    }
    .circle-inner-4 {
      stroke: url(#gradient-4);
    }
    .needle {
      fill: #464A4F;
    }
    .needle-base {
      fill: #464A4F;
    }
  }
`;

// 修改漸變色定義，從極度恐懼到極度貪婪
const gradients = [
  ['#143829', '#1A432F'],  // 極度恐懼 - 深墨綠色
  ['#2B5B3F', '#326B4A'],  // 恐懼 - 深綠色
  ['#E9972D', '#EBA542'],  // 中性 - 橙黃色
  ['#C4501B', '#D05E2A'],  // 貪婪 - 橙紅色
  ['#A0361B', '#B13D1F']   // 極度貪婪 - 深紅褐色
];

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
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1Y');
  const [indicatorsData, setIndicatorsData] = useState({});
  const [historicalData, setHistoricalData] = useState([]);
  const [activeTab, setActiveTab] = useState('composite');
  const [viewMode, setViewMode] = useState('overview');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const initialRenderRef = useRef(true);
  const { requestAdDisplay } = useAdContext();
  const currentLang = i18n.language;

  // 新增滑桿相關狀態
  const [sliderMinMax, setSliderMinMax] = useState([0, 0]); // [minTimestamp, maxTimestamp]
  const [currentSliderRange, setCurrentSliderRange] = useState([0, 0]); // [startTimestamp, endTimestamp]

  // 新增：漸進式導覽步驟狀態
  const [compositeStep, setCompositeStep] = useState('latest');
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
        const response = await axios.get(`${API_BASE_URL}/api/market-sentiment`);
        
        if (isMounted) {
          setSentimentData(response.data);
          setIndicatorsData(response.data.indicators);
          setTimeout(() => {
            setIsDataLoaded(true);
          }, 100);
        }
      } catch (error) {
        handleApiError(error, showToast, t);
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
  }, [showToast, t]);
  
  useEffect(() => {
    async function fetchHistoricalData() {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/composite-historical-data`);
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
        borderColor: '#C78F57',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          
          // 創建垂直漸層，使用相同顏色但不同透明度
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(199, 143, 87, 0)');     // #C78F57 完全透明
          gradient.addColorStop(0.5, 'rgba(199, 143, 87, 0.2)'); // #C78F57 半透明
          gradient.addColorStop(1, 'rgba(199, 143, 87, 0.4)');   // #C78F57 較不透明
          
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
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          
          // 創建垂直漸層
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(54, 162, 235, 0)');     // 完全透明
          gradient.addColorStop(0.5, 'rgba(54, 162, 235, 0.2)'); // 半透明
          gradient.addColorStop(1, 'rgba(54, 162, 235, 0.4)');   // 較不透明
          
          return gradient;
        },
        fill: true,
        tension: 0.4, // 增加曲線的平滑度
        pointRadius: 0,
      },
    ],
  }), [filteredData, t]);

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
          callback: function(value, index, values) {
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
          callback: function(value, index, values) {
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
          label: function(tooltipItem) {
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

  // 修改 GaugeChart
  const renderGaugeChart = () => (
    <StyledGaugeChart
      id="gauge-chart"
      nrOfLevels={5}
      colors={[
        '#143829',  // 極度恐懼
        '#2B5B3F',  // 恐懼
        '#E9972D',  // 中性
        '#C4501B',  // 貪婪
        '#A0361B'   // 極度貪婪
      ]}
      percent={sentimentData.totalScore / 100}
      arcWidth={0.3}
      cornerRadius={5}
      animDelay={0}
      hideText={true}
      needleTransitionDuration={!isDataLoaded || initialRenderRef.current ? 0 : 3000}
      needleTransition="easeElastic"
    />
  );

  // 在組件渲染完成後將 initialRenderRef 設為 false
  useEffect(() => {
    if (isDataLoaded) {
      initialRenderRef.current = false;
    }
  }, [isDataLoaded]);

  // 根據 activeTab 獲取描述內容的翻譯鍵
  const descriptionKey = useMemo(() => {
    if (activeTab === 'composite') {
      return 'composite';
    }
    return INDICATOR_DESCRIPTION_KEY_MAP[activeTab] || 'composite'; // Fallback to composite if key not found
  }, [activeTab]);

  const descriptionBasePath = useMemo(() => `marketSentiment.descriptions.${descriptionKey}`, [descriptionKey]);

  // 使用 t 函數獲取翻譯後的描述內容
  // 注意：這需要 i18next 配置支持 returnObjects: true
  const translatedShortDescription = useMemo(() => t(`${descriptionBasePath}.shortDescription`, { defaultValue: '' }), [t, descriptionBasePath]);
  const translatedSections = useMemo(() => {
    const sections = t(`${descriptionBasePath}.sections`, { returnObjects: true, defaultValue: [] });
    // 確保返回的是陣列，且每個元素都有 title 和 content
    if (Array.isArray(sections)) {
      return sections.map(section => ({
        title: section.title || '',
        content: section.content || ''
      }));
    }
    return [];
  }, [t, descriptionBasePath]);

  // 新增：決定 ExpandableDescription 的主標題
  const expandableMainTitle = useMemo(() => {
    if (activeTab === 'composite') {
      return t('marketSentiment.tabs.compositeIndex');
    }
    // Fallback to the key itself if translation is missing, though ideally all keys should be translated.
    return t(INDICATOR_TRANSLATION_KEY_MAP[activeTab] || activeTab, activeTab);
  }, [activeTab, t]);

  // 定義用於結構化數據的 JSON-LD
  const marketSentimentJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": t('pageTitle.marketSentiment'),
    "description": t('pageDescription.marketSentiment'),
    "url": `${window.location.origin}/${currentLang}/market-sentiment`,
    "inLanguage": currentLang,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${window.location.origin}/${currentLang}/market-sentiment?timeRange={timeRange}&indicator={indicator}`,
      "query-input": "required name=timeRange,indicator"
    }
  }), [t, currentLang]);

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
      title={t('marketSentiment.pageTitle')}
      description={t('marketSentiment.pageDescription')}
      keywords={t('marketSentiment.keywords')}
      ogImage="/images/market-sentiment-og.png"
      ogUrl={`${window.location.origin}/${currentLang}/market-sentiment`}
      jsonLd={marketSentimentJsonLd}
    >
      <div className="market-sentiment-view">
        <h1>{t('marketSentiment.heading')}</h1>
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
          <div className="tab-content">
            {
              activeTab === 'composite' && (
                <div className="indicator-item">
                  <h3>{t('marketSentiment.tabs.compositeIndex')}</h3>
                  <div className="analysis-result">
                    <div className="analysis-item">
                      <span className="analysis-label">{t('marketSentiment.composite.scoreLabel')}</span>
                      <span className="analysis-value">
                        {sentimentData.totalScore ? Math.round(sentimentData.totalScore) : t('common.notAvailable')}
                      </span>
                    </div>
                    <div className="analysis-item">
                      <span className="analysis-label">{t('marketSentiment.composite.sentimentLabel')}</span>
                      <span className={`analysis-value sentiment-${compositeRawSentiment}`}>{compositeSentiment}</span>
                    </div>
                  </div>
                  {compositeStep === 'history' && (
                    <TimeRangeSelector
                      selectedTimeRange={selectedTimeRange}
                      handleTimeRangeChange={handleTimeRangeChange}
                    />
                  )}
                  <div className="indicator-chart-container">
                    {compositeStep === 'latest' ? (
                      <div className="gauge-chart">
                        {renderGaugeChart()}
                        <svg width="0" height="0">
                          <defs>
                            <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
                              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                              <feOffset in="blur" dx="2" dy="2" result="offsetBlur" />
                              <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
                            </filter>
                            {gradients.map((gradient, index) => (
                              <linearGradient key={index} id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={gradient[0]} />
                                <stop offset="100%" stopColor={gradient[1]} />
                              </linearGradient>
                            ))}
                          </defs>
                        </svg>
                        <div className="gauge-center-value">
                          {Math.round(sentimentData.totalScore)}
                        </div>
                        <div className="gauge-labels">
                          <span className="gauge-label gauge-label-left">{t('sentiment.extremeFear')}</span>
                          <span className="gauge-label gauge-label-right">{t('sentiment.extremeGreed')}</span>
                        </div>
                        <div className="last-update-time">
                          {t('marketSentiment.lastUpdateLabel')}: {new Date(sentimentData.compositeScoreLastUpdate).toLocaleDateString('zh-TW')}
                        </div>
                      </div>
                    ) : compositeStep === 'history' ? (
                      <div className="indicator-chart">
                        <Line data={chartData} options={chartOptions} />
                      </div>
                    ) : compositeStep === 'composition' ? (
                      <div className="composition-list">
                        {Object.entries(indicatorsData).map(([key, ind]) => {
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
                              <span className={`composition-sentiment sentiment-${raw}`}>{t(sentimentKey)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  {compositeStep === 'history' && historicalData.length > 0 && sliderMinMax[1] > sliderMinMax[0] && (
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
                  <div className="view-mode-selector-container">
                    <button
                      className={`view-mode-button ${compositeStep === 'latest' ? 'active' : ''}`}
                      onClick={() => setCompositeStep('latest')}
                    >
                      {t('marketSentiment.cta.latestData')}
                    </button>
                    <button
                      className={`view-mode-button ${compositeStep === 'history' ? 'active' : ''}`}
                      onClick={() => {
                        setCompositeStep('history');
                        requestAdDisplay('marketSentimentCompositeHistory', 1);
                      }}
                    >
                      {t('marketSentiment.cta.history')}
                    </button>
                    <button
                      className={`view-mode-button ${compositeStep === 'composition' ? 'active' : ''}`}
                      onClick={() => {
                        setCompositeStep('composition');
                        requestAdDisplay('marketSentimentCompositeComposition', 1);
                      }}
                    >
                      {t('marketSentiment.cta.composition')}
                    </button>
                  </div>
                </div>
              )
            }
            {
              activeTab !== 'composite' && indicatorsData[activeTab] && (
                <IndicatorItem
                  key={activeTab}
                  indicatorKey={activeTab}
                  indicator={indicatorsData[activeTab]}
                  selectedTimeRange={selectedTimeRange}
                  handleTimeRangeChange={handleTimeRangeChange}
                  historicalSPYData={historicalData}
                />
              )
            }
          </div>
          <div className="description-container-wrapper">
            <div className="description-scroll-content">
              <ExpandableDescription
                mainTitle={expandableMainTitle}
                shortDescription={translatedShortDescription}
                sections={translatedSections}
              />
            </div>
          </div>
        </div>
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
                  <ExpandableDescription
                    mainTitle={t(INDICATOR_TRANSLATION_KEY_MAP[selectedIndicatorKey] || selectedIndicatorKey, selectedIndicatorKey)}
                    shortDescription={t(`marketSentiment.descriptions.${INDICATOR_DESCRIPTION_KEY_MAP[selectedIndicatorKey]}.shortDescription`)}
                    sections={t(`marketSentiment.descriptions.${INDICATOR_DESCRIPTION_KEY_MAP[selectedIndicatorKey]}.sections`, { returnObjects: true })}
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
    </PageContainer>
  );
};

export default MarketSentimentIndex;
