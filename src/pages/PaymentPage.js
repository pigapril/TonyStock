/**
 * 專用付款頁面
 * 
 * Apple 風格的獨立付款頁面，提供清晰的付款流程
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../components/Auth/useAuth';
import { useSubscription } from '../components/Subscription/SubscriptionContext';
import PaymentFlow from '../components/Payment/PaymentFlow';
import { Analytics } from '../utils/analytics';
import subscriptionService from '../api/subscriptionService';
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
                            {t('payment.upgradeTitle', { planName: selectedPlan.name })}
                        </h1>
                        <p className="payment-page__subtitle">
                            {t('payment.upgradeSubtitle')}
                        </p>
                    </div>
                </header>

                {/* 付款流程 */}
                <main className="payment-page__content">
                    <PaymentFlow
                        planType={planType}
                        billingPeriod={billingPeriod}
                        onSuccess={handleSuccess}
                        onError={handleError}
                        onCancel={handleCancel}
                    />
                </main>
            </div>
        </div>
    );
};

export default PaymentPage;