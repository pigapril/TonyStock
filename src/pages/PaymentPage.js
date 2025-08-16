/**
 * 專用付款頁面
 * 
 * Apple 風格的獨立付款頁面，提供清晰的付款流程
 */

import React, { useEffect, useState, Fragment } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../components/Auth/useAuth';
import { useSubscription } from '../components/Subscription/SubscriptionContext';
import { Analytics } from '../utils/analytics';
import subscriptionService from '../api/subscriptionService';
import paymentService from '../services/paymentService';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import './PaymentPage.css';

const PaymentPage = () => {
    const { t } = useTranslation();
    const { lang } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { userPlan } = useSubscription();
    const [searchParams] = useSearchParams();
    
    const planType = searchParams.get('plan') || 'pro';
    const billingPeriod = searchParams.get('period') || 'monthly';
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState('Credit');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [orderData, setOrderData] = useState(null);
    const [error, setError] = useState(null);

    // 確保用戶已登入
    useEffect(() => {
        if (!user) {
            navigate(`/${lang}/subscription-plans`, { 
                state: { 
                    message: t('payment.loginRequired'),
                    returnTo: `/payment?plan=${planType}&period=${billingPeriod}`
                }
            });
            return;
        }

        // 追蹤頁面訪問
        Analytics.track('payment_page_viewed', {
            userId: user.id,
            planType,
            billingPeriod,
            currentPlan: userPlan?.type || 'unknown'
        });
    }, [user, navigate, lang, planType, billingPeriod, userPlan, t]);

    const handleSuccess = (subscription) => {
        setLoading(false);
        
        Analytics.track('payment_success', {
            userId: user?.id,
            planType,
            billingPeriod,
            subscriptionId: subscription.id
        });

        navigate(`/${lang}/payment/status`, {
            state: { 
                success: true,
                subscription,
                planType,
                billingPeriod
            }
        });
    };

    const handleError = (error) => {
        setLoading(false);
        
        Analytics.track('payment_error', {
            userId: user?.id,
            planType,
            billingPeriod,
            error: error.message
        });

        navigate(`/${lang}/payment/status`, {
            state: { 
                error: true,
                errorMessage: error.message,
                planType,
                billingPeriod
            }
        });
    };

    const handleCancel = () => {
        Analytics.track('payment_cancelled', {
            userId: user?.id,
            planType,
            billingPeriod
        });

        navigate(`/${lang}/subscription-plans`);
    };

    // 獲取方案資訊
    const availablePlans = subscriptionService.getAvailablePlans();
    const selectedPlan = availablePlans.find(plan => plan.id === planType);
    const planPricing = paymentService.getPlanPricing();
    const currentPlan = planPricing[planType]?.[billingPeriod];

    // 處理步驟導航
    const handleNextStep = () => {
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    // 處理條款同意
    const handleTermsChange = (agreed) => {
        setAgreedToTerms(agreed);
    };

    // 創建訂單並跳轉到付款頁面
    const handleCreateOrder = async () => {
        if (!agreedToTerms) {
            setError('請先同意服務條款和隱私政策');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await paymentService.createOrder({
                planType,
                billingPeriod,
                paymentMethod
            });

            setOrderData(result);
            setCurrentStep(3); // 跳轉到確認頁面

            Analytics.track('payment_order_created', {
                userId: user?.id,
                planType,
                billingPeriod,
                orderId: result.orderId
            });

        } catch (error) {
            setError('創建訂單時發生錯誤，請稍後再試');
            handleError(error);
        } finally {
            setLoading(false);
        }
    };

    // 提交付款表單到綠界
    const handleSubmitPayment = () => {
        if (!orderData) {
            setError('訂單資料不完整');
            return;
        }

        try {
            // 提交表單到綠界
            paymentService.submitPaymentForm(orderData);
        } catch (error) {
            setError('跳轉到付款頁面時發生錯誤');
            handleError(error);
        }
    };

    if (!user) {
        return null; // 重定向處理中
    }

    if (!selectedPlan) {
        return (
            <div className="payment-page">
                <div className="payment-page__container">
                    <div className="payment-page__error">
                        <h1>{t('payment.invalidPlan.title')}</h1>
                        <p>{t('payment.invalidPlan.message')}</p>
                        <button 
                            className="payment-page__back-button"
                            onClick={() => navigate(`/${lang}/subscription-plans`)}
                        >
                            {t('payment.backToPlans')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 渲染步驟指示器
    const renderStepIndicator = () => {
        const steps = [
            { number: 1, title: '確認方案' },
            { number: 2, title: '確認條款' },
            { number: 3, title: '確認付款' }
        ];

        return (
            <div className="payment-page__steps">
                {steps.map((step, index) => (
                    <Fragment key={step.number}>
                        <div className={`payment-page__step ${
                            currentStep >= step.number ? 'payment-page__step--active' : ''
                        }`}>
                            <div className="payment-page__step-number">
                                {currentStep > step.number ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path 
                                            d="M20 6L9 17L4 12" 
                                            stroke="currentColor" 
                                            strokeWidth="2" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                ) : (
                                    step.number
                                )}
                            </div>
                            <span className="payment-page__step-title">{step.title}</span>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`payment-page__step-connector ${
                                currentStep > step.number ? 'payment-page__step-connector--completed' : ''
                            }`} />
                        )}
                    </Fragment>
                ))}
            </div>
        );
    };

    // 渲染方案確認
    const renderPlanConfirmation = () => (
        <div className="payment-page__plan-section">
            <div className="payment-page__plan-card">
                <div className="payment-page__plan-header">
                    <div className="payment-page__plan-badge">Pro</div>
                    <h3 className="payment-page__plan-name">Pro 方案</h3>
                    <div className="payment-page__plan-price">
                        <span className="payment-page__plan-amount">
                            NT$ {currentPlan?.price?.toLocaleString()}
                        </span>
                        <span className="payment-page__plan-period">
                            / {billingPeriod === 'monthly' ? '月' : '年'}
                        </span>
                    </div>
                    {currentPlan?.discount && (
                        <div className="payment-page__plan-discount">
                            {currentPlan.discount}
                        </div>
                    )}
                </div>

                <div className="payment-page__plan-features">
                    <h4 className="payment-page__features-title">包含功能</h4>
                    <ul className="payment-page__features-list">
                        <li className="payment-page__feature-item">
                            <svg className="payment-page__feature-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            市場情緒分析
                        </li>
                        <li className="payment-page__feature-item">
                            <svg className="payment-page__feature-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            進階股票分析工具
                        </li>
                        <li className="payment-page__feature-item">
                            <svg className="payment-page__feature-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            無限制觀察清單
                        </li>
                        <li className="payment-page__feature-item">
                            <svg className="payment-page__feature-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            優先客戶支援
                        </li>
                    </ul>
                </div>
            </div>

            <div className="payment-page__actions">
                <button
                    className="payment-page__button payment-page__button--secondary"
                    onClick={handleCancel}
                >
                    取消
                </button>
                <button
                    className="payment-page__button payment-page__button--primary"
                    onClick={handleNextStep}
                >
                    確認方案
                </button>
            </div>
        </div>
    );

    // 渲染條款同意
    const renderTermsAgreement = () => (
        <div className="payment-page__terms-section">
            <div className="payment-page__terms-content">
                <h3 className="payment-page__terms-title">服務條款與隱私政策</h3>
                
                <div className="payment-page__terms-box">
                    <div className="payment-page__terms-group">
                        <h4>服務條款重點</h4>
                        <ul>
                            <li>訂閱服務將於付款完成後立即生效</li>
                            <li>月付方案每月自動續費，年付方案每年自動續費</li>
                            <li>您可以隨時取消訂閱，取消後將在當前週期結束時停止服務</li>
                            <li>退款政策：付款後 7 天內可申請全額退款</li>
                            <li>我們承諾保護您的個人資料和付款資訊安全</li>
                        </ul>
                    </div>

                    <div className="payment-page__terms-group">
                        <h4>隱私政策重點</h4>
                        <ul>
                            <li>我們僅收集提供服務所必需的個人資料</li>
                            <li>您的付款資訊由綠界支付安全處理，我們不會儲存信用卡資訊</li>
                            <li>我們不會將您的個人資料出售給第三方</li>
                            <li>您有權隨時查看、修改或刪除您的個人資料</li>
                        </ul>
                    </div>
                </div>

                <label className="payment-page__checkbox-label">
                    <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => handleTermsChange(e.target.checked)}
                        className="payment-page__checkbox"
                    />
                    <span className="payment-page__checkbox-text">
                        我已閱讀並同意
                        <a href="/terms" target="_blank" className="payment-page__link">
                            服務條款
                        </a>
                        和
                        <a href="/privacy" target="_blank" className="payment-page__link">
                            隱私政策
                        </a>
                    </span>
                </label>
            </div>

            <div className="payment-page__actions">
                <button
                    className="payment-page__button payment-page__button--secondary"
                    onClick={handlePrevStep}
                >
                    上一步
                </button>
                <button
                    className="payment-page__button payment-page__button--primary"
                    onClick={handleCreateOrder}
                    disabled={!agreedToTerms || loading}
                >
                    {loading ? '創建訂單中...' : '創建訂單'}
                </button>
            </div>
        </div>
    );

    // 渲染付款確認
    const renderPaymentConfirmation = () => (
        <div className="payment-page__confirmation-section">
            <div className="payment-page__order-summary">
                <h3 className="payment-page__summary-title">訂單摘要</h3>
                
                {orderData && (
                    <div className="payment-page__order-details">
                        <div className="payment-page__order-row">
                            <span>訂單編號</span>
                            <span className="payment-page__order-id">{orderData.orderId}</span>
                        </div>
                        <div className="payment-page__order-row">
                            <span>方案</span>
                            <span>Pro 方案 ({billingPeriod === 'monthly' ? '月付' : '年付'})</span>
                        </div>
                        <div className="payment-page__order-row">
                            <span>付款方式</span>
                            <span>信用卡定期定額</span>
                        </div>
                        <div className="payment-page__order-row payment-page__order-total">
                            <span>總金額</span>
                            <span>NT$ {orderData.amount?.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="payment-page__security-notice">
                <div className="payment-page__security-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <div className="payment-page__security-text">
                    <h4>安全付款保障</h4>
                    <ul>
                        <li>點擊「前往付款」將跳轉到綠界支付頁面</li>
                        <li>請在 30 分鐘內完成付款，逾時訂單將自動取消</li>
                        <li>付款完成後將自動返回本網站</li>
                        <li>所有交易均採用 SSL 加密保護</li>
                    </ul>
                </div>
            </div>

            <div className="payment-page__actions">
                <button
                    className="payment-page__button payment-page__button--secondary"
                    onClick={handleCancel}
                >
                    取消訂單
                </button>
                <button
                    className="payment-page__button payment-page__button--primary payment-page__button--payment"
                    onClick={handleSubmitPayment}
                >
                    前往付款
                </button>
            </div>
        </div>
    );

    return (
        <div className="payment-page">
            <div className="payment-page__container">
                {/* 頁面標題 */}
                <header className="payment-page__header">
                    <button 
                        className="payment-page__back-button"
                        onClick={handleCancel}
                        aria-label={t('common.back')}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path 
                                d="M15 18L9 12L15 6" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            />
                        </svg>
                        {t('payment.backToPlans')}
                    </button>
                    
                    <div className="payment-page__title-section">
                        <h1 className="payment-page__title">
                            {t('payment.upgradeTitle', { planName: selectedPlan?.name || 'Pro' })}
                        </h1>
                        <p className="payment-page__subtitle">
                            {t('payment.upgradeSubtitle')}
                        </p>
                    </div>
                </header>

                {/* 步驟指示器 */}
                {renderStepIndicator()}

                {/* 錯誤訊息 */}
                {error && (
                    <div className="payment-page__error-message">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                {/* 載入狀態 */}
                {loading && (
                    <div className="payment-page__loading">
                        <LoadingSpinner size="large" />
                    </div>
                )}

                {/* 付款流程內容 */}
                <main className="payment-page__content">
                    {currentStep === 1 && renderPlanConfirmation()}
                    {currentStep === 2 && renderTermsAgreement()}
                    {currentStep === 3 && renderPaymentConfirmation()}
                </main>
            </div>
        </div>
    );
};

export default PaymentPage;