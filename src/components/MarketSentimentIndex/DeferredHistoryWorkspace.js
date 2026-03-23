import React from 'react';
import { Line } from 'react-chartjs-2';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { useTranslation } from 'react-i18next';
import TimeRangeSelector from '../Common/TimeRangeSelector/TimeRangeSelector';
import { ensureHomeChartsRegistered } from '../../utils/homeChartRegistry';
import { ensureChartZoomRegistered } from '../../utils/chartZoomRegistry';
import { extremeFearPulsePlugin, restrictedWindowMaskPlugin } from './historyChartPlugins';

ensureHomeChartsRegistered();
ensureChartZoomRegistered();

function DeferredHistoryWorkspace({
  selectedTimeRange,
  handleTimeRangeChange,
  isRestrictedPreview,
  formattedRestrictionCutoffDate,
  historyChartContainerRef,
  historyChartRef,
  chartData,
  chartOptions,
  historyRestrictionWindow,
  historyOverlayMode,
  historyOverlayPosition,
  historyOverlayCardRef,
  handleRestrictedFeatureClick,
  historicalData,
  sliderMinMax,
  currentSliderRange,
  handleSliderChange
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  return (
    <div className="hero-history-workspace hero-panel-transition hero-panel-transition--history">
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
        <Line
          ref={historyChartRef}
          data={chartData}
          options={chartOptions}
          plugins={[restrictedWindowMaskPlugin, extremeFearPulsePlugin]}
        />
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
  );
}

export default DeferredHistoryWorkspace;
