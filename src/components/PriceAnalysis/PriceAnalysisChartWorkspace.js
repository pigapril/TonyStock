import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import ULBandChart from '../ULBandChart/ULBandChart';
import { ensureHomeChartsRegistered } from '../../utils/homeChartRegistry';
import { useDeferredFeature } from '../../hooks/useDeferredFeature';
import { ensureCrosshairRegistered, linkCharts } from '../../utils/linkedCrosshair';
import PriceAnalysisSummary from './PriceAnalysisSummary';
import TechnicalIndicatorChart from './TechnicalIndicatorChart';
import { useAuth } from '../Auth/useAuth';
import { useDialog } from '../Common/Dialog/useDialog';
import { useTranslation } from 'react-i18next';

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
  indicatorRanges,
  localizedChartData,
  lineChartOptions,
  sharedPriceRange,
  ulbandData,
  bandXRange,
  onAfterZoom,
  displayedStockCode,
  analysisResult,
  displayedHorizonKey,
  analysisSentimentText,
  getSentimentSuffix,
  combinedStateKey,
  signalLadder,
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
  const indicatorChartRef = useRef(null);
  const { user, loading: authLoading } = useAuth();
  const { openDialog } = useDialog();
  const { i18n } = useTranslation();
  const canUseAdvancedIndicators = !authLoading && ['pro', 'premium'].includes(user?.plan);
  const [activeIndicator, setActiveIndicator] = useState('ma');

  useEffect(() => {
    if (!canUseAdvancedIndicators && activeIndicator !== 'ma') setActiveIndicator('ma');
  }, [activeIndicator, canUseAdvancedIndicators]);

  const handleIndicatorChange = (indicator) => {
    if (indicator === 'ma' || canUseAdvancedIndicators) {
      setActiveIndicator(indicator);
      return;
    }
    openDialog('featureUpgrade', {
      feature: 'technicalIndicators',
      upgradeUrl: `/${i18n.language}/subscription-plans`
    });
  };

  // 主圖與通道圖是 flex 項目，初次掛載時高度還沒算出來（flex-basis 0），
  // Chart.js 會先用一個接近 0 的尺寸建圖，畫面就被擠成一條。
  // 掛載後補量一次，並讓通道圖套用主圖當下的 x 範圍。
  useEffect(() => {
    if (loading) {
      return undefined;
    }

    const resync = () => {
      const main = chartRef.current;
      const band = ulbandChartRef.current;
      const indicator = indicatorChartRef.current;

      if (isChartAttached(main)) {
        main.resize?.();
      }
      if (isChartAttached(indicator)) {
        indicator.resize?.();
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

  // 三張圖共用垂直標線。日線與週線粒度不同，所以用時間值對應而不是 index。
  useEffect(() => {
    if (loading || !chartData) {
      return undefined;
    }

    let unlink;
    const timer = window.setTimeout(() => {
      unlink = linkCharts(() => [chartRef.current, ulbandChartRef.current, indicatorChartRef.current]);
    }, 450);

    return () => {
      window.clearTimeout(timer);
      unlink?.();
    };
  }, [chartRef, loading, chartData, ulbandData, ulbandChartRef, activeIndicator]);

  return (
    <>
    <div className="chart-card" ref={chartCardRef}>
      <div className="chart-container">
        <PriceAnalysisSummary
          hasAnalysisContent={hasAnalysisContent}
          displayedStockCode={displayedStockCode}
          analysisResult={analysisResult}
          displayedHorizonKey={displayedHorizonKey}
          analysisSentimentText={analysisSentimentText}
          getSentimentSuffix={getSentimentSuffix}
          formatPrice={formatPrice}
          t={t}
        />

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
                    chartCardRef={chartCardRef}
                    ulbandChartRef={ulbandChartRef}
                    chartData={chartData}
                    ulbandData={ulbandData}
                    onAfterZoom={onAfterZoom}
                  />
                </Suspense>
              ) : null}

              {chartData && (
                <div className="chart-stack__main">
                  <h2 className="chart-stack__title">{t('priceAnalysis.chart.tabs.sd')}</h2>
                  <div className="chart-stack__plot">
                    <Line
                      ref={chartRef}
                      data={localizedChartData || chartData}
                      options={lineChartOptions}
                    />
                  </div>
                </div>
              )}

              {ulbandData && (
                <div className="chart-stack__band">
                  <h2 className="chart-stack__title">{t('priceAnalysis.chart.tabs.ulband')}</h2>
                  <div className="chart-stack__plot">
                    <MemoizedULBandChart
                      data={ulbandData}
                      follower
                      hideXAxisLabels={Boolean(chartData)}
                      yRange={sharedPriceRange}
                      xRange={bandXRange}
                      onChartReady={(chart) => { ulbandChartRef.current = chart; }}
                    />
                  </div>
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

    {!loading && chartData?.labels?.length > 0 && chartData?.datasets?.[0]?.data?.length > 0 ? (
      <TechnicalIndicatorChart
        activeIndicator={activeIndicator}
        onIndicatorChange={handleIndicatorChange}
        canUseAdvanced={canUseAdvancedIndicators}
        chartRef={indicatorChartRef}
        dates={chartData.labels}
        prices={chartData.datasets[0].data}
        highs={indicatorRanges?.highs}
        lows={indicatorRanges?.lows}
        xRange={bandXRange}
        timeUnit={chartData.timeUnit}
        isMobile={isMobile}
        t={t}
      />
    ) : null}

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

        {/* 條件清單。列出全部、而不是只顯示「已達成幾項」，是因為沒打勾的那幾項
            才是使用者要的資訊：他能看到現在到哪、還差什麼，自己判斷要不要動作。
            條件越多、出現越少（回測：一年 5.8 天 → 1.0 天），所以順序不能調。 */}
        {signalLadder ? (
          <div className="signal-ladder">
            <span className="signal-ladder__heading">{t('priceAnalysis.ladder.heading')}</span>
            <ul className="signal-ladder__list">
              {signalLadder.steps.map((step) => {
                const label = t(`priceAnalysis.ladder.${signalLadder.level}.${step.key}`);
                return (
                  <li
                    key={step.key}
                    className={`signal-ladder__item signal-ladder__item--${step.met ? 'met' : 'pending'}`}
                    // 達成與否只靠顏色與 ✓/○ 表達，讀屏聽不出差別，所以整列給一個標籤
                    aria-label={`${t(step.met ? 'priceAnalysis.ladder.met' : 'priceAnalysis.ladder.notMet')}：${label}`}
                  >
                    <span className="signal-ladder__mark" aria-hidden="true">{step.met ? '✓' : '○'}</span>
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    ) : null}
    </>
  );
}

export default PriceAnalysisChartWorkspace;
