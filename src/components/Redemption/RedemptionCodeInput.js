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

import React, { useState, useEffect, useCallback, useRef } from 'react';
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

    // 🔍 調試：監控 error 狀態變化
    useEffect(() => {
        console.log('🔍 Error state changed:', error);
    }, [error]);
    const [preview, setPreview] = useState(null);

    // 🔍 調試：監控 preview 狀態變化
    useEffect(() => {
        console.log('🔍 Preview state changed:', preview);
    }, [preview]);
    const [showSuccess, setShowSuccess] = useState(false);

    // Request state management for duplicate prevention
    const [requestState, setRequestState] = useState({
        isProcessing: false,
        lastRequestKey: null,
        requestStartTime: null,
        operationType: null // 'validate', 'preview', 'redeem'
    });

    // Refs for cleanup and request tracking
    const abortControllerRef = useRef(null);
    const requestTimeoutRef = useRef(null);
    const componentMountedRef = useRef(true);

    // Cleanup effect
    useEffect(() => {
        componentMountedRef.current = true;

        return () => {
            componentMountedRef.current = false;
            // Cancel any ongoing requests
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            // Clear timeout
            if (requestTimeoutRef.current) {
                clearTimeout(requestTimeoutRef.current);
            }
        };
    }, []);

    // Clear states when code changes
    useEffect(() => {
        if (!code.trim()) {
            setValidationResult(null);
            setError(null);
            setPreview(null);
            // Reset request state when code is cleared
            setRequestState({
                isProcessing: false,
                lastRequestKey: null,
                requestStartTime: null,
                operationType: null
            });
        } else {
            // Clear previous validation results when code changes
            setValidationResult(null);
            setError(null);
            setPreview(null);
        }
    }, [code]);

    /**
     * Generate unique request key for deduplication
     */
    const generateRequestKey = useCallback((operationType, codeValue) => {
        const userId = user?.id || 'anonymous';
        const normalizedCode = codeValue.trim().toUpperCase();
        return `${userId}-${normalizedCode}-${operationType}`;
    }, [user?.id]);

    /**
     * Check if request should be blocked due to duplicate or rate limiting
     */
    const shouldBlockRequest = useCallback((operationType, codeValue) => {
        const requestKey = generateRequestKey(operationType, codeValue);

        // Block if currently processing the SAME operation type
        if (requestState.isProcessing && requestState.operationType === operationType) {
            return {
                blocked: true,
                reason: 'processing',
                message: 'Request already in progress'
            };
        }

        // Block if same request was made recently (within 1 second)
        if (requestState.lastRequestKey === requestKey &&
            requestState.requestStartTime &&
            Date.now() - requestState.requestStartTime < 1000) {
            return {
                blocked: true,
                reason: 'duplicate',
                message: 'Duplicate request blocked'
            };
        }

        return { blocked: false };
    }, [requestState, generateRequestKey]);

    /**
     * Start request tracking
     */
    const startRequestTracking = useCallback((operationType, codeValue) => {
        const requestKey = generateRequestKey(operationType, codeValue);

        setRequestState({
            isProcessing: true,
            lastRequestKey: requestKey,
            requestStartTime: Date.now(),
            operationType
        });

        // Set timeout to reset request state if request takes too long
        requestTimeoutRef.current = setTimeout(() => {
            if (componentMountedRef.current) {
                setRequestState(prev => ({
                    ...prev,
                    isProcessing: false
                }));
            }
        }, 30000); // 30 second timeout

        return requestKey;
    }, [generateRequestKey]);

    /**
     * End request tracking
     */
    const endRequestTracking = useCallback(() => {
        if (requestTimeoutRef.current) {
            clearTimeout(requestTimeoutRef.current);
            requestTimeoutRef.current = null;
        }

        if (componentMountedRef.current) {
            setRequestState(prev => ({
                ...prev,
                isProcessing: false,
                requestStartTime: Date.now() // Keep timestamp for duplicate detection
            }));
        }
    }, []);

    /**
     * Validate redemption code with duplicate request prevention
     */
    const validateCode = useCallback(async (codeToValidate) => {
        if (!codeToValidate || codeToValidate.length < 3) return;

        // Check for duplicate requests
        const blockCheck = shouldBlockRequest('validate', codeToValidate);
        if (blockCheck.blocked) {
            console.log('Validation request blocked:', blockCheck.reason);
            return;
        }

        // Start request tracking
        const requestKey = startRequestTracking('validate', codeToValidate);

        setIsValidating(true);
        setError(null);
        setValidationResult(null);

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        try {
            const result = await redemptionService.validateCode(codeToValidate);
            console.log('🔍 validateCode result:', result);

            // Check if component is still mounted
            if (!componentMountedRef.current) {
                console.log('❌ Component unmounted, skipping result processing');
                return;
            }

            console.log('✅ Component still mounted, processing result...');

            // End request tracking immediately after getting result
            if (componentMountedRef.current) {
                setIsValidating(false);
                endRequestTracking();
            }

            if (result.success) {
                console.log('🎉 Validation successful!');
                setValidationResult(result.data);

                // If validation successful and preview enabled, get preview
                if (showPreview) {
                    console.log('🎯 About to call getPreview, showPreview:', showPreview);
                    try {
                        await getPreview(codeToValidate);
                        console.log('✅ getPreview completed successfully');
                    } catch (previewError) {
                        console.error('❌ getPreview failed:', previewError);
                    }
                } else {
                    console.log('❌ showPreview is false, skipping preview');
                }

                Analytics.track('redemption_code_validated', {
                    location,
                    userId: user?.id,
                    codeLength: codeToValidate.length,
                    isValid: true,
                    fromCache: result.fromCache
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
            // Check if component is still mounted
            if (!componentMountedRef.current) return;

            // Don't handle aborted requests
            if (err.name === 'AbortError') return;

            const errorCode = err.response?.data?.code || 'validationFailed';
            const errorParams = err.response?.data?.params || {};
            setError({
                error: formatError(errorCode, errorParams),
                errorCode: errorCode.toUpperCase()
            });
        } finally {
            // Only cleanup if not already done (for error cases)
            if (componentMountedRef.current && requestState.isProcessing) {
                setIsValidating(false);
                endRequestTracking();
            }
            abortControllerRef.current = null;
        }
    }, [showPreview, location, user?.id, formatError, shouldBlockRequest, startRequestTracking, endRequestTracking, requestState.lastRequestKey]);

    /**
     * Get redemption preview with duplicate request prevention
     */
    const getPreview = useCallback(async (codeToPreview) => {
        console.log('🎬 getPreview called with:', codeToPreview);
        console.log('🔍 componentMountedRef.current:', componentMountedRef.current);

        // Check for duplicate requests
        const blockCheck = shouldBlockRequest('preview', codeToPreview);
        console.log('🚦 Block check result:', blockCheck);
        if (blockCheck.blocked) {
            console.log('Preview request blocked:', blockCheck.reason);
            return;
        }

        try {
            const result = await redemptionService.previewRedemption(codeToPreview);

            // 🔍 調試：記錄 getPreview 的結果
            console.log('🔍 getPreview result:', {
                success: result.success,
                hasData: !!result.data,
                dataKeys: result.data ? Object.keys(result.data) : 'no data',
                fullResult: result
            });

            // Check if component is still mounted
            if (!componentMountedRef.current) return;

            if (result.success) {
                console.log('✅ result.success is true, calling setPreview');
                console.log('🔍 About to call setPreview with:', result.data);

                // 強制清除錯誤狀態並設置預覽數據
                setError(null);
                setTimeout(() => {
                    setPreview(result.data);
                    onPreviewSuccess?.(result.data);
                }, 0);  // 使用 setTimeout 確保狀態更新順序

                Analytics.track('redemption_preview_loaded', {
                    location,
                    userId: user?.id,
                    benefitType: result.data.benefits?.type,
                    discountAmount: result.data.benefits?.discountAmount
                });
            } else {
                console.log('❌ result.success is false, calling setError');
                console.log('🔍 Error result:', result);
                setError(result);
            }
        } catch (err) {
            console.log('❌ getPreview catch block executed:', err);

            // Check if component is still mounted
            if (!componentMountedRef.current) return;

            // Don't handle aborted requests
            if (err.name === 'AbortError') return;

            const errorCode = err.response?.data?.code || 'previewFailed';
            const errorParams = err.response?.data?.params || {};
            console.log('🔍 Setting error in catch block:', { errorCode, errorParams });
            setError({
                error: formatError(errorCode, errorParams),
                errorCode: errorCode.toUpperCase()
            });
        }
    }, [location, user?.id, onPreviewSuccess, formatError, shouldBlockRequest]);

    /**
     * Handle code input change
     */
    const handleCodeChange = (e) => {
        const newCode = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        setCode(newCode);
        setShowSuccess(false);
    };

    /**
     * Handle form submission (manual validation and redemption)
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Enhanced blocking conditions
        if (!code.trim() || isValidating || isRedeeming || requestState.isProcessing) {
            return;
        }

        // If no validation result available, validate first
        if (!validationResult) {
            await validateCode(code.trim());
            return;
        }

        // If already validated, proceed to redeem
        await redeemCode();
    };

    /**
     * Redeem the code with duplicate request prevention
     */
    const redeemCode = async () => {
        if (!code.trim()) return;

        // Check for duplicate requests
        const blockCheck = shouldBlockRequest('redeem', code.trim());
        if (blockCheck.blocked) {
            console.log('Redemption request blocked:', blockCheck.reason);
            return;
        }

        // Start request tracking
        const requestKey = startRequestTracking('redeem', code.trim());

        setIsRedeeming(true);
        setError(null);

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        try {
            const result = await redemptionService.redeemCode(code.trim(), true);

            // Check if component is still mounted and this is the current request
            if (!componentMountedRef.current || requestState.lastRequestKey !== requestKey) {
                return;
            }

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
                setTimeout(() => {
                    if (componentMountedRef.current) {
                        setShowSuccess(false);
                    }
                }, 3000);
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
            // Check if component is still mounted
            if (!componentMountedRef.current) return;

            // Don't handle aborted requests
            if (err.name === 'AbortError') return;

            const errorResult = {
                error: t('redemption.errors.redemptionFailed'),
                errorCode: 'REDEMPTION_ERROR'
            };
            setError(errorResult);
            onRedemptionError?.(errorResult);
        } finally {
            if (componentMountedRef.current) {
                setIsRedeeming(false);
                endRequestTracking();
            }
            abortControllerRef.current = null;
        }
    };

    /**
     * Get input status class
     */
    const getInputStatusClass = () => {
        if (error) return 'redemption-input--error';
        if (validationResult || preview) return 'redemption-input--success';
        if (isValidating || requestState.isProcessing) return 'redemption-input--processing';
        return '';
    };

    /**
     * Get button status class
     */
    const getButtonStatusClass = () => {
        if (requestState.isProcessing || isValidating || isRedeeming) {
            return 'redemption-submit-btn--processing';
        }
        return '';
    };

    /**
     * Get button text based on state with enhanced processing indicators
     */
    const getButtonText = () => {
        if (isRedeeming) return t('redemption.redeeming');
        if (isValidating) return t('redemption.validating');
        if (requestState.isProcessing) {
            switch (requestState.operationType) {
                case 'validate': return t('redemption.validating');
                case 'preview': return t('redemption.loadingPreview');
                case 'redeem': return t('redemption.redeeming');
                default: return t('redemption.processing');
            }
        }
        if (validationResult && (!showPreview || preview)) return t('redemption.redeem');
        return t('redemption.validate');
    };

    /**
     * Check if button should be disabled
     */
    const isButtonDisabled = () => {
        return !code.trim() ||
            isValidating ||
            isRedeeming ||
            requestState.isProcessing ||
            disabled;
    };

    /**
     * Format preview benefits for display
     */
    const formatPreviewBenefits = (benefits) => {
        if (!benefits) {
            console.log('🔍 formatPreviewBenefits: benefits is null/undefined');
            return '';
        }

        console.log('🔍 formatPreviewBenefits input:', benefits);
        const formatted = formatBenefitPreview(benefits);
        console.log('🔍 formatBenefitPreview result:', formatted);

        if (!formatted || !formatted.title) {
            console.log('❌ formatBenefitPreview returned no title:', formatted);
            return '';
        }

        console.log('✅ formatPreviewBenefits returning title:', formatted.title);
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
                            disabled={disabled || isRedeeming || requestState.isProcessing}
                            autoFocus={autoFocus}
                            maxLength={20}
                            autoComplete="off"
                            spellCheck="false"
                        />

                        {(isValidating || requestState.isProcessing) && (
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
                        className={`redemption-submit-btn ${getButtonStatusClass()}`}
                        disabled={isButtonDisabled()}
                    >
                        {(isRedeeming || requestState.isProcessing) ? (
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