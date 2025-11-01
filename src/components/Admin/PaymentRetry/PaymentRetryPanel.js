/**
 * PaymentRetryPanel - Admin panel for managing subscription payment retries
 * 
 * Features:
 * - View retry statistics
 * - Monitor pending retries
 * - Execute manual retries
 * - View retry history
 * - Control retry job status
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../../Common/LoadingSpinner';
import paymentRetryService from '../../../services/paymentRetryService';
import './PaymentRetryPanel.css';

const PaymentRetryPanel = () => {
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState('overview');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // State for different data
    const [healthStatus, setHealthStatus] = useState(null);
    const [stats, setStats] = useState(null);
    const [pendingRetries, setPendingRetries] = useState([]);
    const [jobStatus, setJobStatus] = useState(null);

    // Load health status on component mount
    useEffect(() => {
        loadHealthStatus();
    }, []);

    const loadHealthStatus = async () => {
        try {
            const data = await paymentRetryService.getHealthStatus();
            setHealthStatus(data);
        } catch (err) {
            console.error('Failed to load health status:', err);
            setError(t('admin.paymentRetry.messages.loadHealthError'));
        }
    };

    const loadStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await paymentRetryService.getStats();
            setStats(data);
        } catch (err) {
            console.error('Failed to load stats:', err);
            setError(t('admin.paymentRetry.messages.loadStatsError', { error: err.message }));
        } finally {
            setLoading(false);
        }
    };

    const loadPendingRetries = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await paymentRetryService.getPendingRetries();
            setPendingRetries(data);
        } catch (err) {
            console.error('Failed to load pending retries:', err);
            setError(t('admin.paymentRetry.messages.loadPendingError', { error: err.message }));
        } finally {
            setLoading(false);
        }
    };

    const loadJobStatus = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await paymentRetryService.getJobStatus();
            setJobStatus(data);
        } catch (err) {
            console.error('Failed to load job status:', err);
            setError(t('admin.paymentRetry.messages.loadJobStatusError', { error: err.message }));
        } finally {
            setLoading(false);
        }
    };

    const executeRetry = async (merchantTradeNo) => {
        // eslint-disable-next-line no-restricted-globals
        if (!confirm(t('admin.paymentRetry.confirmations.executeRetry', { merchantTradeNo }))) {
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await paymentRetryService.executeRetry(merchantTradeNo);
            alert(t('admin.paymentRetry.messages.retryExecuted', { message: data.message || t('admin.paymentRetry.messages.success') }));
            
            // Reload pending retries
            if (activeSection === 'pending') {
                loadPendingRetries();
            }
        } catch (err) {
            console.error('Failed to execute retry:', err);
            setError(t('admin.paymentRetry.messages.executeRetryError', { error: err.message }));
        } finally {
            setLoading(false);
        }
    };

    const runRetryJob = async () => {
        // eslint-disable-next-line no-restricted-globals
        if (!confirm(t('admin.paymentRetry.confirmations.triggerJob'))) {
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await paymentRetryService.runRetryJob();
            alert(t('admin.paymentRetry.messages.jobTriggered', { message: data.message || t('admin.paymentRetry.messages.success') }));
            
            // Reload job status
            loadJobStatus();
        } catch (err) {
            console.error('Failed to run retry job:', err);
            setError(t('admin.paymentRetry.messages.runJobError', { error: err.message }));
        } finally {
            setLoading(false);
        }
    };

    // Load data when section changes
    useEffect(() => {
        switch (activeSection) {
            case 'stats':
                loadStats();
                break;
            case 'pending':
                loadPendingRetries();
                break;
            case 'job':
                loadJobStatus();
                break;
            default:
                break;
        }
    }, [activeSection]);

    const sections = [
        {
            id: 'overview',
            label: t('admin.paymentRetry.sections.overview'),
            icon: '🏥'
        },
        {
            id: 'stats',
            label: t('admin.paymentRetry.sections.stats'),
            icon: '📊'
        },
        {
            id: 'pending',
            label: t('admin.paymentRetry.sections.pending'),
            icon: '⏳'
        },
        {
            id: 'job',
            label: t('admin.paymentRetry.sections.job'),
            icon: '⚙️'
        }
    ];

    const renderOverview = () => (
        <div className="retry-overview">
            <h3>{t('admin.paymentRetry.overview.title')}</h3>
            {healthStatus ? (
                <div className="health-status">
                    <div className={`status-indicator ${healthStatus.status === 'success' ? 'healthy' : 'unhealthy'}`}>
                        <span className="status-dot"></span>
                        <span className="status-text">
                            {healthStatus.status === 'success' ? t('admin.paymentRetry.overview.healthy') : t('admin.paymentRetry.overview.unhealthy')}
                        </span>
                    </div>
                    
                    <div className="health-details">
                        <div className="health-item">
                            <label>{t('admin.paymentRetry.overview.service')}:</label>
                            <span>{healthStatus.data?.service || 'N/A'}</span>
                        </div>
                        <div className="health-item">
                            <label>{t('admin.paymentRetry.overview.initialized')}:</label>
                            <span>{healthStatus.data?.initialized ? t('admin.paymentRetry.overview.yes') : t('admin.paymentRetry.overview.no')}</span>
                        </div>
                        <div className="health-item">
                            <label>{t('admin.paymentRetry.overview.lastCheck')}:</label>
                            <span>{healthStatus.data?.timestamp ? new Date(healthStatus.data.timestamp).toLocaleString() : 'N/A'}</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="loading-placeholder">{t('admin.paymentRetry.overview.loading')}</div>
            )}
            
            <div className="overview-actions">
                <button 
                    className="btn btn-primary"
                    onClick={() => setActiveSection('stats')}
                >
                    {t('admin.paymentRetry.overview.viewStats')}
                </button>
                <button 
                    className="btn btn-secondary"
                    onClick={() => setActiveSection('pending')}
                >
                    {t('admin.paymentRetry.overview.checkPending')}
                </button>
            </div>
        </div>
    );

    const renderStats = () => (
        <div className="retry-stats">
            <h3>{t('admin.paymentRetry.stats.title')}</h3>
            {loading ? (
                <LoadingSpinner />
            ) : stats ? (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{stats.totalRetries || 0}</div>
                        <div className="stat-label">{t('admin.paymentRetry.stats.totalRetries')}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.successfulRetries || 0}</div>
                        <div className="stat-label">{t('admin.paymentRetry.stats.successful')}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.failedRetries || 0}</div>
                        <div className="stat-label">{t('admin.paymentRetry.stats.failed')}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.pendingRetries || 0}</div>
                        <div className="stat-label">{t('admin.paymentRetry.stats.pending')}</div>
                    </div>
                </div>
            ) : (
                <div className="no-data">{t('admin.paymentRetry.stats.noData')}</div>
            )}
        </div>
    );

    const renderPendingRetries = () => (
        <div className="pending-retries">
            <h3>{t('admin.paymentRetry.pending.title')}</h3>
            {loading ? (
                <LoadingSpinner />
            ) : pendingRetries.length > 0 ? (
                <div className="retries-table">
                    <table>
                        <thead>
                            <tr>
                                <th>{t('admin.paymentRetry.pending.merchantTradeNo')}</th>
                                <th>{t('admin.paymentRetry.pending.errorType')}</th>
                                <th>{t('admin.paymentRetry.pending.retryCount')}</th>
                                <th>{t('admin.paymentRetry.pending.retryAt')}</th>
                                <th>{t('admin.paymentRetry.pending.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingRetries.map((retry, index) => (
                                <tr key={index}>
                                    <td>{retry.merchantTradeNo}</td>
                                    <td>{retry.errorType}</td>
                                    <td>{retry.retryCount}</td>
                                    <td>{new Date(retry.retryAt).toLocaleString()}</td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => executeRetry(retry.merchantTradeNo)}
                                            disabled={loading}
                                        >
                                            {t('admin.paymentRetry.pending.executeNow')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="no-data">{t('admin.paymentRetry.pending.noData')}</div>
            )}
        </div>
    );

    const renderJobControl = () => (
        <div className="job-control">
            <h3>{t('admin.paymentRetry.job.title')}</h3>
            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="job-status-section">
                    {jobStatus && (
                        <div className="job-status-info">
                            <div className="status-item">
                                <label>{t('admin.paymentRetry.job.status')}:</label>
                                <span className={`status ${jobStatus.status}`}>
                                    {t(`admin.paymentRetry.job.${jobStatus.status}`, { defaultValue: jobStatus.status })}
                                </span>
                            </div>
                            <div className="status-item">
                                <label>{t('admin.paymentRetry.job.lastRun')}:</label>
                                <span>{jobStatus.lastRun ? new Date(jobStatus.lastRun).toLocaleString() : t('admin.paymentRetry.job.never')}</span>
                            </div>
                            <div className="status-item">
                                <label>{t('admin.paymentRetry.job.nextRun')}:</label>
                                <span>{jobStatus.nextRun ? new Date(jobStatus.nextRun).toLocaleString() : t('admin.paymentRetry.job.notScheduled')}</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="job-actions">
                        <button
                            className="btn btn-primary"
                            onClick={runRetryJob}
                            disabled={loading}
                        >
                            {t('admin.paymentRetry.job.triggerJob')}
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={loadJobStatus}
                            disabled={loading}
                        >
                            {t('admin.paymentRetry.job.refreshStatus')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    const renderContent = () => {
        switch (activeSection) {
            case 'overview':
                return renderOverview();
            case 'stats':
                return renderStats();
            case 'pending':
                return renderPendingRetries();
            case 'job':
                return renderJobControl();
            default:
                return renderOverview();
        }
    };

    return (
        <div className="payment-retry-panel">
            <div className="panel-header">
                <h2>{t('admin.paymentRetry.title')}</h2>
                <p>{t('admin.paymentRetry.description')}</p>
            </div>

            {/* Section Navigation */}
            <div className="section-nav">
                {sections.map(section => (
                    <button
                        key={section.id}
                        className={`section-tab ${activeSection === section.id ? 'active' : ''}`}
                        onClick={() => setActiveSection(section.id)}
                    >
                        <span className="tab-icon">{section.icon}</span>
                        <span className="tab-label">{section.label}</span>
                    </button>
                ))}
            </div>

            {/* Error Display */}
            {error && (
                <div className="error-message">
                    <div className="error-content">
                        <span className="error-icon">⚠️</span>
                        <span className="error-text">{error}</span>
                        <button 
                            className="error-dismiss"
                            onClick={() => setError(null)}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="panel-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default PaymentRetryPanel;