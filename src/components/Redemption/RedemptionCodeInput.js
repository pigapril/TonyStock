/**
 * RedemptionCodeInput Component
 * 
 * Multi-location redemption input with real-time validation
 * Features:
 * - Real-time code validation and preview
 * - Loading states and error handling
 * - Responsive design following existing patterns
 * - Multi-location support (pricing, checkout, account)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Auth/useAuth';
import { useSubscription } from '../Subscription/SubscriptionContext';
import LoadingSpinner from '../Common/LoadingSpinner';
import redemptionService from '../../services/redemptionService';
import { Analytics } from '../../utils/analytics';
import { useRedemptionFormatting } from '../../hooks/useRedemptionFormatting';
import './RedemptionCodeInput.css';

export const RedemptionCodeInput = ({
    location = 'general', // 'pricing', 'checkout', 'account', 'general'
    onRedemptionSuccess,
    onRedemptionError,
    onPreviewSuccess,
    showPreview = true,
    placeholder,
    className = '',
    disabled = false,
    autoFocus = false
}) => {
    const { t } = useTranslation();
    const { formatters, formatError, formatBenefitPreview } = useRedemptionFormatting();
    const { user } = useAuth();
    const { refreshUserPlan } = useSubscription();
    
    // Component state
    const [code, setCode] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [validationResult, setValidationResult] = useState(null);
    const [error, setError] = useState(null);
    const [preview, setPreview] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);

    // Debounced validation
    const [validationTimeout, setValidationTimeout] = useState(null);

    // Clear states when code changes
    useEffect(() => {
        if (!code.trim()) {
            setValidationResult(null);
            setError(null);
            setPreview(null);
        }
    }, [code]);

    // Debounced validation effect
    useEffect(() => {
        if (validationTimeout) {
            clearTimeout(validationTimeout);
        }

        if (code.trim().length >= 3) {
            const timeout = setTimeout(() => {
                validateCode(code.trim());
            }, 500);
            setValidationTimeout(timeout);
        }

        return () => {
            if (validationTimeout) {
                clearTimeout(validationTimeout);
            }
        };
    }, [code]);

    /**
     * Validate redemption code
     */
    const validateCode = useCallback(async (codeToValidate) => {
        if (!codeToValidate || codeToValidate.length < 3) return;

        setIsValidating(true);
        setError(null);
        setValidationResult(null);

        try {
            const result = await redemptionService.validateCode(codeToValidate);
            
            if (result.success) {
                setValidationResult(result.data);
                
                // If validation successful and preview enabled, get preview
                if (showPreview) {
                    await getPreview(codeToValidate);
                }

                Analytics.track('redemption_code_validated', {
                    location,
                    userId: user?.id,
                    codeLength: codeToValidate.length,
                    isValid: true
                });
            } else {
                setError(result);
                Analytics.track('redemption_code_validation_failed', {
                    location,
                    userId: user?.id,
                    errorCode: result.errorCode,
                    codeLength: codeToValidate.length
                });
            }
        } catch (err) {
            const errorCode = err.response?.data?.code || 'validationFailed';
            const errorParams = err.response?.data?.params || {};
            setError({
                error: formatError(errorCode, errorParams),
                errorCode: errorCode.toUpperCase()
            });
        } finally {
            setIsValidating(false);
        }
    }, [showPreview, location, user?.id, t]);

    /**
     * Get redemption preview
     */
    const getPreview = useCallback(async (codeToPreview) => {
        try {
            const result = await redemptionService.previewRedemption(codeToPreview);
            
            if (result.success) {
                setPreview(result.data);
                onPreviewSuccess?.(result.data);
                
                Analytics.track('redemption_preview_loaded', {
                    location,
                    userId: user?.id,
                    benefitType: result.data.benefits?.type,
                    discountAmount: result.data.benefits?.discountAmount
                });
            } else {
                setError(result);
            }
        } catch (err) {
            const errorCode = err.response?.data?.code || 'previewFailed';
            const errorParams = err.response?.data?.params || {};
            setError({
                error: formatError(errorCode, errorParams),
                errorCode: errorCode.toUpperCase()
            });
        }
    }, [location, user?.id, onPreviewSuccess, t]);

    /**
     * Handle code input change
     */
    const handleCodeChange = (e) => {
        const newCode = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        setCode(newCode);
        setShowSuccess(false);
    };

    /**
     * Handle form submission (quick redeem)
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!code.trim() || isValidating || isRedeeming) return;

        // If no preview available, validate first
        if (!preview && !validationResult) {
            await validateCode(code.trim());
            return;
        }

        await redeemCode();
    };

    /**
     * Redeem the code
     */
    const redeemCode = async () => {
        if (!code.trim()) return;

        setIsRedeeming(true);
        setError(null);

        try {
            const result = await redemptionService.redeemCode(code.trim(), true);
            
            if (result.success) {
                setShowSuccess(true);
                setCode('');
                setPreview(null);
                setValidationResult(null);
                
                // Refresh user plan data
                await refreshUserPlan();
                
                onRedemptionSuccess?.(result.data);
                
                Analytics.track('redemption_code_redeemed', {
                    location,
                    userId: user?.id,
                    benefitType: result.data.benefits?.type,
                    discountAmount: result.data.benefits?.discountAmount
                });

                // Auto-hide success message after 3 seconds
                setTimeout(() => setShowSuccess(false), 3000);
            } else {
                setError(result);
                onRedemptionError?.(result);
                
                Analytics.track('redemption_failed', {
                    location,
                    userId: user?.id,
                    errorCode: result.errorCode
                });
            }
        } catch (err) {
            const errorResult = {
                error: t('redemption.errors.redemptionFailed'),
                errorCode: 'REDEMPTION_ERROR'
            };
            setError(errorResult);
            onRedemptionError?.(errorResult);
        } finally {
            setIsRedeeming(false);
        }
    };

    /**
     * Get input status class
     */
    const getInputStatusClass = () => {
        if (error) return 'redemption-input--error';
        if (validationResult || preview) return 'redemption-input--success';
        if (isValidating) return 'redemption-input--validating';
        return '';
    };

    /**
     * Get button text based on state
     */
    const getButtonText = () => {
        if (isRedeeming) return t('redemption.redeeming');
        if (isValidating) return t('redemption.validating');
        if (preview) return t('redemption.redeem');
        return t('redemption.validate');
    };

    /**
     * Format preview benefits for display
     */
    const formatPreviewBenefits = (benefits) => {
        if (!benefits) return '';
        
        const formatted = formatBenefitPreview(benefits);
        return formatted.title;
    };

    return (
        <div className={`redemption-code-input ${className}`}>
            <form onSubmit={handleSubmit} className="redemption-form">
                <div className="redemption-input-container">
                    <div className={`redemption-input-wrapper ${getInputStatusClass()}`}>
                        <input
                            type="text"
                            value={code}
                            onChange={handleCodeChange}
                            placeholder={placeholder || t('redemption.inputPlaceholder')}
                            className="redemption-input"
                            disabled={disabled || isRedeeming}
                            autoFocus={autoFocus}
                            maxLength={20}
                            autoComplete="off"
                            spellCheck="false"
                        />
                        
                        {isValidating && (
                            <div className="redemption-input-spinner">
                                <LoadingSpinner size="small" />
                            </div>
                        )}
                        
                        {validationResult && !error && (
                            <div className="redemption-input-check">
                                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                    </div>
                    
                    <button
                        type="submit"
                        className="redemption-submit-btn"
                        disabled={!code.trim() || isValidating || isRedeeming || disabled}
                    >
                        {isRedeeming ? (
                            <LoadingSpinner size="small" />
                        ) : (
                            getButtonText()
                        )}
                    </button>
                </div>
            </form>

            {/* Preview Display */}
            {preview && !error && (
                <div className="redemption-preview">
                    <div className="redemption-preview-header">
                        <h4>{t('redemption.preview.title')}</h4>
                    </div>
                    <div className="redemption-preview-content">
                        <div className="redemption-preview-benefit">
                            {formatPreviewBenefits(preview.benefits)}
                        </div>
                        {preview.requiresPaymentMethod && (
                            <div className="redemption-preview-warning">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {t('redemption.preview.paymentMethodRequired')}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="redemption-error">
                    <div className="redemption-error-icon">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="redemption-error-message">
                        {redemptionService.formatErrorMessage(error, t)}
                    </div>
                </div>
            )}

            {/* Success Display */}
            {showSuccess && (
                <div className="redemption-success">
                    <div className="redemption-success-icon">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="redemption-success-message">
                        {t('redemption.success.redeemed')}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RedemptionCodeInput;