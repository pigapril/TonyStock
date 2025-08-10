import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import GaugeChart from 'react-gauge-chart';
import styled from 'styled-components';
import { getSentiment } from '../../../utils/sentimentUtils';
import './MarketSentimentGauge.css';

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

/**
 * MarketSentimentGauge - 獨立的市場情緒儀表板組件
 * * @param {Object} props - 組件屬性
 * @param {Object} props.sentimentData - 情緒數據對象
 * @param {number} props.sentimentData.totalScore - 總分數 (0-100)
 * @param {string} props.sentimentData.compositeScoreLastUpdate - 最後更新時間
 * @param {boolean} props.isDataLoaded - 數據是否已載入
 * @param {React.MutableRefObject} props.initialRenderRef - 初始渲染參考
 * @param {string} props.className - 額外的 CSS 類名
 * @param {string} props.size - 組件尺寸 ('small' | 'medium' | 'large')
 * @param {boolean} props.showAnalysisResult - 是否顯示分析結果
 * @param {boolean} props.showLastUpdate - 是否顯示最後更新時間
 */
const MarketSentimentGauge = ({
  sentimentData,
  isDataLoaded = false,
  initialRenderRef,
  className = '',
  size = 'medium',
  showAnalysisResult = true,
  showLastUpdate = true
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  // 互動功能狀態
  const [activeZone, setActiveZone] = useState(null);
  const [labelPosition, setLabelPosition] = useState({ top: 0, left: 0 });
  
  // 防抖和性能優化
  const debounceTimeoutRef = useRef(null);
  const isInteractionEnabledRef = useRef(true);
  const gaugeRenderKeyRef = useRef(0);

  // 將 kebab-case 轉換為 camelCase
  const kebabToCamel = (s) => s.replace(/-./g, (x) => x[1].toUpperCase());

  // 情緒區域配置
  const GAUGE_ZONES = {
    'extreme-fear': { range: [0, 20], color: '#0000FF' },
    'fear': { range: [20, 40], color: '#5B9BD5' },
    'neutral': { range: [40, 60], color: '#708090' },
    'greed': { range: [60, 80], color: '#F0B8CE' },
    'extreme-greed': { range: [80, 100], color: '#D24A93' }
  };

  // 計算針頭旋轉角度的函數
  const calculateNeedleRotation = (percent) => {
    const startAngle = -90;
    const endAngle = 90;
    const currentAngle = startAngle + (percent * (endAngle - startAngle));
    const angleOffset = 0;
    return currentAngle + angleOffset;
  };

  // 互動事件處理函數
  const handleZoneHover = useCallback((event, zone) => {
    try {
      if (!isInteractionEnabledRef.current) return;
      if (!GAUGE_ZONES[zone]) {
        console.warn(`Invalid zone: ${zone}`);
        return;
      }
      
      const gaugeContainerRect = event.currentTarget.closest('.gauge-chart-container').getBoundingClientRect();
      const x = event.clientX - gaugeContainerRect.left;
      const y = event.clientY - gaugeContainerRect.top;

      requestAnimationFrame(() => {
        setLabelPosition({ top: y, left: x });
        setActiveZone(zone);
      });
    } catch (error) {
      console.error('Error in handleZoneHover:', error);
    }
  }, [GAUGE_ZONES]);

  const handleZoneLeave = useCallback(() => {
    try {
      requestAnimationFrame(() => {
        setActiveZone(null);
      });
    } catch (error) {
      console.error('Error in handleZoneLeave:', error);
    }
  }, []);

  const handleZoneClick = useCallback((event, zone) => {
    try {
      if (!isInteractionEnabledRef.current) return;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      if (isTouchDevice) {
        handleZoneHover(event, zone);
        setTimeout(() => handleZoneLeave(), 2000);
      }
    } catch (error) {
      console.error('Error in handleZoneClick:', error);
    }
  }, [handleZoneHover, handleZoneLeave]);

  // 清理副作用
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // 在數據載入完成後啟用互動功能
  useEffect(() => {
    if (isDataLoaded && sentimentData) {
      const timer = setTimeout(() => {
        isInteractionEnabledRef.current = true;
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      isInteractionEnabledRef.current = false;
    }
  }, [isDataLoaded, sentimentData]);

  // 使用 useMemo 來避免 GaugeChart 重新渲染
  const gaugeChart = useMemo(() => {
    const gaugeId = `gauge-chart-${gaugeRenderKeyRef.current}`;
    gaugeRenderKeyRef.current++;
    
    return (
      <StyledGaugeChart
        id={gaugeId}
        nrOfLevels={5}
        colors={['#0000FF', '#5B9BD5', '#708090', '#F0B8CE', '#D24A93']}
        percent={sentimentData.totalScore / 100}
        arcWidth={0.3}
        cornerRadius={5}
        animDelay={0}
        hideText={true}
        needleTransitionDuration={!isDataLoaded || initialRenderRef.current ? 0 : 3000}
        needleTransition="easeElastic"
      />
    );
  }, [sentimentData.totalScore, isDataLoaded, initialRenderRef.current]);

  // 計算情緒相關數據
  const sentimentInfo = useMemo(() => {
    if (!sentimentData || sentimentData.totalScore == null) {
      return {
        sentimentKey: 'sentiment.neutral',
        sentiment: t('sentiment.neutral'),
        rawSentiment: 'neutral',
        score: 0
      };
    }

    const score = Math.round(sentimentData.totalScore);
    const sentimentKey = getSentiment(score);
    const sentiment = t(sentimentKey);
    const rawSentiment = sentimentKey.split('.').pop();

    return { sentimentKey, sentiment, rawSentiment, score };
  }, [sentimentData, t]);

  if (!sentimentData) {
    return (
      <div className={`market-sentiment-gauge ${className} size-${size} loading`}>
        <div className="gauge-loading-skeleton">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>{t('common.loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  if (sentimentData.totalScore == null) {
    return (
      <div className={`market-sentiment-gauge ${className} size-${size} error`}>
        <div className="gauge-error-state">
          <span>{t('marketSentiment.error.invalidData')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`market-sentiment-gauge ${className} size-${size}`}>
      <div className="gauge-chart-container" style={{ position: 'relative' }}>
        <div className="gauge-chart">
          <div className="gauge-chart-wrapper" style={{ isolation: 'isolate' }}>
            {gaugeChart}
          </div>
          
          <div className="gauge-interactive-overlay" role="group" aria-label={t('marketSentiment.gauge.interactiveZones')}>
            {Object.keys(GAUGE_ZONES).map((zone) => (
              <div
                key={zone}
                className={`interactive-zone interactive-zone-${zone}`}
                onMouseEnter={(e) => handleZoneHover(e, zone)}
                onMouseLeave={handleZoneLeave}
                onClick={(e) => handleZoneClick(e, zone)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleZoneClick(e, zone);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${t(`sentiment.${kebabToCamel(zone)}`)} ${t('marketSentiment.gauge.zone')}`}
                aria-describedby={`zone-description-${zone}`}
                data-zone={zone}
              />
            ))}
            
            {Object.keys(GAUGE_ZONES).map((zone) => (
              <div
                key={`desc-${zone}`}
                id={`zone-description-${zone}`}
                className="sr-only"
              >
                {t(`marketSentiment.gauge.zoneDescription.${kebabToCamel(zone)}`)}
              </div>
            ))}
          </div>

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
          {(() => {
            const rotation = calculateNeedleRotation(sentimentData.totalScore / 100);
            const uprightValueStyle = { transform: `rotate(${-rotation}deg)` };
            
            return (
              <div 
                className="gauge-value-rotator"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: !isDataLoaded || initialRenderRef.current ? 'none' : 'transform 3s ease-out'
                }}
              >
                <div className="custom-gauge-needle"></div>
                <div className="gauge-dynamic-value" style={uprightValueStyle}>
                  {sentimentInfo.score}
                </div>
              </div>
            );
          })()}
        </div>
        
        {/* 新的浮動標籤 */}
        {activeZone && (
          <div
            className={`floating-sentiment-label sentiment-${kebabToCamel(activeZone)}`}
            style={{
              top: `${labelPosition.top}px`,
              left: `${labelPosition.left}px`,
            }}
          >
            {t(`sentiment.${kebabToCamel(activeZone)}`)}
          </div>
        )}
      </div>

      {/* 將分析結果移至此處 */}
      {showAnalysisResult && (
        <div className="analysis-result">
          <div className="analysis-item">
            <span className="analysis-label">
              {t('marketSentiment.composite.sentimentLabel')}
            </span>
            <span className={`analysis-value sentiment-${sentimentInfo.rawSentiment}`}>
              {sentimentInfo.sentiment}
            </span>
          </div>
        </div>
      )}

      {showLastUpdate && sentimentData.compositeScoreLastUpdate && (
        <div className="last-update-time">
          {t('marketSentiment.lastUpdateLabel')}: {' '}
          {new Date(sentimentData.compositeScoreLastUpdate).toLocaleDateString(
            currentLang === 'zh-TW' ? 'zh-TW' : 'en-US'
          )}
        </div>
      )}
    </div>
  );
};

MarketSentimentGauge.propTypes = {
  sentimentData: PropTypes.shape({
    totalScore: PropTypes.number,
    compositeScoreLastUpdate: PropTypes.string
  }),
  isDataLoaded: PropTypes.bool,
  initialRenderRef: PropTypes.shape({
    current: PropTypes.bool
  }),
  className: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  showAnalysisResult: PropTypes.bool,
  showLastUpdate: PropTypes.bool
};

MarketSentimentGauge.defaultProps = {
  sentimentData: null,
  isDataLoaded: false,
  initialRenderRef: { current: true },
  className: '',
  size: 'medium',
  showAnalysisResult: true,
  showLastUpdate: true
};

export default MarketSentimentGauge;