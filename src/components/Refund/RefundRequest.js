import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../Common/LoadingSpinner';
import { refundService } from '../../services/refundService';
import { paymentService } from '../../services/paymentService';
import { logger } from '../../utils/logger';

/**
 * RefundRequest Component
 * 實作退款申請功能
 * 整合到用戶帳戶頁面中
 * 支援退款歷史查看和狀態追蹤
 */
const RefundRequest = ({ userId, onRefundSubmitted }) => {
    const { t } = useTranslation();
    const [payments, setPayments] = useState([]);
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showRefundForm, setShowRefundForm] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [refundForm, setRefundForm] = useState({
        amount: '',
        reason: ''
    });
    const [activeTab, setActiveTab] = useState('history'); // 'history' or 'request'

    // 載入付款記錄和退款歷史
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 並行載入付款記錄和退款歷史
            const [paymentsResponse, refundsResponse] = await Promise.all([
                paymentService.getPaymentHistory(),
                refundService.getRefundHistory()
            ]);

            if (paymentsResponse.success) {
                // 只顯示成功的付款記錄
                const successfulPayments = paymentsResponse.data.payments.filter(
                    payment => payment.status === 'success'
                );
                setPayments(successfulPayments);
            } else {
                throw new Error(paymentsResponse.error || '載入付款記錄失敗');
            }

            if (refundsResponse.success) {
                setRefunds(refundsResponse.data.refunds);
            } else {
                // 退款歷史載入失敗不影響主要功能
                logger.warn('Failed to load refund history:', refundsResponse.error);
                setRefunds([]);
            }

            logger.info('Refund data loaded successfully', {
                paymentsCount: payments.length,
                refundsCount: refunds.length
            });
        } catch (err) {
            logger.error('Failed to load refund data:', err);
            setError(err.message || '載入資料失敗');
        } finally {
            setLoading(false);
        }
    };

    // 初始載入
    useEffect(() => {
        loadData();
    }, []);

    // 處理退款申請表單提交
    const handleRefundSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedPayment) {
            setError('請選擇要退款的付款記錄');
            return;
        }

        const amount = parseFloat(refundForm.amount);
        if (isNaN(amount) || amount <= 0) {
            setError('請輸入有效的退款金額');
            return;
        }

        if (amount > selectedPayment.amount) {
            setError('退款金額不能超過原付款金額');
            return;
        }

        if (!refundForm.reason.trim() || refundForm.reason.trim().length < 10) {
            setError('退款原因至少需要 10 個字符');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            const response = await refundService.requestRefund({
                paymentId: selectedPayment.id,
                amount: amount,
                reason: refundForm.reason.trim()
            });

            if (response.success) {
                setSuccess('退款申請已提交成功');
                setShowRefundForm(false);
                setSelectedPayment(null);
                setRefundForm({ amount: '', reason: '' });
                setActiveTab('history');
                
                // 重新載入資料
                await loadData();
                
                // 通知父組件
                if (onRefundSubmitted) {
                    onRefundSubmitted(response.data.refund);
                }

                logger.info('Refund request submitted successfully', {
                    refundId: response.data.refund.id,
                    paymentId: selectedPayment.id,
                    amount
                });
            } else {
                throw new Error(response.error || '提交退款申請失敗');
            }
        } catch (err) {
            logger.error('Failed to submit refund request:', err);
            setError(err.message || '提交退款申請失敗');
        } finally {
            setSubmitting(false);
        }
    };

    // 處理取消退款
    const handleCancelRefund = async (refundId) => {
        if (!window.confirm(t('refund.confirmCancel'))) {
            return;
        }

        try {
            const response = await refundService.cancelRefund(refundId);
            
            if (response.success) {
                setSuccess('退款申請已取消');
                await loadData(); // 重新載入資料
                
                logger.info('Refund cancelled successfully', { refundId });
            } else {
                throw new Error(response.error || '取消退款申請失敗');
            }
        } catch (err) {
            logger.error('Failed to cancel refund:', err);
            setError(err.message || '取消退款申請失敗');
        }
    };

    // 開始退款申請流程
    const startRefundRequest = (payment) => {
        setSelectedPayment(payment);
        setRefundForm({
            amount: payment.amount.toString(),
            reason: ''
        });
        setShowRefundForm(true);
        setActiveTab('request');
        setError(null);
        setSuccess(null);
    };

    // 獲取退款狀態顯示
    const getRefundStatusDisplay = (status) => {
        const statusConfig = {
            pending: {
                text: t('refund.status.pending'),
                className: 'bg-yellow-100 text-yellow-800'
            },
            processing: {
                text: t('refund.status.processing'),
                className: 'bg-blue-100 text-blue-800'
            },
            succeeded: {
                text: t('refund.status.succeeded'),
                className: 'bg-green-100 text-green-800'
            },
            failed: {
                text: t('refund.status.failed'),
                className: 'bg-red-100 text-red-800'
            },
            cancelled: {
                text: t('refund.status.cancelled'),
                className: 'bg-gray-100 text-gray-800'
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
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // 格式化金額
    const formatAmount = (amount, currency = 'TWD') => {
        return new Intl.NumberFormat('zh-TW', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    // 檢查付款是否已有退款申請
    const hasRefundRequest = (paymentId) => {
        return refunds.some(refund => 
            refund.payment.id === paymentId && 
            ['pending', 'processing', 'succeeded'].includes(refund.status)
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <LoadingSpinner />
                <span className="ml-2">{t('refund.loading')}</span>
            </div>
        );
    }

    return (
        <div className="refund-request">
            {/* 標題和標籤頁 */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'history'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        {t('refund.history')}
                    </button>
                    <button
                        onClick={() => setActiveTab('request')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'request'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        {t('refund.newRequest')}
                    </button>
                </nav>
            </div>

            {/* 成功/錯誤訊息 */}
            {success && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-green-800">{success}</p>
                        </div>
                        <div className="ml-auto pl-3">
                            <button
                                onClick={() => setSuccess(null)}
                                className="text-green-400 hover:text-green-600"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 退款歷史標籤頁 */}
            {activeTab === 'history' && (
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {t('refund.historyTitle')}
                    </h3>
                    
                    {refunds.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                {t('refund.noRefunds')}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {t('refund.noRefundsDescription')}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white shadow overflow-hidden sm:rounded-md">
                            <ul className="divide-y divide-gray-200">
                                {refunds.map((refund) => {
                                    const statusDisplay = getRefundStatusDisplay(refund.status);
                                    
                                    return (
                                        <li key={refund.id}>
                                            <div className="px-4 py-4 sm:px-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0">
                                                            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                                                            </svg>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="flex items-center">
                                                                <p className="text-sm font-medium text-indigo-600 truncate">
                                                                    {formatAmount(refund.amount)}
                                                                </p>
                                                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.className}`}>
                                                                    {statusDisplay.text}
                                                                </span>
                                                            </div>
                                                            <div className="mt-2 flex items-center text-sm text-gray-500">
                                                                <p>
                                                                    {refund.order?.itemName || t('refund.defaultItemName')} • 
                                                                    {formatDate(refund.createdAt)}
                                                                </p>
                                                            </div>
                                                            <div className="mt-1 text-sm text-gray-500">
                                                                <p className="truncate max-w-md">
                                                                    {t('refund.reason')}: {refund.reason}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        {refund.status === 'pending' && (
                                                            <button
                                                                onClick={() => handleCancelRefund(refund.id)}
                                                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                                                            >
                                                                {t('refund.cancel')}
                                                            </button>
                                                        )}
                                                        {refund.ecpayRefundNo && (
                                                            <span className="text-xs text-gray-500">
                                                                {t('refund.refundNo')}: {refund.ecpayRefundNo}
                                                            </span>
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
                </div>
            )}

            {/* 申請退款標籤頁 */}
            {activeTab === 'request' && (
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {t('refund.requestTitle')}
                    </h3>
                    
                    {!showRefundForm ? (
                        <div>
                            <p className="text-sm text-gray-600 mb-4">
                                {t('refund.selectPaymentDescription')}
                            </p>
                            
                            {payments.length === 0 ? (
                                <div className="text-center py-12">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                                        {t('refund.noPayments')}
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {t('refund.noPaymentsDescription')}
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                                    <ul className="divide-y divide-gray-200">
                                        {payments.map((payment) => {
                                            const hasRefund = hasRefundRequest(payment.id);
                                            
                                            return (
                                                <li key={payment.id}>
                                                    <div className="px-4 py-4 sm:px-6">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center">
                                                                <div className="flex-shrink-0">
                                                                    <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                </div>
                                                                <div className="ml-4">
                                                                    <div className="flex items-center">
                                                                        <p className="text-sm font-medium text-gray-900">
                                                                            {formatAmount(payment.amount)}
                                                                        </p>
                                                                        {hasRefund && (
                                                                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                                {t('refund.hasRequest')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="mt-2 flex items-center text-sm text-gray-500">
                                                                        <p>
                                                                            {payment.order?.itemName || t('refund.defaultItemName')} • 
                                                                            {formatDate(payment.createdAt)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <button
                                                                    onClick={() => startRefundRequest(payment)}
                                                                    disabled={hasRefund}
                                                                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {hasRefund ? t('refund.alreadyRequested') : t('refund.requestRefund')}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white shadow sm:rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    {t('refund.formTitle')}
                                </h3>
                                
                                {selectedPayment && (
                                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                                            {t('refund.selectedPayment')}
                                        </h4>
                                        <div className="text-sm text-gray-600">
                                            <p>{selectedPayment.order?.itemName || t('refund.defaultItemName')}</p>
                                            <p>{formatAmount(selectedPayment.amount)} • {formatDate(selectedPayment.createdAt)}</p>
                                        </div>
                                    </div>
                                )}
                                
                                <form onSubmit={handleRefundSubmit} className="space-y-6">
                                    <div>
                                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                                            {t('refund.amount')}
                                        </label>
                                        <div className="mt-1 relative rounded-md shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-gray-500 sm:text-sm">NT$</span>
                                            </div>
                                            <input
                                                type="number"
                                                id="amount"
                                                value={refundForm.amount}
                                                onChange={(e) => setRefundForm(prev => ({ ...prev, amount: e.target.value }))}
                                                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-12 pr-12 sm:text-sm border-gray-300 rounded-md"
                                                placeholder="0.00"
                                                min="0"
                                                max={selectedPayment?.amount || 0}
                                                step="0.01"
                                                required
                                            />
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500">
                                            {t('refund.maxAmount')}: {selectedPayment ? formatAmount(selectedPayment.amount) : 'N/A'}
                                        </p>
                                    </div>
                                    
                                    <div>
                                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                                            {t('refund.reason')}
                                        </label>
                                        <div className="mt-1">
                                            <textarea
                                                id="reason"
                                                rows={4}
                                                value={refundForm.reason}
                                                onChange={(e) => setRefundForm(prev => ({ ...prev, reason: e.target.value }))}
                                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                placeholder={t('refund.reasonPlaceholder')}
                                                minLength={10}
                                                maxLength={500}
                                                required
                                            />
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500">
                                            {refundForm.reason.length}/500 {t('refund.characters')}
                                        </p>
                                    </div>
                                    
                                    <div className="flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowRefundForm(false);
                                                setSelectedPayment(null);
                                                setRefundForm({ amount: '', reason: '' });
                                            }}
                                            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {submitting ? (
                                                <span className="flex items-center">
                                                    <LoadingSpinner size="sm" />
                                                    <span className="ml-2">{t('refund.submitting')}</span>
                                                </span>
                                            ) : (
                                                t('refund.submit')
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RefundRequest;