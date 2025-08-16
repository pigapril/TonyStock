/**
 * RedemptionHistory Component
 * 
 * Comprehensive redemption history display with filtering and pagination
 * Features:
 * - Detailed benefit breakdown for each redemption
 * - Status indicators (applied, expired, etc.)
 * - Filtering by date, type, and status
 * - Export functionality
 * - Responsive design with pagination
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Auth/useAuth';
import LoadingSpinner from '../Common/LoadingSpinner';
import AdminOnly from '../AdminOnly';
import redemptionService from '../../services/redemptionService';
import { Analytics } from '../../utils/analytics';
import { useRedemptionFormatting } from '../../hooks/useRedemptionFormatting';
import './RedemptionHistory.css';

export const RedemptionHistory = ({
    className = '',
    showFilters = true,
    showExport = true,
    pageSize = 10,
    onHistoryLoad
}) => {
    const { t } = useTranslation();
    const { formatHistoryItem, formatters } = useRedemptionFormatting();
    const { user } = useAuth();
    
    // Component state
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    
    // Filter state
    const [filters, setFilters] = useState({
        status: '',
        type: '',
        startDate: '',
        endDate: ''
    });
    const [appliedFilters, setAppliedFilters] = useState({});

    // Load history on component mount and filter changes
    useEffect(() => {
        loadHistory();
    }, [currentPage, appliedFilters]);

    /**
     * Load redemption history
     */
    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await redemptionService.getRedemptionHistory({
                page: currentPage,
                limit: pageSize,
                ...appliedFilters
            });

            if (result.success) {
                setHistory(result.data.history || []);
                setTotalPages(result.data.pagination?.totalPages || 1);
                setTotalItems(result.data.pagination?.totalItems || 0);
                
                onHistoryLoad?.(result.data);
                
                Analytics.track('redemption_history_loaded', {
                    userId: user?.id,
                    page: currentPage,
                    totalItems: result.data.pagination?.totalItems || 0,
                    filters: appliedFilters
                });
            } else {
                setError(result);
            }
        } catch (err) {
            setError({
                error: t('redemption.history.errors.loadFailed'),
                errorCode: 'LOAD_HISTORY_FAILED'
            });
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, pageSize, appliedFilters, user?.id, onHistoryLoad, t]);

    /**
     * Apply filters
     */
    const applyFilters = () => {
        setAppliedFilters({ ...filters });
        setCurrentPage(1);
        
        Analytics.track('redemption_history_filtered', {
            userId: user?.id,
            filters
        });
    };

    /**
     * Clear filters
     */
    const clearFilters = () => {
        setFilters({
            status: '',
            type: '',
            startDate: '',
            endDate: ''
        });
        setAppliedFilters({});
        setCurrentPage(1);
    };

    /**
     * Handle page change
     */
    const handlePageChange = (page) => {
        setCurrentPage(page);
        
        Analytics.track('redemption_history_page_changed', {
            userId: user?.id,
            page
        });
    };

    /**
     * Export history
     */
    const exportHistory = async () => {
        try {
            Analytics.track('redemption_history_export_requested', {
                userId: user?.id,
                filters: appliedFilters
            });

            // Create CSV content
            const csvContent = generateCSV(history);
            
            // Download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `redemption-history-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Export failed:', err);
        }
    };

    /**
     * Generate CSV content
     */
    const generateCSV = (data) => {
        const headers = [
            t('redemption.history.table.date'),
            t('redemption.history.table.code'),
            t('redemption.history.table.type'),
            t('redemption.history.table.benefit'),
            t('redemption.history.table.status')
        ];

        const rows = data.map(item => [
            formatDate(item.redeemedAt),
            item.code,
            formatBenefitType(item.appliedBenefits?.type),
            formatBenefitDescription(item.appliedBenefits),
            formatStatus(item.status)
        ]);

        return [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
    };

    /**
     * Format date for display
     */
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString(
            user?.language === 'zh-TW' ? 'zh-TW' : 'en-US',
            {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }
        );
    };

    /**
     * Format benefit type
     */
    const formatBenefitType = (type) => {
        if (!type) return '-';
        return t(`redemption.history.types.${type}`);
    };

    /**
     * Format benefit description
     */
    const formatBenefitDescription = (benefits) => {
        if (!benefits) return '-';

        switch (benefits.type) {
            case 'discount':
                if (benefits.discountAmount) {
                    return t('redemption.history.benefits.discount', {
                        amount: benefits.discountAmount,
                        currency: benefits.currency || 'TWD'
                    });
                }
                return t('redemption.history.benefits.discountGeneral');

            case 'extension':
                return t('redemption.history.benefits.extension', {
                    duration: benefits.extensionDays || benefits.extensionDuration,
                    unit: benefits.extensionDays ? t('redemption.units.day') : 
                          t(`redemption.units.${benefits.extensionUnit?.toLowerCase()}`)
                });

            case 'upgrade':
                return t('redemption.history.benefits.upgrade', {
                    plan: t(`subscription.plans.${benefits.newPlan || benefits.targetPlan}`)
                });

            default:
                return t('redemption.history.benefits.general');
        }
    };

    /**
     * Format status
     */
    const formatStatus = (status) => {
        return t(`redemption.history.status.${status?.toLowerCase()}`);
    };

    /**
     * Get status badge class
     */
    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'applied':
                return 'redemption-history-status--applied';
            case 'pending':
                return 'redemption-history-status--pending';
            case 'failed':
                return 'redemption-history-status--failed';
            case 'reversed':
                return 'redemption-history-status--reversed';
            default:
                return 'redemption-history-status--unknown';
        }
    };

    /**
     * Render pagination
     */
    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return (
            <div className="redemption-history-pagination">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="redemption-history-pagination-btn"
                >
                    {t('redemption.history.pagination.previous')}
                </button>
                
                {pages.map(page => (
                    <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`redemption-history-pagination-btn ${
                            page === currentPage ? 'redemption-history-pagination-btn--active' : ''
                        }`}
                    >
                        {page}
                    </button>
                ))}
                
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="redemption-history-pagination-btn"
                >
                    {t('redemption.history.pagination.next')}
                </button>
            </div>
        );
    };

    return (
        <div className={`redemption-history ${className}`}>
            {/* Header */}
            <div className="redemption-history-header">
                <h3 className="redemption-history-title">
                    {t('redemption.history.title')}
                </h3>
                
                <AdminOnly fallback={null}>
                    {showExport && history.length > 0 && (
                        <button
                            onClick={exportHistory}
                            className="redemption-history-export-btn"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {t('redemption.history.export')}
                        </button>
                    )}
                </AdminOnly>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="redemption-history-filters">
                    <div className="redemption-history-filters-row">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="redemption-history-filter-select"
                        >
                            <option value="">{t('redemption.history.filters.allStatuses')}</option>
                            <option value="applied">{t('redemption.history.status.applied')}</option>
                            <option value="pending">{t('redemption.history.status.pending')}</option>
                            <option value="failed">{t('redemption.history.status.failed')}</option>
                            <option value="reversed">{t('redemption.history.status.reversed')}</option>
                        </select>

                        <select
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                            className="redemption-history-filter-select"
                        >
                            <option value="">{t('redemption.history.filters.allTypes')}</option>
                            <option value="discount">{t('redemption.history.types.discount')}</option>
                            <option value="extension">{t('redemption.history.types.extension')}</option>
                            <option value="upgrade">{t('redemption.history.types.upgrade')}</option>
                        </select>

                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="redemption-history-filter-date"
                            placeholder={t('redemption.history.filters.startDate')}
                        />

                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="redemption-history-filter-date"
                            placeholder={t('redemption.history.filters.endDate')}
                        />
                    </div>

                    <div className="redemption-history-filters-actions">
                        <button
                            onClick={applyFilters}
                            className="redemption-history-filter-apply-btn"
                        >
                            {t('redemption.history.filters.apply')}
                        </button>
                        
                        <button
                            onClick={clearFilters}
                            className="redemption-history-filter-clear-btn"
                        >
                            {t('redemption.history.filters.clear')}
                        </button>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="redemption-history-content">
                {isLoading ? (
                    <div className="redemption-history-loading">
                        <LoadingSpinner size="medium" />
                        <p>{t('redemption.history.loading')}</p>
                    </div>
                ) : error ? (
                    <div className="redemption-history-error">
                        <div className="redemption-history-error-icon">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <p>{redemptionService.formatErrorMessage(error, t)}</p>
                        <button
                            onClick={loadHistory}
                            className="redemption-history-retry-btn"
                        >
                            {t('redemption.history.retry')}
                        </button>
                    </div>
                ) : history.length === 0 ? (
                    <div className="redemption-history-empty">
                        <div className="redemption-history-empty-icon">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h4>{t('redemption.history.empty.title')}</h4>
                        <p>{t('redemption.history.empty.description')}</p>
                    </div>
                ) : (
                    <>
                        {/* History List */}
                        <div className="redemption-history-list">
                            {history.map((item) => (
                                <div key={item.id} className="redemption-history-item">
                                    <div className="redemption-history-item-header">
                                        <div className="redemption-history-item-code">
                                            {item.code}
                                        </div>
                                        <div className={`redemption-history-item-status ${getStatusBadgeClass(item.status)}`}>
                                            {formatStatus(item.status)}
                                        </div>
                                    </div>
                                    
                                    <div className="redemption-history-item-content">
                                        <div className="redemption-history-item-benefit">
                                            <span className="redemption-history-item-benefit-type">
                                                {formatBenefitType(item.appliedBenefits?.type)}
                                            </span>
                                            <span className="redemption-history-item-benefit-description">
                                                {formatBenefitDescription(item.appliedBenefits)}
                                            </span>
                                        </div>
                                        
                                        <div className="redemption-history-item-date">
                                            {formatDate(item.redeemedAt)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {renderPagination()}

                        {/* Summary */}
                        <div className="redemption-history-summary">
                            {t('redemption.history.summary', {
                                showing: history.length,
                                total: totalItems
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default RedemptionHistory;