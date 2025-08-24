/**
 * ActivePromotions Component
 * 
 * Shows currently active promotional benefits with countdown timers
 * Features:
 * - Countdown timers for expiring promotions
 * - Clear indication of promotional vs. paid subscriptions
 * - Transition warnings and payment method prompts
 * - Renewal options and upgrade paths
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Auth/useAuth';
import { useSubscription } from '../Subscription/SubscriptionContext';
import LoadingSpinner from '../Common/LoadingSpinner';
import redemptionService from '../../services/redemptionService';
import { Analytics } from '../../utils/analytics';
import { useRedemptionFormatting } from '../../hooks/useRedemptionFormatting';
import './ActivePromotions.css';

export const ActivePromotions = ({
    className = '',
    showRenewalOptions = true,
    onPromotionExpiring,
    onPromotionExpired,
    refreshInterval = 60000 // 1 minute
}) => {
    const { t } = useTranslation();
    const { formatActivePromotion, formatters } = useRedemptionFormatting();
    const { user } = useAuth();
    const { userPlan, refreshUserPlan } = useSubscription();
    
    // Component state
    const [promotions, setPromotions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Load promotions on component mount
    useEffect(() => {
        loadActivePromotions();
    }, []);

    // Set up refresh interval
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
            loadActivePromotions();
        }, refreshInterval);

        return () => clearInterval(interval);
    }, [refreshInterval]);

    // Update current time every second for countdown
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    /**
     * Load active promotions
     */
    const loadActivePromotions = useCallback(async () => {
        if (!user) {
            setPromotions([]);
            setIsLoading(false);
            return;
        }

        try {
            const result = await redemptionService.getActivePromotions();
            
            if (result.success) {
                const activePromotions = result.data.promotions || [];
                setPromotions(activePromotions);
                setError(null);
                
                // Check for expiring promotions
                checkExpiringPromotions(activePromotions);
                
                Analytics.track('active_promotions_loaded', {
                    userId: user?.id,
                    promotionCount: activePromotions.length
                });
            } else {
                setError(result);
            }
        } catch (err) {
            setError({
                error: t('redemption.activePromotions.errors.loadFailed'),
                errorCode: 'LOAD_PROMOTIONS_FAILED'
            });
        } finally {
            setIsLoading(false);
        }
    }, [user, t]);

    /**
     * Check for expiring promotions and trigger callbacks
     */
    const checkExpiringPromotions = (promotionList) => {
        const now = new Date();
        const warningThreshold = 24 * 60 * 60 * 1000; // 24 hours

        promotionList.forEach(promotion => {
            if (promotion.expiresAt) {
                const expiryTime = new Date(promotion.expiresAt);
                const timeUntilExpiry = expiryTime.getTime() - now.getTime();

                if (timeUntilExpiry <= 0) {
                    onPromotionExpired?.(promotion);
                } else if (timeUntilExpiry <= warningThreshold) {
                    onPromotionExpiring?.(promotion, timeUntilExpiry);
                }
            }
        });
    };

    /**
     * Format time remaining
     */
    const formatTimeRemaining = (expiryDate) => {
        if (!expiryDate) return null;

        const now = currentTime;
        const expiry = new Date(expiryDate);
        const diff = expiry.getTime() - now.getTime();

        if (diff <= 0) {
            return {
                expired: true,
                text: t('redemption.activePromotions.expired')
            };
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
            return {
                expired: false,
                text: t('redemption.activePromotions.timeRemaining.days', { days, hours }),
                isUrgent: days <= 1
            };
        } else if (hours > 0) {
            return {
                expired: false,
                text: t('redemption.activePromotions.timeRemaining.hours', { hours, minutes }),
                isUrgent: true
            };
        } else {
            return {
                expired: false,
                text: t('redemption.activePromotions.timeRemaining.minutes', { minutes }),
                isUrgent: true
            };
        }
    };

    /**
     * Format promotion benefit
     */
    const formatPromotionBenefit = (promotion) => {
        switch (promotion.type) {
            case 'discount':
                return {
                    title: t('redemption.activePromotions.benefits.discount.title'),
                    description: promotion.discountType === 'percentage' 
                        ? t('redemption.activePromotions.benefits.discount.percentage', { 
                            percentage: promotion.discountPercentage 
                          })
                        : t('redemption.activePromotions.benefits.discount.fixed', { 
                            amount: promotion.discountAmount,
                            currency: promotion.currency || 'TWD'
                          }),
                    icon: '💰',
                    color: 'green'
                };

            case 'extension':
                return {
                    title: t('redemption.activePromotions.benefits.extension.title'),
                    description: t('redemption.activePromotions.benefits.extension.description', {
                        duration: promotion.extensionDuration,
                        unit: t(`redemption.units.${promotion.extensionUnit?.toLowerCase()}`)
                    }),
                    icon: '⏰',
                    color: 'blue'
                };

            case 'upgrade':
                return {
                    title: t('redemption.activePromotions.benefits.upgrade.title'),
                    description: t('redemption.activePromotions.benefits.upgrade.description', {
                        plan: t(`subscription.plans.${promotion.targetPlan}`)
                    }),
                    icon: '⭐',
                    color: 'purple'
                };

            default:
                return {
                    title: t('redemption.activePromotions.benefits.general.title'),
                    description: t('redemption.activePromotions.benefits.general.description'),
                    icon: '🎁',
                    color: 'gray'
                };
        }
    };

    /**
     * Handle renewal action
     */
    const handleRenewal = (promotion) => {
        Analytics.track('promotion_renewal_clicked', {
            userId: user?.id,
            promotionId: promotion.id,
            promotionType: promotion.type
        });

        // Navigate to subscription page or show payment modal
        // This would be implemented based on the existing subscription flow
        window.location.href = '/subscription';
    };

    /**
     * Get promotion card class based on urgency
     */
    const getPromotionCardClass = (timeRemaining) => {
        let baseClass = 'active-promotion-card';
        
        if (timeRemaining?.expired) {
            baseClass += ' active-promotion-card--expired';
        } else if (timeRemaining?.isUrgent) {
            baseClass += ' active-promotion-card--urgent';
        }
        
        return baseClass;
    };

    if (!user) {
        return null;
    }

    return (
        <div className={`active-promotions ${className}`}>
            {/* Content */}
            <div className="active-promotions-content">
                {isLoading ? (
                    <div className="active-promotions-loading">
                        <LoadingSpinner size="medium" />
                        <p>{t('redemption.activePromotions.loading')}</p>
                    </div>
                ) : error ? (
                    <div className="active-promotions-error">
                        <div className="active-promotions-error-icon">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <p>{redemptionService.formatErrorMessage(error, t)}</p>
                        <button
                            onClick={loadActivePromotions}
                            className="active-promotions-retry-btn"
                        >
                            {t('redemption.activePromotions.retry')}
                        </button>
                    </div>
                ) : promotions.length === 0 ? (
                    <div className="active-promotions-empty">
                        <div className="active-promotions-empty-icon">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                            </svg>
                        </div>
                        <h4>{t('redemption.activePromotions.empty.title')}</h4>
                        <p>{t('redemption.activePromotions.empty.description')}</p>
                    </div>
                ) : (
                    <div className="active-promotions-list">
                        {promotions.map((promotion) => {
                            const benefit = formatPromotionBenefit(promotion);
                            const timeRemaining = formatTimeRemaining(promotion.expiresAt);
                            
                            return (
                                <div key={promotion.id} className={getPromotionCardClass(timeRemaining)}>
                                    <div className="active-promotion-card-header">
                                        <div className="active-promotion-card-icon">
                                            {benefit.icon}
                                        </div>
                                        <div className="active-promotion-card-title">
                                            {benefit.title}
                                        </div>
                                        {timeRemaining && (
                                            <div className={`active-promotion-card-timer ${
                                                timeRemaining.expired ? 'active-promotion-card-timer--expired' :
                                                timeRemaining.isUrgent ? 'active-promotion-card-timer--urgent' : ''
                                            }`}>
                                                {timeRemaining.text}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="active-promotion-card-content">
                                        <div className="active-promotion-card-description">
                                            {benefit.description}
                                        </div>
                                        
                                        {promotion.code && (
                                            <div className="active-promotion-card-code">
                                                <span className="active-promotion-card-code-label">
                                                    {t('redemption.activePromotions.codeLabel')}
                                                </span>
                                                <span className="active-promotion-card-code-value">
                                                    {promotion.code}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Renewal Options */}
                                    {showRenewalOptions && timeRemaining?.isUrgent && !timeRemaining.expired && (
                                        <div className="active-promotion-card-actions">
                                            <div className="active-promotion-card-warning">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                {t('redemption.activePromotions.expiringWarning')}
                                            </div>
                                            
                                            <button
                                                onClick={() => handleRenewal(promotion)}
                                                className="active-promotion-card-renew-btn"
                                            >
                                                {t('redemption.activePromotions.renewNow')}
                                            </button>
                                        </div>
                                    )}
                                    
                                    {/* Expired State */}
                                    {timeRemaining?.expired && (
                                        <div className="active-promotion-card-expired">
                                            <div className="active-promotion-card-expired-message">
                                                {t('redemption.activePromotions.expiredMessage')}
                                            </div>
                                            
                                            {showRenewalOptions && (
                                                <button
                                                    onClick={() => handleRenewal(promotion)}
                                                    className="active-promotion-card-renew-btn"
                                                >
                                                    {t('redemption.activePromotions.renewSubscription')}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivePromotions;