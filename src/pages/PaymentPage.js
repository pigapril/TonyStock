/**
 * Single-page subscription checkout.
 * The backend creates (or reuses) the authoritative pending order on entry;
 * ECPay is contacted only when the user agrees to the terms and continues.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../components/Auth/useAuth';
import { useSubscription } from '../components/Subscription/SubscriptionContext';
import { Analytics } from '../utils/analytics';
import { trackSubscriptionCheckout } from '../utils/subscriptionAnalytics';
import subscriptionService from '../api/subscriptionService';
import paymentService from '../services/paymentService';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { Button } from '../components/Common/Button/Button';
import { Badge } from '../components/Common/Badge/Badge';
import PaymentTrustNotice from '../components/Payment/PaymentTrustNotice';
import { getIntlLocale, getPaymentServiceLocale } from '../locales/localeConfig';
import './PaymentPage.css';

const wait = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

const createOrderWithLockRetry = async (orderPayload) => {
    const retryDelays = [350, 700, 1200, 1800, 2500];

    for (let attempt = 0; ; attempt += 1) {
        try {
            return await paymentService.createOrder(orderPayload);
        } catch (error) {
            const isLockContention = [
                'ORDER_CREATION_IN_PROGRESS',
                'SUBSCRIPTION_REQUEST_IN_PROGRESS'
            ].includes(error.response?.data?.errorCode);
            if (!isLockContention || attempt >= retryDelays.length) throw error;
            await wait(retryDelays[attempt]);
        }
    }
};

const PaymentPage = () => {
    const { t } = useTranslation();
    const { lang } = useParams();
    const displayLocale = getIntlLocale(lang);
    const formatAmount = (amount) => Number(amount ?? 0).toLocaleString(displayLocale);
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const userId = user?.id;
    const { userPlan } = useSubscription();
    const [searchParams] = useSearchParams();

    const planType = searchParams.get('plan') || 'pro';
    const billingPeriod = searchParams.get('period') || 'monthly';
    const redemptionCode = searchParams.get('redemption') || searchParams.get('redemptionCode');
    const discountValue = searchParams.get('discountValue');
    const discountType = searchParams.get('discountType');
    const selectedPlan = useMemo(
        () => subscriptionService.getAvailablePlans().find(plan => plan.id === planType),
        [planType]
    );

    const [orderLoading, setOrderLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [orderData, setOrderData] = useState(null);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const pageViewTrackedRef = useRef(null);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Keep the login redirect compatible with the selected plan and coupon.
    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            navigate(`/${lang}/subscription-plans`, {
                state: {
                    message: t('payment.loginRequired'),
                    returnTo: `/payment?${searchParams.toString()}`
                }
            });
        }
    }, [authLoading, user, navigate, lang, searchParams, t]);

    // Keep analytics separate from order creation. The subscription context
    // may finish loading after checkout mounts; that must not POST another order.
    useEffect(() => {
        if (authLoading || !userId) return;

        const pageViewKey = JSON.stringify([
            userId,
            planType,
            billingPeriod,
            redemptionCode || null,
            discountValue || null
        ]);
        if (pageViewTrackedRef.current === pageViewKey) return;
        pageViewTrackedRef.current = pageViewKey;

        Analytics.track('payment_page_viewed', {
            userId,
            planType,
            billingPeriod,
            currentPlan: userPlan?.type || userPlan || 'unknown',
            hasDiscount: Boolean(redemptionCode || discountValue)
        });
    }, [authLoading, userId, planType, billingPeriod, redemptionCode, discountValue, userPlan]);

    // Create or reuse the backend order as soon as checkout opens so the amount
    // shown here is the amount the ECPay signed form will actually submit.
    useEffect(() => {
        if (authLoading || !userId || !selectedPlan) return undefined;

        let active = true;
        const orderPayload = {
            planType,
            billingPeriod,
            paymentMethod: 'Credit',
            language: getPaymentServiceLocale(lang || 'zh-TW'),
            returnLocale: lang || 'zh-TW',
            redemptionCode: redemptionCode || null,
            // Retain compatibility with existing non-code discount links.
            appliedDiscount: discountValue && discountType && Number.isFinite(Number(discountValue))
                ? { type: discountType, amount: Number(discountValue) }
                : null
        };

        setOrderLoading(true);
        setOrderData(null);
        // If an order expires or its authoritative amount changes, require
        // the user to review the new order before enabling the handoff.
        setAgreedToTerms(false);
        setError(null);

        createOrderWithLockRetry(orderPayload)
            .then(result => {
                if (!active) return;

                if (!result?.orderId || !result?.paymentUrl || !result?.formData?.CheckMacValue) {
                    throw new Error(t('payment.errors.invalidAmount'));
                }

                setOrderData(result);
                trackSubscriptionCheckout({ ...result, planType, billingPeriod });

                if (!result.reusedOrder) {
                    Analytics.track('payment_order_created', {
                        userId,
                        planType,
                        billingPeriod,
                        orderId: result.orderId
                    });
                }
            })
            .catch(createError => {
                if (!active) return;

                const response = createError.response?.data;
                const activeOrder = response?.data;

                // A previous tab already handed this order to ECPay. Never
                // generate another order or resubmit the same signed request.
                if (response?.errorCode === 'PAYMENT_SUBMISSION_IN_PROGRESS' && activeOrder?.merchantTradeNo) {
                    const resultParams = new URLSearchParams({
                        source: 'client',
                        merchantTradeNo: activeOrder.merchantTradeNo
                    });
                    navigate(`/${lang}/payment/result?${resultParams.toString()}`, { replace: true });
                    return;
                }

                const message = response?.message || createError.message || t('payment.errors.createOrderFailed');
                setError(message);
                Analytics.track('payment_error', {
                    userId,
                    planType,
                    billingPeriod,
                    error: message
                });
            })
            .finally(() => {
                if (active) setOrderLoading(false);
            });

        return () => {
            active = false;
        };
    }, [
        authLoading,
        userId,
        selectedPlan,
        planType,
        billingPeriod,
        lang,
        redemptionCode,
        discountValue,
        discountType,
        retryCount,
        navigate,
        t
    ]);

    const handleCancel = () => {
        Analytics.track('payment_cancelled', {
            userId: user?.id,
            planType,
            billingPeriod
        });
        navigate(`/${lang}/subscription-plans`);
    };

    const handleSubmitPayment = async () => {
        if (!agreedToTerms) {
            setError(t('payment.errors.termsRequired'));
            return;
        }

        if (!orderData?.orderId || !orderData?.paymentUrl || !orderData?.formData?.CheckMacValue) {
            setError(t('payment.errors.invalidAmount'));
            return;
        }

        if (submitting) return;

        setSubmitting(true);
        setError(null);

        try {
            // Persist the handoff state before the cross-origin form POST. If
            // the browser returns or refreshes, the backend will not cancel or
            // recreate an order whose ECPay callback may still be pending.
            await paymentService.markPaymentSubmissionStarted(orderData.orderId);
            paymentService.submitPaymentForm(orderData);
        } catch (submitError) {
            const response = submitError.response?.data;
            if (response?.errorCode === 'PAYMENT_SUBMISSION_IN_PROGRESS' && response?.data?.merchantTradeNo) {
                const resultParams = new URLSearchParams({
                    source: 'client',
                    merchantTradeNo: response.data.merchantTradeNo
                });
                navigate(`/${lang}/payment/result?${resultParams.toString()}`, { replace: true });
                return;
            }

            // The pending order can expire while the checkout page is open.
            // Fetch a new backend order and show its freshly confirmed amount
            // instead of attempting to submit an expired signed form.
            if (['ORDER_EXPIRED', 'ORDER_NOT_PAYABLE'].includes(response?.errorCode)) {
                setOrderData(null);
                setSubmitting(false);
                setRetryCount(value => value + 1);
                return;
            }

            const message = submitError.response?.data?.message ||
                submitError.message ||
                t('payment.errors.paymentFailed');
            setError(message);
            setSubmitting(false);
            Analytics.track('payment_error', {
                userId: user?.id,
                planType,
                billingPeriod,
                error: message
            });
        }
    };

    if (authLoading) {
        return (
            <div className="payment-page">
                <div className="payment-page__container">
                    <div className="payment-page__order-loading" aria-live="polite">
                        <LoadingSpinner size="large" />
                    </div>
                </div>
            </div>
        );
    }

    if (!user) return null;

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

    const serviceTerms = t('payment.terms.serviceTerms', { returnObjects: true });
    const privacyTerms = t('payment.terms.privacyPolicy', { returnObjects: true });
    const originalAmount = Number(orderData?.originalAmount ?? orderData?.amount ?? 0);
    const orderAmount = Number(orderData?.amount ?? 0);
    const discountAmount = Number(orderData?.discountAmount ?? Math.max(0, originalAmount - orderAmount));
    const hasDiscount = discountAmount > 0 && originalAmount > orderAmount;

    return (
        <div className="payment-page">
            <div className="payment-page__container">
                <header className="payment-page__header">
                    <button
                        className="payment-page__back-button"
                        onClick={handleCancel}
                        aria-label={t('common.back')}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
                            {t('payment.upgradeTitle', { planName: selectedPlan.name || 'Pro' })}
                        </h1>
                        <p className="payment-page__subtitle">{t('payment.upgradeSubtitle')}</p>
                    </div>
                </header>

                {error && (
                    <div className="payment-page__error-message" role="alert">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" />
                            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                <main className="payment-page__content payment-page__content--single">
                    {orderLoading ? (
                        <div className="payment-page__order-loading" aria-live="polite">
                            <LoadingSpinner size="large" />
                            <p>{t('payment.loading.orderData', 'Confirming your order amount…')}</p>
                        </div>
                    ) : !orderData ? (
                        <div className="payment-page__error">
                            <h2>{t('payment.errors.createOrderFailed')}</h2>
                            <p>{error || t('payment.errors.createOrderFailed')}</p>
                            <button
                                className="payment-page__back-button payment-page__retry-button"
                                onClick={() => setRetryCount(value => value + 1)}
                            >
                                {t('payment.error.retry')}
                            </button>
                        </div>
                    ) : (
                        <div className="payment-page__checkout-grid">
                            <section className="payment-page__summary-column" aria-labelledby="payment-order-summary-title">
                                <div className="payment-page__plan-card payment-page__order-summary ui-surface-card ui-surface-card--prominent">
                                    <div className="payment-page__checkout-card-heading">
                                        <h2 className="payment-page__summary-title" id="payment-order-summary-title">
                                            {t('payment.orderSummary.title')}
                                        </h2>
                                        <Badge
                                            label={selectedPlan.name || 'Pro'}
                                            variant="blue"
                                            size="medium"
                                            className="payment-page__plan-badge"
                                        />
                                    </div>

                                    <div className="payment-page__plan-header">
                                        <h3 className="payment-page__plan-name">{t('payment.plan.proPlan')}</h3>
                                        <div className="payment-page__plan-price">
                                            <span className="payment-page__plan-amount" data-testid="payment-plan-amount">
                                                TWD {formatAmount(orderData.amount)}
                                            </span>
                                            <span className="payment-page__plan-period">
                                                / {billingPeriod === 'monthly'
                                                    ? t('payment.plan.pricing.monthly')
                                                    : t('payment.plan.pricing.yearly')}
                                            </span>
                                        </div>
                                        {hasDiscount && (
                                            <div className="payment-page__plan-discount" aria-label={t('payment.orderSummary.discount')}>
                                                <div className="payment-page__original-price" data-testid="payment-original-amount">
                                                    {t('payment.plan.pricing.originalPrice')}: TWD {formatAmount(originalAmount)}
                                                </div>
                                                <div className="payment-page__discount-badge">
                                                    {t('payment.orderSummary.discount')}: -TWD {formatAmount(discountAmount)}
                                                </div>
                                                {orderData.redemptionCode && (
                                                    <div className="payment-page__redemption-code">
                                                        {t('redemption.confirmation.codeLabel')}: {orderData.redemptionCode}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="payment-page__order-details">
                                        <div className="payment-page__order-row">
                                            <span>{t('payment.orderSummary.plan')}</span>
                                            <span>
                                                {t('payment.plan.proPlan')} ({billingPeriod === 'monthly'
                                                    ? t('payment.orderSummary.monthlyPlan')
                                                    : t('payment.orderSummary.yearlyPlan')})
                                            </span>
                                        </div>
                                        <div className="payment-page__order-row">
                                            <span>{t('payment.plan.pricing.totalAmount')}</span>
                                            <span className="payment-page__order-total-amount" data-testid="payment-order-total">
                                                TWD {formatAmount(orderData.amount)}
                                            </span>
                                        </div>
                                        <div className="payment-page__order-row payment-page__order-reference">
                                            <span>{t('payment.orderSummary.orderId')}</span>
                                            <span className="payment-page__order-id">{orderData.orderId}</span>
                                        </div>
                                    </div>

                                    <div className="payment-page__plan-features">
                                        <h4 className="payment-page__features-title">{t('payment.plan.features.title')}</h4>
                                        <ul className="payment-page__features-list">
                                            <li className="payment-page__feature-item">
                                                <span className="payment-page__feature-icon" aria-hidden="true">✓</span>
                                                {t('payment.plan.features.marketSentiment')}
                                            </li>
                                            <li className="payment-page__feature-item">
                                                <span className="payment-page__feature-icon" aria-hidden="true">✓</span>
                                                {t('payment.plan.features.advancedAnalysis')}
                                            </li>
                                            <li className="payment-page__feature-item">
                                                <span className="payment-page__feature-icon" aria-hidden="true">✓</span>
                                                {t('payment.plan.features.unlimitedWatchlist')}
                                            </li>
                                            <li className="payment-page__feature-item">
                                                <span className="payment-page__feature-icon" aria-hidden="true">✓</span>
                                                {t('payment.plan.features.prioritySupport')}
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                <PaymentTrustNotice
                                    amount={orderData.amount}
                                    billingPeriod={billingPeriod}
                                    lang={lang || 'zh-TW'}
                                />
                            </section>

                            <section className="payment-page__terms-column" aria-labelledby="payment-terms-title">
                                <div className="payment-page__terms-content ui-surface-card ui-surface-card--prominent">
                                    <h2 className="payment-page__terms-title" id="payment-terms-title">
                                        {t('payment.terms.title')}
                                    </h2>

                                    <div className="payment-page__terms-box">
                                        <div className="payment-page__terms-group">
                                            <h3>{t('payment.terms.serviceTermsTitle')}</h3>
                                            <ul>
                                                {(Array.isArray(serviceTerms) ? serviceTerms : []).map((term, index) => (
                                                    <li key={`service-${index}`}>{term}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="payment-page__terms-group">
                                            <h3>{t('payment.terms.privacyPolicyTitle')}</h3>
                                            <ul>
                                                {(Array.isArray(privacyTerms) ? privacyTerms : []).map((policy, index) => (
                                                    <li key={`privacy-${index}`}>{policy}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    <label className="payment-page__checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={agreedToTerms}
                                            onChange={(event) => setAgreedToTerms(event.target.checked)}
                                            className="payment-page__checkbox"
                                        />
                                        <span className="payment-page__checkbox-text">
                                            {t('payment.terms.agreement')}
                                            <a href={`/${lang}/legal`} target="_blank" rel="noreferrer" className="payment-page__link">
                                                {t('payment.form.termsAndConditions')}
                                            </a>
                                        </span>
                                    </label>
                                </div>

                                <div className="payment-page__payment-method-card ui-surface-card">
                                    <div className="payment-page__payment-method-icon" aria-hidden="true">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <rect x="2.5" y="5" width="19" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
                                            <path d="M3 9.5H21" stroke="currentColor" strokeWidth="1.7" />
                                            <path d="M6.5 15H10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3>{t('payment.orderSummary.paymentMethod')}</h3>
                                        <p>{t('payment.orderSummary.creditCardRecurring')}</p>
                                    </div>
                                </div>

                                <div className="payment-page__actions payment-page__checkout-actions">
                                    <Button
                                        className="payment-page__button payment-page__cancel-button"
                                        variant="outline"
                                        onClick={handleCancel}
                                        disabled={submitting}
                                    >
                                        {t('payment.form.cancel')}
                                    </Button>
                                    <Button
                                        className="payment-page__button payment-page__submit-button"
                                        variant="primary"
                                        onClick={handleSubmitPayment}
                                        disabled={!agreedToTerms || orderLoading || submitting || !orderData}
                                    >
                                        {submitting ? t('payment.form.processing') : t('payment.form.proceedToPayment')}
                                    </Button>
                                </div>
                            </section>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default PaymentPage;
