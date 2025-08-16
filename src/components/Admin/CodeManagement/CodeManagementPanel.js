/**
 * CodeManagementPanel - Comprehensive admin interface for redemption code management
 * 
 * Features:
 * - Advanced filtering and search
 * - Real-time usage monitoring
 * - Bulk operations support
 * - Code lifecycle management
 * - Analytics display
 * - Export functionality
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './CodeManagementPanel.css';
import LoadingSpinner from '../../Common/LoadingSpinner';
import ErrorDisplay from '../../Common/ErrorDisplay';
import AdminRedemptionService from '../../../services/adminRedemptionService';
import CodeGenerationWizard from './CodeGenerationWizard';
import CodeDetailsModal from './CodeDetailsModal';
import BulkOperationsModal from './BulkOperationsModal';
import AdminOnly from '../../AdminOnly';
import { useAdminPermissions } from '../../../hooks/useAdminPermissions';
import { systemLogger } from '../../../utils/logger';

const CodeManagementPanel = () => {
    const { t } = useTranslation();
    const { isAdmin, loading: adminLoading, checkAdminStatus } = useAdminPermissions();
    
    // State management
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCodes, setSelectedCodes] = useState(new Set());
    const [showGenerationWizard, setShowGenerationWizard] = useState(false);
    const [showCodeDetails, setShowCodeDetails] = useState(null);
    const [showBulkOperations, setShowBulkOperations] = useState(false);
    
    // Pagination and filtering
    const [pagination, setPagination] = useState({
        limit: 50,
        offset: 0,
        totalCount: 0,
        hasMore: false
    });
    
    const [filters, setFilters] = useState({
        codeType: '',
        campaignName: '',
        prefix: '',
        status: '',
        eligibilityType: '',
        createdBy: '',
        createdAfter: '',
        createdBefore: '',
        expiresAfter: '',
        expiresBefore: '',
        minUsage: '',
        maxUsage: '',
        hasUsage: '',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    });
    
    // Real-time updates
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(null);
    
    // Analytics summary
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    /**
     * Load codes with current filters and pagination
     */
    const loadCodes = useCallback(async (resetPagination = false) => {
        try {
            setLoading(true);
            setError(null);
            
            const currentPagination = resetPagination ? 
                { ...pagination, offset: 0 } : 
                pagination;
            
            const queryParams = {
                ...filters,
                limit: currentPagination.limit,
                offset: currentPagination.offset,
                includeUsageStats: true,
                includeMetadata: true
            };
            
            // Remove empty filters
            Object.keys(queryParams).forEach(key => {
                if (queryParams[key] === '' || queryParams[key] === null || queryParams[key] === undefined) {
                    delete queryParams[key];
                }
            });
            
            const response = await AdminRedemptionService.getCodes(queryParams);
            
            if (response.success) {
                setCodes(response.data.codes);
                setPagination({
                    ...currentPagination,
                    totalCount: response.data.pagination.totalCount,
                    hasMore: response.data.pagination.hasMore,
                    offset: resetPagination ? 0 : currentPagination.offset
                });
                
                // Clear selection when data changes
                setSelectedCodes(new Set());
                
                systemLogger.info('Admin codes loaded successfully', {
                    count: response.data.codes.length,
                    totalCount: response.data.pagination.totalCount,
                    filters: Object.keys(queryParams)
                });
            } else {
                throw new Error(response.error || 'Failed to load codes');
            }
        } catch (err) {
            systemLogger.error('Failed to load admin codes:', err);
            setError(err.message || 'Failed to load codes');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.limit, pagination.offset]);

    /**
     * Load analytics summary
     */
    const loadAnalytics = useCallback(async () => {
        try {
            setAnalyticsLoading(true);
            
            const response = await AdminRedemptionService.getAnalytics({
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                endDate: new Date(),
                includeConversion: true,
                includeRevenue: true,
                includeUsage: true
            });
            
            if (response.success) {
                setAnalytics(response.data);
            }
        } catch (err) {
            systemLogger.error('Failed to load analytics:', err);
        } finally {
            setAnalyticsLoading(false);
        }
    }, []);

    /**
     * Handle filter changes
     */
    const handleFilterChange = useCallback((filterName, value) => {
        setFilters(prev => ({
            ...prev,
            [filterName]: value
        }));
    }, []);

    /**
     * Apply filters and reload data
     */
    const applyFilters = useCallback(() => {
        loadCodes(true); // Reset pagination when applying filters
    }, [loadCodes]);

    /**
     * Clear all filters
     */
    const clearFilters = useCallback(() => {
        setFilters({
            codeType: '',
            campaignName: '',
            prefix: '',
            status: '',
            eligibilityType: '',
            createdBy: '',
            createdAfter: '',
            createdBefore: '',
            expiresAfter: '',
            expiresBefore: '',
            minUsage: '',
            maxUsage: '',
            hasUsage: '',
            sortBy: 'createdAt',
            sortOrder: 'desc'
        });
    }, []);

    /**
     * Handle code selection
     */
    const handleCodeSelection = useCallback((codeId, selected) => {
        setSelectedCodes(prev => {
            const newSelection = new Set(prev);
            if (selected) {
                newSelection.add(codeId);
            } else {
                newSelection.delete(codeId);
            }
            return newSelection;
        });
    }, []);

    /**
     * Select all visible codes
     */
    const selectAllCodes = useCallback((selectAll) => {
        if (selectAll) {
            setSelectedCodes(new Set(codes.map(code => code.id)));
        } else {
            setSelectedCodes(new Set());
        }
    }, [codes]);

    /**
     * Handle pagination
     */
    const handlePageChange = useCallback((direction) => {
        setPagination(prev => {
            const newOffset = direction === 'next' ? 
                prev.offset + prev.limit : 
                Math.max(0, prev.offset - prev.limit);
            
            return {
                ...prev,
                offset: newOffset
            };
        });
    }, []);

    /**
     * Handle code activation/deactivation
     */
    const handleCodeStatusChange = useCallback(async (codeId, activate) => {
        try {
            const response = activate ? 
                await AdminRedemptionService.activateCode(codeId) :
                await AdminRedemptionService.deactivateCode(codeId, 'Manual admin action');
            
            if (response.success) {
                // Refresh the codes list
                loadCodes();
                systemLogger.info(`Code ${activate ? 'activated' : 'deactivated'}`, { codeId });
            } else {
                throw new Error(response.error || `Failed to ${activate ? 'activate' : 'deactivate'} code`);
            }
        } catch (err) {
            systemLogger.error(`Failed to ${activate ? 'activate' : 'deactivate'} code:`, err);
            setError(err.message);
        }
    }, [loadCodes]);

    /**
     * Handle code export
     */
    const handleExport = useCallback(async (format = 'json') => {
        try {
            const response = await AdminRedemptionService.exportData({
                format,
                type: 'codes',
                ...filters
            });
            
            if (response.success) {
                // Create download link
                const blob = new Blob([JSON.stringify(response.data, null, 2)], {
                    type: format === 'csv' ? 'text/csv' : 'application/json'
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `redemption-codes-${new Date().toISOString().split('T')[0]}.${format}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                systemLogger.info('Codes exported successfully', { format });
            }
        } catch (err) {
            systemLogger.error('Failed to export codes:', err);
            setError(err.message);
        }
    }, [filters]);

    /**
     * Setup auto-refresh
     */
    useEffect(() => {
        if (autoRefresh) {
            const interval = setInterval(() => {
                loadCodes();
                loadAnalytics();
            }, 30000); // Refresh every 30 seconds
            
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
    }, [autoRefresh, loadCodes, loadAnalytics]);

    /**
     * Initial data load
     */
    useEffect(() => {
        loadCodes();
        loadAnalytics();
    }, [pagination.offset, pagination.limit]);

    /**
     * Memoized computed values
     */
    const selectedCodesCount = selectedCodes.size;
    const allCodesSelected = codes.length > 0 && selectedCodes.size === codes.length;
    const someCodesSelected = selectedCodes.size > 0 && selectedCodes.size < codes.length;

    const statusCounts = useMemo(() => {
        return codes.reduce((acc, code) => {
            acc[code.status] = (acc[code.status] || 0) + 1;
            return acc;
        }, {});
    }, [codes]);

    // Handle admin permission loading
    if (adminLoading) {
        return (
            <div className="code-management-panel">
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

    if (loading && codes.length === 0) {
        return (
            <div className="code-management-panel">
                <div className="loading-container">
                    <LoadingSpinner />
                    <p>{t('admin.codes.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="code-management-panel">
            {/* Header */}
            <div className="panel-header">
                <div className="header-content">
                    <h1>{t('admin.codes.title')}</h1>
                    <p>{t('admin.codes.description')}</p>
                </div>
                
                <div className="header-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowGenerationWizard(true)}
                    >
                        {t('admin.codes.generateNew')}
                    </button>
                    
                    <div className="refresh-controls">
                        <label className="auto-refresh-toggle">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                            />
                            {t('admin.codes.autoRefresh')}
                        </label>
                        
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                loadCodes();
                                loadAnalytics();
                            }}
                            disabled={loading}
                        >
                            {t('admin.codes.refresh')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Analytics Summary */}
            {analytics && (
                <div className="analytics-summary">
                    <div className="summary-cards">
                        <div className="summary-card">
                            <div className="card-value">{analytics.summary.totalCodes}</div>
                            <div className="card-label">{t('admin.analytics.totalCodes')}</div>
                        </div>
                        
                        <div className="summary-card">
                            <div className="card-value">{analytics.summary.activeCodes}</div>
                            <div className="card-label">{t('admin.analytics.activeCodes')}</div>
                        </div>
                        
                        <div className="summary-card">
                            <div className="card-value">{analytics.summary.totalRedemptions}</div>
                            <div className="card-label">{t('admin.analytics.totalRedemptions')}</div>
                        </div>
                        
                        <div className="summary-card">
                            <div className="card-value">{analytics.summary.conversionRate}%</div>
                            <div className="card-label">{t('admin.analytics.conversionRate')}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="filters-section">
                <div className="filters-header">
                    <h3>{t('admin.codes.filters')}</h3>
                    <div className="filter-actions">
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={clearFilters}
                        >
                            {t('admin.codes.clearFilters')}
                        </button>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={applyFilters}
                        >
                            {t('admin.codes.applyFilters')}
                        </button>
                    </div>
                </div>
                
                <div className="filters-grid">
                    <div className="filter-group">
                        <label>{t('admin.codes.codeType')}</label>
                        <select
                            value={filters.codeType}
                            onChange={(e) => handleFilterChange('codeType', e.target.value)}
                        >
                            <option value="">{t('admin.codes.allTypes')}</option>
                            <option value="PERCENTAGE_DISCOUNT">{t('admin.codes.types.percentageDiscount')}</option>
                            <option value="FIXED_AMOUNT_DISCOUNT">{t('admin.codes.types.fixedAmountDiscount')}</option>
                            <option value="TIME_EXTENSION">{t('admin.codes.types.timeExtension')}</option>
                        </select>
                    </div>
                    
                    <div className="filter-group">
                        <label>{t('admin.codes.status')}</label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                            <option value="">{t('admin.codes.allStatuses')}</option>
                            <option value="active">{t('admin.codes.statuses.active')}</option>
                            <option value="inactive">{t('admin.codes.statuses.inactive')}</option>
                            <option value="expired">{t('admin.codes.statuses.expired')}</option>
                            <option value="exhausted">{t('admin.codes.statuses.exhausted')}</option>
                        </select>
                    </div>
                    
                    <div className="filter-group">
                        <label>{t('admin.codes.campaignName')}</label>
                        <input
                            type="text"
                            value={filters.campaignName}
                            onChange={(e) => handleFilterChange('campaignName', e.target.value)}
                            placeholder={t('admin.codes.searchCampaign')}
                        />
                    </div>
                    
                    <div className="filter-group">
                        <label>{t('admin.codes.prefix')}</label>
                        <input
                            type="text"
                            value={filters.prefix}
                            onChange={(e) => handleFilterChange('prefix', e.target.value)}
                            placeholder={t('admin.codes.searchPrefix')}
                        />
                    </div>
                    
                    <div className="filter-group">
                        <label>{t('admin.codes.createdAfter')}</label>
                        <input
                            type="date"
                            value={filters.createdAfter}
                            onChange={(e) => handleFilterChange('createdAfter', e.target.value)}
                        />
                    </div>
                    
                    <div className="filter-group">
                        <label>{t('admin.codes.createdBefore')}</label>
                        <input
                            type="date"
                            value={filters.createdBefore}
                            onChange={(e) => handleFilterChange('createdBefore', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Bulk Operations */}
            {selectedCodesCount > 0 && (
                <div className="bulk-operations">
                    <div className="selection-info">
                        <span>{t('admin.codes.selectedCount', { count: selectedCodesCount })}</span>
                    </div>
                    
                    <div className="bulk-actions">
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setShowBulkOperations(true)}
                        >
                            {t('admin.codes.bulkOperations')}
                        </button>
                        
                        <button
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                                // Bulk deactivate selected codes
                                selectedCodes.forEach(codeId => {
                                    handleCodeStatusChange(codeId, false);
                                });
                            }}
                        >
                            {t('admin.codes.deactivateSelected')}
                        </button>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <ErrorDisplay
                    error={error}
                    onRetry={() => {
                        setError(null);
                        loadCodes();
                    }}
                />
            )}

            {/* Codes Table */}
            <div className="codes-table-container">
                <div className="table-header">
                    <div className="table-controls">
                        <div className="selection-controls">
                            <label className="select-all">
                                <input
                                    type="checkbox"
                                    checked={allCodesSelected}
                                    ref={input => {
                                        if (input) input.indeterminate = someCodesSelected;
                                    }}
                                    onChange={(e) => selectAllCodes(e.target.checked)}
                                />
                                {t('admin.codes.selectAll')}
                            </label>
                        </div>
                        
                        <div className="export-controls">
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleExport('json')}
                            >
                                {t('admin.codes.exportJson')}
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleExport('csv')}
                            >
                                {t('admin.codes.exportCsv')}
                            </button>
                        </div>
                    </div>
                    
                    <div className="status-summary">
                        {Object.entries(statusCounts).map(([status, count]) => (
                            <span key={status} className={`status-badge status-${status}`}>
                                {t(`admin.codes.statuses.${status}`)}: {count}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="codes-table">
                        <thead>
                            <tr>
                                <th className="select-column">
                                    <input
                                        type="checkbox"
                                        checked={allCodesSelected}
                                        ref={input => {
                                            if (input) input.indeterminate = someCodesSelected;
                                        }}
                                        onChange={(e) => selectAllCodes(e.target.checked)}
                                    />
                                </th>
                                <th>{t('admin.codes.table.code')}</th>
                                <th>{t('admin.codes.table.type')}</th>
                                <th>{t('admin.codes.table.campaign')}</th>
                                <th>{t('admin.codes.table.status')}</th>
                                <th>{t('admin.codes.table.usage')}</th>
                                <th>{t('admin.codes.table.expires')}</th>
                                <th>{t('admin.codes.table.created')}</th>
                                <th>{t('admin.codes.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {codes.map(code => (
                                <CodeRow
                                    key={code.id}
                                    code={code}
                                    selected={selectedCodes.has(code.id)}
                                    onSelect={(selected) => handleCodeSelection(code.id, selected)}
                                    onStatusChange={(activate) => handleCodeStatusChange(code.id, activate)}
                                    onViewDetails={() => setShowCodeDetails(code)}
                                    t={t}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="table-pagination">
                    <div className="pagination-info">
                        {t('admin.codes.pagination.showing', {
                            start: pagination.offset + 1,
                            end: Math.min(pagination.offset + pagination.limit, pagination.totalCount),
                            total: pagination.totalCount
                        })}
                    </div>
                    
                    <div className="pagination-controls">
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handlePageChange('prev')}
                            disabled={pagination.offset === 0}
                        >
                            {t('admin.codes.pagination.previous')}
                        </button>
                        
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handlePageChange('next')}
                            disabled={!pagination.hasMore}
                        >
                            {t('admin.codes.pagination.next')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showGenerationWizard && (
                <CodeGenerationWizard
                    onClose={() => setShowGenerationWizard(false)}
                    onSuccess={() => {
                        setShowGenerationWizard(false);
                        loadCodes(true);
                    }}
                />
            )}

            {showCodeDetails && (
                <CodeDetailsModal
                    code={showCodeDetails}
                    onClose={() => setShowCodeDetails(null)}
                    onUpdate={() => {
                        setShowCodeDetails(null);
                        loadCodes();
                    }}
                />
            )}

            {showBulkOperations && (
                <BulkOperationsModal
                    selectedCodes={Array.from(selectedCodes)}
                    codes={codes.filter(code => selectedCodes.has(code.id))}
                    onClose={() => setShowBulkOperations(false)}
                    onComplete={() => {
                        setShowBulkOperations(false);
                        setSelectedCodes(new Set());
                        loadCodes();
                    }}
                />
            )}
        </div>
    );
};

/**
 * Individual code row component
 */
const CodeRow = ({ code, selected, onSelect, onStatusChange, onViewDetails, t }) => {
    const getStatusBadgeClass = (status) => {
        const baseClass = 'status-badge';
        switch (status) {
            case 'active': return `${baseClass} status-active`;
            case 'inactive': return `${baseClass} status-inactive`;
            case 'expired': return `${baseClass} status-expired`;
            case 'exhausted': return `${baseClass} status-exhausted`;
            case 'scheduled': return `${baseClass} status-scheduled`;
            default: return baseClass;
        }
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString();
    };

    const formatUsage = (code) => {
        const percentage = code.usagePercentage || 0;
        return `${code.timesUsed}/${code.maxTotalUses || '∞'} (${percentage.toFixed(1)}%)`;
    };

    return (
        <tr className={`code-row ${selected ? 'selected' : ''}`}>
            <td className="select-column">
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => onSelect(e.target.checked)}
                />
            </td>
            
            <td className="code-column">
                <div className="code-info">
                    <span className="code-value">{code.code}</span>
                    {code.prefix && <span className="code-prefix">({code.prefix})</span>}
                </div>
            </td>
            
            <td className="type-column">
                <span className={`type-badge type-${code.codeType.toLowerCase()}`}>
                    {t(`admin.codes.types.${code.codeType.toLowerCase()}`)}
                </span>
            </td>
            
            <td className="campaign-column">
                {code.campaignName || '-'}
            </td>
            
            <td className="status-column">
                <span className={getStatusBadgeClass(code.status)}>
                    {t(`admin.codes.statuses.${code.status}`)}
                </span>
            </td>
            
            <td className="usage-column">
                <div className="usage-info">
                    <span className="usage-text">{formatUsage(code)}</span>
                    {code.usagePercentage > 0 && (
                        <div className="usage-bar">
                            <div 
                                className="usage-fill"
                                style={{ width: `${Math.min(code.usagePercentage, 100)}%` }}
                            />
                        </div>
                    )}
                </div>
            </td>
            
            <td className="expires-column">
                {formatDate(code.expiresAt)}
            </td>
            
            <td className="created-column">
                {formatDate(code.createdAt)}
            </td>
            
            <td className="actions-column">
                <div className="action-buttons">
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={onViewDetails}
                        title={t('admin.codes.viewDetails')}
                    >
                        {t('admin.codes.view')}
                    </button>
                    
                    <button
                        className={`btn btn-sm ${code.isActive ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => onStatusChange(!code.isActive)}
                        title={code.isActive ? t('admin.codes.deactivate') : t('admin.codes.activate')}
                    >
                        {code.isActive ? t('admin.codes.deactivate') : t('admin.codes.activate')}
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default CodeManagementPanel;