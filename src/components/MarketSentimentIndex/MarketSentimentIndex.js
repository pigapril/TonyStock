import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { handleApiError } from '../../utils/errorHandler';
import { Analytics } from '../../utils/analytics';
import './MarketSentimentIndex.css';
import 'chartjs-adapter-date-fns';
import GaugeChart from 'react-gauge-chart';
import styled from 'styled-components';
import { ExpandableDescription } from '../Common/ExpandableDescription/ExpandableDescription';
import PageContainer from '../PageContainer';
import TimeRangeSelector from '../Common/TimeRangeSelector/TimeRangeSelector';
import { filterDataByTimeRange } from '../../utils/timeUtils';
import { getSentiment } from '../../utils/sentimentUtils';
import { Helmet } from 'react-helmet-async';

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
import IndicatorItem, { INDICATOR_NAME_MAP } from '../IndicatorItem/IndicatorItem';

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

// 定義指標描述的映射表
const INDICATOR_DESCRIPTION_MAP = {
  composite: {
    shortDescription: (
      <>
        分析市場情緒的目的，是因為當市場極度貪婪時，投資人往往忽視風險，股市泡沫隨之擴大，可能是賣出的時機。而當市場充滿恐懼時，投資人也容易過度悲觀，反而可能是買入的機會。
        <br />
        詳細說明可以參考以下文章：
        <a href="https://sentimentinsideout.com/articles/2.%E7%94%A8%E5%B8%82%E5%A0%B4%E6%83%85%E7%B7%92%E7%B6%9C%E5%90%88%E6%8C%87%E6%95%B8%E5%88%A4%E6%96%B7%E8%B2%B7%E8%B3%A3%E6%99%82%E6%A9%9F" target="_blank" rel="noopener noreferrer">
          用市場情緒綜合指數判斷買賣時機
        </a>
      </>
    ),
    sections: [
      {
        content: "回顧歷史數據，例如在金融海嘯期間股市最低點2009年3月、疫情爆發後股市最低點2020年3月、以及聯準會2022年的連續升息期間，市場情緒綜合指數都曾經低於10、甚至接近0，回頭看都是相當好的買點。市場情緒指標能幫助投資人了解當前市場的心理狀態。過度樂觀可能預示風險，而過度悲觀則可能帶來機會。"
      },
    ]
  },
  'AAII Bull-Bear Spread': {
    shortDescription: "AAII 投資者情緒調查，又稱美國散戶情緒指標。計算方式為看多者百分比減去看空者百分比。正值表示市場樂觀，負值表示市場悲觀。",
    sections: [
      {
        content: "AAII（美國個人投資者協會）每週進行的投資者情緒調查，旨在了解個人投資者對未來市場的看法。調查結果分為三類：看多、看空和中性。淨看多值是看多者百分比減去看空者百分比，數值愈高表示市場愈樂觀，愈低則表示市場愈悲觀。這項調查被廣泛用作市場情緒的指標，因為它能反映出散戶的心理狀態，並可能預示市場的未來走勢。過度的樂觀可能預示著市場的泡沫，而過度的悲觀則可能是潛在的買入機會。"
      },
    ]
  },
  'CBOE Put/Call Ratio 5-Day Avg': {
    shortDescription: "CBOE 買/賣權比例計算方式是將買入賣權（看空）合約數量除以買入買權（看多）合約數量。比例越低，表示投資者預期市場上漲，情緒偏樂觀。",
    sections: [
      {
        content: "CBOE 買/賣權比例衡量市場情緒的方式，是透過比較個股看跌期權（Put）和看漲期權（Call）的交易量。比例越低，表示投資者預期市場上漲，情緒偏樂觀。此指標將原始數值進行 5 日平均減少波動，以平緩指標的波動。"
      },
    ]
  },
  'Market Momentum': {
    shortDescription: "S&P500 市場動能衡量 S&P500 指數的動量。正值表示市場動能強勁，負值表示市場動能疲弱。",
    sections: [
      {
        content: "動能指標是藉由比較S&P500指數與其125日移動平均線，計算當前價格相對於長期平均的差異。正值表示樂觀趨勢，負值表示悲觀趨勢。"
      },
    ]
  },
  'VIX MA50': {
    shortDescription: "VIX 恐慌指數衡量市場對未來 30 天波動性的預期。VIX 通常被稱為「恐慌指數」，因為它在市場下跌時往往會飆升。",
    sections: [
      {
        content: "VIX 的數值越高，表示市場預期未來波動性越大，投資者對市場的未來走勢感到不安。此指標計算出 VIX 指數的 50 日移動平均線，平緩指標的波動。趨勢上升表示市場預期波動加大，情緒較為悲觀；下降則表示預期波動減小，情緒較為樂觀。"
      },
    ]
  },
  'Safe Haven Demand': {
    shortDescription: "債券需求衡量投資者對避險資產的需求。此指標數值愈高表示市場情緒愈樂觀。",
    sections: [
      {
        content: "避險需求指標衡量的是資金在股市與債市之間的流動。計算過去20日內股債報酬率的差異。正值表示資金入股市，情緒樂觀；負值表示流入債市，情緒悲觀。"
      },
    ]
  },
  'Junk Bond Spread': {
    shortDescription: "垃圾債殖利率差衡量高收益債券（又稱垃圾債券）與投資級債券之間的收益率差異。此數值愈低，表示利差縮小，表示市場情緒愈樂觀。",
    sections: [
      {
        content: "垃圾債券殖利率與投資級債券殖利率的利差。利差越小，表示風險偏好情緒上升，投資者願意承擔更多風險；利差越大，表示避險情緒上升，市場情緒偏悲觀。"
      },
    ]
  },
  "S&P 500 COT Index": {
    shortDescription: "S&P 500 期貨投機淨持倉指數，反映投機者與避險者之間的持倉差異。此數值愈高，表示市場情緒愈樂觀。",
    sections: [
      {
        content: "期貨投機淨持倉指數是一個衡量 S&P 500 期貨市場中投機者的淨持倉量的指標。正值表示投機者看多，負值表示投機者看空。這個指標可以幫助投資者了解市場中投機者的情緒。"
      },
    ]
  },
  'NAAIM Exposure Index': {
    shortDescription: "NAAIM 投資經理人曝險指數，反映專業投資經理人對美國股市的曝險程度。數值越高，代表經理人對市場更有信心，情緒樂觀。",
    sections: [
      {
        content: "NAAIM 經理人曝險指數是一個衡量 NAAIM 成員的股票曝險程度的指標。正值表示經理人看多，負值表示經理人看空。這個指標可以幫助投資者了解專業經理人對市場的看法。"
      },
    ]
  },
};

const MarketSentimentIndex = () => {
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1Y');
  const [indicatorsData, setIndicatorsData] = useState({});
  const [historicalData, setHistoricalData] = useState([]);
  const [activeTab, setActiveTab] = useState('composite'); // 新增：用於跟踪當前活動的標籤
  const [viewMode, setViewMode] = useState('overview'); // 修改：默認顯示概覽（最新情緒指數）
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const initialRenderRef = useRef(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchSentimentData() {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/market-sentiment`);
        
        if (isMounted) {
          setSentimentData(response.data);
          setIndicatorsData(response.data.indicators);
          // 使用 setTimeout 確保數據完全載入後再設置 isDataLoaded
          setTimeout(() => {
            setIsDataLoaded(true);
          }, 100);
        }
      } catch (error) {
        if (isMounted) {
          const handledError = handleApiError(error);
          Analytics.error({
            status: handledError.status,
            errorCode: handledError.errorCode,
            message: handledError.message,
            component: 'MarketSentimentIndex',
            action: 'fetchSentimentData'
          });
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
  }, []);
  
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
      } catch (error) {
        const handledError = handleApiError(error);
        Analytics.error({
          status: handledError.status,
          errorCode: handledError.errorCode,
          message: handledError.message,
          component: 'MarketSentimentIndex',
          action: 'fetchHistoricalData'
        });
      }
    }

    fetchHistoricalData();
  }, []);

  const handleTimeRangeChange = (e) => {
    Analytics.marketSentiment.changeTimeRange({
      timeRange: e.target.value,
      currentIndicator: INDICATOR_NAME_MAP[activeTab] || activeTab
    });
    setSelectedTimeRange(e.target.value);
  };

  const filteredData = filterDataByTimeRange(historicalData, selectedTimeRange);
  
  // 獲取時間單位
  const timeUnit = getTimeUnit(filteredData.map(item => item.date));

  // 構建圖表數據
  const chartData = {
    labels: filteredData.map((item) => item.date),
    datasets: [
      {
        label: '市場情緒指數',
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
        label: 'SPY 價格',
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
  };

  // 修改圖表選項
  const chartOptions = {
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
          maxRotation: 0,
          minRotation: 0
        }
      },
      'left-axis': {
        position: 'left',
        title: {
          display: true,
          text: '市場情緒指數',
        },
      },
      'right-axis': {
        position: 'right',
        title: {
          display: true,
          text: 'SPY 價格',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      tooltip: {
        mode: 'index',
        intersect: false,
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
          overScaleMode: 'x',
        },
        zoom: {
          wheel: {
            enabled: false,
          },
          pinch: {
            enabled: false,
          },
          mode: 'x',
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  // 新增：處理標籤切換的函數
  const handleTabChange = (tabKey) => {
    Analytics.marketSentiment.switchIndicator({
      indicatorName: INDICATOR_NAME_MAP[tabKey] || tabKey,
      fromIndicator: INDICATOR_NAME_MAP[activeTab] || activeTab
    });
    setActiveTab(tabKey);
  };

  // 新增：處理視圖模式切換的函數
  const handleViewModeChange = (mode) => {
    Analytics.marketSentiment.switchViewMode({
      viewMode: mode,
      currentIndicator: INDICATOR_NAME_MAP[activeTab] || activeTab
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

  // 根據 activeTab 獲取描述內容
  const currentDescription = INDICATOR_DESCRIPTION_MAP[activeTab] || INDICATOR_DESCRIPTION_MAP.composite;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>載入中...</span>
        </div>
      </div>
    );
  }

  if (!sentimentData) {
    return <div>未能獲取市場情緒數據。</div>;
  }

  return (
    <PageContainer>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "市場情緒分析",
            "description": "即時追蹤市場情緒，避免追高殺低。提供多個市場情緒指標，幫助投資人判斷當前市場情緒是恐懼還是貪婪。",
            "url": "https://sentimentinsideout.com/market-sentiment",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://sentimentinsideout.com/market-sentiment?timeRange={timeRange}&indicator={indicator}",
              "query-input": "required name=timeRange,indicator"
            }
          })}
        </script>
      </Helmet>
      <h1>市場情緒分析</h1>
      <div className="tabs-grid">
        <button
          className={`tab-button ${activeTab === 'composite' ? 'active' : ''}`}
          onClick={() => handleTabChange('composite')}
        >
          市場情緒綜合指數
        </button>
        {Object.keys(indicatorsData).map((key) => (
          key !== 'Investment Grade Bond Yield' && key !== 'Junk Bond Yield' && (
            <button
              key={key}
              className={`tab-button ${activeTab === key ? 'active' : ''}`}
              onClick={() => handleTabChange(key)}
            >
              {INDICATOR_NAME_MAP[key] || key} {/* 使用 INDICATOR_NAME_MAP 中的中文名稱 */}
            </button>
          )
        ))}
      </div>
      <div className="tab-content">
        {
          activeTab === 'composite' && (
            <div className="indicator-item">
              <h3>市場情緒綜合指數</h3>
              <div className="analysis-result">
                <div className="analysis-item">
                  <span className="analysis-label">恐懼貪婪分數</span>
                  <span className="analysis-value">
                    {sentimentData.totalScore ? Math.round(sentimentData.totalScore) : 'N/A'}
                  </span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">市場情緒</span>
                  <span className={`analysis-value sentiment-${getSentiment(Math.round(sentimentData.totalScore))}`}>{getSentiment(Math.round(sentimentData.totalScore))}</span>
                </div>
              </div>
              {viewMode === 'timeline' && (
                <TimeRangeSelector
                  selectedTimeRange={selectedTimeRange}
                  handleTimeRangeChange={handleTimeRangeChange}
                />
              )}
              <div className="indicator-chart-container">
                {viewMode === 'overview' ? (
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
                      <span className="gauge-label gauge-label-left">極度恐懼</span>
                      <span className="gauge-label gauge-label-right">極度貪婪</span>
                    </div>
                    <div className="last-update-time">
                      最後更新時間: {new Date(sentimentData.compositeScoreLastUpdate).toLocaleDateString('zh-TW')}
                    </div>
                  </div>
                ) : (
                  <div className="indicator-chart">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                )}
              </div>
              <div className="view-mode-selector-container">
                <button
                  className={`view-mode-button ${viewMode === 'overview' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('overview')}
                >
                  最新情緒指數
                </button>
                <button
                  className={`view-mode-button ${viewMode === 'timeline' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('timeline')}
                >
                  歷史數據
                </button>
              </div>
            </div>
          )
        }
        {Object.entries(indicatorsData).map(([key, indicator]) => (
          key !== 'Investment Grade Bond Yield' && key !== 'Junk Bond Yield' && activeTab === key && (
            <IndicatorItem
              key={key}
              indicatorKey={key}
              indicator={indicator}
              selectedTimeRange={selectedTimeRange}
              handleTimeRangeChange={handleTimeRangeChange}
              historicalSPYData={filteredData}
            />
          )
        ))}
      </div>
      <ExpandableDescription
        shortDescription={currentDescription.shortDescription}
        sections={currentDescription.sections}
        expandButtonText="了解更多"
        collapseButtonText="收合"
      />
    </PageContainer>
  );
};

export default MarketSentimentIndex;
