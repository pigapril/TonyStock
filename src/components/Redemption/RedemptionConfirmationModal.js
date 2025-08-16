/**
 * RedemptionConfirmationModal Component
 * 
 * Modal for confirming code redemption with benefit display
 * Features:
 * - Clear benefit display with detailed breakdown
 * - Payment method requirement handling and warnings
 * - Terms acceptance and confirmation flow
 * - Responsive design with accessibility support
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Auth/useAuth';
import { Dialog } from '../Common/Dialog/Dialog';
import { useRedemptionFormatting } from '../../hooks/useRedemptionFormatting';
import LoadingSpinner from '../Common/LoadingSpinner';
import redemptionService from '../../services/redemptionService';
import { Analytics } from '../../utils/analytics';
import './RedemptionConfirmationModal.css';

export const RedemptionConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    onCancel,
    code,
    preview,
    isRedeeming = false,
    requiresPaymentMethod = false,
    requiresTermsAcceptance = true
}) => {
    const { t } = useTranslation();
    const { formatters, formatBenefitPreview } = useRedemptionFormatting();
    const { user } = useAuth();
    
    // Component state
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [paymentMethodAcknowledged, setPaymentMethodAcknowledged] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setTermsAccepted(false);
            setPaymentMethodAcknowledged(false);
            setIsProcessing(false);
            
            Analytics.track('redemption_confirmation_modal_opened', {
                userId: user?.id,
                code: code?.substring(0, 4) + '***',
                benefitType: preview?.benefits?.type,
                requiresPaymentMethod
            });
        }
    }, [isOpen, code, preview, requiresPaymentMethod, user?.id]);

    /**
     * Handle confirmation
     */
    const handleConfirm = async () => {
        if (!canConfirm()) return;

        setIsProcessing(true);

        try {
            Analytics.track('redemption_confirmation_submitted', {
                userId: user?.id,
                code: code?.substring(0, 4) + '***',
                termsAccepted,
                paymentMethodAcknowledged
            });

            await onConfirm?.();
        } catch (error) {
            console.error('Confirmation error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Handle cancellation
     */
    const handleCancel = () => {
        Analytics.track('redemption_confirmation_cancelled', {
            userId: user?.id,
            code: code?.substring(0, 4) + '***'
        });

        onCancel?.();
        onClose?.();
    };

    /**
     * Check if confirmation is allowed
     */
    const canConfirm = () => {
        if (isProcessing || isRedeeming) return false;
        if (requiresTermsAcceptance && !termsAccepted) return false;
        if (requiresPaymentMethod && !paymentMethodAcknowledged) return false;
        return true;
    };

    /**
     * Format benefit display
     */
    const formatBenefitDisplay = (benefits) => {
        if (!benefits) return null;
        return formatBenefitPreview(benefits);
    };

    /**
     * Get estimated value display
     */
    const getEstimatedValue = (benefits) => {
        if (!benefits?.estimatedValue) return null;

        return {
            amount: benefits.estimatedValue.amount,
            currency: benefits.estimatedValue.currency || 'TWD',
            formatted: formatters.estimatedValue(
                benefits.estimatedValue.amount, 
                benefits.estimatedValue.currency || 'TWD'
            )
        };
    };

    const benefitDisplay = formatBenefitDisplay(preview?.benefits);
    const estimatedValue = getEstimatedValue(preview?.benefits);

    if (!isOpen) return null;

    return (
        <Dialog
            open={isOpen}
            onClose={handleCancel}
            title={t('redemption.confirmation.title')}
            titleClassName="redemption-confirmation-title"
        >
            <div className="redemption-confirmation-modal">
                {/* Code Display */}
                <div className="redemption-confirmation-code">
                    <div className="redemption-confirmation-code-label">
                        {t('redemption.confirmation.codeLabel')}
                    </div>
                    <div className="redemption-confirmation-code-value">
                        {code}
                    </div>
                </div>

                {/* Benefits Display */}
                {benefitDisplay && (
                    <div className="redemption-confirmation-benefits">
                        <h3 className="redemption-confirmation-benefits-title">
                            {t('redemption.confirmation.benefitsTitle')}
                        </h3>
                        
                        <div className="redemption-confirmation-benefit-card">
                            <div className="redemption-confirmation-benefit-icon">
                                {benefitDisplay.icon}
                            </div>
                            <div className="redemption-confirmation-benefit-content">
                                <div className="redemption-confirmation-benefit-title">
                                    {benefitDisplay.title}
                                </div>
                                <div className="redemption-confirmation-benefit-description">
                                    {benefitDisplay.description}
                                </div>
                                <div className="redemption-confirmation-benefit-highlight">
                                    {benefitDisplay.highlight}
                                </div>
                            </div>
                        </div>

                        {/* Estimated Value */}
                        {estimatedValue && (
                            <div className="redemption-confirmation-value">
                                <span className="redemption-confirmation-value-label">
                                    {t('redemption.confirmation.valueLabel')}
                                </span>
                                <span className="redemption-confirmation-value-amount">
                                    {estimatedValue.formatted}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Payment Method Warning */}
                {requiresPaymentMethod && (
                    <div className="redemption-confirmation-warning">
                        <div className="redemption-confirmation-warning-icon">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="redemption-confirmation-warning-content">
                            <div className="redemption-confirmation-warning-title">
                                {t('redemption.confirmation.paymentMethod.title')}
                            </div>
                            <div className="redemption-confirmation-warning-description">
                                {t('redemption.confirmation.paymentMethod.description')}
                            </div>
                        </div>
                    </div>
                )}

                {/* Checkboxes */}
                <div className="redemption-confirmation-checkboxes">
                    {/* Payment Method Acknowledgment */}
                    {requiresPaymentMethod && (
                        <label className="redemption-confirmation-checkbox">
                            <input
                                type="checkbox"
                                checked={paymentMethodAcknowledged}
                                onChange={(e) => setPaymentMethodAcknowledged(e.target.checked)}
                                disabled={isProcessing || isRedeeming}
                            />
                            <span className="redemption-confirmation-checkbox-text">
                                {t('redemption.confirmation.paymentMethod.acknowledge')}
                            </span>
                        </label>
                    )}

                    {/* Terms Acceptance */}
                    {requiresTermsAcceptance && (
                        <label className="redemption-confirmation-checkbox">
                            <input
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                disabled={isProcessing || isRedeeming}
                            />
                            <span className="redemption-confirmation-checkbox-text">
                                {t('redemption.confirmation.terms.accept')}
                                <a 
                                    href="/terms" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="redemption-confirmation-terms-link"
                                >
                                    {t('redemption.confirmation.terms.link')}
                                </a>
                            </span>
                        </label>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="redemption-confirmation-actions">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="redemption-confirmation-cancel-btn"
                        disabled={isProcessing || isRedeeming}
                    >
                        {t('redemption.confirmation.cancel')}
                    </button>
                    
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="redemption-confirmation-confirm-btn"
                        disabled={!canConfirm()}
                    >
                        {isProcessing || isRedeeming ? (
                            <>
                                <LoadingSpinner size="small" />
                                {t('redemption.confirmation.processing')}
                            </>
                        ) : (
                            t('redemption.confirmation.confirm')
                        )}
                    </button>
                </div>

                {/* Additional Info */}
                <div className="redemption-confirmation-info">
                    <p className="redemption-confirmation-info-text">
                        {t('redemption.confirmation.info')}
                    </p>
                </div>
            </div>
        </Dialog>
    );
};

export default RedemptionConfirmationModal;