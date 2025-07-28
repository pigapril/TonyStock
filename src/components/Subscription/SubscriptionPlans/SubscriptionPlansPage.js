import React, { useEffect, useState, Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Auth/useAuth';
import { useSubscription } from '../context/SubscriptionContext';
import { PlanCard } from './components/PlanCard';
import { PlanComparison } from './components/PlanComparison';
import PlanComparisonTable from './components/PlanComparisonTable';
import { AppleButton } from '../shared/AppleButton';
import { withCache } from '../../../services/subscriptionCache';
import './SubscriptionPlansPage.css';

export const SubscriptionPlansPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { userPlan, refreshSubscriptionData } = useSubscription();
  const [showComparison, setShowComparison] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Refresh data when component mounts
  useEffect(() => {
    refreshSubscriptionData();
  }, [refreshSubscriptionData]);

  // Memoized plans data for better performance
  const plans = useMemo(() => [
    {
      id: 'free',
      name: t('subscriptionPlans.free.name', 'Free'),
      price: 0,
      period: t('subscriptionPlans.period.forever', 'Forever'),
      description: t('subscriptionPlans.free.description', 'Perfect for getting started'),
      features: [
        t('subscriptionPlans.free.features.api', '1,000 API calls per day'),
        t('subscriptionPlans.free.features.analysis', '10 price analyses per day'),
        t('subscriptionPlans.free.features.watchlist', '3 watchlist categories'),
        t('subscriptionPlans.free.features.support', 'Community support'),
        t('subscriptionPlans.free.features.ads', 'Ad-supported experience')
      ],
      limitations: [
        t('subscriptionPlans.free.limitations.quota', 'Daily usage limits'),
        t('subscriptionPlans.free.limitations.features', 'Limited advanced features')
      ],
      // Extended features for comparison table
      extendedFeatures: {
        watchlist: {
          maxCategories: 3,
          maxStocksPerCategory: 10
        },
        realTimeData: false,
        advancedAnalytics: false,
        prioritySupport: false,
        apiRateLimit: t('subscription.standard')
      },
      limits: {
        api: { daily: 1000, monthly: 20000 },
        priceAnalysis: { daily: 10, monthly: 200 },
        news: { daily: 50, monthly: 1000 },
        search: { daily: 100, monthly: 2000 }
      },
      popular: false,
      current: userPlan?.type === 'free'
    },
    {
      id: 'pro',
      name: t('subscriptionPlans.pro.name', 'Pro'),
      price: 299,
      period: t('subscriptionPlans.period.month', 'per month'),
      description: t('subscriptionPlans.pro.description', 'For serious traders and analysts'),
      features: [
        t('subscriptionPlans.pro.features.api', '10,000 API calls per day'),
        t('subscriptionPlans.pro.features.analysis', '100 price analyses per day'),
        t('subscriptionPlans.pro.features.watchlist', '10 watchlist categories'),
        t('subscriptionPlans.pro.features.support', 'Priority email support'),
        t('subscriptionPlans.pro.features.ads', 'Ad-free experience'),
        t('subscriptionPlans.pro.features.advanced', 'Advanced analytics tools'),
        t('subscriptionPlans.pro.features.export', 'Data export capabilities')
      ],
      limitations: [],
      // Extended features for comparison table
      extendedFeatures: {
        watchlist: {
          maxCategories: 10,
          maxStocksPerCategory: 50
        },
        realTimeData: true,
        advancedAnalytics: true,
        prioritySupport: false,
        apiRateLimit: t('subscription.enhanced')
      },
      limits: {
        api: { daily: 10000, monthly: 200000 },
        priceAnalysis: { daily: 100, monthly: 2000 },
        news: { daily: 500, monthly: 10000 },
        search: { daily: 1000, monthly: 20000 }
      },
      popular: true,
      current: userPlan?.type === 'pro'
    },
    {
      id: 'ultra',
      name: t('subscriptionPlans.ultra.name', 'Ultra'),
      price: 599,
      period: t('subscriptionPlans.period.month', 'per month'),
      description: t('subscriptionPlans.ultra.description', 'For professional institutions'),
      features: [
        t('subscriptionPlans.ultra.features.api', 'Unlimited API calls'),
        t('subscriptionPlans.ultra.features.analysis', 'Unlimited price analyses'),
        t('subscriptionPlans.ultra.features.watchlist', '100 watchlist categories'),
        t('subscriptionPlans.ultra.features.support', 'Premium phone & chat support'),
        t('subscriptionPlans.ultra.features.ads', 'Ad-free experience'),
        t('subscriptionPlans.ultra.features.advanced', 'All advanced analytics tools'),
        t('subscriptionPlans.ultra.features.export', 'Unlimited data export'),
        t('subscriptionPlans.ultra.features.api_access', 'API access for integrations'),
        t('subscriptionPlans.ultra.features.custom', 'Custom reporting features')
      ],
      limitations: [],
      // Extended features for comparison table
      extendedFeatures: {
        watchlist: {
          maxCategories: -1,
          maxStocksPerCategory: -1
        },
        realTimeData: true,
        advancedAnalytics: true,
        prioritySupport: true,
        apiRateLimit: t('subscription.premium')
      },
      limits: {
        api: { daily: -1, monthly: -1 },
        priceAnalysis: { daily: -1, monthly: -1 },
        news: { daily: -1, monthly: -1 },
        search: { daily: -1, monthly: -1 }
      },
      popular: false,
      current: userPlan?.type === 'ultra'
    }
  ], [t, userPlan]);

  // Cached plan selection handler
  const handlePlanSelect = withCache(async (plan) => {
    setIsLoading(true);
    try {
      // Simulate API call for plan selection
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Selected plan:', plan);
      // Here you would call the actual API
    } catch (error) {
      console.error('Failed to select plan:', error);
    } finally {
      setIsLoading(false);
    }
  }, 'planSelection', 'planComparison');

  const handleScrollToComparison = () => {
    const comparisonElement = document.getElementById('plan-comparison');
    if (comparisonElement) {
      comparisonElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="subscription-plans-page">
      <div className="subscription-plans-page__container">
        {/* Hero Section */}
        <section className="subscription-plans-page__hero">
          <div className="subscription-plans-page__hero-content">
            <h1 className="subscription-plans-page__title">
              {t('subscriptionPlans.title', 'Choose the plan that\'s right for you')}
            </h1>
            <p className="subscription-plans-page__subtitle">
              {t('subscriptionPlans.subtitle', 'Unlock powerful trading insights and analytics with our flexible pricing plans')}
            </p>
            {user && userPlan && (
              <div className="subscription-plans-page__current-plan">
                <span className="subscription-plans-page__current-plan-label">
                  {t('subscriptionPlans.currentPlan', 'Your current plan')}:
                </span>
                <span className="subscription-plans-page__current-plan-name">
                  {plans.find(p => p.id === userPlan.type)?.name || userPlan.type}
                </span>
              </div>
            )}
            
            {/* View Toggle */}
            <div className="view-toggle">
              <button 
                className={`toggle-btn ${!showComparison ? 'active' : ''}`}
                onClick={() => setShowComparison(false)}
              >
                {t('subscription.card_view')}
              </button>
              <button 
                className={`toggle-btn ${showComparison ? 'active' : ''}`}
                onClick={() => setShowComparison(true)}
              >
                {t('subscription.comparison_view')}
              </button>
            </div>
          </div>
        </section>

        {/* Plan Cards Section */}
        <section className="subscription-plans-page__plans">
          {showComparison ? (
            <Suspense fallback={<div className="loading-skeleton">Loading comparison...</div>}>
              <PlanComparisonTable 
                plans={plans}
                currentPlan={userPlan?.type || 'free'}
                onSelectPlan={handlePlanSelect}
              />
            </Suspense>
          ) : (
            <div className="subscription-plans-page__plans-grid">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  className={`subscription-plans-page__plan-card ${
                    plan.popular ? 'subscription-plans-page__plan-card--popular' : ''
                  }`}
                  onSelect={handlePlanSelect}
                  isLoading={isLoading}
                />
              ))}
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="subscription-plans-page__cta">
          <div className="subscription-plans-page__cta-content">
            <h2 className="subscription-plans-page__cta-title">
              {t('subscriptionPlans.cta.title', 'Need more details?')}
            </h2>
            <p className="subscription-plans-page__cta-description">
              {t('subscriptionPlans.cta.description', 'Compare all features side by side to find the perfect plan for your needs')}
            </p>
            <AppleButton
              variant="secondary"
              size="large"
              onClick={handleScrollToComparison}
              className="subscription-plans-page__cta-button"
            >
              {t('subscriptionPlans.cta.button', 'Compare All Features')}
            </AppleButton>
          </div>
        </section>

        {/* Detailed Comparison Section */}
        <section id="plan-comparison" className="subscription-plans-page__comparison">
          <PlanComparison plans={plans} />
        </section>

        {/* FAQ Section */}
        <section className="subscription-plans-page__faq">
          <div className="subscription-plans-page__faq-content">
            <h2 className="subscription-plans-page__faq-title">
              {t('subscriptionPlans.faq.title', 'Frequently Asked Questions')}
            </h2>
            <div className="subscription-plans-page__faq-list">
              <div className="subscription-plans-page__faq-item">
                <h3 className="subscription-plans-page__faq-question">
                  {t('subscriptionPlans.faq.q1', 'Can I change my plan anytime?')}
                </h3>
                <p className="subscription-plans-page__faq-answer">
                  {t('subscriptionPlans.faq.a1', 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.')}
                </p>
              </div>
              <div className="subscription-plans-page__faq-item">
                <h3 className="subscription-plans-page__faq-question">
                  {t('subscriptionPlans.faq.q2', 'What payment methods do you accept?')}
                </h3>
                <p className="subscription-plans-page__faq-answer">
                  {t('subscriptionPlans.faq.a2', 'We accept all major credit cards and digital payment methods. Payment processing is secure and encrypted.')}
                </p>
              </div>
              <div className="subscription-plans-page__faq-item">
                <h3 className="subscription-plans-page__faq-question">
                  {t('subscriptionPlans.faq.q3', 'Is there a free trial?')}
                </h3>
                <p className="subscription-plans-page__faq-answer">
                  {t('subscriptionPlans.faq.a3', 'Our Free plan gives you access to core features. You can upgrade anytime to unlock advanced capabilities.')}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};