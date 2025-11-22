/**
 * Payment History Component
 * 
 * Displays user payment records:
 * - Payment record list
 * - Payment details view
 * - Invoice download
 * - Payment status indicators
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { systemLogger } from '../../utils/logger';
import LoadingSpinner from '../Common/LoadingSpinner';
import paymentService from '../../services/paymentService';
import './PaymentHistory.css';

const PaymentHistory = ({ userId }) => {
    const { t } = useTranslation();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    /**
     * Get plan name text
     */
    const getPlanNameText = (planType) => {
        if (!planType) return '';
        
        // Convert plan type to lowercase for consistent lookup
        const normalizedPlanType = planType.toLowerCase();
        
        // Try to get translated plan name
        if (normalizedPlanType === 'pro') {
            return t('subscription.plans.pro');
        } else if (normalizedPlanType === 'free') {
            return t('subscription.plans.free');
        }
        
        // Fallback to capitalized plan type
        return planType.charAt(0).toUpperCase() + planType.slice(1).toLowerCase();
    };

    useEffect(() => {
        if (userId) {
            loadPaymentHistory();
        }
    }, [userId]);

    /**
     * Load payment history
     */
    const loadPaymentHistory = async () => {
        try {
            setLoading(true);
            setError(null);

            // Call real payment history API
            const response = await paymentService.getPaymentHistory();
            
            systemLogger.info('Payment history API response:', response);

            // Process API response data
            let paymentData = [];
            if (Array.isArray(response)) {
                paymentData = response;
            } else if (response && Array.isArray(response.payments)) {
                paymentData = response.payments;
            } else if (response && Array.isArray(response.data)) {
                paymentData = response.data;
            }

            // Format payment data to match component requirements
            const formattedPayments = paymentData.map(payment => ({
                id: payment.id || payment.paymentId,
                orderId: payment.orderId || payment.merchantTradeNo,
                amount: payment.amount || 0,
                currency: payment.currency || 'TWD',
                status: payment.status || payment.paymentStatus,
                displayText: payment.displayText, // 使用後端提供的顯示文字
                statusKey: payment.statusKey, // 使用後端提供的翻譯鍵值
                paymentMethod: payment.paymentMethod || t('payment.methods.creditCard'),
                planType: payment.planType || 'pro',
                billingPeriod: payment.billingPeriod || 'monthly',
                paymentDate: payment.paymentDate || payment.createdAt || payment.paidAt,
                // Always use frontend translation, ignore backend description to ensure proper i18n
                description: t('payment.history.planDescription', {
                    planType: getPlanNameText(payment.planType || 'pro'),
                    billingPeriod: payment.billingPeriod === 'yearly' ? t('payment.history.yearly') : t('payment.history.monthly')
                }),
                invoiceUrl: payment.invoiceUrl,
                failureReason: payment.failureReason || payment.errorMessage,
                // 保留原始狀態信息用於調試
                originalPaymentStatus: payment.originalPaymentStatus,
                orderStatus: payment.orderStatus,
                isExpired: payment.isExpired
            }));

            setPayments(formattedPayments);
            
            systemLogger.info('Payment history loaded:', {
                userId,
                paymentCount: formattedPayments.length
            });

        } catch (error) {
            systemLogger.error('Failed to load payment history:', {
                userId,
                error: error.message
            });
            setError(t('payment.history.loadError', { message: error.message || t('common.unknownError') }));
        } finally {
            setLoading(false);
        }
    };

    /**
     * Show payment details
     */
    const handleShowDetails = (payment) => {
        setSelectedPayment(payment);
        setShowDetails(true);
    };

    /**
     * Download invoice
     */
    const handleDownloadInvoice = (payment) => {
        if (payment.invoiceUrl) {
            // In actual implementation, should call API to get invoice download link
            window.open(payment.invoiceUrl, '_blank');
            
            systemLogger.info('Invoice download requested:', {
                paymentId: payment.id,
                invoiceUrl: payment.invoiceUrl
            });
        }
    };



    /**
     * Get payment status text with smart display logic
     */
    const getStatusText = (payment) => {
        // 優先使用後端提供的顯示文字
        if (payment.displayText) {
            // 直接使用後端提供的顯示文字，因為後端已經處理了國際化
            return payment.displayText;
        }

        // 回退到原有邏輯（向後兼容）
        const status = payment.status;
        
        // 針對不同狀態提供更友好的顯示文字，使用正確的付款歷史翻譯鍵值
        if (status === 'expired') {
            return t('payment.history.status.expired', '訂單已過期');
        }
        
        if (status === 'failed') {
            return t('payment.history.status.failed', '付款失敗');
        }
        
        if (status === 'pending') {
            return t('payment.history.status.pending', '處理中');
        }
        
        if (status === 'success' || status === 'paid') {
            return t('payment.history.status.success', '付款成功');
        }
        
        const statusKey = `payment.history.status.${status}`;
        return t(statusKey, { defaultValue: t('payment.history.status.unknown', '未知狀態') });
    };

    /**
     * Format amount
     */
    const formatAmount = (amount, currency = 'TWD') => {
        return `${currency} ${amount.toLocaleString()}`;
    };

    /**
     * Format date
     */
    const formatDate = (date) => {
        const locale = t('common.locale', { defaultValue: 'zh-TW' });
        return new Date(date).toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false  // 使用 24 小時制，避免顯示 AM/PM
        });
    };

    /**
     * Get paginated data
     */
    const getPaginatedPayments = () => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return payments.slice(startIndex, endIndex);
    };

    /**
     * Handle page change
     */
    const handlePageChange = (page) => {
        setCurrentPage(page);
        // Scroll to component top
        document.querySelector('.payment-history')?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    };

    /**
     * Calculate total pages
     */
    const getTotalPages = () => {
        return Math.ceil(payments.length / itemsPerPage);
    };

    /**
     * Get current display data summary
     */
    const getDataSummary = () => {
        const totalItems = payments.length;
        const totalPages = getTotalPages();
        const currentItems = getPaginatedPayments().length;
        
        return {
            total: totalItems,
            currentPage,
            totalPages,
            showing: currentItems
        };
    };

    if (loading) {
        return (
            <div className="payment-history__loading">
                <LoadingSpinner size="large" />
                <p className="payment-history__loading-text">{t('common.loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="payment-history__error">
                <svg className="payment-history__error-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="payment-history__error-content">
                    <h3 className="payment-history__error-title">{t('common.error')}</h3>
                    <p className="payment-history__error-message">{error}</p>
                    <button 
                        className="payment-history__retry-button"
                        onClick={loadPaymentHistory}
                    >
                        {t('errorBoundary.retryButton')}
                    </button>
                </div>
            </div>
        );
    }

    if (payments.length === 0) {
        return (
            <div className="payment-history__empty">
                <div className="payment-history__empty-content">
                    <h3 className="payment-history__empty-title">{t('payment.history.title')}</h3>
                    <p className="payment-history__empty-description">{t('payment.history.noPayments')}</p>
                </div>
            </div>
        );
    }

    const paginatedPayments = getPaginatedPayments();
    const dataSummary = getDataSummary();
    const totalPages = getTotalPages();

    return (
        <div className="payment-history">
            {/* Header with title and refresh button */}
            <div className="payment-history__header">
                <h2 className="payment-history__title">{t('subscription.userAccount.paymentHistory')}</h2>
                <button
                    onClick={loadPaymentHistory}
                    disabled={loading}
                    className="payment-history__refresh-button"
                >
                    <svg 
                        className={`payment-history__refresh-icon ${loading ? 'payment-history__refresh-icon--spinning' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="payment-history__refresh-text">{t('common.refresh')}</span>
                </button>
            </div>



            {/* Payment Cards */}
            <div className="payment-history__cards">
                {paginatedPayments.map((payment) => (
                    <div key={payment.id} className="payment-card">
                        <div className="payment-card__header">
                            <div className="payment-card__main-info">
                                <div className="payment-card__description">
                                    <h3 className="payment-card__title">{payment.description}</h3>
                                    <p className="payment-card__order-id">{t('payment.history.orderId')}: {payment.orderId}</p>
                                </div>
                                <div className="payment-card__amount">
                                    <div className="payment-card__amount-value">
                                        {formatAmount(payment.amount, payment.currency)}
                                    </div>
                                </div>
                            </div>
                            <div className="payment-card__status-row">
                                <span className="payment-card__date">
                                    {formatDate(payment.paymentDate)}
                                </span>
                                <div className={`payment-status payment-status--${payment.status}`}>
                                    {payment.status === 'success' && (
                                        <svg className="payment-status__icon" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                    {(payment.status === 'failed' || payment.status === 'expired') && (
                                        <svg className="payment-status__icon" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                    {payment.status === 'pending' && (
                                        <svg className="payment-status__icon payment-status__icon--spinning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                    {payment.status === 'refunded' && (
                                        <svg className="payment-status__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                        </svg>
                                    )}
                                    <span>{getStatusText(payment)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="payment-card__details">
                            <div className="payment-card__detail-item">
                                <span className="payment-card__detail-label">{t('payment.history.method')}</span>
                                <span className="payment-card__detail-value">{payment.paymentMethod}</span>
                            </div>
                            <div className="payment-card__detail-item">
                                <span className="payment-card__detail-label">{t('payment.history.plan')}</span>
                                <span className="payment-card__detail-value">{getPlanNameText(payment.planType)}</span>
                            </div>
                        </div>

                        <div className="payment-card__actions">
                            <button
                                onClick={() => handleShowDetails(payment)}
                                className="payment-card__action-button payment-card__action-button--primary"
                            >
                                <svg className="payment-card__action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {t('payment.history.viewDetails')}
                            </button>
                            {payment.status === 'success' && payment.invoiceUrl && (
                                <button
                                    onClick={() => handleDownloadInvoice(payment)}
                                    className="payment-card__action-button payment-card__action-button--secondary"
                                >
                                    <svg className="payment-card__action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    {t('payment.actions.downloadInvoice')}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="payment-history__pagination">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="payment-history__pagination-button"
                    >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('common.previous')}
                    </button>
                    
                    <div className="payment-history__pagination-info">
                        <span className="payment-history__pagination-current">{currentPage}</span>
                        <span className="payment-history__pagination-separator">/</span>
                        <span className="payment-history__pagination-total">{totalPages}</span>
                    </div>
                    
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="payment-history__pagination-button"
                    >
                        {t('common.next')}
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Payment Details Modal */}
            {showDetails && selectedPayment && (
                <div className="payment-details-modal">
                    <div className="payment-details-modal__backdrop" onClick={() => setShowDetails(false)} />
                    <div className="payment-details-modal__container">
                        <div className="payment-details-modal__content">
                            <div className="payment-details-modal__header">
                                <div className="payment-details-modal__header-content">
                                    <h3 className="payment-details-modal__title">{t('payment.history.viewDetails')}</h3>
                                    <div className={`payment-status payment-status--${selectedPayment.status}`}>
                                        {selectedPayment.status === 'success' && (
                                            <svg className="payment-status__icon" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                        {(selectedPayment.status === 'failed' || selectedPayment.status === 'expired') && (
                                            <svg className="payment-status__icon" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                        {selectedPayment.status === 'pending' && (
                                            <svg className="payment-status__icon payment-status__icon--spinning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                        {selectedPayment.status === 'refunded' && (
                                            <svg className="payment-status__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                            </svg>
                                        )}
                                        <span>{getStatusText(selectedPayment)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="payment-details-modal__close-button"
                                >
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="payment-details-modal__amount-section">
                                <div className="payment-details-modal__amount">
                                    {formatAmount(selectedPayment.amount, selectedPayment.currency)}
                                </div>
                                <p className="payment-details-modal__description">{selectedPayment.description}</p>
                            </div>

                            <div className="payment-details-modal__details">
                                <div className="payment-details-modal__detail-group">
                                    <div className="payment-details-modal__detail-item">
                                        <span className="payment-details-modal__detail-label">{t('payment.history.paymentId')}</span>
                                        <span className="payment-details-modal__detail-value payment-details-modal__detail-value--mono">{selectedPayment.id}</span>
                                    </div>
                                    <div className="payment-details-modal__detail-item">
                                        <span className="payment-details-modal__detail-label">{t('payment.history.orderId')}</span>
                                        <span className="payment-details-modal__detail-value payment-details-modal__detail-value--mono">{selectedPayment.orderId}</span>
                                    </div>
                                </div>

                                <div className="payment-details-modal__detail-group">
                                    <div className="payment-details-modal__detail-item">
                                        <span className="payment-details-modal__detail-label">{t('payment.history.date')}</span>
                                        <span className="payment-details-modal__detail-value">{formatDate(selectedPayment.paymentDate)}</span>
                                    </div>
                                    <div className="payment-details-modal__detail-item">
                                        <span className="payment-details-modal__detail-label">{t('payment.history.method')}</span>
                                        <span className="payment-details-modal__detail-value">{selectedPayment.paymentMethod}</span>
                                    </div>
                                </div>

                                <div className="payment-details-modal__detail-group">
                                    <div className="payment-details-modal__detail-item">
                                        <span className="payment-details-modal__detail-label">{t('payment.history.plan')}</span>
                                        <span className="payment-details-modal__detail-value">{getPlanNameText(selectedPayment.planType)}</span>
                                    </div>
                                    <div className="payment-details-modal__detail-item">
                                        <span className="payment-details-modal__detail-label">{t('payment.history.cycle')}</span>
                                        <span className="payment-details-modal__detail-value">
                                            {selectedPayment.billingPeriod === 'monthly' ? t('payment.history.monthly') : t('payment.history.yearly')}
                                        </span>
                                    </div>
                                </div>

                                {selectedPayment.status === 'failed' && selectedPayment.failureReason && (
                                    <div className="payment-details-modal__detail-item payment-details-modal__detail-item--full">
                                        <span className="payment-details-modal__detail-label">{t('payment.history.failureReason')}</span>
                                        <span className="payment-details-modal__detail-value payment-details-modal__detail-value--error">
                                            {selectedPayment.failureReason}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="payment-details-modal__actions">
                                {selectedPayment.status === 'success' && selectedPayment.invoiceUrl && (
                                    <button
                                        onClick={() => handleDownloadInvoice(selectedPayment)}
                                        className="payment-details-modal__action-button payment-details-modal__action-button--primary"
                                    >
                                        <svg className="payment-details-modal__action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        {t('payment.actions.downloadInvoice')}
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="payment-details-modal__action-button payment-details-modal__action-button--secondary"
                                >
                                    {t('common.close')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentHistory;