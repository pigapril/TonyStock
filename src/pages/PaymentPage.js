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
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [appliedRedemption, setAppliedRedemption] = useState(null);
    const [originalAmount, setOriginalAmount] = useState(null);
    const [finalAmount, setFinalAmount] = useState(null);

    // 確保用戶已登入並檢查折扣信息
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

        // 檢查URL參數中的折扣信息
        const discountValue = searchParams.get('discountValue');
        const discountType = searchParams.get('discountType');
        const originalPrice = searchParams.get('originalPrice');
        const finalPrice = searchParams.get('finalPrice');
        const redemptionCode = searchParams.get('redemption') || searchParams.get('redemptionCode');

        // 設置價格信息
        if (originalPrice) setOriginalAmount(parseFloat(originalPrice));
        if (finalPrice) setFinalAmount(parseFloat(finalPrice));

        // 處理優惠碼信息
        if (redemptionCode) {
            console.log('🔗 PaymentPage 從 URL 參數中發現優惠碼:', redemptionCode);
            console.log('🔍 PaymentPage URL 參數詳細:', {
                discountValue: discountValue,
                discountType: discountType,
                originalPrice: originalPrice,
                finalPrice: finalPrice,
                redemptionCode: redemptionCode,
                allParams: Object.fromEntries(searchParams.entries())
            });

            // 🔧 修復：確保正確解析折扣數值
            const parsedDiscountValue = discountValue ? parseFloat(discountValue) : 0;
            const parsedOriginalPrice = originalPrice ? parseFloat(originalPrice) : null;
            const parsedFinalPrice = finalPrice ? parseFloat(finalPrice) : null;

            console.log('🔍 PaymentPage 解析後的數值:', {
                parsedDiscountValue,
                parsedOriginalPrice,
                parsedFinalPrice
            });

            // 🔧 修復：根據折扣類型設置正確的 benefits 結構
            const benefits = {
                type: 'discount',
                discountType: discountType || 'FIXED_AMOUNT_DISCOUNT'
            };

            // 根據折扣類型設置不同的字段
            if (discountType === 'PERCENTAGE_DISCOUNT' || discountType === 'percentage') {
                // 百分比折扣
                benefits.savingsPercentage = parsedDiscountValue;
                benefits.discountPercentage = parsedDiscountValue;
                console.log('🔍 PaymentPage 設置百分比折扣:', parsedDiscountValue + '%');
            } else {
                // 固定金額折扣
                benefits.discountAmount = parsedDiscountValue;
                benefits.estimatedValue = parsedDiscountValue;
                benefits.amount = parsedDiscountValue;
                console.log('🔍 PaymentPage 設置固定金額折扣:', parsedDiscountValue);
            }

            setAppliedRedemption({
                code: redemptionCode,
                isValid: true,
                canRedeem: true,
                benefits: benefits
            });

            console.log('🔍 PaymentPage 設置的 appliedRedemption:', {
                code: redemptionCode,
                benefits: benefits
            });
        }

        // 向後兼容：設置舊的 appliedDiscount 格式
        if (discountValue && discountType) {
            setAppliedDiscount({
                type: discountType,
                value: parseFloat(discountValue),
                originalPrice: originalPrice ? parseFloat(originalPrice) : null,
                finalPrice: finalPrice ? parseFloat(finalPrice) : null
            });
        }

        // 追蹤頁面訪問
        Analytics.track('payment_page_viewed', {
            userId: user.id,
            planType,
            billingPeriod,
            currentPlan: userPlan?.type || 'unknown',
            hasDiscount: !!appliedDiscount
        });
    }, [user, navigate, lang, planType, billingPeriod, userPlan, t, searchParams]);

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

    // 新增：定價資料狀態
    const [planPricing, setPlanPricing] = useState(null);
    const [pricingLoading, setPricingLoading] = useState(true);
    const [pricingError, setPricingError] = useState(null);

    // 獲取方案資訊
    const availablePlans = subscriptionService.getAvailablePlans();
    const selectedPlan = availablePlans.find(plan => plan.id === planType);
    const basePlan = planPricing?.[planType]?.[billingPeriod];

    // 載入定價資料
    useEffect(() => {
        const loadPricing = async () => {
            try {
                setPricingLoading(true);
                setPricingError(null);

                console.log('🔄 PaymentPage: 開始載入定價資料');

                // 使用新的 API 方法載入定價
                const pricing = await paymentService.getPlanPricingFromAPI();

                setPlanPricing(pricing);
                console.log('✅ PaymentPage: 定價資料載入成功', pricing);

            } catch (error) {
                console.error('❌ PaymentPage: 定價資料載入失敗', error);
                setPricingError(error.message);

                // 使用 fallback 定價
                const fallbackPricing = paymentService.getPlanPricing();
                setPlanPricing(fallbackPricing);

            } finally {
                setPricingLoading(false);
            }
        };

        loadPricing();
    }, []);

    // 計算實際價格（考慮折扣）
    const calculateFinalPrice = () => {
        const basePrice = basePlan?.price || 0;

        // 🔧 修復：優先使用 finalAmount（從 URL 參數計算好的價格）
        if (finalAmount !== null && finalAmount !== undefined) {
            console.log('🔍 PaymentPage 使用 URL 參數中的 finalAmount:', finalAmount);
            return finalAmount;
        }

        // 🔧 修復：檢查 appliedRedemption 而不是 appliedDiscount
        if (appliedRedemption && appliedRedemption.benefits) {
            const benefits = appliedRedemption.benefits;
            console.log('🔍 PaymentPage 根據 appliedRedemption 計算價格:', benefits);
            console.log('🔍 PaymentPage basePrice:', basePrice);

            if (benefits.discountType === 'PERCENTAGE_DISCOUNT' || benefits.discountType === 'percentage') {
                const discountPercentage = benefits.savingsPercentage || benefits.discountPercentage || 0;
                const discountAmount = (basePrice * discountPercentage) / 100;
                const calculatedPrice = Math.max(0, basePrice - discountAmount);
                console.log('🔍 PaymentPage 百分比折扣計算:', {
                    basePrice,
                    discountPercentage: discountPercentage + '%',
                    discountAmount,
                    calculatedPrice
                });
                return calculatedPrice;
            } else if (benefits.discountType === 'FIXED_AMOUNT_DISCOUNT' || benefits.discountType === 'fixed') {
                const discountAmount = benefits.estimatedValue || benefits.discountAmount || benefits.amount || 0;
                const calculatedPrice = Math.max(0, basePrice - discountAmount);
                console.log('🔍 PaymentPage 固定金額折扣計算:', {
                    discountAmount,
                    basePrice,
                    calculatedPrice
                });
                return calculatedPrice;
            }
        }

        // 向後兼容：檢查舊的 appliedDiscount 格式
        if (appliedDiscount) {
            // 如果URL中已經有計算好的最終價格，直接使用
            if (appliedDiscount.finalPrice !== null && appliedDiscount.finalPrice !== undefined) {
                return appliedDiscount.finalPrice;
            }

            // 否則根據折扣類型重新計算
            if (appliedDiscount.type === 'percentage') {
                const discountAmount = (basePrice * appliedDiscount.value) / 100;
                return Math.max(0, basePrice - discountAmount);
            } else if (appliedDiscount.type === 'fixed') {
                return Math.max(0, basePrice - appliedDiscount.value);
            }
        }

        return basePrice;
    };

    const finalPrice = calculateFinalPrice();
    const basePrice = basePlan?.price || 0;

    // 🔧 修復：正確設置 originalPrice，無論是 appliedRedemption 還是 appliedDiscount
    const hasDiscount = Boolean(
        (appliedRedemption && appliedRedemption.benefits) ||
        appliedDiscount ||
        (originalAmount && finalAmount && originalAmount !== finalAmount)
    );

    // 🔧 修復：確保有折扣時 originalPrice 正確設置
    let originalPriceToShow = null;
    if (hasDiscount) {
        if (originalAmount) {
            originalPriceToShow = originalAmount;
        } else if (appliedRedemption || appliedDiscount) {
            originalPriceToShow = basePrice;
        }
    }

    console.log('🔍 PaymentPage 價格計算結果:', {
        basePrice,
        finalPrice,
        originalAmount,
        finalAmount,
        hasDiscount,
        originalPriceToShow,
        appliedRedemption: appliedRedemption ? appliedRedemption.code : null,
        appliedDiscount
    });

    const currentPlan = {
        ...basePlan,
        price: finalPrice,
        originalPrice: originalPriceToShow,
        discount: appliedDiscount,
        redemption: appliedRedemption
    };

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
            setError(t('payment.errors.termsRequired'));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 🔍 調試：檢查 appliedRedemption 狀態
            console.log('🔍 PaymentPage 創建訂單前的 appliedRedemption:', appliedRedemption);
            console.log('🔍 PaymentPage 傳遞給後端的 redemptionCode:', appliedRedemption?.code);

            // 🔧 修復：確保傳遞正確的參數給後端
            const orderPayload = {
                planType,
                billingPeriod,
                paymentMethod,
                redemptionCode: appliedRedemption?.code || null,
                // 保持向後兼容
                appliedDiscount: appliedDiscount ? {
                    type: appliedDiscount.type,
                    amount: appliedDiscount.value
                } : null
            };

            console.log('🔍 PaymentPage 完整的訂單參數:', orderPayload);

            const result = await paymentService.createOrder(orderPayload);

            setOrderData(result);
            setCurrentStep(3); // 跳轉到確認頁面

            Analytics.track('payment_order_created', {
                userId: user?.id,
                planType,
                billingPeriod,
                orderId: result.orderId
            });

        } catch (error) {
            setError(t('payment.errors.createOrderFailed'));
            handleError(error);
        } finally {
            setLoading(false);
        }
    };

    // 提交付款表單到綠界
    const handleSubmitPayment = () => {
        if (!orderData) {
            setError(t('payment.errors.invalidAmount'));
            return;
        }

        try {
            // 提交表單到綠界
            paymentService.submitPaymentForm(orderData);
        } catch (error) {
            setError(t('payment.errors.paymentFailed'));
            handleError(error);
        }
    };

    if (!user) {
        return null; // 重定向處理中
    }

    // 如果定價資料還在載入中，顯示載入狀態
    if (pricingLoading) {
        return (
            <div className="payment-page">
                <div className="payment-page__container">
                    <div className="payment-page__loading">
                        <LoadingSpinner size="large" />
                        <p className="payment-page__loading-text">
                            {t('payment.loading.pricingData', '載入方案資料中...')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // 如果定價資料載入失敗且沒有 fallback 資料
    if (pricingError && !planPricing) {
        return (
            <div className="payment-page">
                <div className="payment-page__container">
                    <div className="payment-page__error">
                        <h1>{t('payment.error.pricingLoadFailed', '載入方案資料失敗')}</h1>
                        <p>{pricingError}</p>
                        <button
                            className="payment-page__back-button"
                            onClick={() => window.location.reload()}
                        >
                            {t('payment.error.retry', '重新載入')}
                        </button>
                    </div>
                </div>
            </div>
        );
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
            { number: 1, title: t('payment.form.confirmPlan') },
            { number: 2, title: t('payment.form.confirmTerms') },
            { number: 3, title: t('payment.form.confirmPayment') }
        ];

        return (
            <div className="payment-page__steps">
                {steps.map((step, index) => (
                    <Fragment key={step.number}>
                        <div className={`payment-page__step ${currentStep >= step.number ? 'payment-page__step--active' : ''
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
                            <div className={`payment-page__step-connector ${currentStep > step.number ? 'payment-page__step-connector--completed' : ''
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
                    <h3 className="payment-page__plan-name">{t('payment.plan.proPlan')}</h3>
                    <div className="payment-page__plan-price">
                        <span className="payment-page__plan-amount">
                            NT$ {currentPlan?.price?.toLocaleString()}
                        </span>
                        <span className="payment-page__plan-period">
                            / {billingPeriod === 'monthly' ? t('payment.plan.pricing.monthly') : t('payment.plan.pricing.yearly')}
                        </span>
                    </div>

                    {/* 🔧 修復：優先顯示 appliedRedemption 的折扣信息 */}
                    {appliedRedemption && appliedRedemption.benefits && currentPlan?.originalPrice && (
                        <div className="payment-page__plan-discount">
                            <div className="payment-page__original-price">
                                {t('payment.plan.pricing.originalPrice')}：NT$ {currentPlan.originalPrice.toLocaleString()}
                            </div>
                            <div className="payment-page__discount-badge">
                                {appliedRedemption.benefits.discountType === 'PERCENTAGE_DISCOUNT' || appliedRedemption.benefits.discountType === 'percentage'
                                    ? `${appliedRedemption.benefits.savingsPercentage || appliedRedemption.benefits.discountPercentage}% 折扣`
                                    : `折扣 NT$ ${(appliedRedemption.benefits.estimatedValue || appliedRedemption.benefits.discountAmount || appliedRedemption.benefits.amount || 0).toLocaleString()}`
                                }
                            </div>
                            <div className="payment-page__redemption-code">
                                優惠碼：{appliedRedemption.code}
                            </div>
                        </div>
                    )}

                    {/* 向後兼容：顯示舊的 appliedDiscount 格式 */}
                    {!appliedRedemption && appliedDiscount && currentPlan?.originalPrice && (
                        <div className="payment-page__plan-discount">
                            <div className="payment-page__original-price">
                                {t('payment.plan.pricing.originalPrice')}：NT$ {currentPlan.originalPrice.toLocaleString()}
                            </div>
                            <div className="payment-page__discount-badge">
                                {appliedDiscount.type === 'percentage'
                                    ? `${appliedDiscount.value}% 折扣`
                                    : `折扣 NT$ ${appliedDiscount.value.toLocaleString()}`
                                }
                            </div>
                        </div>
                    )}
                </div>

                <div className="payment-page__plan-features">
                    <h4 className="payment-page__features-title">{t('payment.plan.features.title')}</h4>
                    <ul className="payment-page__features-list">
                        <li className="payment-page__feature-item">
                            <svg className="payment-page__feature-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {t('payment.plan.features.marketSentiment')}
                        </li>
                        <li className="payment-page__feature-item">
                            <svg className="payment-page__feature-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {t('payment.plan.features.advancedAnalysis')}
                        </li>
                        <li className="payment-page__feature-item">
                            <svg className="payment-page__feature-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {t('payment.plan.features.unlimitedWatchlist')}
                        </li>
                        <li className="payment-page__feature-item">
                            <svg className="payment-page__feature-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {t('payment.plan.features.prioritySupport')}
                        </li>
                    </ul>
                </div>
            </div>

            <div className="payment-page__actions">
                <button
                    className="payment-page__button payment-page__button--secondary"
                    onClick={handleCancel}
                >
                    {t('payment.form.cancel')}
                </button>
                <button
                    className="payment-page__button payment-page__button--primary"
                    onClick={handleNextStep}
                >
                    {t('payment.form.confirmPlan')}
                </button>
            </div>
        </div>
    );

    // 渲染條款同意
    const renderTermsAgreement = () => (
        <div className="payment-page__terms-section">
            <div className="payment-page__terms-content">
                <h3 className="payment-page__terms-title">{t('payment.terms.title')}</h3>

                <div className="payment-page__terms-box">
                    <div className="payment-page__terms-group">
                        <h4>{t('payment.terms.serviceTermsTitle')}</h4>
                        <ul>
                            {t('payment.terms.serviceTerms', { returnObjects: true }).map((term, index) => (
                                <li key={index}>{term}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="payment-page__terms-group">
                        <h4>{t('payment.terms.privacyPolicyTitle')}</h4>
                        <ul>
                            {t('payment.terms.privacyPolicy', { returnObjects: true }).map((policy, index) => (
                                <li key={index}>{policy}</li>
                            ))}
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
                        {t('payment.terms.agreement')}
                        <a href={`/${lang}/legal`} target="_blank" className="payment-page__link">
                            {t('payment.form.termsAndConditions')}
                        </a>
                    </span>
                </label>
            </div>

            <div className="payment-page__actions">
                <button
                    className="payment-page__button payment-page__button--secondary"
                    onClick={handlePrevStep}
                >
                    {t('payment.form.previous')}
                </button>
                <button
                    className="payment-page__button payment-page__button--primary"
                    onClick={handleCreateOrder}
                    disabled={!agreedToTerms || loading}
                >
                    {loading ? t('payment.form.creatingOrder') : t('payment.form.createOrder')}
                </button>
            </div>
        </div>
    );

    // 渲染付款確認
    const renderPaymentConfirmation = () => (
        <div className="payment-page__confirmation-section">
            <div className="payment-page__order-summary">
                <h3 className="payment-page__summary-title">{t('payment.orderSummary.title')}</h3>

                {orderData && (
                    <div className="payment-page__order-details">
                        <div className="payment-page__order-row">
                            <span>{t('payment.orderSummary.orderId')}</span>
                            <span className="payment-page__order-id">{orderData.orderId}</span>
                        </div>
                        <div className="payment-page__order-row">
                            <span>{t('payment.orderSummary.plan')}</span>
                            <span>{t('payment.plan.proPlan')} ({billingPeriod === 'monthly' ? t('payment.orderSummary.monthlyPlan') : t('payment.orderSummary.yearlyPlan')})</span>
                        </div>
                        <div className="payment-page__order-row">
                            <span>{t('payment.orderSummary.paymentMethod')}</span>
                            <span>{t('payment.orderSummary.creditCardRecurring')}</span>
                        </div>
                        {/* 🔧 修復：優先顯示 appliedRedemption 的折扣信息 */}
                        {appliedRedemption && appliedRedemption.benefits && currentPlan?.originalPrice && (
                            <>
                                <div className="payment-page__order-row">
                                    <span>{t('payment.plan.pricing.originalPrice')}</span>
                                    <span>NT$ {currentPlan.originalPrice.toLocaleString()}</span>
                                </div>
                                <div className="payment-page__order-row payment-page__order-discount">
                                    <span>{t('payment.orderSummary.discount')} ({appliedRedemption.code})</span>
                                    <span className="payment-page__discount-amount">
                                        -{appliedRedemption.benefits.discountType === 'PERCENTAGE_DISCOUNT' || appliedRedemption.benefits.discountType === 'percentage'
                                            ? `${appliedRedemption.benefits.savingsPercentage || appliedRedemption.benefits.discountPercentage}%`
                                            : `NT$ ${(appliedRedemption.benefits.estimatedValue || appliedRedemption.benefits.discountAmount || appliedRedemption.benefits.amount || 0).toLocaleString()}`
                                        }
                                    </span>
                                </div>
                            </>
                        )}

                        {/* 向後兼容：顯示舊的 appliedDiscount 格式 */}
                        {!appliedRedemption && appliedDiscount && currentPlan?.originalPrice && (
                            <>
                                <div className="payment-page__order-row">
                                    <span>{t('payment.plan.pricing.originalPrice')}</span>
                                    <span>NT$ {currentPlan.originalPrice.toLocaleString()}</span>
                                </div>
                                <div className="payment-page__order-row payment-page__order-discount">
                                    <span>{t('payment.orderSummary.discount')}</span>
                                    <span className="payment-page__discount-amount">
                                        -{appliedDiscount.type === 'percentage'
                                            ? `${appliedDiscount.value}%`
                                            : `NT$ ${appliedDiscount.value.toLocaleString()}`
                                        }
                                    </span>
                                </div>
                            </>
                        )}
                        <div className="payment-page__order-row payment-page__order-total">
                            <span>{t('payment.plan.pricing.totalAmount')}</span>
                            <span>NT$ {finalPrice?.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="payment-page__security-notice">
                <div className="payment-page__security-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div className="payment-page__security-text">
                    <h4>{t('payment.security.title')}</h4>
                    <ul>
                        {t('payment.security.notices', { returnObjects: true }).map((notice, index) => (
                            <li key={index}>{notice}</li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="payment-page__actions">
                <button
                    className="payment-page__button payment-page__button--secondary"
                    onClick={handleCancel}
                >
                    {t('payment.form.cancelOrder')}
                </button>
                <button
                    className="payment-page__button payment-page__button--primary payment-page__button--payment"
                    onClick={handleSubmitPayment}
                >
                    {t('payment.form.proceedToPayment')}
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
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" />
                            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" />
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