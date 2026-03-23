import React, { useEffect, useMemo } from 'react';
import ScrollToTopButton from '../Common/ScrollToTopButton/ScrollToTopButton';
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
  activeChart
}) {
  useMobileTouchHandler(chartRef, isMobile, activeChart === 'sd');

  useEffect(() => {
    const activeChartInstance = activeChart === 'sd' ? chartRef.current : ulbandChartRef.current;
    if (!isChartAttached(activeChartInstance)) {
      return;
    }

    activeChartInstance.update?.('none');
  }, [activeChart, chartRef, ulbandChartRef]);

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

  const getActiveLabels = () => (activeChart === 'sd' ? chartData?.labels : ulbandData?.dates);
  const getActiveChartInstance = () => (activeChart === 'sd' ? chartRef.current : ulbandChartRef.current);
  const hasZoomTarget = activeChart === 'sd' ? Boolean(chartData) : Boolean(ulbandData);

  return (
    <>
      <ScrollToTopButton show={isMobile && (chartData || ulbandData)} />
      {hasZoomTarget && (
        <div className="chart-zoom-buttons">
          <button className="zoom-btn zoom-in" onClick={() => zoomActions.zoomIn(getActiveChartInstance(), getActiveLabels())} title="放大">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button className="zoom-btn zoom-out" onClick={() => zoomActions.zoomOut(getActiveChartInstance(), getActiveLabels())} title="縮小">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button className="zoom-btn zoom-reset" onClick={() => zoomActions.reset(getActiveChartInstance())} title="重置">
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
