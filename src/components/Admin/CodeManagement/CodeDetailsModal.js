/**
 * CodeDetailsModal - Detailed view and editing for individual redemption codes
 * 
 * Features:
 * - Comprehensive code information display
 * - Inline editing capabilities
 * - Usage statistics and history
 * - Status management
 * - Audit trail display
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './CodeDetailsModal.css';
import LoadingSpinner from '../../Common/LoadingSpinner';
import ErrorDisplay from '../../Common/ErrorDisplay';
import AdminRedemptionService from '../../../services/adminRedemptionService';
import { systemLogger } from '../../../utils/logger';

const CodeDetailsModal = ({ code, onClose, onUpdate }) => {
    const { t } = useTranslation();

    // State management
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form data for editing
    const [formData, setFormData] = useState({
        isActive: code.isActive,
        expiresAt: code.expiresAt ? new Date(code.expiresAt).toISOString().split('T')[0] : '',
        activatesAt: code.activatesAt ? new Date(code.activatesAt).toISOString().split('T')[0] : '',
        maxTotalUses: code.maxTotalUses,
        maxUsesPerUser: code.maxUsesPerUser,
        campaignName: code.campaignName || '',
        internalNotes: code.internalNotes || '',
        eligibilityType: code.eligibilityType,
        eligiblePlans: code.eligiblePlans || [],
        requiresPaymentMethod: code.requiresPaymentMethod,
        allowStacking: code.allowStacking,
        stackingGroup: code.stackingGroup || ''
    });

    // Validation errors
    const [validationErrors, setValidationErrors] = useState({});

    /**
     * Handle form field changes
     */
    const handleFieldChange = useCallback((field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear validation error for this field
        if (validationErrors[field]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    }, [validationErrors]);

    /**
     * Validate form data
     */
    const validateForm = useCallback(() => {
        const errors = {};

        if (!formData.expiresAt) {
            errors.expiresAt = t('admin.codeDetails.validation.expirationRequired');
        } else {
            const expirationDate = new Date(formData.expiresAt);
            const now = new Date();
            if (expirationDate <= now) {
                errors.expiresAt = t('admin.codeDetails.validation.expirationInPast');
            }
        }

        if (formData.activatesAt) {
            const activationDate = new Date(formData.activatesAt);
            const expirationDate = new Date(formData.expiresAt);
            if (activationDate >= expirationDate) {
                errors.activatesAt = t('admin.codeDetails.validation.activationAfterExpiration');
            }
        }

        if (!formData.maxTotalUses || formData.maxTotalUses <= 0) {
            errors.maxTotalUses = t('admin.codeDetails.validation.invalidTotalUses');
        }

        if (!formData.maxUsesPerUser || formData.maxUsesPerUser <= 0) {
            errors.maxUsesPerUser = t('admin.codeDetails.validation.invalidUserUses');
        }

        if (formData.maxUsesPerUser > formData.maxTotalUses) {
            errors.maxUsesPerUser = t('admin.codeDetails.validation.userUsesExceedsTotal');
        }

        if (formData.eligibilityType === 'SPECIFIC_PLANS' && (!formData.eligiblePlans || formData.eligiblePlans.length === 0)) {
            errors.eligiblePlans = t('admin.codeDetails.validation.plansRequired');
        }

        if (!formData.campaignName || formData.campaignName.trim().length < 3) {
            errors.campaignName = t('admin.codeDetails.validation.campaignNameRequired');
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }, [formData, t]);

    /**
     * Save changes
     */
    const saveChanges = useCallback(async () => {
        if (!validateForm()) {
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const updates = {
                isActive: formData.isActive,
                expiresAt: formData.expiresAt,
                activatesAt: formData.activatesAt || null,
                maxTotalUses: formData.maxTotalUses,
                maxUsesPerUser: formData.maxUsesPerUser,
                campaignName: formData.campaignName,
                internalNotes: formData.internalNotes,
                eligibilityType: formData.eligibilityType,
                eligiblePlans: formData.eligibilityType === 'SPECIFIC_PLANS' ? formData.eligiblePlans : null,
                requiresPaymentMethod: formData.requiresPaymentMethod,
                allowStacking: formData.allowStacking,
                stackingGroup: formData.allowStacking ? formData.stackingGroup : null
            };

            systemLogger.info('Updating code details', {
                codeId: code.id,
                updates: Object.keys(updates)
            });

            const response = await AdminRedemptionService.updateCode(code.id, updates);

            if (response.success) {
                setEditMode(false);
                onUpdate();
                systemLogger.info('Code details updated successfully', { codeId: code.id });
            } else {
                throw new Error(response.error || 'Update failed');
            }
        } catch (err) {
            systemLogger.error('Failed to update code details:', err);
            setError(err.message || 'Update failed');
        } finally {
            setSaving(false);
        }
    }, [formData, validateForm, code.id, onUpdate]);

    /**
     * Cancel editing
     */
    const cancelEdit = useCallback(() => {
        setFormData({
            isActive: code.isActive,
            expiresAt: code.expiresAt ? new Date(code.expiresAt).toISOString().split('T')[0] : '',
            activatesAt: code.activatesAt ? new Date(code.activatesAt).toISOString().split('T')[0] : '',
            maxTotalUses: code.maxTotalUses,
            maxUsesPerUser: code.maxUsesPerUser,
            campaignName: code.campaignName || '',
            internalNotes: code.internalNotes || '',
            eligibilityType: code.eligibilityType,
            eligiblePlans: code.eligiblePlans || [],
            requiresPaymentMethod: code.requiresPaymentMethod,
            allowStacking: code.allowStacking,
            stackingGroup: code.stackingGroup || ''
        });
        setValidationErrors({});
        setEditMode(false);
    }, [code]);

    /**
     * Format date for display
     */
    const formatDate = useCallback((date) => {
        if (!date) return '-';
        return new Date(date).toLocaleString();
    }, []);

    /**
     * Get status badge class
     */
    const getStatusBadgeClass = useCallback((status) => {
        const baseClass = 'status-badge';
        switch (status) {
            case 'active': return `${baseClass} status-active`;
            case 'inactive': return `${baseClass} status-inactive`;
            case 'expired': return `${baseClass} status-expired`;
            case 'exhausted': return `${baseClass} status-exhausted`;
            case 'scheduled': return `${baseClass} status-scheduled`;
            default: return baseClass;
        }
    }, []);

    /**
     * Get configuration value description
     */
    const getConfigurationValue = useCallback(() => {
        switch (code.codeType) {
            case 'PERCENTAGE_DISCOUNT':
                return `${code.discountPercentage}% ${t('admin.codeDetails.discount')}`;
            case 'FIXED_AMOUNT_DISCOUNT':
                return `${code.discountCurrency} ${code.discountAmount} ${t('admin.codeDetails.discount')}`;
            case 'TIME_EXTENSION':
                return `${code.extensionDuration} ${code.extensionUnit.toLowerCase()}(s) ${t('admin.codeDetails.extension')}`;
            default:
                return t('admin.codeDetails.unknown');
        }
    }, [code, t]);

    /**
     * Get eligibility description
     */
    const getEligibilityDescription = useCallback(() => {
        switch (code.eligibilityType) {
            case 'ALL_USERS':
                return t('admin.codeDetails.eligibility.allUsers');
            case 'NEW_CUSTOMERS_ONLY':
                return t('admin.codeDetails.eligibility.newCustomers');
            case 'SPECIFIC_PLANS':
                return t('admin.codeDetails.eligibility.specificPlans', {
                    plans: (code.eligiblePlans || []).join(', ')
                });
            case 'FIRST_TIME_USERS':
                return t('admin.codeDetails.eligibility.firstTime');
            default:
                return t('admin.codeDetails.unknown');
        }
    }, [code, t]);

    return (
        <div className="modal-overlay">
            <div className="code-details-modal">
                <div className="modal-header">
                    <div className="header-info">
                        <h2>{t('admin.codeDetails.title')}</h2>
                        <span className="code-value">{code.code}</span>
                    </div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="modal-error">
                        <ErrorDisplay
                            error={error}
                            onRetry={() => setError(null)}
                        />
                    </div>
                )}

                <div className="modal-content">
                    {/* Basic Information */}
                    <div className="info-section">
                        <div className="section-header">
                            <h3>{t('admin.codeDetails.basicInfo')}</h3>
                            {!editMode && (
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setEditMode(true)}
                                >
                                    {t('admin.codeDetails.edit')}
                                </button>
                            )}
                        </div>

                        <div className="info-grid">
                            <div className="info-item">
                                <label>{t('admin.codeDetails.code')}</label>
                                <span className="code-display">{code.code}</span>
                            </div>

                            <div className="info-item">
                                <label>{t('admin.codeDetails.type')}</label>
                                <span className={`type-badge type-${code.codeType.toLowerCase()}`}>
                                    {t(`admin.codes.types.${code.codeType.toLowerCase()}`)}
                                </span>
                            </div>

                            <div className="info-item">
                                <label>{t('admin.codeDetails.value')}</label>
                                <span>{getConfigurationValue()}</span>
                            </div>

                            <div className="info-item">
                                <label>{t('admin.codeDetails.status')}</label>
                                <span className={getStatusBadgeClass(code.status)}>
                                    {t(`admin.codes.statuses.${code.status}`)}
                                </span>
                            </div>

                            <div className="info-item">
                                <label>{t('admin.codeDetails.prefix')}</label>
                                <span>{code.prefix || '-'}</span>
                            </div>

                            <div className="info-item">
                                <label>{t('admin.codeDetails.created')}</label>
                                <span>{formatDate(code.createdAt)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Configuration */}
                    <div className="info-section">
                        <h3>{t('admin.codeDetails.configuration')}</h3>

                        {editMode ? (
                            <div className="edit-form">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>{t('admin.codeDetails.campaignName')} *</label>
                                        <input
                                            type="text"
                                            value={formData.campaignName}
                                            onChange={(e) => handleFieldChange('campaignName', e.target.value)}
                                            className={validationErrors.campaignName ? 'error' : ''}
                                        />
                                        {validationErrors.campaignName && (
                                            <span className="error-message">{validationErrors.campaignName}</span>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.isActive}
                                                onChange={(e) => handleFieldChange('isActive', e.target.checked)}
                                            />
                                            {t('admin.codeDetails.isActive')}
                                        </label>
                                    </div>

                                    <div className="form-group">
                                        <label>{t('admin.codeDetails.expiresAt')} *</label>
                                        <input
                                            type="date"
                                            value={formData.expiresAt}
                                            onChange={(e) => handleFieldChange('expiresAt', e.target.value)}
                                            className={validationErrors.expiresAt ? 'error' : ''}
                                        />
                                        {validationErrors.expiresAt && (
                                            <span className="error-message">{validationErrors.expiresAt}</span>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label>{t('admin.codeDetails.activatesAt')}</label>
                                        <input
                                            type="date"
                                            value={formData.activatesAt}
                                            onChange={(e) => handleFieldChange('activatesAt', e.target.value)}
                                            className={validationErrors.activatesAt ? 'error' : ''}
                                        />
                                        {validationErrors.activatesAt && (
                                            <span className="error-message">{validationErrors.activatesAt}</span>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label>{t('admin.codeDetails.maxTotalUses')} *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.maxTotalUses}
                                            onChange={(e) => handleFieldChange('maxTotalUses', parseInt(e.target.value))}
                                            className={validationErrors.maxTotalUses ? 'error' : ''}
                                        />
                                        {validationErrors.maxTotalUses && (
                                            <span className="error-message">{validationErrors.maxTotalUses}</span>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label>{t('admin.codeDetails.maxUsesPerUser')} *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.maxUsesPerUser}
                                            onChange={(e) => handleFieldChange('maxUsesPerUser', parseInt(e.target.value))}
                                            className={validationErrors.maxUsesPerUser ? 'error' : ''}
                                        />
                                        {validationErrors.maxUsesPerUser && (
                                            <span className="error-message">{validationErrors.maxUsesPerUser}</span>
                                        )}
                                    </div>

                                    <div className="form-group full-width">
                                        <label>{t('admin.codeDetails.eligibilityType')}</label>
                                        <select
                                            value={formData.eligibilityType}
                                            onChange={(e) => handleFieldChange('eligibilityType', e.target.value)}
                                        >
                                            <option value="ALL_USERS">{t('admin.codeDetails.eligibility.allUsers')}</option>
                                            <option value="NEW_CUSTOMERS_ONLY">{t('admin.codeDetails.eligibility.newCustomers')}</option>
                                            <option value="SPECIFIC_PLANS">{t('admin.codeDetails.eligibility.specificPlansOption')}</option>
                                            <option value="FIRST_TIME_USERS">{t('admin.codeDetails.eligibility.firstTime')}</option>
                                        </select>
                                    </div>

                                    {formData.eligibilityType === 'SPECIFIC_PLANS' && (
                                        <div className="form-group full-width">
                                            <label>{t('admin.codeDetails.eligiblePlans')} *</label>
                                            <div className="checkbox-group">
                                                <label className="checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.eligiblePlans.includes('free')}
                                                        onChange={(e) => {
                                                            const plans = e.target.checked
                                                                ? [...formData.eligiblePlans, 'free']
                                                                : formData.eligiblePlans.filter(p => p !== 'free');
                                                            handleFieldChange('eligiblePlans', plans);
                                                        }}
                                                    />
                                                    {t('admin.codeDetails.plans.free')}
                                                </label>
                                                <label className="checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.eligiblePlans.includes('pro')}
                                                        onChange={(e) => {
                                                            const plans = e.target.checked
                                                                ? [...formData.eligiblePlans, 'pro']
                                                                : formData.eligiblePlans.filter(p => p !== 'pro');
                                                            handleFieldChange('eligiblePlans', plans);
                                                        }}
                                                    />
                                                    {t('admin.codeDetails.plans.pro')}
                                                </label>
                                            </div>
                                            {validationErrors.eligiblePlans && (
                                                <span className="error-message">{validationErrors.eligiblePlans}</span>
                                            )}
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.requiresPaymentMethod}
                                                onChange={(e) => handleFieldChange('requiresPaymentMethod', e.target.checked)}
                                            />
                                            {t('admin.codeDetails.requiresPaymentMethod')}
                                        </label>
                                    </div>

                                    <div className="form-group">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.allowStacking}
                                                onChange={(e) => handleFieldChange('allowStacking', e.target.checked)}
                                            />
                                            {t('admin.codeDetails.allowStacking')}
                                        </label>
                                    </div>

                                    {formData.allowStacking && (
                                        <div className="form-group">
                                            <label>{t('admin.codeDetails.stackingGroup')}</label>
                                            <input
                                                type="text"
                                                value={formData.stackingGroup}
                                                onChange={(e) => handleFieldChange('stackingGroup', e.target.value)}
                                                placeholder={t('admin.codeDetails.stackingGroupPlaceholder')}
                                            />
                                        </div>
                                    )}

                                    <div className="form-group full-width">
                                        <label>{t('admin.codeDetails.internalNotes')}</label>
                                        <textarea
                                            value={formData.internalNotes}
                                            onChange={(e) => handleFieldChange('internalNotes', e.target.value)}
                                            placeholder={t('admin.codeDetails.internalNotesPlaceholder')}
                                            rows="3"
                                        />
                                    </div>
                                </div>

                                <div className="edit-actions">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={cancelEdit}
                                        disabled={saving}
                                    >
                                        {t('admin.codeDetails.cancel')}
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={saveChanges}
                                        disabled={saving || Object.keys(validationErrors).length > 0}
                                    >
                                        {saving ? <LoadingSpinner size="small" /> : t('admin.codeDetails.save')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>{t('admin.codeDetails.campaignName')}</label>
                                    <span>{code.campaignName || '-'}</span>
                                </div>

                                <div className="info-item">
                                    <label>{t('admin.codeDetails.eligibilityLabel')}</label>
                                    <span>{getEligibilityDescription()}</span>
                                </div>

                                <div className="info-item">
                                    <label>{t('admin.codeDetails.expiresAt')}</label>
                                    <span>{formatDate(code.expiresAt)}</span>
                                </div>

                                <div className="info-item">
                                    <label>{t('admin.codeDetails.activatesAt')}</label>
                                    <span>{formatDate(code.activatesAt)}</span>
                                </div>

                                <div className="info-item">
                                    <label>{t('admin.codeDetails.usageLimits')}</label>
                                    <span>{code.maxUsesPerUser} per user, {code.maxTotalUses} total</span>
                                </div>

                                <div className="info-item">
                                    <label>{t('admin.codeDetails.paymentRequired')}</label>
                                    <span>{code.requiresPaymentMethod ? t('admin.codeDetails.yes') : t('admin.codeDetails.no')}</span>
                                </div>

                                <div className="info-item">
                                    <label>{t('admin.codeDetails.stacking')}</label>
                                    <span>
                                        {code.allowStacking ?
                                            (code.stackingGroup ? `${t('admin.codeDetails.group')}: ${code.stackingGroup}` : t('admin.codeDetails.allowed')) :
                                            t('admin.codeDetails.notAllowed')
                                        }
                                    </span>
                                </div>

                                {code.internalNotes && (
                                    <div className="info-item full-width">
                                        <label>{t('admin.codeDetails.internalNotes')}</label>
                                        <span className="notes-text">{code.internalNotes}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Usage Statistics */}
                    <div className="info-section">
                        <h3>{t('admin.codeDetails.usageStats')}</h3>

                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-value">{code.timesUsed}</div>
                                <div className="stat-label">{t('admin.codeDetails.timesUsed')}</div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-value">{code.maxTotalUses - code.timesUsed}</div>
                                <div className="stat-label">{t('admin.codeDetails.remaining')}</div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-value">{(code.usagePercentage || 0).toFixed(1)}%</div>
                                <div className="stat-label">{t('admin.codeDetails.usageRate')}</div>
                            </div>

                            {code.usageStats && (
                                <div className="stat-card">
                                    <div className="stat-value">{code.usageStats.uniqueUsers}</div>
                                    <div className="stat-label">{t('admin.codeDetails.uniqueUsers')}</div>
                                </div>
                            )}
                        </div>

                        {code.usagePercentage > 0 && (
                            <div className="usage-bar-container">
                                <div className="usage-bar">
                                    <div
                                        className="usage-fill"
                                        style={{ width: `${Math.min(code.usagePercentage, 100)}%` }}
                                    />
                                </div>
                                <span className="usage-text">
                                    {code.timesUsed} / {code.maxTotalUses} ({(code.usagePercentage || 0).toFixed(1)}%)
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Metadata */}
                    {code.metadata && (
                        <div className="info-section">
                            <h3>{t('admin.codeDetails.metadata')}</h3>

                            <div className="metadata-display">
                                <pre>{JSON.stringify(code.metadata, null, 2)}</pre>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        {t('admin.codeDetails.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CodeDetailsModal;