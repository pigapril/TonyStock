/**
 * 付款狀態頁面
 * 
 * 顯示付款處理狀態：
 * - 處理中：顯示進度指示器和輪詢狀態
 * - 成功：顯示成功訊息和訂閱資訊
 * - 失敗：顯示錯誤訊息和重試選項
 * - 取消：顯示取消訊息和返回選項
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { trackSubscriptionPurchase } from '../../utils/subscriptionAnalytics';
import paymentService from '../../services/paymentService';
import { systemLogger } from '../../utils/logger';
import LoadingSpinner from '../Common/LoadingSpinner';

const PaymentStatus = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const language = i18n.language?.startsWith('zh') ? 'zh-TW' : 'en';
    const displayError = error => {
        if (error?.startsWith('paymentStatus.')) return t(error);
        if (i18n.language?.startsWith('en') && /[\u3400-\u9fff]/.test(error || '')) {
            return t('paymentStatus.genericFailure');
        }
        return error;
    };
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId');

    const [status, setStatus] = useState('processing'); // processing, success, failed, cancelled, timeout
    const [paymentData, setPaymentData] = useState(null);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0);

    useEffect(() => {
        if (!orderId) {
            setStatus('failed');
            setError('paymentStatus.missingOrder');
            return;
        }

        systemLogger.info('PaymentStatus initialized:', { orderId });
        
        // 開始輪詢付款狀態
        startPaymentPolling();

        // 開始計時器
        const timer = setInterval(() => {
            setTimeElapsed(prev => prev + 1);
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, [orderId]);

    /**
     * 開始輪詢付款狀態
     */
    const startPaymentPolling = async () => {
        try {
            setStatus('processing');
            setError(null);

            systemLogger.info('Starting payment status polling:', { orderId });

            // 檢查 orderId 是否為 UUID 格式
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId);
            
            let result;
            if (isUUID) {
                // 使用 orderId 查詢
                result = await paymentService.pollPaymentStatus(orderId, {
                    maxAttempts: 60, // 5 分鐘
                    interval: 5000   // 5 秒間隔
                });
            } else {
                // 使用 merchantTradeNo 查詢
                result = await paymentService.pollPaymentStatusByMerchantTradeNo(orderId, {
                    maxAttempts: 60, // 5 分鐘
                    interval: 5000   // 5 秒間隔
                });
            }

            if (result.success) {
                if (result.status === 'completed') {
                    trackSubscriptionPurchase(result.data);
                    setStatus('success');
                    setPaymentData(result.data);
                    
                    systemLogger.info('Payment completed successfully:', {
                        orderId,
                        paymentData: result.data
                    });
                } else {
                    setStatus(result.status); // failed, cancelled, expired
                    setPaymentData(result.data);
                    setError(result.error || 'paymentStatus.incomplete');
                }
            } else {
                setStatus(result.status || 'failed');
                setError(result.error || 'paymentStatus.queryFailed');
            }

        } catch (error) {
            systemLogger.error('Payment polling failed:', {
                orderId,
                error: error.message
            });

            setStatus('failed');
            setError('paymentStatus.queryError');
        }
    };

    /**
     * 重試付款狀態查詢
     */
    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        setTimeElapsed(0);
        startPaymentPolling();
    };

    /**
     * 返回訂閱頁面
     */
    const handleBackToSubscription = () => {
        navigate(`/${language}/subscription-plans`);
    };

    /**
     * 前往帳戶頁面
     */
    const handleGoToAccount = () => {
        navigate(`/${language}/user-account`);
    };

    /**
     * 重新付款
     */
    const handleRetryPayment = () => {
        navigate(`/${language}/subscription-plans`, {
            state: { 
                retryPayment: true,
                previousOrderId: orderId 
            }
        });
    };

    /**
     * 格式化時間顯示
     */
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    /**
     * 渲染處理中狀態
     */
    const renderProcessingStatus = () => (
        <div className="text-center">
            <div className="mb-6">
                <LoadingSpinner size="large" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {t('paymentStatus.processingTitle')}
            </h1>
            
            <p className="text-gray-600 mb-6">
                {t('paymentStatus.processingBody')}
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center space-x-4 text-sm text-blue-800">
                    <div>
                        <span className="font-medium">{t('paymentStatus.orderLabel')}</span>
                        <span className="font-mono">{orderId}</span>
                    </div>
                    <div>
                        <span className="font-medium">{t('paymentStatus.elapsedLabel')}</span>
                        <span>{formatTime(timeElapsed)}</span>
                    </div>
                    {retryCount > 0 && (
                        <div>
                            <span className="font-medium">{t('paymentStatus.retryLabel')}</span>
                            <span>{retryCount}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2 text-sm text-gray-500">
                <p>• {t('paymentStatus.processingTime')}</p>
                <p>• {t('paymentStatus.keepOpen')}</p>
                <p>• {t('paymentStatus.autoCheck')}</p>
            </div>

            <div className="mt-8">
                <button
                    onClick={handleRetry}
                    className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                    {t('paymentStatus.manualCheck')}
                </button>
            </div>
        </div>
    );

    /**
     * 渲染成功狀態
     */
    const renderSuccessStatus = () => (
        <div className="text-center">
            <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {t('paymentStatus.successTitle')}
            </h1>

            <p className="text-gray-600 mb-6">
                {t('paymentStatus.successBody')}
            </p>

            {paymentData && paymentData.subscription && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                    <h3 className="font-semibold text-green-900 mb-3">{t('paymentStatus.subscriptionTitle')}</h3>
                    <div className="space-y-2 text-sm text-green-800">
                        <div className="flex justify-between">
                            <span>{t('paymentStatus.planLabel')}</span>
                            <span className="font-medium">
                                {t('paymentStatus.planName', { plan: paymentData.subscription.planType?.toUpperCase() })}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>{t('paymentStatus.billingLabel')}</span>
                            <span className="font-medium">
                                {t(paymentData.billingPeriod === 'monthly' ? 'paymentStatus.monthly' : 'paymentStatus.yearly')}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>{t('paymentStatus.startLabel')}</span>
                            <span className="font-medium">
                                {new Date(paymentData.subscription.startDate).toLocaleDateString(i18n.language)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>{t('paymentStatus.endLabel')}</span>
                            <span className="font-medium">
                                {new Date(paymentData.subscription.endDate).toLocaleDateString(i18n.language)}
                            </span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                            <span>{t('paymentStatus.amountLabel')}</span>
                            <span className="font-medium">
                                NT$ {paymentData.amount?.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-900 mb-2">{t('paymentStatus.availableTitle')}</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• {t('paymentStatus.availableSentiment')}</li>
                    <li>• {t('paymentStatus.availableAnalysis')}</li>
                    <li>• {t('paymentStatus.availableWatchlist')}</li>
                    <li>• {t('paymentStatus.availableMomentum')}</li>
                </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    onClick={handleGoToAccount}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {t('paymentStatus.accountDetails')}
                </button>
                <button
                    onClick={() => navigate(`/${language}/priceanalysis`)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    {t('paymentStatus.startUsing')}
                </button>
            </div>
        </div>
    );

    /**
     * 渲染失敗狀態
     */
    const renderFailedStatus = () => (
        <div className="text-center">
            <div className="mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {t('paymentStatus.failedTitle')}
            </h1>

            <p className="text-gray-600 mb-6">
                {displayError(error) || t('paymentStatus.genericFailure')}
            </p>

            {paymentData && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="text-sm text-red-800">
                        <div className="font-medium mb-2">{t('paymentStatus.orderTitle')}</div>
                        <div className="space-y-1">
                            <div>{t('paymentStatus.orderLabel')}{paymentData.orderId}</div>
                            <div>{t('paymentStatus.orderStatusLabel')}{paymentData.orderStatus}</div>
                            <div>{t('paymentStatus.paymentStatusLabel')}{paymentData.paymentStatus}</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-yellow-900 mb-2">{t('paymentStatus.possibleReasons')}</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• {t('paymentStatus.cardReason')}</li>
                    <li>• {t('paymentStatus.bankReason')}</li>
                    <li>• {t('paymentStatus.networkReason')}</li>
                    <li>• {t('paymentStatus.detailsReason')}</li>
                </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    onClick={handleRetryPayment}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {t('paymentStatus.retryPayment')}
                </button>
                <button
                    onClick={handleBackToSubscription}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                    {t('paymentStatus.backToPlans')}
                </button>
            </div>
        </div>
    );

    /**
     * 渲染取消狀態
     */
    const renderCancelledStatus = () => (
        <div className="text-center">
            <div className="mb-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {t('paymentStatus.cancelledTitle')}
            </h1>

            <p className="text-gray-600 mb-6">
                {t('paymentStatus.cancelledBody')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    onClick={handleRetryPayment}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {t('paymentStatus.choosePlan')}
                </button>
                <button
                    onClick={() => navigate(`/${language}`)}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                    {t('paymentStatus.home')}
                </button>
            </div>
        </div>
    );

    /**
     * 渲染超時狀態
     */
    const renderTimeoutStatus = () => (
        <div className="text-center">
            <div className="mb-6">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {t('paymentStatus.timeoutTitle')}
            </h1>

            <p className="text-gray-600 mb-6">
                {t('paymentStatus.timeoutBody')}
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="text-sm text-blue-800">
                    <p className="font-medium mb-2">{t('paymentStatus.ifPaid')}</p>
                    <ul className="space-y-1">
                        <li>• {t('paymentStatus.stillProcessing')}</li>
                        <li>• {t('paymentStatus.accountHint')}</li>
                        <li>• {t('paymentStatus.supportHint')}</li>
                    </ul>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    onClick={handleRetry}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {t('paymentStatus.retryCheck')}
                </button>
                <button
                    onClick={handleGoToAccount}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                    {t('paymentStatus.viewAccount')}
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-lg shadow-md p-8">
                        {status === 'processing' && renderProcessingStatus()}
                        {status === 'success' && renderSuccessStatus()}
                        {status === 'failed' && renderFailedStatus()}
                        {status === 'cancelled' && renderCancelledStatus()}
                        {status === 'timeout' && renderTimeoutStatus()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentStatus;
