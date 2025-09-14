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
import paymentService from '../../services/paymentService';
import { systemLogger } from '../../utils/logger';
import LoadingSpinner from '../Common/LoadingSpinner';

const PaymentStatus = () => {
    const navigate = useNavigate();
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
            setError('缺少訂單資訊');
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
                    setStatus('success');
                    setPaymentData(result.data);
                    
                    systemLogger.info('Payment completed successfully:', {
                        orderId,
                        paymentData: result.data
                    });
                } else {
                    setStatus(result.status); // failed, cancelled, expired
                    setPaymentData(result.data);
                    setError(result.error || '付款未完成');
                }
            } else {
                setStatus(result.status || 'failed');
                setError(result.error || '付款狀態查詢失敗');
            }

        } catch (error) {
            systemLogger.error('Payment polling failed:', {
                orderId,
                error: error.message
            });

            setStatus('failed');
            setError('付款狀態查詢時發生錯誤');
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
        navigate('/subscription');
    };

    /**
     * 前往帳戶頁面
     */
    const handleGoToAccount = () => {
        navigate('/account');
    };

    /**
     * 重新付款
     */
    const handleRetryPayment = () => {
        navigate('/subscription', { 
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
                付款處理中...
            </h1>
            
            <p className="text-gray-600 mb-6">
                正在確認您的付款狀態，請稍候片刻
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center space-x-4 text-sm text-blue-800">
                    <div>
                        <span className="font-medium">訂單編號：</span>
                        <span className="font-mono">{orderId}</span>
                    </div>
                    <div>
                        <span className="font-medium">處理時間：</span>
                        <span>{formatTime(timeElapsed)}</span>
                    </div>
                    {retryCount > 0 && (
                        <div>
                            <span className="font-medium">重試次數：</span>
                            <span>{retryCount}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2 text-sm text-gray-500">
                <p>• 付款處理通常需要 1-3 分鐘</p>
                <p>• 請勿關閉此頁面或重新整理</p>
                <p>• 如果長時間無回應，系統會自動重試</p>
            </div>

            <div className="mt-8">
                <button
                    onClick={handleRetry}
                    className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                    手動重新檢查
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
                付款成功！
            </h1>

            <p className="text-gray-600 mb-6">
                恭喜您成功升級到 Pro 方案，現在可以享受完整功能了！
            </p>

            {paymentData && paymentData.subscription && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                    <h3 className="font-semibold text-green-900 mb-3">訂閱資訊</h3>
                    <div className="space-y-2 text-sm text-green-800">
                        <div className="flex justify-between">
                            <span>方案類型：</span>
                            <span className="font-medium">
                                {paymentData.subscription.planType?.toUpperCase()} 方案
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>計費週期：</span>
                            <span className="font-medium">
                                {paymentData.billingPeriod === 'monthly' ? '月付' : '年付'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>開始日期：</span>
                            <span className="font-medium">
                                {new Date(paymentData.subscription.startDate).toLocaleDateString('zh-TW')}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>到期日期：</span>
                            <span className="font-medium">
                                {new Date(paymentData.subscription.endDate).toLocaleDateString('zh-TW')}
                            </span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                            <span>付款金額：</span>
                            <span className="font-medium">
                                NT$ {paymentData.amount?.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-900 mb-2">現在您可以：</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 使用市場情緒分析功能</li>
                    <li>• 存取進階股票分析工具</li>
                    <li>• 建立無限制觀察清單</li>
                    <li>• 享受優先客戶支援</li>
                </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    onClick={handleGoToAccount}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    查看帳戶資訊
                </button>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    開始使用
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
                付款失敗
            </h1>

            <p className="text-gray-600 mb-6">
                {error || '付款過程中發生問題，請稍後再試'}
            </p>

            {paymentData && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="text-sm text-red-800">
                        <div className="font-medium mb-2">訂單資訊：</div>
                        <div className="space-y-1">
                            <div>訂單編號：{paymentData.orderId}</div>
                            <div>訂單狀態：{paymentData.orderStatus}</div>
                            <div>付款狀態：{paymentData.paymentStatus}</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-yellow-900 mb-2">可能的原因：</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• 信用卡餘額不足或已過期</li>
                    <li>• 銀行拒絕交易</li>
                    <li>• 網路連線中斷</li>
                    <li>• 付款資訊輸入錯誤</li>
                </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    onClick={handleRetryPayment}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    重新付款
                </button>
                <button
                    onClick={handleBackToSubscription}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                    返回方案選擇
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
                付款已取消
            </h1>

            <p className="text-gray-600 mb-6">
                您已取消付款流程，如需升級方案請重新選擇
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    onClick={handleRetryPayment}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    重新選擇方案
                </button>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                    返回首頁
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
                查詢超時
            </h1>

            <p className="text-gray-600 mb-6">
                付款狀態查詢超時，請稍後再檢查或聯繫客服
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="text-sm text-blue-800">
                    <p className="font-medium mb-2">如果您已完成付款：</p>
                    <ul className="space-y-1">
                        <li>• 付款可能仍在處理中，請稍後再檢查</li>
                        <li>• 您可以在帳戶頁面查看訂閱狀態</li>
                        <li>• 如有問題請聯繫客服：support@example.com</li>
                    </ul>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    onClick={handleRetry}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    重新檢查
                </button>
                <button
                    onClick={handleGoToAccount}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                    查看帳戶
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