import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { systemLogger } from '../utils/logger';

/**
 * 測試付款頁面
 * 用於模擬綠界付款流程
 */
const PaymentTestPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    
    const [paymentData, setPaymentData] = useState({
        orderId: searchParams.get('orderId') || 'unknown',
        amount: searchParams.get('amount') || '0'
    });
    
    const [countdown, setCountdown] = useState(5);
    const [paymentStatus, setPaymentStatus] = useState('processing'); // processing, success, failed

    useEffect(() => {
        systemLogger.info('Test payment page loaded:', paymentData);
        
        // 模擬付款處理時間
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // 模擬付款成功
                    setPaymentStatus('success');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [paymentData]);

    const handleReturnToApp = () => {
        // 模擬綠界返回應用程式
        const returnUrl = `/payment/status?orderId=${paymentData.orderId}&status=success`;
        navigate(returnUrl);
    };

    const handleSimulateFailure = () => {
        setPaymentStatus('failed');
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
                <div className="text-center">
                    {/* 模擬綠界 Logo */}
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-green-600 rounded-full mx-auto flex items-center justify-center">
                            <span className="text-white font-bold text-xl">綠界</span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-800 mt-2">
                            ECPay 測試付款頁面
                        </h1>
                    </div>

                    {/* 付款資訊 */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">付款資訊</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">訂單編號:</span>
                                <span className="font-mono">{paymentData.orderId}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">付款金額:</span>
                                <span className="font-semibold">NT$ {paymentData.amount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">付款方式:</span>
                                <span>信用卡</span>
                            </div>
                        </div>
                    </div>

                    {/* 付款狀態 */}
                    {paymentStatus === 'processing' && (
                        <div className="mb-6">
                            <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-600 mb-2">正在處理付款...</p>
                            <p className="text-sm text-gray-500">
                                {countdown > 0 ? `${countdown} 秒後完成` : '處理中...'}
                            </p>
                        </div>
                    )}

                    {paymentStatus === 'success' && (
                        <div className="mb-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-green-600 mb-2">付款成功！</h3>
                            <p className="text-gray-600 text-sm mb-4">
                                您的付款已成功處理，即將返回應用程式...
                            </p>
                        </div>
                    )}

                    {paymentStatus === 'failed' && (
                        <div className="mb-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-red-600 mb-2">付款失敗</h3>
                            <p className="text-gray-600 text-sm mb-4">
                                付款處理時發生錯誤，請稍後再試或聯繫客服。
                            </p>
                        </div>
                    )}

                    {/* 操作按鈕 */}
                    <div className="space-y-3">
                        {paymentStatus === 'processing' && (
                            <button
                                onClick={handleSimulateFailure}
                                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                模擬付款失敗
                            </button>
                        )}
                        
                        {paymentStatus === 'success' && (
                            <button
                                onClick={handleReturnToApp}
                                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                返回應用程式
                            </button>
                        )}
                        
                        {paymentStatus === 'failed' && (
                            <div className="space-y-2">
                                <button
                                    onClick={() => setPaymentStatus('processing')}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    重新付款
                                </button>
                                <button
                                    onClick={() => navigate('/subscription-plans')}
                                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    返回方案選擇
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 測試說明 */}
                    <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800">
                            <strong>測試環境說明：</strong><br />
                            這是模擬的付款頁面，用於測試付款流程。在正式環境中，這裡會是真實的綠界付款頁面。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentTestPage;