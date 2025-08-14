import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../Common/LoadingSpinner';
import { invoiceService } from '../../services/invoiceService';
import { logger } from '../../utils/logger';

/**
 * InvoiceList Component
 * 實作發票記錄的列表顯示
 * 支援發票詳情的查看
 * 實作發票狀態的視覺化指示
 */
const InvoiceList = ({ userId }) => {
    const { t } = useTranslation();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });
    const [filters, setFilters] = useState({
        status: ''
    });
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [downloadingInvoices, setDownloadingInvoices] = useState(new Set());
    const [resendingInvoices, setResendingInvoices] = useState(new Set());

    // 載入發票列表
    const loadInvoices = async (page = 1, status = '') => {
        try {
            setLoading(true);
            setError(null);

            const response = await invoiceService.getInvoiceList({
                page,
                limit: pagination.limit,
                status
            });

            if (response.success) {
                setInvoices(response.data.invoices);
                setPagination(response.data.pagination);
                
                logger.info('Invoice list loaded successfully', {
                    count: response.data.invoices.length,
                    page,
                    status
                });
            } else {
                throw new Error(response.error || '載入發票列表失敗');
            }
        } catch (err) {
            logger.error('Failed to load invoice list:', err);
            setError(err.message || '載入發票列表失敗');
        } finally {
            setLoading(false);
        }
    };

    // 初始載入
    useEffect(() => {
        loadInvoices(pagination.page, filters.status);
    }, []);

    // 處理頁面變更
    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
        loadInvoices(newPage, filters.status);
    };

    // 處理狀態篩選變更
    const handleStatusFilterChange = (status) => {
        setFilters({ status });
        setPagination(prev => ({ ...prev, page: 1 }));
        loadInvoices(1, status);
    };

    // 查看發票詳情
    const handleViewDetails = async (invoiceId) => {
        try {
            const response = await invoiceService.getInvoiceDetails(invoiceId);
            
            if (response.success) {
                setSelectedInvoice(response.data.invoice);
                setShowDetails(true);
                
                logger.info('Invoice details loaded', { invoiceId });
            } else {
                throw new Error(response.error || '載入發票詳情失敗');
            }
        } catch (err) {
            logger.error('Failed to load invoice details:', err);
            setError(err.message || '載入發票詳情失敗');
        }
    };

    // 下載發票 PDF
    const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
        try {
            setDownloadingInvoices(prev => new Set(prev).add(invoiceId));
            
            const response = await invoiceService.downloadInvoicePDF(invoiceId);
            
            if (response.success) {
                // 創建下載連結
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `${invoiceNumber}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                
                logger.info('Invoice PDF downloaded successfully', { 
                    invoiceId, 
                    invoiceNumber 
                });
            } else {
                throw new Error(response.error || '下載發票失敗');
            }
        } catch (err) {
            logger.error('Failed to download invoice PDF:', err);
            setError(err.message || '下載發票失敗');
        } finally {
            setDownloadingInvoices(prev => {
                const newSet = new Set(prev);
                newSet.delete(invoiceId);
                return newSet;
            });
        }
    };

    // 重新發送發票
    const handleResendInvoice = async (invoiceId, invoiceNumber) => {
        try {
            setResendingInvoices(prev => new Set(prev).add(invoiceId));
            
            const response = await invoiceService.resendInvoice(invoiceId);
            
            if (response.success) {
                logger.info('Invoice resent successfully', { 
                    invoiceId, 
                    invoiceNumber 
                });
                
                // 顯示成功訊息
                alert(t('invoice.resendSuccess'));
                
                // 重新載入列表
                loadInvoices(pagination.page, filters.status);
            } else {
                throw new Error(response.error || '重新發送發票失敗');
            }
        } catch (err) {
            logger.error('Failed to resend invoice:', err);
            setError(err.message || '重新發送發票失敗');
        } finally {
            setResendingInvoices(prev => {
                const newSet = new Set(prev);
                newSet.delete(invoiceId);
                return newSet;
            });
        }
    };

    // 獲取狀態顯示文字和樣式
    const getStatusDisplay = (status) => {
        const statusConfig = {
            draft: {
                text: t('invoice.status.draft'),
                className: 'bg-gray-100 text-gray-800'
            },
            sent: {
                text: t('invoice.status.sent'),
                className: 'bg-blue-100 text-blue-800'
            },
            paid: {
                text: t('invoice.status.paid'),
                className: 'bg-green-100 text-green-800'
            },
            cancelled: {
                text: t('invoice.status.cancelled'),
                className: 'bg-red-100 text-red-800'
            }
        };

        return statusConfig[status] || {
            text: status,
            className: 'bg-gray-100 text-gray-800'
        };
    };

    // 格式化日期
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    // 格式化金額
    const formatAmount = (amount, currency = 'TWD') => {
        return new Intl.NumberFormat('zh-TW', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    if (loading && invoices.length === 0) {
        return (
            <div className="flex justify-center items-center py-8">
                <LoadingSpinner />
                <span className="ml-2">{t('invoice.loading')}</span>
            </div>
        );
    }

    return (
        <div className="invoice-list">
            {/* 標題和篩選器 */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                    {t('invoice.title')}
                </h2>
                
                <div className="flex items-center space-x-4">
                    {/* 狀態篩選器 */}
                    <select
                        value={filters.status}
                        onChange={(e) => handleStatusFilterChange(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">{t('invoice.filter.allStatus')}</option>
                        <option value="draft">{t('invoice.status.draft')}</option>
                        <option value="sent">{t('invoice.status.sent')}</option>
                        <option value="paid">{t('invoice.status.paid')}</option>
                        <option value="cancelled">{t('invoice.status.cancelled')}</option>
                    </select>
                </div>
            </div>

            {/* 錯誤訊息 */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                        <div className="ml-auto pl-3">
                            <button
                                onClick={() => setError(null)}
                                className="text-red-400 hover:text-red-600"
                            >
                                <span className="sr-only">{t('common.close')}</span>
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 發票列表 */}
            {invoices.length === 0 ? (
                <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                        {t('invoice.noInvoices')}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {t('invoice.noInvoicesDescription')}
                    </p>
                </div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {invoices.map((invoice) => {
                            const statusDisplay = getStatusDisplay(invoice.status);
                            
                            return (
                                <li key={invoice.id}>
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="flex items-center">
                                                        <p className="text-sm font-medium text-indigo-600 truncate">
                                                            {invoice.invoiceNumber}
                                                        </p>
                                                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.className}`}>
                                                            {statusDisplay.text}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 flex items-center text-sm text-gray-500">
                                                        <p>
                                                            {invoice.order?.itemName || t('invoice.defaultItemName')} • 
                                                            {formatAmount(invoice.totalAmount, invoice.currency)} • 
                                                            {formatDate(invoice.issueDate)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {/* 查看詳情按鈕 */}
                                                <button
                                                    onClick={() => handleViewDetails(invoice.id)}
                                                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                                >
                                                    {t('invoice.viewDetails')}
                                                </button>
                                                
                                                {/* 下載 PDF 按鈕 */}
                                                <button
                                                    onClick={() => handleDownloadPDF(invoice.id, invoice.invoiceNumber)}
                                                    disabled={downloadingInvoices.has(invoice.id)}
                                                    className="text-green-600 hover:text-green-900 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {downloadingInvoices.has(invoice.id) ? (
                                                        <span className="flex items-center">
                                                            <LoadingSpinner size="sm" />
                                                            <span className="ml-1">{t('invoice.downloading')}</span>
                                                        </span>
                                                    ) : (
                                                        t('invoice.download')
                                                    )}
                                                </button>
                                                
                                                {/* 重新發送按鈕 */}
                                                {invoice.status !== 'cancelled' && (
                                                    <button
                                                        onClick={() => handleResendInvoice(invoice.id, invoice.invoiceNumber)}
                                                        disabled={resendingInvoices.has(invoice.id)}
                                                        className="text-blue-600 hover:text-blue-900 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {resendingInvoices.has(invoice.id) ? (
                                                            <span className="flex items-center">
                                                                <LoadingSpinner size="sm" />
                                                                <span className="ml-1">{t('invoice.resending')}</span>
                                                            </span>
                                                        ) : (
                                                            t('invoice.resend')
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* 分頁 */}
            {pagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                        <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('common.previous')}
                        </button>
                        <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('common.next')}
                        </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                {t('common.pagination.showing')} {' '}
                                <span className="font-medium">
                                    {(pagination.page - 1) * pagination.limit + 1}
                                </span> {' '}
                                {t('common.pagination.to')} {' '}
                                <span className="font-medium">
                                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                                </span> {' '}
                                {t('common.pagination.of')} {' '}
                                <span className="font-medium">{pagination.total}</span> {' '}
                                {t('common.pagination.results')}
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="sr-only">{t('common.previous')}</span>
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                
                                {/* 頁碼按鈕 */}
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                pageNum === pagination.page
                                                    ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="sr-only">{t('common.next')}</span>
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}

            {/* 發票詳情模態框 */}
            {showDetails && selectedInvoice && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    {t('invoice.details')}
                                </h3>
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            {t('invoice.invoiceNumber')}
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">
                                            {selectedInvoice.invoiceNumber}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            {t('invoice.status.label')}
                                        </label>
                                        <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusDisplay(selectedInvoice.status).className}`}>
                                            {getStatusDisplay(selectedInvoice.status).text}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            {t('invoice.issueDate')}
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">
                                            {formatDate(selectedInvoice.issueDate)}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            {t('invoice.dueDate')}
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">
                                            {formatDate(selectedInvoice.dueDate)}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            {t('invoice.amount')}
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">
                                            {formatAmount(selectedInvoice.amount, selectedInvoice.currency)}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            {t('invoice.totalAmount')}
                                        </label>
                                        <p className="mt-1 text-sm font-bold text-gray-900">
                                            {formatAmount(selectedInvoice.totalAmount, selectedInvoice.currency)}
                                        </p>
                                    </div>
                                </div>
                                
                                {selectedInvoice.order && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            {t('invoice.orderInfo')}
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">
                                            {selectedInvoice.order.itemName} ({selectedInvoice.order.planType} - {selectedInvoice.order.billingPeriod})
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    {t('common.close')}
                                </button>
                                <button
                                    onClick={() => handleDownloadPDF(selectedInvoice.id, selectedInvoice.invoiceNumber)}
                                    disabled={downloadingInvoices.has(selectedInvoice.id)}
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {downloadingInvoices.has(selectedInvoice.id) ? (
                                        <span className="flex items-center">
                                            <LoadingSpinner size="sm" />
                                            <span className="ml-1">{t('invoice.downloading')}</span>
                                        </span>
                                    ) : (
                                        t('invoice.downloadPDF')
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceList;