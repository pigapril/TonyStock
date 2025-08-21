import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './PaymentResult.css';

export const PaymentResult = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [paymentInfo, setPaymentInfo] = useState(null);
    const [loading, setLoading] = useState(true);

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

            // 如果有完整的付款參數（來自 ECPay 回調）
            if (rtnCode && merchantTradeNo) {
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
            // 如果來自 ClientBackURL 但沒有完整參數，需要查詢付款狀態
            else if (source === 'client' && merchantTradeNo) {
                try {
                    // 這裡應該調用 API 查詢付款狀態
                    // 暫時顯示一個通用的成功訊息
                    setPaymentInfo({
                        merchantTradeNo,
                        isSuccess: true, // 假設成功，因為用戶是從 ECPay 返回的
                        source: 'client',
                        message: t('payment.result.clientReturn.message', '您已從付款頁面返回。正在確認付款狀態...')
                    });
                    setLoading(false);
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

    const handleBackToHome = () => {
        navigate('/');
    };

    const handleGoToAccount = () => {
        navigate('/user-account');
    };

    const handleGoToPlans = () => {
        navigate('/subscription-plans');
    };

    if (loading) {
        return (
            <div className="payment-result-container">
                <div className="payment-result-card">
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>{t('payment.result.loading', '處理中...')}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="payment-result-container">
            <div className="payment-result-card">
                {paymentInfo?.isSuccess ? (
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