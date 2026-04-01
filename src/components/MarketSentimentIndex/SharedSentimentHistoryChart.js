import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { ensureHomeChartsRegistered } from '../../utils/homeChartRegistry';
import {
  extremeFearPulsePlugin,
  generateHistoryLegendLabels
} from './historyChartPlugins';

ensureHomeChartsRegistered();

export function SharedSentimentHistoryChart({
  historicalData,
  lowPoints,
  className = '',
  showLegend = true,
  compact = false,
  benchmarkLabel = null
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
        label: benchmarkLabel || t('marketSentiment.chart.spyPriceLabel'),
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
  }), [benchmarkLabel, currentLang, historicalData, lowPoints, t]);

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
          generateLabels: generateHistoryLegendLabels
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
          text: benchmarkLabel || t('marketSentiment.chart.spyPriceAxisLabel')
        },
        grid: {
          drawOnChartArea: false
        },
        ticks: {
          maxTicksLimit: compact ? 4 : 6
        }
      }
    }
  }), [benchmarkLabel, compact, showLegend, t]);

  return (
    <div className={className}>
      <Line data={chartData} options={chartOptions} datasetIdKey="label" plugins={[extremeFearPulsePlugin]} />
    </div>
  );
}
