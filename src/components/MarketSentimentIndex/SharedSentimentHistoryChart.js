import React, { useMemo } from 'react';
import 'chartjs-adapter-date-fns';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  TimeScale,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';

ChartJS.register(
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  TimeScale,
  Filler,
  Tooltip,
  Legend
);

function hasExtremeFearMarkerDataset(chart) {
  return chart?.data?.datasets?.some((dataset) => dataset?.pulseMarker);
}

function stopExtremeFearPulse(chart) {
  if (chart?.$extremeFearPulseFrame) {
    cancelAnimationFrame(chart.$extremeFearPulseFrame);
    chart.$extremeFearPulseFrame = null;
  }
}

function startExtremeFearPulse(chart) {
  if (!chart || chart.$extremeFearPulseFrame || !hasExtremeFearMarkerDataset(chart)) {
    return;
  }

  const tick = () => {
    if (!chart?.ctx) {
      stopExtremeFearPulse(chart);
      return;
    }

    if (!document.hidden) {
      chart.draw();
    }

    chart.$extremeFearPulseFrame = requestAnimationFrame(tick);
  };

  chart.$extremeFearPulseFrame = requestAnimationFrame(tick);
}

const extremeFearPulsePlugin = {
  id: 'sharedExtremeFearPulse',
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

ChartJS.register(extremeFearPulsePlugin);

export function SharedSentimentHistoryChart({
  historicalData,
  lowPoints,
  className = '',
  showLegend = true,
  compact = false
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const chartData = useMemo(() => ({
    datasets: [
      {
        label: t('marketSentiment.chart.compositeIndexLabel'),
        yAxisID: 'left-axis',
        data: historicalData.map((item) => ({
          x: item.date,
          y: item.score
        })),
        borderColor: '#9D00FF',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;

          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(210, 74, 147, 0.6)');
          gradient.addColorStop(0.25, 'rgba(240, 184, 206, 0.5)');
          gradient.addColorStop(0.5, 'rgba(166, 170, 210, 0.4)');
          gradient.addColorStop(0.75, 'rgba(91, 155, 213, 0.3)');
          gradient.addColorStop(1, 'rgba(0, 0, 255, 0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 0
      },
      {
        label: t('marketSentiment.chart.spyPriceLabel'),
        yAxisID: 'right-axis',
        data: historicalData.map((item) => ({
          x: item.date,
          y: item.spyClose
        })),
        borderColor: 'rgb(66, 66, 66)',
        fill: false,
        tension: 0.4,
        pointRadius: 0
      },
      {
        label: currentLang === 'zh-TW' ? '過往極端恐懼低點' : 'Past extreme fear lows',
        yAxisID: 'left-axis',
        pulseMarker: true,
        order: 10,
        data: lowPoints.map((item) => ({
          x: item.date,
          y: item.score,
          meta: item.meta
        })),
        showLine: false,
        pointRadius: 6,
        pointHoverRadius: 9,
        pointHitRadius: 14,
        pointBorderWidth: 3,
        pointHoverBorderWidth: 4,
        pointBackgroundColor: '#fff7ed',
        pointBorderColor: '#f97316',
        pointHoverBackgroundColor: '#ffedd5',
        pointHoverBorderColor: '#ea580c',
        pointStyle: 'circle',
        parsing: false
      }
    ]
  }), [currentLang, historicalData, lowPoints, t]);

  const chartOptions = useMemo(() => ({
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        display: showLegend,
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          boxHeight: 10,
          padding: compact ? 12 : 16,
          generateLabels: (chart) => {
            const defaultLabels = ChartJS.defaults.plugins.legend.labels.generateLabels(chart);

            return defaultLabels.map((label) => {
              const dataset = chart.data.datasets?.[label.datasetIndex];

              if (dataset?.pulseMarker) {
                return {
                  ...label,
                  fillStyle: dataset.pointBackgroundColor,
                  strokeStyle: dataset.pointBorderColor,
                  lineWidth: dataset.pointBorderWidth,
                  pointStyle: 'circle'
                };
              }

              return label;
            });
          }
        }
      },
      tooltip: {
        callbacks: {
          label(tooltipItem) {
            let label = tooltipItem.dataset.label || '';

            if (label) {
              label += ': ';
            }

            if (tooltipItem.dataset.pulseMarker) {
              return `${label}${tooltipItem.raw?.meta || ''} (${Math.round(tooltipItem.parsed.y)})`;
            }

            return `${label}${Math.round(tooltipItem.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'year',
          tooltipFormat: 'yyyy-MM-dd',
          displayFormats: {
            year: 'yyyy'
          }
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.12)'
        },
        ticks: {
          maxTicksLimit: compact ? 4 : 6
        }
      },
      'left-axis': {
        min: 0,
        max: 100,
        title: {
          display: !compact,
          text: t('marketSentiment.chart.compositeIndexAxisLabel')
        },
        ticks: {
          stepSize: 20
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.14)'
        }
      },
      'right-axis': {
        position: 'right',
        title: {
          display: !compact,
          text: t('marketSentiment.chart.spyPriceAxisLabel')
        },
        grid: {
          drawOnChartArea: false
        },
        ticks: {
          maxTicksLimit: compact ? 4 : 6
        }
      }
    }
  }), [compact, showLegend, t]);

  return (
    <div className={className}>
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}
