/**
 * 付款歷史組件
 * 
 * 顯示用戶的付款記錄：
 * - 付款記錄列表
 * - 付款詳情查看
 * - 發票下載
 * - 付款狀態指示
 */

import React, { useState, useEffect } from 'react';
import { systemLogger } from '../../utils/logger';
import LoadingSpinner from '../Common/LoadingSpinner';

const PaymentHistory = ({ userId }) => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        if (userId) {
            loadPaymentHistory();
        }
    }, [userId]);

    /**
     * 載入付款歷史
     */
    const loadPaymentHistory = async () => {
        try {
            setLoading(true);
            setError(null);

            // 這裡應該呼叫實際的 API
            // const response = await subscriptionService.getPaymentHistory();
            
            // 暫時使用模擬資料
            const mockPayments = [
                {
                    id: 'pay_001',
                    orderId: 'order_001',
                    amount: 299,
                    currency: 'TWD',
                    status: 'success',
                    paymentMethod: 'Credit Card',
                    planType: 'pro',
                    billingPeriod: 'monthly',
                    paymentDate: new Date('2025-01-01'),
                    description: 'Pro 方案 - 月付',
                    invoiceUrl: '/invoices/inv_001.pdf'
                },
                {
                    id: 'pay_002',
                    orderId: 'order_002',
                    amount: 2990,
                    currency: 'TWD',
                    status: 'success',
                    paymentMethod: 'Credit Card',
                    planType: 'pro',
                    billingPeriod: 'yearly',
                    paymentDate: new Date('2024-12-01'),
                    description: 'Pro 方案 - 年付',
                    invoiceUrl: '/invoices/inv_002.pdf'
                },
                {
                    id: 'pay_003',
                    orderId: 'order_003',
                    amount: 299,
                    currency: 'TWD',
                    status: 'failed',
                    paymentMethod: 'Credit Card',
                    planType: 'pro',
                    billingPeriod: 'monthly',
                    paymentDate: new Date('2024-11-15'),
                    description: 'Pro 方案 - 月付',
                    failureReason: '信用卡餘額不足'
                }
            ];

            setPayments(mockPayments);
            
            systemLogger.info('Payment history loaded:', {
                userId,
                paymentCount: mockPayments.length
            });

        } catch (error) {
            systemLogger.error('Failed to load payment history:', {
                userId,
                error: error.message
            });
            setError('載入付款歷史失敗');
        } finally {
            setLoading(false);
        }
    };

    /**
     * 顯示付款詳情
     */
    const handleShowDetails = (payment) => {
        setSelectedPayment(payment);
        setShowDetails(true);
    };

    /**
     * 下載發票
     */
    const handleDownloadInvoice = (payment) => {
        if (payment.invoiceUrl) {
            // 實際實作中應該呼叫 API 獲取發票下載連結
            window.open(payment.invoiceUrl, '_blank');
            
            systemLogger.info('Invoice download requested:', {
                paymentId: payment.id,
                invoiceUrl: payment.invoiceUrl
            });
        }
    };

    /**
     * 獲取付款狀態樣式
     */
    const getStatusStyle = (status) => {
        const styles = {
            success: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
            pending: 'bg-yellow-100 text-yellow-800',
            refunded: 'bg-gray-100 text-gray-800'
        };
        return styles[status] || 'bg-gray-100 text-gray-800';
    };

    /**
     * 獲取付款狀態文字
     */
    const getStatusText = (status) => {
        const texts = {
            success: '成功',
            failed: '失敗',
            pending: '處理中',
            refunded: '已退款'
        };
        return texts[status] || '未知';
    };

    /**
     * 格式化金額
     */
    const formatAmount = (amount, currency = 'TWD') => {
        return `${currency} ${amount.toLocaleString()}`;
    };

    /**
     * 格式化日期
     */
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <LoadingSpinner size="large" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-800">{error}</span>
                </div>
            </div>
        );
    }

    if (payments.length === 0) {
        return (
            <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">尚無付款記錄</h3>
                <p className="text-gray-600">您還沒有任何付款記錄</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">付款歷史</h2>
                <button
                    onClick={loadPaymentHistory}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                >
                    重新整理
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    付款日期
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    描述
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    付款方式
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    金額
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    狀態
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    操作
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {payments.map((payment) => (
                                <tr key={payment.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatDate(payment.paymentDate)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{payment.description}</div>
                                        <div className="text-sm text-gray-500">訂單: {payment.orderId}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {payment.paymentMethod}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {formatAmount(payment.amount, payment.currency)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyle(payment.status)}`}>
                                            {getStatusText(payment.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => handleShowDetails(payment)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            詳情
                                        </button>
                                        {payment.status === 'success' && payment.invoiceUrl && (
                                            <button
                                                onClick={() => handleDownloadInvoice(payment)}
                                                className="text-green-600 hover:text-green-900"
                                            >
                                                發票
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 付款詳情彈窗 */}
            {showDetails && selectedPayment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">付款詳情</h3>
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">付款 ID</label>
                                        <p className="mt-1 text-sm text-gray-900 font-mono">{selectedPayment.id}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">訂單 ID</label>
                                        <p className="mt-1 text-sm text-gray-900 font-mono">{selectedPayment.orderId}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">付款日期</label>
                                        <p className="mt-1 text-sm text-gray-900">{formatDate(selectedPayment.paymentDate)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">付款狀態</label>
                                        <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyle(selectedPayment.status)}`}>
                                            {getStatusText(selectedPayment.status)}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">方案類型</label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedPayment.planType?.toUpperCase()} 方案</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">計費週期</label>
                                        <p className="mt-1 text-sm text-gray-900">
                                            {selectedPayment.billingPeriod === 'monthly' ? '月付' : '年付'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">付款方式</label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedPayment.paymentMethod}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">付款金額</label>
                                        <p className="mt-1 text-sm font-semibold text-gray-900">
                                            {formatAmount(selectedPayment.amount, selectedPayment.currency)}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">描述</label>
                                    <p className="mt-1 text-sm text-gray-900">{selectedPayment.description}</p>
                                </div>

                                {selectedPayment.status === 'failed' && selectedPayment.failureReason && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">失敗原因</label>
                                        <p className="mt-1 text-sm text-red-600">{selectedPayment.failureReason}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                {selectedPayment.status === 'success' && selectedPayment.invoiceUrl && (
                                    <button
                                        onClick={() => handleDownloadInvoice(selectedPayment)}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        下載發票
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    關閉
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