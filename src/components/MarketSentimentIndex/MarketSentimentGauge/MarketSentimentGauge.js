import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { getSentiment } from '../../../utils/sentimentUtils';
import './MarketSentimentGauge.css';

const GAUGE_SEGMENTS = [
  { zone: 'extreme-fear', start: 0, end: 20, color: '#0000FF' },
  { zone: 'fear', start: 20, end: 40, color: '#5B9BD5' },
  { zone: 'neutral', start: 40, end: 60, color: '#708090' },
  { zone: 'greed', start: 60, end: 80, color: '#F0B8CE' },
  { zone: 'extreme-greed', start: 80, end: 100, color: '#D24A93' }
];

const VIEWBOX = {
  width: 320,
  height: 220,
  cx: 160,
  cy: 168,
  radius: 108
};

const SEGMENT_GAP_SCORE = 1.3;

const clampScore = (score) => {
  if (score == null || Number.isNaN(score)) return 0;
  return Math.min(100, Math.max(0, score));
};

const scoreToAngle = (score) => 270 + (clampScore(score) * 180) / 100;

const polarToCartesian = (cx, cy, radius, angleInDegrees) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  };
};

const describeUpperArc = (cx, cy, radius, startScore, endScore) => {
  const startAngle = scoreToAngle(startScore);
  const endAngle = scoreToAngle(endScore);
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
};

const getSegmentRenderRange = (segment, index) => {
  const halfGap = SEGMENT_GAP_SCORE / 2;
  const start = index === 0 ? segment.start : segment.start + halfGap;
  const end = index === GAUGE_SEGMENTS.length - 1 ? segment.end : segment.end - halfGap;

  return { start, end };
};

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
  const [activeZone, setActiveZone] = useState(null);
  const [labelPosition, setLabelPosition] = useState({ top: 0, left: 0 });
  const isInteractionEnabledRef = useRef(true);

  useEffect(() => {
    if (isDataLoaded && sentimentData) {
      const timer = window.setTimeout(() => {
        isInteractionEnabledRef.current = true;
      }, 1200);
      return () => window.clearTimeout(timer);
    }

    isInteractionEnabledRef.current = false;
    return undefined;
  }, [isDataLoaded, sentimentData]);

  const sentimentInfo = useMemo(() => {
    if (!sentimentData || sentimentData.totalScore == null) {
      return {
        sentiment: t('sentiment.neutral'),
        rawSentiment: 'neutral',
        score: 0
      };
    }

    const score = Math.round(sentimentData.totalScore);
    const sentimentKey = getSentiment(score);

    return {
      sentiment: t(sentimentKey),
      rawSentiment: sentimentKey.split('.').pop(),
      score
    };
  }, [sentimentData, t]);

  const currentAngle = scoreToAngle(sentimentInfo.score);

  const markerPosition = useMemo(
    () => polarToCartesian(VIEWBOX.cx, VIEWBOX.cy, VIEWBOX.radius, currentAngle),
    [currentAngle]
  );

  const handleZoneHover = useCallback((event, zone) => {
    if (!isInteractionEnabledRef.current) {
      return;
    }

    const containerRect = event.currentTarget
      .closest('.msiArcGauge__frame')
      .getBoundingClientRect();

    requestAnimationFrame(() => {
      setLabelPosition({
        top: event.clientY - containerRect.top,
        left: event.clientX - containerRect.left
      });
      setActiveZone(zone);
    });
  }, []);

  const handleZoneLeave = useCallback(() => {
    requestAnimationFrame(() => {
      setActiveZone(null);
    });
  }, []);

  const handleZoneClick = useCallback((event, zone) => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isInteractionEnabledRef.current || !isTouchDevice) {
      return;
    }

    handleZoneHover(event, zone);
    window.setTimeout(() => handleZoneLeave(), 1600);
  }, [handleZoneHover, handleZoneLeave]);

  if (!sentimentData) {
    return (
      <div className={`market-sentiment-gauge ${className} size-${size} loading`}>
        <div className="msiArcGauge__state">
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
        <div className="msiArcGauge__state">
          <span>{t('marketSentiment.error.invalidData')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`market-sentiment-gauge ${className} size-${size}`} data-testid="msi-arc-gauge-root">
      <section className={`msiArcGauge msiArcGauge--${sentimentInfo.rawSentiment}`}>
        <div className="msiArcGauge__frame">
          <div className="msiArcGauge__headline">
            {currentLang === 'zh-TW' ? '當前股市情緒' : 'Current Market Sentiment'}
          </div>
          <div className="msiArcGauge__canvasWrap">
            <svg
              className="msiArcGauge__svg"
              viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
              aria-label={`${t('marketSentiment.composite.scoreLabel')} ${sentimentInfo.score}`}
              data-testid="msi-arc-gauge-svg"
            >
              <defs>
                <linearGradient id="msiArcGaugeTrack" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#eef2f7" />
                  <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
                <filter id="msiArcGaugeGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <path
                d={describeUpperArc(VIEWBOX.cx, VIEWBOX.cy, VIEWBOX.radius, 0, 100)}
                className="msiArcGauge__track"
              />

              {GAUGE_SEGMENTS.map((segment, index) => {
                const range = getSegmentRenderRange(segment, index);

                return (
                  <g key={segment.zone}>
                    <path
                      d={describeUpperArc(VIEWBOX.cx, VIEWBOX.cy, VIEWBOX.radius, range.start, range.end)}
                      className="msiArcGauge__segment"
                      style={{ '--msi-segment-color': segment.color }}
                    />
                    <path
                      d={describeUpperArc(VIEWBOX.cx, VIEWBOX.cy, VIEWBOX.radius, segment.start, segment.end)}
                      className="msiArcGauge__hitArea"
                      onMouseEnter={(event) => handleZoneHover(event, segment.zone)}
                      onMouseLeave={handleZoneLeave}
                      onClick={(event) => handleZoneClick(event, segment.zone)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleZoneClick(event, segment.zone);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${t(`sentiment.${segment.zone.replace(/-./g, (match) => match[1].toUpperCase())}`)} ${t('marketSentiment.gauge.zone')}`}
                    />
                  </g>
                );
              })}

              <g
                className={`msiArcGauge__locator msiArcGauge__locator--${sentimentInfo.rawSentiment}`}
                transform={`translate(${markerPosition.x}, ${markerPosition.y})`}
                aria-hidden="true"
              >
                <circle className="msiArcGauge__locatorAura" r="14" />
                <circle className="msiArcGauge__locatorBody" r="9" />
                <circle className="msiArcGauge__locatorCore" r="4.25" />
                <circle className="msiArcGauge__locatorShine" cx="-2.4" cy="-2.8" r="1.7" />
              </g>
            </svg>
          </div>

          <div className="msiArcGauge__coreBadge">
            <div className="msiArcGauge__scoreRow">
              <span className="msiArcGauge__score">{sentimentInfo.score}</span>
            </div>
            <span className={`msiArcGauge__coreStatus msiArcGauge__coreStatus--${sentimentInfo.rawSentiment}`}>
              {sentimentInfo.sentiment}
            </span>
            {showLastUpdate && sentimentData.compositeScoreLastUpdate && (
              <div className="msiArcGauge__lastUpdate">
                {t('marketSentiment.lastUpdateLabel')}: {' '}
                {new Date(sentimentData.compositeScoreLastUpdate).toLocaleDateString(
                  currentLang === 'zh-TW' ? 'zh-TW' : 'en-US'
                )}
              </div>
            )}
          </div>

          {activeZone && (
            <div
              className={`msiArcGauge__tooltip msiArcGauge__tooltip--${activeZone.replace(/-./g, (match) => match[1].toUpperCase())}`}
              style={{
                top: `${labelPosition.top}px`,
                left: `${labelPosition.left}px`
              }}
            >
              {t(`sentiment.${activeZone.replace(/-./g, (match) => match[1].toUpperCase())}`)}
            </div>
          )}
        </div>
      </section>

      {showAnalysisResult && (
        <div className="msiArcGauge__analysis">
          <div className="msiArcGauge__analysisItem">
            <span className="msiArcGauge__analysisLabel">
              {t('marketSentiment.composite.sentimentLabel')}
            </span>
            <span className={`msiArcGauge__analysisValue msiArcGauge__analysisValue--${sentimentInfo.rawSentiment}`}>
              {sentimentInfo.sentiment}
            </span>
          </div>
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
