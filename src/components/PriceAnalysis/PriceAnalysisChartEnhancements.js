import React, { useEffect, useMemo } from 'react';
import { useMobileTouchHandler } from '../ULBandChart/useMobileTouchHandler';

function isChartAttached(chart) {
  const canvas = chart?.canvas;
  const ownerDocument = canvas?.ownerDocument;

  return Boolean(canvas && ownerDocument?.contains(canvas));
}

function PriceAnalysisChartEnhancements({
  isMobile,
  chartRef,
  ulbandChartRef,
  chartData,
  ulbandData,
  onAfterZoom
}) {
  // 兩張圖並排後，互動一律由主圖（五線譜）負責，通道圖只跟隨。
  useMobileTouchHandler(chartRef, isMobile, true);

  useEffect(() => {
    if (isChartAttached(chartRef.current)) {
      chartRef.current.update?.('none');
    }
  }, [chartRef]);

  const zoomActions = useMemo(() => ({
    zoomIn(chart, labels) {
      if (!isChartAttached(chart)) {
        return;
      }

      const xScale = chart.scales.x;
      const currentMin = xScale.min;
      const currentMax = xScale.max;
      const range = currentMax - currentMin;
      const newRange = range * 0.8;
      const newMin = currentMax - newRange;
      chart.zoomScale('x', { min: newMin, max: currentMax }, 'default');
    },
    zoomOut(chart, labels) {
      if (!isChartAttached(chart) || !labels?.length) {
        return;
      }

      const xScale = chart.scales.x;
      const currentMin = xScale.min;
      const currentMax = xScale.max;
      const range = currentMax - currentMin;
      const newRange = range * 1.25;
      const newMin = currentMax - newRange;

      const firstDate = new Date(labels[0]);
      const lastDate = new Date(labels[labels.length - 1]);
      const timeRange = lastDate - firstDate;
      const spaceRatio = isMobile ? 0.15 : 0.1;
      const originalMax = new Date(lastDate.getTime() + timeRange * spaceRatio);

      const finalMin = Math.max(newMin, firstDate.getTime());
      const finalMax = Math.min(currentMax, originalMax.getTime());

      if (finalMin < currentMin || finalMax > currentMax) {
        chart.zoomScale('x', { min: finalMin, max: finalMax }, 'default');
      }
    },
    reset(chart) {
      if (isChartAttached(chart)) {
        chart.resetZoom();
      }
    }
  }), [isMobile]);

  const getActiveLabels = () => chartData?.labels;
  const getActiveChartInstance = () => chartRef.current;
  const hasZoomTarget = Boolean(chartData);

  // zoomScale()/resetZoom() 不會觸發 onZoomComplete，所以按鈕按完要主動通知父層，
  // 由父層去讀主圖當下的範圍再套到通道圖。
  const runZoom = (action) => {
    action(getActiveChartInstance(), getActiveLabels());
    // 同步呼叫：zoomScale()/resetZoom() 當下就更新了 scale，
    // 而 requestAnimationFrame 在分頁不可見時不會執行，通道圖就永遠不同步。
    onAfterZoom?.();
  };

  return (
    <>
      {hasZoomTarget && (
        <div className="chart-zoom-buttons">
          <button className="zoom-btn zoom-in" onClick={() => runZoom(zoomActions.zoomIn)} title="放大">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button className="zoom-btn zoom-out" onClick={() => runZoom(zoomActions.zoomOut)} title="縮小">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button className="zoom-btn zoom-reset" onClick={() => runZoom((c) => zoomActions.reset(c))} title="重置">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13 8C13 10.7614 10.7614 13 8 13C5.23858 13 3 10.7614 3 8C3 5.23858 5.23858 3 8 3C9.12583 3 10.1647 3.37194 11 3.99963M11 3.99963V2M11 3.99963H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

export default React.memo(PriceAnalysisChartEnhancements);
