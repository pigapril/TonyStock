/**
 * React Hook for Redemption Text Formatting
 * Integrates with i18next for dynamic text formatting with parameter support
 */

import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import {
    formatCurrency,
    formatDate,
    formatRelativeTime,
    getPluralizedTimeUnit,
    formatTimeExtension,
    formatDiscountDescription,
    formatBenefitDescription,
    formatCountdown,
    formatErrorMessage,
    formatNumber,
    formatPercentage,
    getLocalizedPlanName,
    formatEstimatedValue
} from '../utils/redemptionFormatting';

/**
 * Hook for redemption text formatting with i18next integration
 */
export const useRedemptionFormatting = () => {
    const { t, i18n } = useTranslation();
    const currentLanguage = i18n.language;

    // Memoized formatting functions that use current language
    const formatters = useMemo(() => ({
        /**
         * Format currency with current locale
         */
        currency: (amount, currency = 'TWD') => {
            return formatCurrency(amount, currency, currentLanguage);
        },

        /**
         * Format date with current locale
         */
        date: (date, formatString = 'PPP') => {
            return formatDate(date, formatString, currentLanguage);
        },

        /**
         * Format relative time with current locale
         */
        relativeTime: (date) => {
            return formatRelativeTime(date, currentLanguage);
        },

        /**
         * Get pluralized time unit with current locale
         */
        timeUnit: (duration, unit) => {
            return getPluralizedTimeUnit(duration, unit, currentLanguage);
        },

        /**
         * Format time extension with current locale
         */
        timeExtension: (duration, unit) => {
            return formatTimeExtension(duration, unit, currentLanguage);
        },

        /**
         * Format discount description with current locale
         */
        discount: (discount) => {
            return formatDiscountDescription(discount, currentLanguage);
        },

        /**
         * Format benefit description with current locale
         */
        benefit: (benefit) => {
            return formatBenefitDescription(benefit, currentLanguage);
        },

        /**
         * Format countdown timer with current locale
         */
        countdown: (timeRemaining) => {
            return formatCountdown(timeRemaining, currentLanguage);
        },

        /**
         * Format number with current locale
         */
        number: (number, options = {}) => {
            return formatNumber(number, options, currentLanguage);
        },

        /**
         * Format percentage with current locale
         */
        percentage: (percentage) => {
            return formatPercentage(percentage, currentLanguage);
        },

        /**
         * Get localized plan name
         */
        planName: (planKey) => {
            return getLocalizedPlanName(planKey, currentLanguage);
        },

        /**
         * Format estimated value with current locale
         */
        estimatedValue: (value, currency = 'TWD') => {
            return formatEstimatedValue(value, currency, currentLanguage);
        }
    }), [currentLanguage]);

    /**
     * Format error message with parameters and translation
     */
    const formatError = (errorCode, params = {}) => {
        // Format parameters with current locale
        const formattedParams = formatErrorMessage(errorCode, params, currentLanguage);
        
        // Get translated error message with formatted parameters
        const translationKey = `redemption.errors.${errorCode}`;
        return t(translationKey, formattedParams);
    };

    /**
     * Format benefit preview with translation and formatting
     */
    const formatBenefitPreview = (benefit) => {
        const formatted = formatters.benefit(benefit);
        
        // Get translated titles and descriptions
        switch (benefit.type) {
            case 'discount':
                if (benefit.discountType === 'PERCENTAGE_DISCOUNT' || benefit.discountType === 'percentage') {
                    return {
                        ...formatted,
                        title: t('redemption.preview.percentageDiscount', { 
                            percentage: benefit.savingsPercentage || benefit.percentage 
                        }),
                        description: t('redemption.confirmation.benefits.discount.percentage', { 
                            percentage: benefit.savingsPercentage || benefit.percentage 
                        })
                    };
                } else {
                    return {
                        ...formatted,
                        title: t('redemption.preview.fixedDiscount', { 
                            amount: formatters.currency(benefit.discountAmount || benefit.amount, benefit.currency),
                            currency: benefit.currency 
                        }),
                        description: t('redemption.confirmation.benefits.discount.fixed', { 
                            amount: formatters.currency(benefit.discountAmount || benefit.amount, benefit.currency),
                            currency: benefit.currency 
                        })
                    };
                }
                
            case 'extension':
                return {
                    ...formatted,
                    title: t('redemption.preview.timeExtension', {
                        duration: benefit.duration,
                        unit: formatters.timeUnit(benefit.duration, benefit.unit)
                    }),
                    description: t('redemption.confirmation.benefits.extension.description', {
                        duration: benefit.duration,
                        unit: formatters.timeUnit(benefit.duration, benefit.unit)
                    })
                };
                
            case 'upgrade':
                return {
                    ...formatted,
                    title: t('redemption.preview.planUpgrade', { 
                        plan: formatters.planName(benefit.targetPlan) 
                    }),
                    description: t('redemption.confirmation.benefits.upgrade.description', {
                        plan: formatters.planName(benefit.targetPlan),
                        duration: benefit.duration || 30,
                        unit: formatters.timeUnit(benefit.duration || 30, 'day')
                    })
                };
                
            default:
                return {
                    ...formatted,
                    title: t('redemption.preview.benefits'),
                    description: t('redemption.confirmation.benefits.general.description')
                };
        }
    };

    /**
     * Format redemption history item with translation and formatting
     */
    const formatHistoryItem = (historyItem) => {
        const { appliedBenefits, redeemedAt, status } = historyItem;
        
        return {
            date: formatters.date(redeemedAt),
            relativeDate: formatters.relativeTime(redeemedAt),
            status: t(`redemption.history.status.${status?.toLowerCase()}`),
            type: t(`redemption.history.types.${appliedBenefits?.type}`),
            benefit: formatHistoryBenefit(appliedBenefits)
        };
    };

    /**
     * Format history benefit description
     */
    const formatHistoryBenefit = (benefits) => {
        if (!benefits) return '-';
        
        switch (benefits.type) {
            case 'discount':
                if (benefits.discountAmount) {
                    return t('redemption.history.benefits.discount', {
                        amount: formatters.currency(benefits.discountAmount, benefits.currency || 'TWD'),
                        currency: benefits.currency || 'TWD'
                    });
                }
                return t('redemption.history.benefits.discountGeneral');
                
            case 'extension':
                return t('redemption.history.benefits.extension', {
                    duration: benefits.extensionDays || benefits.extensionDuration,
                    unit: formatters.timeUnit(
                        benefits.extensionDays || benefits.extensionDuration, 
                        benefits.extensionDays ? 'day' : benefits.extensionUnit?.toLowerCase()
                    )
                });
                
            case 'upgrade':
                return t('redemption.history.benefits.upgrade', { 
                    plan: formatters.planName(benefits.newPlan || benefits.targetPlan) 
                });
                
            default:
                return t('redemption.history.benefits.general');
        }
    };

    /**
     * Format active promotion with countdown and translation
     */
    const formatActivePromotion = (promotion) => {
        const timeRemaining = new Date(promotion.expiresAt) - new Date();
        const isExpired = timeRemaining <= 0;
        
        return {
            ...promotion,
            timeRemaining: isExpired ? t('redemption.activePromotions.expired') : formatters.countdown(timeRemaining),
            isExpired,
            isExpiring: timeRemaining > 0 && timeRemaining < 24 * 60 * 60 * 1000, // Less than 24 hours
            benefit: formatActivePromotionBenefit(promotion.appliedBenefits)
        };
    };

    /**
     * Format active promotion benefit description
     */
    const formatActivePromotionBenefit = (benefits) => {
        if (!benefits) return null;
        
        switch (benefits.type) {
            case 'discount':
                if (benefits.discountType === 'percentage') {
                    return {
                        title: t('redemption.activePromotions.benefits.discount.title'),
                        description: t('redemption.activePromotions.benefits.discount.percentage', { 
                            percentage: benefits.percentage 
                        })
                    };
                } else {
                    return {
                        title: t('redemption.activePromotions.benefits.discount.title'),
                        description: t('redemption.activePromotions.benefits.discount.fixed', { 
                            amount: formatters.currency(benefits.amount, benefits.currency),
                            currency: benefits.currency 
                        })
                    };
                }
                
            case 'extension':
                return {
                    title: t('redemption.activePromotions.benefits.extension.title'),
                    description: t('redemption.activePromotions.benefits.extension.description', {
                        duration: benefits.duration,
                        unit: formatters.timeUnit(benefits.duration, benefits.unit)
                    })
                };
                
            case 'upgrade':
                return {
                    title: t('redemption.activePromotions.benefits.upgrade.title'),
                    description: t('redemption.activePromotions.benefits.upgrade.description', { 
                        plan: formatters.planName(benefits.targetPlan) 
                    })
                };
                
            default:
                return {
                    title: t('redemption.activePromotions.benefits.general.title'),
                    description: t('redemption.activePromotions.benefits.general.description')
                };
        }
    };

    return {
        formatters,
        formatError,
        formatBenefitPreview,
        formatHistoryItem,
        formatHistoryBenefit,
        formatActivePromotion,
        formatActivePromotionBenefit,
        t,
        currentLanguage
    };
};

export default useRedemptionFormatting;