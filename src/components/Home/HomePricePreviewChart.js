import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { ensureHomeChartsRegistered } from '../../utils/homeChartRegistry';

ensureHomeChartsRegistered();

export function HomePricePreviewChart({ series, className = '' }) {
  const { t } = useTranslation();

  const chartData = useMemo(() => ({
    datasets: [
      {
        label: t('priceAnalysis.chart.label.price'),
        data: series.map((item) => ({ x: item.date, y: item.price })),
        borderColor: '#000000',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.35
      },
      {
        label: t('priceAnalysis.chart.label.trendLine'),
        data: series.map((item) => ({ x: item.date, y: item.trendLine })),
        borderColor: '#708090',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.35
      },
      {
        label: t('priceAnalysis.chart.label.minus2sd'),
        data: series.map((item) => ({ x: item.date, y: item.tlMinus2Sd })),
        borderColor: '#0000FF',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.35
      },
      {
        label: t('priceAnalysis.chart.label.minus1sd'),
        data: series.map((item) => ({ x: item.date, y: item.tlMinusSd })),
        borderColor: '#5B9BD5',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.35
      },
      {
        label: t('priceAnalysis.chart.label.plus1sd'),
        data: series.map((item) => ({ x: item.date, y: item.tlPlusSd })),
        borderColor: '#F0B8CE',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.35
      },
      {
        label: t('priceAnalysis.chart.label.plus2sd'),
        data: series.map((item) => ({ x: item.date, y: item.tlPlus2Sd })),
        borderColor: '#D24A93',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.35
      }
    ]
  }), [series, t]);

  const chartOptions = useMemo(() => ({
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'month',
          displayFormats: {
            month: "MMM ''yy",
            year: 'yyyy'
          }
        },
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: 4
        }
      },
      y: {
        position: 'right',
        grid: {
          color: 'rgba(15, 23, 42, 0.08)'
        },
        ticks: {
          maxTicksLimit: 5
        }
      }
    }
  }), []);

  return (
    <div className={className}>
      <Line data={chartData} options={chartOptions} datasetIdKey="label" />
    </div>
  );
}
