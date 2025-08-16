/**
 * RedemptionAnalytics - Comprehensive analytics dashboard for redemption codes
 * 
 * Features:
 * - Real-time analytics with charts and metrics
 * - Fraud detection alerts and monitoring
 * - Export functionality for reporting
 * - Time range filtering and comparison
 * - Campaign performance analysis
 * - Usage pattern detection
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './RedemptionAnalytics.css';
import LoadingSpinner from '../../Common/LoadingSpinner';
import ErrorDisplay from '../../Common/ErrorDisplay';
import AdminRedemptionService from '../../../services/adminRedemptionService';
import AdminOnly from '../../AdminOnly';
import { systemLogger } from '../../../utils/logger';

const RedemptionAnalytics = () => {
    const { t } = useTranslation();
    
    // State management
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [fraudAlerts, setFraudAlerts] = useState([]);
    const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
    const [selectedMetric, setSelectedMetric] = useState('overview');
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(null);
    
    // Chart data
    const [chartData, setChartData] = useState({
        redemptionTrends: [],
        codeTypeDistribution: [],
        campaignPerformance: [],
        fraudPatterns: []
    });

    const timeRanges = {
        '7d': { days: 7, label: t('admin.analytics.timeRanges.7days') },
        '30d': { days: 30, label: t('admin.analytics.timeRanges.30days') },
        '90d': { days: 90, label: t('admin.analytics.timeRanges.90days') },
        '1y': { days: 365, label: t('admin.analytics.timeRanges.1year') }
    };

    const metrics = {
        overview: { label: t('admin.analytics.metrics.overview') },
        conversion: { label: t('admin.analytics.metrics.conversion') },
        fraud: { label: t('admin.analytics.metrics.fraud') },
        campaigns: { label: t('admin.analytics.metrics.campaigns') }
    };

    /**
     * Load analytics data
     */
    const loadAnalytics = useCallback(async (timeRange = selectedTimeRange) => {
        try {
            setLoading(true);
            setError(null);
            
            const days = timeRanges[timeRange].days;
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const params = {
                startDate,
                endDate,
                groupBy: days <= 7 ? 'day' : days <= 30 ? 'day' : days <= 90 ? 'week' : 'month',
                includeConversion: true,
                includeRevenue: true,
                includeUsage: true,
                includeTrends: true
            };
            
            systemLogger.info('Loading redemption analytics', { timeRange, days });
            
            const response = await AdminRedemptionService.getAnalytics(params);
            
            if (response.success) {
                setAnalytics(response.data);
                processChartData(response.data);
                
                // Simulate fraud detection (in real implementation, this would come from the backend)
                generateFraudAlerts(response.data);
                
                systemLogger.info('Analytics loaded successfully', {
                    timeRange,
                    totalCodes: response.data.summary.totalCodes,
                    totalRedemptions: response.data.summary.totalRedemptions
                });
            } else {
                throw new Error(response.error || 'Failed to load analytics');
            }
        } catch (err) {
            systemLogger.error('Failed to load analytics:', err);
            setError(err.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, [selectedTimeRange, timeRanges]);

    /**
     * Process analytics data for charts
     */
    const processChartData = useCallback((data) => {
        // Process redemption trends (mock data for demonstration)
        const redemptionTrends = generateTrendData(data);
        
        // Process code type distribution
        const codeTypeDistribution = data.breakdown.byType.map(item => ({
            name: item.codeType,
            value: item.count,
            usage: item.totalUsage
        }));
        
        // Process campaign performance
        const campaignPerformance = data.breakdown.byCampaign.map(item => ({
            name: item.campaignName,
            codes: item.count,
            usage: item.totalUsage,
            rate: item.usageRate
        }));
        
        // Generate fraud patterns (mock data)
        const fraudPatterns = generateFraudPatterns(data);
        
        setChartData({
            redemptionTrends,
            codeTypeDistribution,
            campaignPerformance,
            fraudPatterns
        });
    }, []);

    /**
     * Generate trend data for charts
     */
    const generateTrendData = useCallback((data) => {
        const days = timeRanges[selectedTimeRange].days;
        const trends = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            // Mock trend data (in real implementation, this would come from backend)
            const baseRedemptions = Math.floor(Math.random() * 50) + 10;
            const baseCodes = Math.floor(Math.random() * 20) + 5;
            
            trends.push({
                date: date.toISOString().split('T')[0],
                redemptions: baseRedemptions,
                codes: baseCodes,
                successRate: Math.floor(Math.random() * 20) + 80,
                fraudAttempts: Math.floor(Math.random() * 5)
            });
        }
        
        return trends;
    }, [selectedTimeRange, timeRanges]);

    /**
     * Generate fraud patterns for analysis
     */
    const generateFraudPatterns = useCallback((data) => {
        // Mock fraud pattern data
        return [
            { pattern: 'Rapid Redemption', count: 12, severity: 'high' },
            { pattern: 'IP Clustering', count: 8, severity: 'medium' },
            { pattern: 'Unusual Timing', count: 5, severity: 'low' },
            { pattern: 'Code Guessing', count: 3, severity: 'high' }
        ];
    }, []);

    /**
     * Generate fraud alerts
     */
    const generateFraudAlerts = useCallback((data) => {
        const alerts = [];
        
        // Mock fraud alerts (in real implementation, these would come from backend)
        if (data.summary.totalRedemptions > 100) {
            alerts.push({
                id: 1,
                type: 'velocity',
                severity: 'medium',
                message: t('admin.analytics.fraudAlerts.highVelocity'),
                timestamp: new Date(),
                details: {
                    redemptions: data.summary.totalRedemptions,
                    timeframe: '1 hour'
                }
            });
        }
        
        if (data.summary.successRate < 70) {
            alerts.push({
                id: 2,
                type: 'failure_rate',
                severity: 'high',
                message: t('admin.analytics.fraudAlerts.highFailureRate'),
                timestamp: new Date(),
                details: {
                    successRate: data.summary.successRate,
                    threshold: 70
                }
            });
        }
        
        setFraudAlerts(alerts);
    }, [t]);

    /**
     * Handle time range change
     */
    const handleTimeRangeChange = useCallback((timeRange) => {
        setSelectedTimeRange(timeRange);
        loadAnalytics(timeRange);
    }, [loadAnalytics]);

    /**
     * Handle export
     */
    const handleExport = useCallback(async (format = 'json') => {
        try {
            const days = timeRanges[selectedTimeRange].days;
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const response = await AdminRedemptionService.exportData({
                format,
                type: 'analytics',
                startDate,
                endDate
            });
            
            if (response.success) {
                // Create download link
                const blob = new Blob([JSON.stringify(response.data, null, 2)], {
                    type: format === 'csv' ? 'text/csv' : 'application/json'
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `redemption-analytics-${selectedTimeRange}-${new Date().toISOString().split('T')[0]}.${format}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                systemLogger.info('Analytics exported successfully', { format, timeRange: selectedTimeRange });
            }
        } catch (err) {
            systemLogger.error('Failed to export analytics:', err);
            setError(err.message);
        }
    }, [selectedTimeRange, timeRanges]);

    /**
     * Setup auto-refresh
     */
    useEffect(() => {
        if (autoRefresh) {
            const interval = setInterval(() => {
                loadAnalytics();
            }, 60000); // Refresh every minute
            
            setRefreshInterval(interval);
            
            return () => {
                if (interval) {
                    clearInterval(interval);
                }
            };
        } else if (refreshInterval) {
            clearInterval(refreshInterval);
            setRefreshInterval(null);
        }
    }, [autoRefresh, loadAnalytics]);

    /**
     * Initial data load
     */
    useEffect(() => {
        loadAnalytics();
    }, []);

    /**
     * Memoized computed values
     */
    const fraudAlertsSummary = useMemo(() => {
        return fraudAlerts.reduce((acc, alert) => {
            acc[alert.severity] = (acc[alert.severity] || 0) + 1;
            return acc;
        }, {});
    }, [fraudAlerts]);

    const topCampaigns = useMemo(() => {
        return chartData.campaignPerformance
            .sort((a, b) => b.usage - a.usage)
            .slice(0, 5);
    }, [chartData.campaignPerformance]);

    if (loading && !analytics) {
        return (
            <AdminOnly 
                showLoading={true}
                fallback={
                    <div className="admin-access-denied">
                        <h2>{t('admin.accessDenied.title')}</h2>
                        <p>{t('admin.accessDenied.message')}</p>
                    </div>
                }
            >
                <div className="redemption-analytics">
                    <div className="loading-container">
                        <LoadingSpinner />
                        <p>{t('admin.analytics.loading')}</p>
                    </div>
                </div>
            </AdminOnly>
        );
    }

    return (
        <AdminOnly 
            showLoading={true}
            fallback={
                <div className="admin-access-denied">
                    <h2>{t('admin.accessDenied.title')}</h2>
                    <p>{t('admin.accessDenied.message')}</p>
                </div>
            }
        >
            <div className="redemption-analytics">
            {/* Header */}
            <div className="analytics-header">
                <div className="header-content">
                    <h1>{t('admin.analytics.title')}</h1>
                    <p>{t('admin.analytics.description')}</p>
                </div>
                
                <div className="header-controls">
                    <div className="time-range-selector">
                        <label>{t('admin.analytics.timeRange')}</label>
                        <select
                            value={selectedTimeRange}
                            onChange={(e) => handleTimeRangeChange(e.target.value)}
                        >
                            {Object.entries(timeRanges).map(([key, range]) => (
                                <option key={key} value={key}>{range.label}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="refresh-controls">
                        <label className="auto-refresh-toggle">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                            />
                            {t('admin.analytics.autoRefresh')}
                        </label>
                        
                        <button
                            className="btn btn-secondary"
                            onClick={() => loadAnalytics()}
                            disabled={loading}
                        >
                            {t('admin.analytics.refresh')}
                        </button>
                    </div>
                    
                    <div className="export-controls">
                        <button
                            className="btn btn-secondary"
                            onClick={() => handleExport('json')}
                        >
                            {t('admin.analytics.exportJson')}
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => handleExport('csv')}
                        >
                            {t('admin.analytics.exportCsv')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <ErrorDisplay
                    error={error}
                    onRetry={() => {
                        setError(null);
                        loadAnalytics();
                    }}
                />
            )}

            {/* Fraud Alerts */}
            {fraudAlerts.length > 0 && (
                <div className="fraud-alerts-section">
                    <div className="alerts-header">
                        <h2>{t('admin.analytics.fraudAlerts.title')}</h2>
                        <div className="alerts-summary">
                            {Object.entries(fraudAlertsSummary).map(([severity, count]) => (
                                <span key={severity} className={`alert-badge alert-${severity}`}>
                                    {t(`admin.analytics.fraudAlerts.severity.${severity}`)}: {count}
                                </span>
                            ))}
                        </div>
                    </div>
                    
                    <div className="alerts-list">
                        {fraudAlerts.map(alert => (
                            <FraudAlert key={alert.id} alert={alert} t={t} />
                        ))}
                    </div>
                </div>
            )}

            {/* Analytics Dashboard */}
            {analytics && (
                <>
                    {/* Key Metrics */}
                    <div className="metrics-section">
                        <div className="metrics-grid">
                            <MetricCard
                                title={t('admin.analytics.metrics.totalCodes')}
                                value={analytics.summary.totalCodes}
                                change={null}
                                icon="📊"
                                color="blue"
                            />
                            
                            <MetricCard
                                title={t('admin.analytics.metrics.totalRedemptions')}
                                value={analytics.summary.totalRedemptions}
                                change={null}
                                icon="🎯"
                                color="green"
                            />
                            
                            <MetricCard
                                title={t('admin.analytics.metrics.conversionRate')}
                                value={`${analytics.summary.conversionRate}%`}
                                change={null}
                                icon="📈"
                                color="purple"
                            />
                            
                            <MetricCard
                                title={t('admin.analytics.metrics.successRate')}
                                value={`${analytics.summary.successRate}%`}
                                change={null}
                                icon="✅"
                                color="orange"
                            />
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="charts-section">
                        <div className="charts-grid">
                            {/* Redemption Trends Chart */}
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>{t('admin.analytics.charts.redemptionTrends')}</h3>
                                </div>
                                <div className="chart-content">
                                    <RedemptionTrendsChart data={chartData.redemptionTrends} t={t} />
                                </div>
                            </div>
                            
                            {/* Code Type Distribution */}
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>{t('admin.analytics.charts.codeTypeDistribution')}</h3>
                                </div>
                                <div className="chart-content">
                                    <CodeTypeChart data={chartData.codeTypeDistribution} t={t} />
                                </div>
                            </div>
                            
                            {/* Campaign Performance */}
                            <div className="chart-card full-width">
                                <div className="chart-header">
                                    <h3>{t('admin.analytics.charts.campaignPerformance')}</h3>
                                </div>
                                <div className="chart-content">
                                    <CampaignPerformanceChart data={topCampaigns} t={t} />
                                </div>
                            </div>
                            
                            {/* Fraud Patterns */}
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>{t('admin.analytics.charts.fraudPatterns')}</h3>
                                </div>
                                <div className="chart-content">
                                    <FraudPatternsChart data={chartData.fraudPatterns} t={t} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Analytics */}
                    <div className="detailed-analytics">
                        <div className="analytics-tabs">
                            {Object.entries(metrics).map(([key, metric]) => (
                                <button
                                    key={key}
                                    className={`tab-button ${selectedMetric === key ? 'active' : ''}`}
                                    onClick={() => setSelectedMetric(key)}
                                >
                                    {metric.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="tab-content">
                            {selectedMetric === 'overview' && (
                                <OverviewTab analytics={analytics} t={t} />
                            )}
                            
                            {selectedMetric === 'conversion' && (
                                <ConversionTab analytics={analytics} chartData={chartData} t={t} />
                            )}
                            
                            {selectedMetric === 'fraud' && (
                                <FraudTab fraudAlerts={fraudAlerts} chartData={chartData} t={t} />
                            )}
                            
                            {selectedMetric === 'campaigns' && (
                                <CampaignsTab analytics={analytics} chartData={chartData} t={t} />
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

/**
 * Metric Card Component
 */
const MetricCard = ({ title, value, change, icon, color }) => (
    <div className={`metric-card metric-${color}`}>
        <div className="metric-icon">{icon}</div>
        <div className="metric-content">
            <div className="metric-value">{value}</div>
            <div className="metric-title">{title}</div>
            {change && (
                <div className={`metric-change ${change > 0 ? 'positive' : 'negative'}`}>
                    {change > 0 ? '+' : ''}{change}%
                </div>
            )}
        </div>
    </div>
);

/**
 * Fraud Alert Component
 */
const FraudAlert = ({ alert, t }) => (
    <div className={`fraud-alert alert-${alert.severity}`}>
        <div className="alert-header">
            <div className="alert-type">
                {t(`admin.analytics.fraudAlerts.types.${alert.type}`)}
            </div>
            <div className="alert-timestamp">
                {alert.timestamp.toLocaleTimeString()}
            </div>
        </div>
        <div className="alert-message">{alert.message}</div>
        {alert.details && (
            <div className="alert-details">
                {Object.entries(alert.details).map(([key, value]) => (
                    <span key={key} className="detail-item">
                        {key}: {value}
                    </span>
                ))}
            </div>
        )}
    </div>
);

/**
 * Simple Chart Components (using CSS for visualization)
 */
const RedemptionTrendsChart = ({ data, t }) => (
    <div className="simple-chart">
        <div className="chart-bars">
            {data.slice(-7).map((item, index) => (
                <div key={index} className="chart-bar">
                    <div 
                        className="bar-fill"
                        style={{ height: `${(item.redemptions / Math.max(...data.map(d => d.redemptions))) * 100}%` }}
                    />
                    <div className="bar-label">{new Date(item.date).getDate()}</div>
                </div>
            ))}
        </div>
    </div>
);

const CodeTypeChart = ({ data, t }) => (
    <div className="pie-chart-simple">
        {data.map((item, index) => (
            <div key={index} className="pie-item">
                <div className={`pie-color color-${index}`} />
                <span>{t(`admin.codes.types.${item.name.toLowerCase()}`)}: {item.value}</span>
            </div>
        ))}
    </div>
);

const CampaignPerformanceChart = ({ data, t }) => (
    <div className="horizontal-bars">
        {data.map((item, index) => (
            <div key={index} className="bar-row">
                <div className="bar-label">{item.name}</div>
                <div className="bar-container">
                    <div 
                        className="bar-fill"
                        style={{ width: `${(item.usage / Math.max(...data.map(d => d.usage))) * 100}%` }}
                    />
                </div>
                <div className="bar-value">{item.usage}</div>
            </div>
        ))}
    </div>
);

const FraudPatternsChart = ({ data, t }) => (
    <div className="fraud-patterns-list">
        {data.map((pattern, index) => (
            <div key={index} className={`pattern-item severity-${pattern.severity}`}>
                <div className="pattern-name">{pattern.pattern}</div>
                <div className="pattern-count">{pattern.count}</div>
                <div className={`pattern-severity severity-${pattern.severity}`}>
                    {t(`admin.analytics.fraudAlerts.severity.${pattern.severity}`)}
                </div>
            </div>
        ))}
    </div>
);

/**
 * Tab Content Components
 */
const OverviewTab = ({ analytics, t }) => (
    <div className="overview-tab">
        <div className="overview-grid">
            <div className="overview-section">
                <h4>{t('admin.analytics.overview.codeBreakdown')}</h4>
                <div className="breakdown-list">
                    {analytics.breakdown.byType.map((item, index) => (
                        <div key={index} className="breakdown-item">
                            <span className="breakdown-label">
                                {t(`admin.codes.types.${item.codeType.toLowerCase()}`)}
                            </span>
                            <span className="breakdown-value">{item.count}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="overview-section">
                <h4>{t('admin.analytics.overview.topCampaigns')}</h4>
                <div className="breakdown-list">
                    {analytics.breakdown.byCampaign.slice(0, 5).map((item, index) => (
                        <div key={index} className="breakdown-item">
                            <span className="breakdown-label">{item.campaignName}</span>
                            <span className="breakdown-value">{item.totalUsage}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const ConversionTab = ({ analytics, chartData, t }) => (
    <div className="conversion-tab">
        <div className="conversion-metrics">
            <div className="metric-row">
                <span className="metric-label">{t('admin.analytics.conversion.overallRate')}</span>
                <span className="metric-value">{analytics.summary.conversionRate}%</span>
            </div>
            <div className="metric-row">
                <span className="metric-label">{t('admin.analytics.conversion.successRate')}</span>
                <span className="metric-value">{analytics.summary.successRate}%</span>
            </div>
        </div>
    </div>
);

const FraudTab = ({ fraudAlerts, chartData, t }) => (
    <div className="fraud-tab">
        <div className="fraud-summary">
            <h4>{t('admin.analytics.fraud.recentAlerts')}</h4>
            {fraudAlerts.length === 0 ? (
                <p>{t('admin.analytics.fraud.noAlerts')}</p>
            ) : (
                <div className="fraud-alerts-list">
                    {fraudAlerts.map(alert => (
                        <FraudAlert key={alert.id} alert={alert} t={t} />
                    ))}
                </div>
            )}
        </div>
    </div>
);

const CampaignsTab = ({ analytics, chartData, t }) => (
    <div className="campaigns-tab">
        <div className="campaigns-table">
            <div className="table-header">
                <div className="header-cell">{t('admin.analytics.campaigns.name')}</div>
                <div className="header-cell">{t('admin.analytics.campaigns.codes')}</div>
                <div className="header-cell">{t('admin.analytics.campaigns.usage')}</div>
                <div className="header-cell">{t('admin.analytics.campaigns.rate')}</div>
            </div>
            {analytics.breakdown.byCampaign.map((campaign, index) => (
                <div key={index} className="table-row">
                    <div className="table-cell">{campaign.campaignName}</div>
                    <div className="table-cell">{campaign.count}</div>
                    <div className="table-cell">{campaign.totalUsage}</div>
                    <div className="table-cell">{campaign.usageRate.toFixed(1)}%</div>
                </div>
            ))}
        </div>
            </div>
        </AdminOnly>
    );
};

export default RedemptionAnalytics;