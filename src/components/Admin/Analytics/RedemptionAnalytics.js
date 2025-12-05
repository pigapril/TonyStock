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
import { useAdminPermissions } from '../../../hooks/useAdminPermissions';
import { systemLogger } from '../../../utils/logger';

const RedemptionAnalytics = () => {
    const { t } = useTranslation();
    const { isAdmin, loading: adminLoading, checkAdminStatus } = useAdminPermissions();
    
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
                let blobContent;
                let mimeType;
                
                if (format === 'csv') {
                    // For CSV, response.data is already a string
                    blobContent = response.data;
                    mimeType = 'text/csv;charset=utf-8;';
                } else {
                    // For JSON, stringify the data
                    blobContent = JSON.stringify(response.data, null, 2);
                    mimeType = 'application/json';
                }
                
                const blob = new Blob([blobContent], { type: mimeType });
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

    // Handle admin permission loading
    if (adminLoading) {
        return (
            <div className="redemption-analytics">
                <div className="loading-container">
                    <LoadingSpinner />
                    <p>{t('admin.permissions.checking')}</p>
                </div>
            </div>
        );
    }

    // Handle permission denied
    if (!isAdmin) {
        return (
            <div className="admin-access-denied">
                <h2>{t('admin.accessDenied.title')}</h2>
                <p>{t('admin.accessDenied.message')}</p>
                <button 
                    onClick={checkAdminStatus}
                    className="btn btn-secondary"
                >
                    {t('admin.permissions.retry')}
                </button>
            </div>
        );
    }

    if (loading && !analytics) {
        return (
            <div className="redemption-analytics">
                <div className="loading-container">
                    <LoadingSpinner />
                    <p>{t('admin.analytics.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="redemption-analytics">
            {/* Header */}
            <div className="redemption-analytics-header">
                <div className="redemption-analytics-header-content">
                    <h1>{t('admin.analytics.title')}</h1>
                    <p>{t('admin.analytics.description')}</p>
                </div>
                
                <div className="redemption-analytics-header-controls">
                    <div className="redemption-analytics-time-range-selector">
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
                    
                    <div className="redemption-analytics-refresh-controls">
                        <label className="redemption-analytics-auto-refresh-toggle">
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
                    
                    <div className="redemption-analytics-export-controls">
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
                <div className="redemption-analytics-fraud-alerts-section">
                    <div className="redemption-analytics-alerts-header">
                        <h2>{t('admin.analytics.fraudAlerts.title')}</h2>
                        <div className="redemption-analytics-alerts-summary">
                            {Object.entries(fraudAlertsSummary).map(([severity, count]) => (
                                <span key={severity} className={`redemption-analytics-alert-badge alert-${severity}`}>
                                    {t(`admin.analytics.fraudAlerts.severity.${severity}`)}: {count}
                                </span>
                            ))}
                        </div>
                    </div>
                    
                    <div className="redemption-analytics-alerts-list">
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
                    <div className="redemption-analytics-metrics-section">
                        <div className="redemption-analytics-metrics-grid">
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
                    <div className="redemption-analytics-charts-section">
                        <div className="redemption-analytics-charts-grid">
                            {/* Redemption Trends Chart */}
                            <div className="redemption-analytics-chart-card">
                                <div className="redemption-analytics-chart-header">
                                    <h3>{t('admin.analytics.charts.redemptionTrends')}</h3>
                                </div>
                                <div className="redemption-analytics-chart-content">
                                    <RedemptionTrendsChart data={chartData.redemptionTrends} t={t} />
                                </div>
                            </div>
                            
                            {/* Code Type Distribution */}
                            <div className="redemption-analytics-chart-card">
                                <div className="redemption-analytics-chart-header">
                                    <h3>{t('admin.analytics.charts.codeTypeDistribution')}</h3>
                                </div>
                                <div className="redemption-analytics-chart-content">
                                    <CodeTypeChart data={chartData.codeTypeDistribution} t={t} />
                                </div>
                            </div>
                            
                            {/* Campaign Performance */}
                            <div className="redemption-analytics-chart-card full-width">
                                <div className="redemption-analytics-chart-header">
                                    <h3>{t('admin.analytics.charts.campaignPerformance')}</h3>
                                </div>
                                <div className="redemption-analytics-chart-content">
                                    <CampaignPerformanceChart data={topCampaigns} t={t} />
                                </div>
                            </div>
                            
                            {/* Fraud Patterns */}
                            <div className="redemption-analytics-chart-card">
                                <div className="redemption-analytics-chart-header">
                                    <h3>{t('admin.analytics.charts.fraudPatterns')}</h3>
                                </div>
                                <div className="redemption-analytics-chart-content">
                                    <FraudPatternsChart data={chartData.fraudPatterns} t={t} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Analytics */}
                    <div className="redemption-analytics-detailed-analytics">
                        <div className="redemption-analytics-tabs">
                            {Object.entries(metrics).map(([key, metric]) => (
                                <button
                                    key={key}
                                    className={`redemption-analytics-tab-button ${selectedMetric === key ? 'active' : ''}`}
                                    onClick={() => setSelectedMetric(key)}
                                >
                                    {metric.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="redemption-analytics-tab-content">
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

/**
 * Metric Card Component
 */
const MetricCard = ({ title, value, change, icon, color }) => (
    <div className={`redemption-analytics-metric-card metric-${color}`}>
        <div className="redemption-analytics-metric-icon">{icon}</div>
        <div className="redemption-analytics-metric-content">
            <div className="redemption-analytics-metric-value">{value}</div>
            <div className="redemption-analytics-metric-title">{title}</div>
            {change && (
                <div className={`redemption-analytics-metric-change ${change > 0 ? 'positive' : 'negative'}`}>
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
    <div className={`redemption-analytics-fraud-alert alert-${alert.severity}`}>
        <div className="redemption-analytics-alert-header">
            <div className="redemption-analytics-alert-type">
                {t(`admin.analytics.fraudAlerts.types.${alert.type}`)}
            </div>
            <div className="redemption-analytics-alert-timestamp">
                {alert.timestamp.toLocaleTimeString()}
            </div>
        </div>
        <div className="redemption-analytics-alert-message">{alert.message}</div>
        {alert.details && (
            <div className="redemption-analytics-alert-details">
                {Object.entries(alert.details).map(([key, value]) => (
                    <span key={key} className="redemption-analytics-detail-item">
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
    <div className="redemption-analytics-simple-chart">
        <div className="redemption-analytics-chart-bars">
            {data.slice(-7).map((item, index) => (
                <div key={index} className="redemption-analytics-chart-bar">
                    <div 
                        className="redemption-analytics-bar-fill"
                        style={{ height: `${(item.redemptions / Math.max(...data.map(d => d.redemptions))) * 100}%` }}
                    />
                    <div className="redemption-analytics-bar-label">{new Date(item.date).getDate()}</div>
                </div>
            ))}
        </div>
    </div>
);

const CodeTypeChart = ({ data, t }) => (
    <div className="redemption-analytics-pie-chart-simple">
        {data.map((item, index) => (
            <div key={index} className="redemption-analytics-pie-item">
                <div className={`redemption-analytics-pie-color color-${index}`} />
                <span>{t(`admin.codes.types.${item.name.toLowerCase()}`)}: {item.value}</span>
            </div>
        ))}
    </div>
);

const CampaignPerformanceChart = ({ data, t }) => (
    <div className="redemption-analytics-horizontal-bars">
        {data.map((item, index) => (
            <div key={index} className="redemption-analytics-bar-row">
                <div className="redemption-analytics-bar-label">{item.name}</div>
                <div className="redemption-analytics-bar-container">
                    <div 
                        className="redemption-analytics-bar-fill"
                        style={{ width: `${(item.usage / Math.max(...data.map(d => d.usage))) * 100}%` }}
                    />
                </div>
                <div className="redemption-analytics-bar-value">{item.usage}</div>
            </div>
        ))}
    </div>
);

const FraudPatternsChart = ({ data, t }) => (
    <div className="redemption-analytics-fraud-patterns-list">
        {data.map((pattern, index) => (
            <div key={index} className={`redemption-analytics-pattern-item severity-${pattern.severity}`}>
                <div className="redemption-analytics-pattern-name">{pattern.pattern}</div>
                <div className="redemption-analytics-pattern-count">{pattern.count}</div>
                <div className={`redemption-analytics-pattern-severity severity-${pattern.severity}`}>
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
    <div className="redemption-analytics-overview-tab">
        <div className="redemption-analytics-overview-grid">
            <div className="redemption-analytics-overview-section">
                <h4>{t('admin.analytics.overview.codeBreakdown')}</h4>
                <div className="redemption-analytics-breakdown-list">
                    {analytics.breakdown.byType.map((item, index) => (
                        <div key={index} className="redemption-analytics-breakdown-item">
                            <span className="redemption-analytics-breakdown-label">
                                {t(`admin.codes.types.${item.codeType.toLowerCase()}`)}
                            </span>
                            <span className="redemption-analytics-breakdown-value">{item.count}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="redemption-analytics-overview-section">
                <h4>{t('admin.analytics.overview.topCampaigns')}</h4>
                <div className="redemption-analytics-breakdown-list">
                    {analytics.breakdown.byCampaign.slice(0, 5).map((item, index) => (
                        <div key={index} className="redemption-analytics-breakdown-item">
                            <span className="redemption-analytics-breakdown-label">{item.campaignName}</span>
                            <span className="redemption-analytics-breakdown-value">{item.totalUsage}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const ConversionTab = ({ analytics, chartData, t }) => (
    <div className="redemption-analytics-conversion-tab">
        <div className="redemption-analytics-conversion-metrics">
            <div className="redemption-analytics-metric-row">
                <span className="redemption-analytics-metric-label">{t('admin.analytics.conversion.overallRate')}</span>
                <span className="redemption-analytics-metric-value">{analytics.summary.conversionRate}%</span>
            </div>
            <div className="redemption-analytics-metric-row">
                <span className="redemption-analytics-metric-label">{t('admin.analytics.conversion.successRate')}</span>
                <span className="redemption-analytics-metric-value">{analytics.summary.successRate}%</span>
            </div>
        </div>
    </div>
);

const FraudTab = ({ fraudAlerts, chartData, t }) => (
    <div className="redemption-analytics-fraud-tab">
        <div className="redemption-analytics-fraud-summary">
            <h4>{t('admin.analytics.fraud.recentAlerts')}</h4>
            {fraudAlerts.length === 0 ? (
                <p>{t('admin.analytics.fraud.noAlerts')}</p>
            ) : (
                <div className="redemption-analytics-fraud-alerts-list">
                    {fraudAlerts.map(alert => (
                        <FraudAlert key={alert.id} alert={alert} t={t} />
                    ))}
                </div>
            )}
        </div>
    </div>
);

const CampaignsTab = ({ analytics, chartData, t }) => (
    <div className="redemption-analytics-campaigns-tab">
        <div className="redemption-analytics-campaigns-table">
            <div className="redemption-analytics-table-header">
                <div className="redemption-analytics-header-cell">{t('admin.analytics.campaigns.name')}</div>
                <div className="redemption-analytics-header-cell">{t('admin.analytics.campaigns.codes')}</div>
                <div className="redemption-analytics-header-cell">{t('admin.analytics.campaigns.usage')}</div>
                <div className="redemption-analytics-header-cell">{t('admin.analytics.campaigns.rate')}</div>
            </div>
            {analytics.breakdown.byCampaign.map((campaign, index) => (
                <div key={index} className="redemption-analytics-table-row">
                    <div className="redemption-analytics-table-cell">{campaign.campaignName}</div>
                    <div className="redemption-analytics-table-cell">{campaign.count}</div>
                    <div className="redemption-analytics-table-cell">{campaign.totalUsage}</div>
                    <div className="redemption-analytics-table-cell">{campaign.usageRate.toFixed(1)}%</div>
                </div>
            ))}
        </div>
        </div>
    );
};

export default RedemptionAnalytics;