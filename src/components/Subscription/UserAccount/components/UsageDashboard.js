import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
} from 'chart.js';
import { withCache, optimisticUpdate } from '../../../../services/subscriptionCache';
import './UsageDashboard.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

const UsageDashboard = ({ usageData, planLimits, currentPlan }) => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d
  const [selectedMetric, setSelectedMetric] = useState('api');
  const [isLoading, setIsLoading] = useState(false);

  // Mock usage data - in real app, this would come from API
  const mockUsageData = useMemo(() => ({
    daily: {
      api: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        usage: Math.floor(Math.random() * (planLimits?.api?.daily || 1000) * 0.8)
      })),
      priceAnalysis: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        usage: Math.floor(Math.random() * (planLimits?.priceAnalysis?.daily || 10) * 0.6)
      })),
      news: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        usage: Math.floor(Math.random() * (planLimits?.news?.daily || 50) * 0.7)
      })),
      search: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        usage: Math.floor(Math.random() * (planLimits?.search?.daily || 100) * 0.5)
      }))
    },
    current: {
      api: { used: 750, limit: planLimits?.api?.daily || 1000 },
      priceAnalysis: { used: 6, limit: planLimits?.priceAnalysis?.daily || 10 },
      news: { used: 32, limit: planLimits?.news?.daily || 50 },
      search: { used: 45, limit: planLimits?.search?.daily || 100 }
    },
    monthly: {
      api: { used: 15420, limit: planLimits?.api?.monthly || 20000 },
      priceAnalysis: { used: 156, limit: planLimits?.priceAnalysis?.monthly || 200 },
      news: { used: 678, limit: planLimits?.news?.monthly || 1000 },
      search: { used: 1234, limit: planLimits?.search?.monthly || 2000 }
    }
  }), [planLimits]);

  const getFilteredData = (days) => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    return mockUsageData.daily[selectedMetric].filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const chartData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const data = getFilteredData(days);
    
    return {
      labels: data.map(item => {
        const date = new Date(item.date);
        return timeRange === '7d' 
          ? date.toLocaleDateString('zh-TW', { weekday: 'short', month: 'short', day: 'numeric' })
          : date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: t(`subscription.metrics.${selectedMetric}`),
          data: data.map(item => item.usage),
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#667eea',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  }, [timeRange, selectedMetric, t]);

  const doughnutData = useMemo(() => {
    const current = mockUsageData.current;
    const metrics = ['api', 'priceAnalysis', 'news', 'search'];
    
    return {
      labels: metrics.map(metric => t(`subscription.metrics.${metric}`)),
      datasets: [
        {
          data: metrics.map(metric => {
            const usage = current[metric];
            return usage.limit === -1 ? usage.used : (usage.used / usage.limit) * 100;
          }),
          backgroundColor: [
            '#667eea',
            '#764ba2',
            '#f093fb',
            '#f5576c'
          ],
          borderWidth: 0,
          hoverOffset: 4
        }
      ]
    };
  }, [t]);

  const barData = useMemo(() => {
    const current = mockUsageData.current;
    const monthly = mockUsageData.monthly;
    const metrics = ['api', 'priceAnalysis', 'news', 'search'];
    
    return {
      labels: metrics.map(metric => t(`subscription.metrics.${metric}`)),
      datasets: [
        {
          label: t('subscription.daily_usage'),
          data: metrics.map(metric => current[metric].used),
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: '#667eea',
          borderWidth: 1
        },
        {
          label: t('subscription.monthly_usage'),
          data: metrics.map(metric => monthly[metric].used),
          backgroundColor: 'rgba(118, 75, 162, 0.8)',
          borderColor: '#764ba2',
          borderWidth: 1
        }
      ]
    };
  }, [t]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#667eea',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: timeRange === '7d' ? 7 : 10
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const metric = ['api', 'priceAnalysis', 'news', 'search'][context.dataIndex];
            const usage = mockUsageData.current[metric];
            if (usage.limit === -1) {
              return `${context.label}: ${usage.used} (${t('subscription.unlimited')})`;
            }
            return `${context.label}: ${usage.used}/${usage.limit} (${Math.round(context.parsed)}%)`;
          }
        }
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top'
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  const getUsagePercentage = (used, limit) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageStatus = (percentage) => {
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'normal';
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="usage-dashboard">
      <div className="dashboard-header">
        <h2>{t('subscription.usage_dashboard')}</h2>
        <p>{t('subscription.dashboard_subtitle')}</p>
      </div>

      {/* Current Usage Overview */}
      <div className="usage-overview">
        <h3>{t('subscription.current_usage')}</h3>
        <div className="usage-cards">
          {Object.entries(mockUsageData.current).map(([metric, data]) => {
            const percentage = getUsagePercentage(data.used, data.limit);
            const status = getUsageStatus(percentage);
            
            return (
              <div key={metric} className={`usage-card ${status}`}>
                <div className="usage-card-header">
                  <h4>{t(`subscription.metrics.${metric}`)}</h4>
                  <span className="usage-percentage">
                    {data.limit === -1 ? '∞' : `${Math.round(percentage)}%`}
                  </span>
                </div>
                <div className="usage-bar">
                  <div 
                    className="usage-fill" 
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <div className="usage-numbers">
                  <span className="used">{formatNumber(data.used)}</span>
                  <span className="limit">
                    {data.limit === -1 ? t('subscription.unlimited') : formatNumber(data.limit)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart Controls */}
      <div className="chart-controls">
        <div className="time-range-selector">
          <label>{t('subscription.time_range')}:</label>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="7d">{t('subscription.last_7_days')}</option>
            <option value="30d">{t('subscription.last_30_days')}</option>
            <option value="90d">{t('subscription.last_90_days')}</option>
          </select>
        </div>
        
        <div className="metric-selector">
          <label>{t('subscription.metric')}:</label>
          <select 
            value={selectedMetric} 
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="metric-select"
          >
            <option value="api">{t('subscription.metrics.api')}</option>
            <option value="priceAnalysis">{t('subscription.metrics.priceAnalysis')}</option>
            <option value="news">{t('subscription.metrics.news')}</option>
            <option value="search">{t('subscription.metrics.search')}</option>
          </select>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Trend Chart */}
        <div className="chart-container">
          <h3>{t('subscription.usage_trend')}</h3>
          <div className="chart-wrapper">
            <Suspense fallback={<div className="chart-loading">Loading chart...</div>}>
              <Line data={chartData} options={chartOptions} />
            </Suspense>
          </div>
        </div>

        {/* Usage Distribution */}
        <div className="chart-container">
          <h3>{t('subscription.usage_distribution')}</h3>
          <div className="chart-wrapper">
            <Suspense fallback={<div className="chart-loading">Loading chart...</div>}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </Suspense>
          </div>
        </div>

        {/* Comparison Chart */}
        <div className="chart-container full-width">
          <h3>{t('subscription.daily_vs_monthly')}</h3>
          <div className="chart-wrapper">
            <Suspense fallback={<div className="chart-loading">Loading chart...</div>}>
              <Bar data={barData} options={barOptions} />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Usage Insights */}
      <div className="usage-insights">
        <h3>{t('subscription.insights')}</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-icon">📈</div>
            <div className="insight-content">
              <h4>{t('subscription.peak_usage')}</h4>
              <p>{t('subscription.peak_usage_desc')}</p>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">⚡</div>
            <div className="insight-content">
              <h4>{t('subscription.efficiency_tip')}</h4>
              <p>{t('subscription.efficiency_tip_desc')}</p>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">🎯</div>
            <div className="insight-content">
              <h4>{t('subscription.optimization')}</h4>
              <p>{t('subscription.optimization_desc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrap with cache and memoization for better performance
export default React.memo(withCache(UsageDashboard, 'usageDashboard', 'usageStats'));