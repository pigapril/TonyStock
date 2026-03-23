import React, { lazy, Suspense, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import ULBandChart from '../ULBandChart/ULBandChart';
import { ensureHomeChartsRegistered } from '../../utils/homeChartRegistry';
import { useDeferredFeature } from '../../hooks/useDeferredFeature';

ensureHomeChartsRegistered();

function isChartAttached(chart) {
  const canvas = chart?.canvas;
  const ownerDocument = canvas?.ownerDocument;

  return Boolean(canvas && ownerDocument?.contains(canvas));
}

const MemoizedULBandChart = React.memo(ULBandChart);
const PriceAnalysisChartEnhancements = lazy(() => import('./PriceAnalysisChartEnhancements'));

function PriceAnalysisChartWorkspace({
  isMobile,
  loading,
  isPending,
  chartRef,
  ulbandChartRef,
  chartCardRef,
  chartData,
  localizedChartData,
  lineChartOptions,
  ulbandData,
  activeChart,
  handleChartSwitch,
  displayedStockCode,
  analysisResult,
  analysisSentimentText,
  getSentimentSuffix,
  formatPrice,
  t
}) {
  const hasAnalysisContent = Boolean(loading || chartData || ulbandData);
  const shouldLoadEnhancements = useDeferredFeature({
    timeoutMs: 1800,
    useIdleCallback: true,
    triggerOnInteraction: true
  });
  const shouldRenderEnhancements = shouldLoadEnhancements && hasAnalysisContent;

  useEffect(() => {
    if (!loading && activeChart === 'ulband' && isChartAttached(ulbandChartRef.current)) {
      ulbandChartRef.current.update?.('none');
    }
  }, [activeChart, loading, ulbandChartRef]);

  return (
    <div className="chart-card" ref={chartCardRef}>
      <div className="chart-container">
        <div
          className={`chart-header ${hasAnalysisContent ? '' : 'chart-header--skeleton'}`}
          aria-hidden={!hasAnalysisContent}
        >
          <div className={`analysis-result ${hasAnalysisContent ? '' : 'analysis-result--skeleton'}`}>
            <div className="analysis-item">
              <span className="analysis-label">{t('priceAnalysis.result.stockCode')}</span>
              {hasAnalysisContent ? (
                <span className="analysis-value">{displayedStockCode}</span>
              ) : (
                <span className="analysis-value-skeleton" />
              )}
            </div>
            <div className="analysis-item">
              <span className="analysis-label">{t('priceAnalysis.result.stockPrice')}</span>
              {hasAnalysisContent ? (
                <span className="analysis-value">${formatPrice(analysisResult.price)}</span>
              ) : (
                <span className="analysis-value-skeleton" />
              )}
            </div>
            <div className="analysis-item">
              <span className="analysis-label">{t('priceAnalysis.result.marketSentiment')}</span>
              {hasAnalysisContent ? (
                <span className={`analysis-value sentiment-${getSentimentSuffix(analysisResult.sentimentKey)}`}>
                  {analysisSentimentText}
                </span>
              ) : (
                <span className="analysis-value-skeleton analysis-value-skeleton--wide" />
              )}
            </div>
          </div>
        </div>

        <div className="chart-content">
          <div
            className={`chart-tabs-row ${hasAnalysisContent ? '' : 'chart-tabs-row--skeleton'}`}
            aria-hidden={!hasAnalysisContent}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <div className="chart-tabs">
                <button
                  className={`chart-tab ${activeChart === 'sd' ? 'active' : ''}`}
                  onClick={() => handleChartSwitch('sd')}
                  disabled={loading || !hasAnalysisContent}
                >
                  {t('priceAnalysis.chart.tabs.sd')}
                </button>
                <button
                  className={`chart-tab ${activeChart === 'ulband' ? 'active' : ''}`}
                  onClick={() => handleChartSwitch('ulband')}
                  disabled={loading || !hasAnalysisContent}
                >
                  {t('priceAnalysis.chart.tabs.ulband')}
                </button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="chart-loading-indicator">
              <div className="loading-spinner">
                <div className="spinner"></div>
                <span>{isPending ? t('priceAnalysis.chart.loading.generating') : t('priceAnalysis.chart.loading.fetching')}</span>
              </div>
            </div>
          )}

          {!loading && activeChart === 'sd' && chartData && (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              {shouldRenderEnhancements ? (
                <Suspense fallback={null}>
                  <PriceAnalysisChartEnhancements
                    isMobile={isMobile}
                    chartRef={chartRef}
                    ulbandChartRef={ulbandChartRef}
                    chartData={chartData}
                    ulbandData={ulbandData}
                    activeChart={activeChart}
                  />
                </Suspense>
              ) : null}
              <Line
                ref={chartRef}
                data={localizedChartData || chartData}
                options={lineChartOptions}
              />
            </div>
          )}

          {!loading && activeChart === 'ulband' && ulbandData && (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              {shouldRenderEnhancements ? (
                <Suspense fallback={null}>
                  <PriceAnalysisChartEnhancements
                    isMobile={isMobile}
                    chartRef={chartRef}
                    ulbandChartRef={ulbandChartRef}
                    chartData={chartData}
                    ulbandData={ulbandData}
                    activeChart={activeChart}
                  />
                </Suspense>
              ) : null}
              <MemoizedULBandChart
                data={ulbandData}
                onChartReady={(chart) => { ulbandChartRef.current = chart; }}
              />
            </div>
          )}

          {!loading && !chartData && !ulbandData && (
            <div className="chart-placeholder">{t('priceAnalysis.prompt.enterSymbol')}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PriceAnalysisChartWorkspace;
