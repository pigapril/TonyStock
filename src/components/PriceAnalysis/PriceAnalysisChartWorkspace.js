import React, { lazy, Suspense, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import ULBandChart from '../ULBandChart/ULBandChart';
import { ensureHomeChartsRegistered } from '../../utils/homeChartRegistry';
import { useDeferredFeature } from '../../hooks/useDeferredFeature';
import { ensureCrosshairRegistered, linkCharts } from '../../utils/linkedCrosshair';
import InfoPopover from './InfoPopover';

ensureHomeChartsRegistered();
ensureCrosshairRegistered();

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
  bandXRange,
  onAfterZoom,
  displayedStockCode,
  analysisResult,
  analysisSentimentText,
  getSentimentSuffix,
  combinedStateKey,
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
  const contentRef = useRef(null);

  // 兩張圖是 flex 項目，初次掛載時高度還沒算出來（flex-basis 0），
  // Chart.js 會先用一個接近 0 的尺寸建圖，畫面就被擠成一條。
  // 掛載後補量一次，並讓通道圖套用主圖當下的 x 範圍。
  useEffect(() => {
    if (loading) {
      return undefined;
    }

    const resync = () => {
      const main = chartRef.current;
      const band = ulbandChartRef.current;

      if (isChartAttached(main)) {
        main.resize?.();
      }
      if (!isChartAttached(band)) {
        return;
      }

      band.resize?.();
      band.update('none');
    };

    // 載入過程中容器會有一段寬度為 0 的時間，Chart.js 在那時建圖就會把
    // chartArea 定成接近 0，之後不會自己修正。用 ResizeObserver 等寬度真的
    // 出現再重新量；rAF 與延遲補跑是給 observer 不可用時的保險。
    const node = contentRef.current;
    let observer;
    if (node && typeof window.ResizeObserver === 'function') {
      observer = new window.ResizeObserver(resync);
      observer.observe(node);
    }

    const raf = window.requestAnimationFrame(resync);
    const timer = window.setTimeout(resync, 400);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  // 依賴刻意不含 bandXRange：縮放後跟著重跑 resize() 會把剛做的縮放洗掉。
  // 範圍同步已經由 xRange prop 負責，這個 effect 只管初次排版的尺寸。
  }, [chartRef, loading, chartData, ulbandData, ulbandChartRef]);

  // 兩張圖共用一條垂直標線：游標在任一張圖上移動時，另一張圖同步顯示同一個
  // 時間點的價格。日線 vs 週線粒度不同，所以用時間值對應而不是 index。
  useEffect(() => {
    if (loading || !chartData || !ulbandData) {
      return undefined;
    }

    let unlink;
    const timer = window.setTimeout(() => {
      unlink = linkCharts(() => [chartRef.current, ulbandChartRef.current]);
    }, 450);

    return () => {
      window.clearTimeout(timer);
      unlink?.();
    };
  }, [chartRef, loading, chartData, ulbandData, ulbandChartRef]);

  return (
    <>
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
              <span className="analysis-label">
                {t('priceAnalysis.result.marketSentiment')}
                <InfoPopover
                  label={t('priceAnalysis.description.sd.title')}
                  title={t('priceAnalysis.description.sd.title')}
                  points={[
                    t('priceAnalysis.description.sd.point1'),
                    t('priceAnalysis.description.sd.point2'),
                    t('priceAnalysis.description.sd.point3'),
                    t('priceAnalysis.description.sd.point4')
                  ]}
                />
              </span>
              {hasAnalysisContent ? (
                <span className={`analysis-value sentiment-${getSentimentSuffix(analysisResult.sentimentKey)}`}>
                  {analysisSentimentText}
                </span>
              ) : (
                <span className="analysis-value-skeleton analysis-value-skeleton--wide" />
              )}
            </div>
            {/* 通道位置自成一欄，與情緒並列。掛在情緒值後面會讓兩個等重的資訊擠在一起。 */}
            <div className="analysis-item">
              <span className="analysis-label">
                {t('priceAnalysis.result.channelPosition')}
                <InfoPopover
                  label={t('priceAnalysis.description.ulband.title')}
                  title={t('priceAnalysis.description.ulband.title')}
                  points={[
                    t('priceAnalysis.description.ulband.point1'),
                    t('priceAnalysis.description.ulband.point2'),
                    t('priceAnalysis.description.ulband.point3')
                  ]}
                />
              </span>
              {hasAnalysisContent && analysisResult.channelState ? (
                <span className={`analysis-value channel-value channel-value--${analysisResult.channelState}`}>
                  {t(`priceAnalysis.channel.${analysisResult.channelState}`)}
                </span>
              ) : (
                <span className="analysis-value-skeleton analysis-value-skeleton--wide" />
              )}
            </div>
          </div>

        </div>

        <div className="chart-content" ref={contentRef}>
          {loading && (
            <div className="chart-loading-indicator">
              <div className="loading-spinner">
                <div className="spinner"></div>
                <span>{isPending ? t('priceAnalysis.chart.loading.generating') : t('priceAnalysis.chart.loading.fetching')}</span>
              </div>
            </div>
          )}

          {/* 五線譜與樂活通道上下並排，共用同一段時間軸。
              兩者同時到達極端才是有統計基礎的訊號（見 combined-state-note），
              分成兩個分頁會讓使用者得自己在腦中做交集。 */}
          {!loading && (chartData || ulbandData) && (
            <div className="chart-stack">
              {/* 放在 stack 外層：縮放按鈕是絕對定位，掛在主圖裡會被通道圖蓋掉 */}
              {shouldRenderEnhancements ? (
                <Suspense fallback={null}>
                  <PriceAnalysisChartEnhancements
                    isMobile={isMobile}
                    chartRef={chartRef}
                    ulbandChartRef={ulbandChartRef}
                    chartData={chartData}
                    ulbandData={ulbandData}
                    onAfterZoom={onAfterZoom}
                  />
                </Suspense>
              ) : null}

              {chartData && (
                <div className="chart-stack__main">
                  <Line
                    ref={chartRef}
                    data={localizedChartData || chartData}
                    options={lineChartOptions}
                  />
                </div>
              )}

              {ulbandData && (
                <div className="chart-stack__band">
                  <span className="chart-stack__band-label">{t('priceAnalysis.chart.tabs.ulband')}</span>
                  <MemoizedULBandChart
                    data={ulbandData}
                    follower
                    xRange={bandXRange}
                    onChartReady={(chart) => { ulbandChartRef.current = chart; }}
                  />
                </div>
              )}
            </div>
          )}

          {!loading && !chartData && !ulbandData && (
            <div className="chart-placeholder">{t('priceAnalysis.prompt.enterSymbol')}</div>
          )}
        </div>
      </div>
    </div>

    {/* 狀態說明放在卡片外面：卡片在桌機是固定高度、手機是固定 490px，
        把這段塞進 header 會直接從圖表身上扣高度——手機實測主圖從 229px
        掉到 131px。放到卡片下方，圖表拿回完整高度，說明也不用收進點擊裡。 */}
    {hasAnalysisContent && combinedStateKey ? (
      <div className={`combined-state-note combined-state-note--${combinedStateKey}`}>
        <span className="combined-state-note__title">
          {t(`priceAnalysis.combined.${combinedStateKey}.title`)}
        </span>
        <span className="combined-state-note__body">
          {t(`priceAnalysis.combined.${combinedStateKey}.body`)}
        </span>
      </div>
    ) : null}
    </>
  );
}

export default PriceAnalysisChartWorkspace;
