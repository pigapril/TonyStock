import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '../../../api/apiClient';
import './PaymentResult.css';

export const PaymentResult = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { lang } = useParams();
    const [paymentInfo, setPaymentInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState(30);
    const [pollingCount, setPollingCount] = useState(0);
    const maxPollingAttempts = 30; // 最多輪詢 30 次（約 30 秒）

    // 查詢付款狀態的函數
    const queryPaymentStatus = async (merchantTradeNo) => {
        try {
            const response = await apiClient.get(`/api/payment/status/${merchantTradeNo}`);
            const result = response.data;
            
            if (result.success) {
                // 付款狀態確認成功
                setPaymentInfo({
                    merchantTradeNo,
                    isSuccess: result.data.isSuccess,
                    source: 'query',
                    rtnCode: result.data.rtnCode,
                    rtnMsg: result.data.rtnMsg,
                    tradeNo: result.data.tradeNo,
                    tradeAmt: result.data.tradeAmt,
                    paymentDate: result.data.paymentDate,
                    paymentType: result.data.paymentType,
                    subscriptionStatus: result.data.subscriptionStatus
                });
                setLoading(false);
                return true;
            } else {
                // 查詢失敗或付款未完成
                return false;
            }
        } catch (error) {
            console.error('Query payment status error:', error);
            return false;
        }
    };

    // 輪詢付款狀態（用於等待回調完成）
    const pollPaymentStatus = async (merchantTradeNo) => {
        const poll = async (attempt) => {
            if (attempt >= maxPollingAttempts) {
                // 超過最大輪詢次數，顯示待確認狀態
                setPaymentInfo({
                    merchantTradeNo,
                    isSuccess: null, // null 表示待確認
                    source: 'polling_timeout',
                    message: t('payment.result.pending.message', '付款正在處理中，請稍後查看您的訂閱狀態。')
                });
                setLoading(false);
                return;
            }

            const success = await queryPaymentStatus(merchantTradeNo);
            if (success) {
                return; // 查詢成功，結束輪詢
            }

            // 繼續輪詢
            setPollingCount(attempt + 1);
            setTimeout(() => poll(attempt + 1), 1000); // 每秒輪詢一次
        };

        await poll(0);
    };

    useEffect(() => {
        const initializePaymentResult = async () => {
            // 解析 URL 參數
            const urlParams = new URLSearchParams(location.search);
            const merchantTradeNo = urlParams.get('MerchantTradeNo') || urlParams.get('merchantTradeNo');
            const source = urlParams.get('source'); // 'client' 表示來自 ClientBackURL
            const rtnCode = urlParams.get('RtnCode');
            const rtnMsg = urlParams.get('RtnMsg');
            const tradeNo = urlParams.get('TradeNo');
            const tradeAmt = urlParams.get('TradeAmt');
            const paymentDate = urlParams.get('PaymentDate');
            const paymentType = urlParams.get('PaymentType');

            // 檢查是否來自 ClientBackURL（測試環境下不能相信這些參數）
            // 在測試環境下，ECPay 會在 ClientBackURL 中帶上付款參數，但這不代表真正完成
            // 必須等待 Server 端回調才算真正完成付款
            if (source === 'client' && merchantTradeNo) {
                try {
                    // 開始輪詢付款狀態（測試環境下必須等待 Server 端回調）
                    await pollPaymentStatus(merchantTradeNo);
                } catch (error) {
                    console.error('Failed to query payment status:', error);
                    setPaymentInfo({
                        merchantTradeNo,
                        isSuccess: false,
                        source: 'client',
                        error: t('payment.result.queryError', '無法確認付款狀態，請聯繫客服。')
                    });
                    setLoading(false);
                }
            }
            // 如果有完整的付款參數且不是來自 ClientBackURL（真正的 Server 端回調）
            else if (rtnCode && merchantTradeNo && source !== 'client') {
                setPaymentInfo({
                    merchantTradeNo,
                    rtnCode,
                    rtnMsg,
                    tradeNo,
                    tradeAmt,
                    paymentDate,
                    paymentType,
                    isSuccess: rtnCode === '1',
                    source: 'callback'
                });
                setLoading(false);
            }
            // 如果沒有任何參數，顯示錯誤
            else {
                setPaymentInfo({
                    isSuccess: false,
                    source: 'unknown',
                    error: t('payment.result.noParams', '缺少付款資訊參數。')
                });
                setLoading(false);
            }
        };

        initializePaymentResult();
    }, [location.search, navigate, t]);

    // 付款成功後自動導向到用戶帳戶頁面
    useEffect(() => {
        if (paymentInfo?.isSuccess && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (paymentInfo?.isSuccess && countdown === 0) {
            handleGoToAccount();
        }
    }, [paymentInfo, countdown]);

    const handleBackToHome = () => {
        navigate(`/${lang}`);
    };

    const handleGoToAccount = () => {
        navigate(`/${lang}/user-account`);
    };

    const handleGoToPlans = () => {
        navigate(`/${lang}/subscription-plans`);
    };

    if (loading) {
        return (
            <div className="payment-result-container">
                <div className="payment-result-card">
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>{t('payment.result.loading', '正在確認付款狀態...')}</p>
                        {pollingCount > 0 && (
                            <p className="polling-info">
                                {t('payment.result.polling', `正在等待付款確認... (${pollingCount}/${maxPollingAttempts})`)}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="payment-result-container">
            <div className="payment-result-card">
                {paymentInfo?.isSuccess === true ? (
                    // 付款成功
                    <div className="payment-success">
                        <div className="success-icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" fill="#4CAF50"/>
                                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        
                        <h1 className="result-title success">
                            {t('payment.result.success.title', '付款成功！')}
                        </h1>
                        
                        <p className="result-message">
                            {t('payment.result.success.message', '恭喜！您的訂閱已成功啟用。')}
                        </p>

                        {paymentInfo.merchantTradeNo && (
                            <div className="payment-details">
                                <h3>{t('payment.result.details', '付款詳情')}</h3>
                                <div className="detail-row">
                                    <span className="label">{t('payment.result.orderNumber', '訂單編號')}:</span>
                                    <span className="value">{paymentInfo.merchantTradeNo}</span>
                                </div>
                                {paymentInfo.tradeAmt && (
                                    <div className="detail-row">
                                        <span className="label">{t('payment.result.amount', '付款金額')}:</span>
                                        <span className="value">NT$ {paymentInfo.tradeAmt}</span>
                                    </div>
                                )}
                                {paymentInfo.paymentDate && (
                                    <div className="detail-row">
                                        <span className="label">{t('payment.result.date', '付款時間')}:</span>
                                        <span className="value">{paymentInfo.paymentDate}</span>
                                    </div>
                                )}
                                {paymentInfo.paymentType && (
                                    <div className="detail-row">
                                        <span className="label">{t('payment.result.method', '付款方式')}:</span>
                                        <span className="value">{paymentInfo.paymentType}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="next-steps">
                            <h3>{t('payment.result.nextSteps', '接下來您可以')}</h3>
                            <ul>
                                <li>{t('payment.result.step1', '立即開始使用 Pro 功能')}</li>
                                <li>{t('payment.result.step2', '查看您的訂閱狀態')}</li>
                                <li>{t('payment.result.step3', '管理您的帳戶設定')}</li>
                            </ul>
                        </div>

                        <div className="action-buttons">
                            <button 
                                className="btn btn-primary"
                                onClick={handleGoToAccount}
                            >
                                {t('payment.result.goToAccount', '查看我的帳戶')}
                            </button>
                            <button 
                                className="btn btn-secondary"
                                onClick={handleBackToHome}
                            >
                                {t('payment.result.backToHome', '返回首頁')}
                            </button>
                        </div>

                        {/* 自動導向提示 */}
                        <div className="auto-redirect-notice">
                            <p className="redirect-text">
                                {t('payment.result.autoRedirect', `${countdown}秒後將自動跳轉到您的帳戶頁面...`)}
                            </p>
                        </div>

                    </div>
                ) : paymentInfo?.isSuccess === null ? (
                    // 付款狀態待確認
                    <div className="payment-pending">
                        <div className="pending-icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" fill="#FF9800"/>
                                <path d="M12 6v6l4 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        
                        <h1 className="result-title pending">
                            {t('payment.result.pending.title', '付款處理中')}
                        </h1>
                        
                        <p className="result-message">
                            {paymentInfo.message || t('payment.result.pending.defaultMessage', '您的付款正在處理中，請稍後查看訂閱狀態。')}
                        </p>

                        {paymentInfo.merchantTradeNo && (
                            <div className="payment-details">
                                <div className="detail-row">
                                    <span className="label">{t('payment.result.orderNumber', '訂單編號')}:</span>
                                    <span className="value">{paymentInfo.merchantTradeNo}</span>
                                </div>
                            </div>
                        )}

                        <div className="pending-info">
                            <h3>{t('payment.result.pending.info', '處理說明')}</h3>
                            <ul>
                                <li>{t('payment.result.pending.info1', '付款已提交，正在等待銀行確認')}</li>
                                <li>{t('payment.result.pending.info2', '通常在 1-5 分鐘內完成')}</li>
                                <li>{t('payment.result.pending.info3', '您可以稍後查看帳戶中的訂閱狀態')}</li>
                            </ul>
                        </div>

                        <div className="action-buttons">
                            <button 
                                className="btn btn-primary"
                                onClick={handleGoToAccount}
                            >
                                {t('payment.result.checkAccount', '查看我的帳戶')}
                            </button>
                            <button 
                                className="btn btn-secondary"
                                onClick={handleBackToHome}
                            >
                                {t('payment.result.backToHome', '返回首頁')}
                            </button>
                        </div>
                    </div>
                ) : (
                    // 付款失敗
                    <div className="payment-failure">
                        <div className="failure-icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" fill="#f44336"/>
                                <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        
                        <h1 className="result-title failure">
                            {t('payment.result.failure.title', '付款失敗')}
                        </h1>
                        
                        <p className="result-message">
                            {paymentInfo?.rtnMsg || t('payment.result.failure.message', '很抱歉，付款過程中發生錯誤。')}
                        </p>

                        {paymentInfo?.merchantTradeNo && (
                            <div className="payment-details">
                                <div className="detail-row">
                                    <span className="label">{t('payment.result.orderNumber', '訂單編號')}:</span>
                                    <span className="value">{paymentInfo.merchantTradeNo}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">{t('payment.result.errorCode', '錯誤代碼')}:</span>
                                    <span className="value">{paymentInfo.rtnCode}</span>
                                </div>
                            </div>
                        )}

                        <div className="failure-suggestions">
                            <h3>{t('payment.result.suggestions', '建議您')}</h3>
                            <ul>
                                <li>{t('payment.result.suggestion1', '檢查信用卡資訊是否正確')}</li>
                                <li>{t('payment.result.suggestion2', '確認信用卡額度是否足夠')}</li>
                                <li>{t('payment.result.suggestion3', '稍後再試或聯繫客服')}</li>
                            </ul>
                        </div>

                        <div className="action-buttons">
                            <button 
                                className="btn btn-primary"
                                onClick={handleGoToPlans}
                            >
                                {t('payment.result.tryAgain', '重新選擇方案')}
                            </button>
                            <button 
                                className="btn btn-secondary"
                                onClick={handleBackToHome}
                            >
                                {t('payment.result.backToHome', '返回首頁')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};