import React, { useMemo } from 'react';
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

  // 渲染 GaugeChart
  const renderGaugeChart = () => (
    <StyledGaugeChart
      id="gauge-chart"
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
            <span className="gauge-label gauge-label-left">
              {t('sentiment.extremeFear')}
            </span>
            <span className="gauge-label gauge-label-right">
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