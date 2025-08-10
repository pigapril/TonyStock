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
 * 
 * @param {Object} props - 組件屬性
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

  // 互動功能狀態 - 使用 useRef 來避免觸發重新渲染
  const [activeZone, setActiveZone] = useState(null);
  const [showInteractiveLabel, setShowInteractiveLabel] = useState(false);
  
  // 防抖和性能優化
  const debounceTimeoutRef = useRef(null);
  const isInteractionEnabledRef = useRef(true);
  const gaugeRenderKeyRef = useRef(0);

  // 情緒區域配置
  const GAUGE_ZONES = {
    'extreme-fear': {
      range: [0, 20],
      color: '#0000FF',
      useExistingLabel: true
    },
    'fear': {
      range: [20, 40], 
      color: '#5B9BD5'
    },
    'neutral': {
      range: [40, 60],
      color: '#708090'
    },
    'greed': {
      range: [60, 80],
      color: '#F0B8CE'
    },
    'extreme-greed': {
      range: [80, 100],
      color: '#D24A93',
      useExistingLabel: true
    }
  };

  // 計算針頭旋轉角度的函數
  const calculateNeedleRotation = (percent) => {
    // react-gauge-chart 的角度計算
    const startAngle = -90; // 左邊
    const endAngle = 90;    // 右邊
    const currentAngle = startAngle + (percent * (endAngle - startAngle));
    
    // 添加偏移量來對齊實際的 needle
    const angleOffset = 0; // 可以調整這個值，比如 +10 或 -10
    const finalAngle = currentAngle + angleOffset;
    
    return finalAngle;
  };

  // 互動事件處理函數 - 完全隔離以避免重新渲染
  const handleZoneHover = useCallback((zone) => {
    try {
      // 檢查互動是否啟用
      if (!isInteractionEnabledRef.current) return;
      
      // 避免重複設置相同的 zone
      if (activeZone === zone) return;
      
      // 清除之前的防抖計時器
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // 立即更新狀態，不使用防抖
      if (!GAUGE_ZONES[zone]) {
        console.warn(`Invalid zone: ${zone}`);
        return;
      }
      
      // 使用 requestAnimationFrame 來避免阻塞渲染
      requestAnimationFrame(() => {
        setActiveZone(zone);
        
        // 如果是極度情緒，高亮現有標籤；否則顯示互動標籤
        if (GAUGE_ZONES[zone].useExistingLabel) {
          setShowInteractiveLabel(false);
        } else {
          setShowInteractiveLabel(true);
        }
      });
    } catch (error) {
      console.error('Error in handleZoneHover:', error);
    }
  }, [GAUGE_ZONES, activeZone]);

  const handleZoneLeave = useCallback(() => {
    try {
      // 避免重複設置
      if (activeZone === null && !showInteractiveLabel) return;
      
      // 清除防抖計時器
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // 使用 requestAnimationFrame 來避免阻塞渲染
      requestAnimationFrame(() => {
        setActiveZone(null);
        setShowInteractiveLabel(false);
      });
    } catch (error) {
      console.error('Error in handleZoneLeave:', error);
    }
  }, [activeZone, showInteractiveLabel]);

  const handleZoneClick = useCallback((zone) => {
    try {
      // 檢查互動是否啟用
      if (!isInteractionEnabledRef.current) return;
      
      // 觸控設備的點擊處理
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      if (isTouchDevice) {
        handleZoneHover(zone);
        // 2秒後自動隱藏
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
      // 延遲啟用互動功能，確保 gauge 動畫完成
      const timer = setTimeout(() => {
        isInteractionEnabledRef.current = true;
      }, 3500); // 比 gauge 動畫稍長一點
      
      return () => clearTimeout(timer);
    } else {
      isInteractionEnabledRef.current = false;
    }
  }, [isDataLoaded, sentimentData]);

  // 使用 useMemo 來避免 GaugeChart 重新渲染，完全隔離互動狀態
  const gaugeChart = useMemo(() => {
    // 只在數據真正變化時才重新渲染
    const gaugeId = `gauge-chart-${gaugeRenderKeyRef.current}`;
    gaugeRenderKeyRef.current++;
    
    return (
      <StyledGaugeChart
        id={gaugeId}
        nrOfLevels={5}
        colors={[
          '#0000FF',  // 極度恐懼
          '#5B9BD5',  // 恐懼
          '#708090',  // 中性
          '#F0B8CE',  // 貪婪
          '#D24A93'   // 極度貪婪
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

    return {
      sentimentKey,
      sentiment,
      rawSentiment,
      score
    };
  }, [sentimentData, t]);

  // 如果沒有數據，顯示載入狀態
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

  // 如果數據無效，顯示錯誤狀態
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
      {showAnalysisResult && (
        <div className="analysis-result">
          <div className="analysis-item">
            <span className="analysis-label">
              {currentLang === 'zh-TW' ? '當前市場情緒' : 'Current Market Sentiment'}
            </span>
            <span className={`analysis-value sentiment-${sentimentInfo.rawSentiment}`}>
              {sentimentInfo.sentiment}
            </span>
          </div>
        </div>
      )}

      <div className="gauge-chart-container">
        <div className="gauge-chart">
          <div className="gauge-chart-wrapper" style={{ isolation: 'isolate' }}>
            {gaugeChart}
          </div>
          
          {/* 互動覆蓋層 */}
          <div className="gauge-interactive-overlay" role="group" aria-label={t('marketSentiment.gauge.interactiveZones')}>
            {Object.keys(GAUGE_ZONES).map((zone, index) => (
              <div
                key={zone}
                className={`interactive-zone interactive-zone-${zone} ${activeZone === zone ? 'active' : ''}`}
                onMouseEnter={() => handleZoneHover(zone)}
                onMouseLeave={handleZoneLeave}
                onClick={() => handleZoneClick(zone)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleZoneClick(zone);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${t(`sentiment.${zone.replace('-', '')}`)} ${t('marketSentiment.gauge.zone')}`}
                aria-describedby={`zone-description-${zone}`}
                data-zone={zone}
              />
            ))}
            
            {/* 隱藏的描述文字，供螢幕閱讀器使用 */}
            {Object.keys(GAUGE_ZONES).map((zone) => (
              <div
                key={`desc-${zone}`}
                id={`zone-description-${zone}`}
                className="sr-only"
              >
                {t(`marketSentiment.gauge.zoneDescription.${zone.replace('-', '')}`)}
              </div>
            ))}
          </div>

          {/* 互動標籤 */}
          {showInteractiveLabel && activeZone && (
            <div className={`interactive-label sentiment-${activeZone.replace('-', '')}`}>
              {t(`sentiment.${activeZone.replace('-', '')}`)}
            </div>
          )}
          
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

            // 建立一個 style 物件來做反向旋轉
            const uprightValueStyle = {
              transform: `rotate(${-rotation}deg)`
            };
            
            return (
              <div 
                className="gauge-value-rotator"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: !isDataLoaded || initialRenderRef.current ? 'none' : 'transform 3s ease-out'
                }}
              >
                {/* 自訂指針 */}
                <div className="custom-gauge-needle"></div>

                {/* 為顯示數值的圓圈加上 style */}
                <div 
                  className="gauge-dynamic-value"
                  style={uprightValueStyle}
                >
                  {sentimentInfo.score}
                </div>
              </div>
            );
          })()}
          <div className="gauge-labels">
            <span className={`gauge-label gauge-label-left ${activeZone === 'extreme-fear' ? 'highlighted' : ''}`}>
              {t('sentiment.extremeFear')}
            </span>
            <span className={`gauge-label gauge-label-right ${activeZone === 'extreme-greed' ? 'highlighted' : ''}`}>
              {t('sentiment.extremeGreed')}
            </span>
          </div>
        </div>
      </div>

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