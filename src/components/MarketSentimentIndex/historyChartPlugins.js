function hasExtremeFearMarkerDataset(chart) {
  return chart?.data?.datasets?.some((dataset) => dataset?.pulseMarker);
}

function isChartVisible(chart) {
  const canvas = chart?.canvas;

  if (!canvas || typeof canvas.getBoundingClientRect !== 'function') {
    return false;
  }

  const rect = canvas.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

  return rect.bottom > 0 && rect.right > 0 && rect.top < viewportHeight && rect.left < viewportWidth;
}

function stopExtremeFearPulse(chart) {
  if (chart?.$extremeFearPulseFrame) {
    cancelAnimationFrame(chart.$extremeFearPulseFrame);
    chart.$extremeFearPulseFrame = null;
  }
}

function startExtremeFearPulse(chart) {
  if (!chart || chart.$extremeFearPulseFrame || !hasExtremeFearMarkerDataset(chart) || document.hidden || !isChartVisible(chart)) {
    return;
  }

  const tick = () => {
    if (!chart?.ctx) {
      stopExtremeFearPulse(chart);
      return;
    }

    if (document.hidden || !isChartVisible(chart)) {
      stopExtremeFearPulse(chart);
      return;
    }

    chart.draw();
    chart.$extremeFearPulseFrame = requestAnimationFrame(tick);
  };

  chart.$extremeFearPulseFrame = requestAnimationFrame(tick);
}

export const extremeFearPulsePlugin = {
  id: 'extremeFearPulse',
  afterInit(chart) {
    startExtremeFearPulse(chart);
  },
  afterUpdate(chart) {
    if (hasExtremeFearMarkerDataset(chart)) {
      startExtremeFearPulse(chart);
    } else {
      stopExtremeFearPulse(chart);
    }
  },
  afterDatasetsDraw(chart) {
    const markerDatasetIndex = chart.data.datasets.findIndex((dataset) => dataset?.pulseMarker);

    if (markerDatasetIndex === -1) {
      return;
    }

    const datasetMeta = chart.getDatasetMeta(markerDatasetIndex);
    const points = datasetMeta?.data || [];

    if (!points.length) {
      return;
    }

    const ctx = chart.ctx;
    const pulse = (Math.sin(performance.now() / 420) + 1) / 2;

    ctx.save();

    points.forEach((point) => {
      if (!point || point.skip) {
        return;
      }

      const { x, y } = point.getProps(['x', 'y'], true);
      const outerRadius = 10 + pulse * 4;
      const innerRadius = 6 + pulse * 2;

      ctx.beginPath();
      ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245, 158, 11, ${0.08 + pulse * 0.14})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(249, 115, 22, ${0.28 + pulse * 0.28})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.restore();
  },
  beforeDestroy(chart) {
    stopExtremeFearPulse(chart);
  }
};

export const restrictedWindowMaskPlugin = {
  id: 'restrictedWindowMask',
  beforeEvent(chart, args) {
    const options = chart?.options?.plugins?.restrictedWindowMask;
    const event = args?.event;

    if (!options?.enabled || !options.cutoffDate || !event) {
      return undefined;
    }

    const xScale = chart.scales?.x;
    const chartArea = chart.chartArea;

    if (!xScale || !chartArea) {
      return undefined;
    }

    const cutoffValue = options.cutoffDate instanceof Date
      ? options.cutoffDate
      : new Date(options.cutoffDate);
    const cutoffPixel = xScale.getPixelForValue(cutoffValue);
    const maskStart = Math.max(chartArea.left, Math.min(cutoffPixel, chartArea.right));
    const isInsideMaskedArea = event.x >= maskStart && event.x <= chartArea.right
      && event.y >= chartArea.top && event.y <= chartArea.bottom;

    if (!isInsideMaskedArea) {
      return undefined;
    }

    if (typeof chart.setActiveElements === 'function') {
      chart.setActiveElements([]);
    }

    if (chart.tooltip && typeof chart.tooltip.setActiveElements === 'function') {
      chart.tooltip.setActiveElements([], { x: event.x, y: event.y });
    }

    chart.draw();
    return false;
  },
  afterDatasetsDraw(chart) {
    const options = chart?.options?.plugins?.restrictedWindowMask;

    if (!options?.enabled || !options.cutoffDate) {
      return;
    }

    const xScale = chart.scales?.x;
    const chartArea = chart.chartArea;

    if (!xScale || !chartArea) {
      return;
    }

    const cutoffValue = options.cutoffDate instanceof Date
      ? options.cutoffDate
      : new Date(options.cutoffDate);
    const cutoffPixel = xScale.getPixelForValue(cutoffValue);
    const maskStart = Math.max(chartArea.left, Math.min(cutoffPixel, chartArea.right));

    if (maskStart >= chartArea.right) {
      return;
    }

    const ctx = chart.ctx;

    ctx.save();
    ctx.fillStyle = options.fillColor || '#f8fafc';
    ctx.fillRect(maskStart, chartArea.top, chartArea.right - maskStart, chartArea.bottom - chartArea.top);

    ctx.beginPath();
    ctx.moveTo(maskStart, chartArea.top);
    ctx.lineTo(maskStart, chartArea.bottom);
    ctx.strokeStyle = options.lineColor || 'rgba(37, 99, 235, 0.88)';
    ctx.lineWidth = options.lineWidth || 1.5;
    ctx.stroke();
    ctx.restore();
  }
};

export function generateHistoryLegendLabels(chart) {
  return (chart.data.datasets || []).map((dataset, datasetIndex) => {
    const meta = chart.getDatasetMeta(datasetIndex);
    const hidden = meta.hidden === null ? !chart.isDatasetVisible(datasetIndex) : meta.hidden;

    if (dataset?.pulseMarker) {
      return {
        text: dataset.label,
        fillStyle: dataset.pointBackgroundColor,
        strokeStyle: dataset.pointBorderColor,
        lineWidth: dataset.pointBorderWidth,
        pointStyle: 'circle',
        hidden,
        datasetIndex
      };
    }

    return {
      text: dataset.label,
      fillStyle: dataset.borderColor,
      strokeStyle: dataset.borderColor,
      lineWidth: dataset.borderWidth || 2,
      pointStyle: dataset.pointStyle || 'line',
      hidden,
      datasetIndex
    };
  });
}
