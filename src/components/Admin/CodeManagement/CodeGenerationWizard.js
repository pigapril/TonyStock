/**
 * CodeGenerationWizard - Step-by-step code generation interface
 * 
 * Features:
 * - Multi-step wizard interface
 * - Form validation for all configuration options
 * - Preview and bulk generation capabilities
 * - Real-time validation feedback
 * - Configuration templates
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './CodeGenerationWizard.css';
import LoadingSpinner from '../../Common/LoadingSpinner';
import ErrorDisplay from '../../Common/ErrorDisplay';
import AdminRedemptionService from '../../../services/adminRedemptionService';
import { systemLogger } from '../../../utils/logger';

const CodeGenerationWizard = ({ onClose, onSuccess }) => {
    const { t } = useTranslation();
    
    // Wizard state
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    
    // Form data
    const [formData, setFormData] = useState({
        // Step 1: Basic Configuration
        codeType: 'PERCENTAGE_DISCOUNT',
        discountPercentage: 10,
        discountAmount: 100,
        discountCurrency: 'TWD',
        extensionDuration: 30,
        extensionUnit: 'DAY',
        targetPlan: 'pro',
        
        // Step 2: Usage Limits and Eligibility
        maxTotalUses: 100,
        maxUsesPerUser: 1,
        eligibilityType: 'ALL_USERS',
        eligiblePlans: [],
        requiresPaymentMethod: false,
        
        // Step 3: Stacking and Advanced Options
        allowStacking: false,
        stackingGroup: '',
        expiresAt: '',
        activatesAt: '',
        
        // Step 4: Administrative and Generation
        campaignName: '',
        internalNotes: '',
        prefix: '',
        codeLength: 12,
        count: 1,
        metadata: {}
    });
    
    // Preview data
    const [previewData, setPreviewData] = useState(null);
    const [generationResult, setGenerationResult] = useState(null);

    const steps = [
        {
            id: 1,
            title: t('admin.wizard.steps.basicConfig'),
            description: t('admin.wizard.steps.basicConfigDesc')
        },
        {
            id: 2,
            title: t('admin.wizard.steps.usageLimits'),
            description: t('admin.wizard.steps.usageLimitsDesc')
        },
        {
            id: 3,
            title: t('admin.wizard.steps.advanced'),
            description: t('admin.wizard.steps.advancedDesc')
        },
        {
            id: 4,
            title: t('admin.wizard.steps.review'),
            description: t('admin.wizard.steps.reviewDesc')
        }
    ];

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
     * Validate current step
     */
    const validateStep = useCallback((step) => {
        const errors = {};
        
        switch (step) {
            case 1:
                // Basic Configuration validation
                if (!formData.codeType) {
                    errors.codeType = t('admin.wizard.validation.codeTypeRequired');
                }
                
                if (formData.codeType === 'PERCENTAGE_DISCOUNT') {
                    if (!formData.discountPercentage || formData.discountPercentage <= 0 || formData.discountPercentage > 100) {
                        errors.discountPercentage = t('admin.wizard.validation.invalidPercentage');
                    }
                }
                
                if (formData.codeType === 'FIXED_AMOUNT_DISCOUNT') {
                    if (!formData.discountAmount || formData.discountAmount <= 0) {
                        errors.discountAmount = t('admin.wizard.validation.invalidAmount');
                    }
                }
                
                if (formData.codeType === 'TIME_EXTENSION') {
                    if (!formData.extensionDuration || formData.extensionDuration <= 0) {
                        errors.extensionDuration = t('admin.wizard.validation.invalidDuration');
                    }
                    if (!formData.extensionUnit) {
                        errors.extensionUnit = t('admin.wizard.validation.unitRequired');
                    }
                }
                break;
                
            case 2:
                // Usage Limits validation
                if (!formData.maxTotalUses || formData.maxTotalUses <= 0) {
                    errors.maxTotalUses = t('admin.wizard.validation.invalidTotalUses');
                }
                
                if (!formData.maxUsesPerUser || formData.maxUsesPerUser <= 0) {
                    errors.maxUsesPerUser = t('admin.wizard.validation.invalidUserUses');
                }
                
                if (formData.maxUsesPerUser > formData.maxTotalUses) {
                    errors.maxUsesPerUser = t('admin.wizard.validation.userUsesExceedsTotal');
                }
                
                if (formData.eligibilityType === 'SPECIFIC_PLANS' && (!formData.eligiblePlans || formData.eligiblePlans.length === 0)) {
                    errors.eligiblePlans = t('admin.wizard.validation.plansRequired');
                }
                break;
                
            case 3:
                // Advanced Options validation
                if (!formData.expiresAt) {
                    errors.expiresAt = t('admin.wizard.validation.expirationRequired');
                } else {
                    const expirationDate = new Date(formData.expiresAt);
                    const now = new Date();
                    if (expirationDate <= now) {
                        errors.expiresAt = t('admin.wizard.validation.expirationInPast');
                    }
                }
                
                if (formData.activatesAt) {
                    const activationDate = new Date(formData.activatesAt);
                    const expirationDate = new Date(formData.expiresAt);
                    if (activationDate >= expirationDate) {
                        errors.activatesAt = t('admin.wizard.validation.activationAfterExpiration');
                    }
                }
                
                if (formData.allowStacking && formData.stackingGroup && formData.stackingGroup.trim().length < 3) {
                    errors.stackingGroup = t('admin.wizard.validation.stackingGroupTooShort');
                }
                break;
                
            case 4:
                // Review and Generation validation
                if (!formData.campaignName || formData.campaignName.trim().length < 3) {
                    errors.campaignName = t('admin.wizard.validation.campaignNameRequired');
                }
                
                if (formData.count > 1 && (!formData.prefix || formData.prefix.trim().length < 2)) {
                    errors.prefix = t('admin.wizard.validation.prefixRequiredForBulk');
                }
                
                if (formData.count <= 0 || formData.count > 10000) {
                    errors.count = t('admin.wizard.validation.invalidCount');
                }
                
                if (formData.codeLength < 8 || formData.codeLength > 32) {
                    errors.codeLength = t('admin.wizard.validation.invalidCodeLength');
                }
                break;
        }
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }, [formData, t]);

    /**
     * Navigate to next step
     */
    const nextStep = useCallback(() => {
        if (validateStep(currentStep)) {
            if (currentStep < steps.length) {
                setCurrentStep(currentStep + 1);
                
                // Generate preview for review step
                if (currentStep === 3) {
                    generatePreview();
                }
            }
        }
    }, [currentStep, validateStep, steps.length]);

    /**
     * Navigate to previous step
     */
    const prevStep = useCallback(() => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    }, [currentStep]);

    /**
     * Generate preview of the configuration
     */
    const generatePreview = useCallback(() => {
        const preview = {
            configuration: {
                type: formData.codeType,
                value: getConfigurationValue(),
                usageLimits: `${formData.maxUsesPerUser} per user, ${formData.maxTotalUses} total`,
                eligibility: getEligibilityDescription(),
                expiration: new Date(formData.expiresAt).toLocaleDateString(),
                stacking: formData.allowStacking ? 
                    (formData.stackingGroup ? `Group: ${formData.stackingGroup}` : 'Allowed') : 
                    'Not allowed'
            },
            generation: {
                method: formData.count > 1 ? 'Bulk' : 'Single',
                count: formData.count,
                prefix: formData.prefix || 'None',
                codeLength: formData.codeLength,
                campaign: formData.campaignName
            },
            estimatedCodes: generateSampleCodes()
        };
        
        setPreviewData(preview);
    }, [formData]);

    /**
     * Get configuration value description
     */
    const getConfigurationValue = useCallback(() => {
        switch (formData.codeType) {
            case 'PERCENTAGE_DISCOUNT':
                return `${formData.discountPercentage}% discount`;
            case 'FIXED_AMOUNT_DISCOUNT':
                return `${formData.discountCurrency} ${formData.discountAmount} discount`;
            case 'TIME_EXTENSION':
                return `${formData.extensionDuration} ${formData.extensionUnit.toLowerCase()}(s) extension`;
            default:
                return 'Unknown';
        }
    }, [formData]);

    /**
     * Get eligibility description
     */
    const getEligibilityDescription = useCallback(() => {
        switch (formData.eligibilityType) {
            case 'ALL_USERS':
                return 'All users';
            case 'NEW_CUSTOMERS_ONLY':
                return 'New customers only';
            case 'SPECIFIC_PLANS':
                return `Users on: ${formData.eligiblePlans.join(', ')}`;
            case 'FIRST_TIME_USERS':
                return 'First-time code users';
            default:
                return 'Unknown';
        }
    }, [formData]);

    /**
     * Generate sample codes for preview
     */
    const generateSampleCodes = useCallback(() => {
        const samples = [];
        const sampleCount = Math.min(formData.count, 3);
        
        for (let i = 0; i < sampleCount; i++) {
            const randomSuffix = Math.random().toString(36).substring(2, 2 + (formData.codeLength - (formData.prefix?.length || 0))).toUpperCase();
            const code = formData.prefix ? `${formData.prefix}-${randomSuffix}` : randomSuffix;
            samples.push(code);
        }
        
        if (formData.count > 3) {
            samples.push(`... and ${formData.count - 3} more`);
        }
        
        return samples;
    }, [formData]);

    /**
     * Generate codes
     */
    const generateCodes = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Helper function to ensure valid numbers
            const ensureValidNumber = (value, defaultValue = 1) => {
                const num = typeof value === 'number' ? value : parseInt(value);
                return isNaN(num) || num <= 0 ? defaultValue : num;
            };

            // Prepare configuration
            const config = {
                codeType: formData.codeType,
                codeLength: ensureValidNumber(formData.codeLength, 12),
                prefix: (formData.count > 1 && formData.prefix) ? formData.prefix : undefined,
                
                // Type-specific configuration
                discountPercentage: formData.codeType === 'PERCENTAGE_DISCOUNT' ? ensureValidNumber(formData.discountPercentage, 10) : undefined,
                discountAmount: formData.codeType === 'FIXED_AMOUNT_DISCOUNT' ? ensureValidNumber(formData.discountAmount, 100) : undefined,
                discountCurrency: formData.codeType === 'FIXED_AMOUNT_DISCOUNT' ? formData.discountCurrency : undefined,
                extensionDuration: formData.codeType === 'TIME_EXTENSION' ? ensureValidNumber(formData.extensionDuration, 30) : undefined,
                extensionUnit: formData.codeType === 'TIME_EXTENSION' ? formData.extensionUnit : undefined,
                targetPlan: formData.targetPlan,
                
                // Usage limits
                maxTotalUses: ensureValidNumber(formData.maxTotalUses, 100),
                maxUsesPerUser: ensureValidNumber(formData.maxUsesPerUser, 1),
                
                // Eligibility
                eligibilityType: formData.eligibilityType,
                eligiblePlans: formData.eligibilityType === 'SPECIFIC_PLANS' ? formData.eligiblePlans : undefined,
                requiresPaymentMethod: formData.requiresPaymentMethod,
                
                // Stacking
                allowStacking: formData.allowStacking,
                stackingGroup: (formData.allowStacking && formData.stackingGroup) ? formData.stackingGroup : undefined,
                
                // Lifecycle
                expiresAt: formData.expiresAt,
                activatesAt: formData.activatesAt || undefined,
                
                // Administrative
                campaignName: formData.campaignName || undefined,
                internalNotes: formData.internalNotes || undefined,
                metadata: formData.metadata
            };
            
            systemLogger.info('Generating codes via wizard', {
                codeType: config.codeType,
                count: formData.count,
                campaignName: config.campaignName
            });
            
            const validCount = ensureValidNumber(formData.count, 1);
            const response = await AdminRedemptionService.generateCodes(config, validCount);
            
            if (response.success) {
                setGenerationResult(response.data);
                systemLogger.info('Code generation successful', {
                    count: formData.count,
                    generated: response.data.codes?.length || 1
                });
            } else {
                throw new Error(response.error || 'Code generation failed');
            }
        } catch (err) {
            systemLogger.error('Code generation failed:', err);
            setError(err.message || 'Code generation failed');
        } finally {
            setLoading(false);
        }
    }, [formData]);

    /**
     * Load configuration template
     */
    const loadTemplate = useCallback((templateName) => {
        const templates = {
            newCustomerDiscount: {
                codeType: 'PERCENTAGE_DISCOUNT',
                discountPercentage: 20,
                eligibilityType: 'NEW_CUSTOMERS_ONLY',
                maxTotalUses: 1000,
                maxUsesPerUser: 1,
                requiresPaymentMethod: true,
                campaignName: 'New Customer 20% Off'
            },
            timeExtension: {
                codeType: 'TIME_EXTENSION',
                extensionDuration: 30,
                extensionUnit: 'DAY',
                eligibilityType: 'ALL_USERS',
                maxTotalUses: 500,
                maxUsesPerUser: 1,
                campaignName: '30 Day Extension'
            },
            bulkDiscount: {
                codeType: 'FIXED_AMOUNT_DISCOUNT',
                discountAmount: 50,
                discountCurrency: 'TWD',
                eligibilityType: 'ALL_USERS',
                maxTotalUses: 10000,
                maxUsesPerUser: 1,
                count: 1000,
                prefix: 'BULK50',
                campaignName: 'Bulk 50 TWD Off'
            }
        };
        
        const template = templates[templateName];
        if (template) {
            setFormData(prev => ({
                ...prev,
                ...template
            }));
        }
    }, []);

    /**
     * Set default expiration date (30 days from now)
     */
    useEffect(() => {
        if (!formData.expiresAt) {
            const defaultExpiration = new Date();
            defaultExpiration.setDate(defaultExpiration.getDate() + 30);
            handleFieldChange('expiresAt', defaultExpiration.toISOString().split('T')[0]);
        }
    }, [formData.expiresAt, handleFieldChange]);

    if (generationResult) {
        return (
            <div className="wizard-overlay">
                <div className="wizard-modal wizard-success">
                    <div className="wizard-header">
                        <h2>{t('admin.wizard.success.title')}</h2>
                        <button className="close-btn" onClick={onClose}>×</button>
                    </div>
                    
                    <div className="wizard-content">
                        <div className="success-message">
                            <div className="success-icon">✓</div>
                            <p>{t('admin.wizard.success.message', { 
                                count: generationResult.codes?.length || 1 
                            })}</p>
                        </div>
                        
                        <div className="generation-summary">
                            <h3>{t('admin.wizard.success.summary')}</h3>
                            <div className="summary-grid">
                                <div className="summary-item">
                                    <label>{t('admin.wizard.success.campaign')}</label>
                                    <span>{formData.campaignName}</span>
                                </div>
                                <div className="summary-item">
                                    <label>{t('admin.wizard.success.type')}</label>
                                    <span>{t(`admin.codes.types.${formData.codeType.toLowerCase()}`)}</span>
                                </div>
                                <div className="summary-item">
                                    <label>{t('admin.wizard.success.generated')}</label>
                                    <span>{generationResult.codes?.length || 1}</span>
                                </div>
                                <div className="summary-item">
                                    <label>{t('admin.wizard.success.expires')}</label>
                                    <span>{new Date(formData.expiresAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                        
                        {generationResult.codes && generationResult.codes.length <= 10 && (
                            <div className="generated-codes">
                                <h3>{t('admin.wizard.success.codes')}</h3>
                                <div className="codes-list">
                                    {generationResult.codes.map((code, index) => (
                                        <div key={index} className="code-item">
                                            <span className="code-value">{code.code}</span>
                                            <button 
                                                className="copy-btn"
                                                onClick={() => navigator.clipboard.writeText(code.code)}
                                            >
                                                {t('admin.wizard.success.copy')}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="wizard-footer">
                        <button className="btn btn-primary" onClick={onSuccess}>
                            {t('admin.wizard.success.done')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="wizard-overlay">
            <div className="wizard-modal">
                <div className="wizard-header">
                    <h2>{t('admin.wizard.title')}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                
                {/* Progress Indicator */}
                <div className="wizard-progress">
                    {steps.map((step, index) => (
                        <div 
                            key={step.id}
                            className={`progress-step ${currentStep >= step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
                        >
                            <div className="step-number">{step.id}</div>
                            <div className="step-info">
                                <div className="step-title">{step.title}</div>
                                <div className="step-description">{step.description}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Error Display */}
                {error && (
                    <ErrorDisplay
                        error={error}
                        onRetry={() => setError(null)}
                    />
                )}

                {/* Step Content */}
                <div className="wizard-content">
                    {currentStep === 1 && (
                        <Step1BasicConfig
                            formData={formData}
                            validationErrors={validationErrors}
                            onFieldChange={handleFieldChange}
                            onLoadTemplate={loadTemplate}
                            t={t}
                        />
                    )}
                    
                    {currentStep === 2 && (
                        <Step2UsageLimits
                            formData={formData}
                            validationErrors={validationErrors}
                            onFieldChange={handleFieldChange}
                            t={t}
                        />
                    )}
                    
                    {currentStep === 3 && (
                        <Step3Advanced
                            formData={formData}
                            validationErrors={validationErrors}
                            onFieldChange={handleFieldChange}
                            t={t}
                        />
                    )}
                    
                    {currentStep === 4 && (
                        <Step4Review
                            formData={formData}
                            validationErrors={validationErrors}
                            previewData={previewData}
                            onFieldChange={handleFieldChange}
                            t={t}
                        />
                    )}
                </div>

                {/* Navigation */}
                <div className="wizard-footer">
                    <div className="nav-buttons">
                        <button 
                            className="btn btn-secondary"
                            onClick={prevStep}
                            disabled={currentStep === 1}
                        >
                            {t('admin.wizard.previous')}
                        </button>
                        
                        {currentStep < steps.length ? (
                            <button 
                                className="btn btn-primary"
                                onClick={nextStep}
                            >
                                {t('admin.wizard.next')}
                            </button>
                        ) : (
                            <button 
                                className="btn btn-success"
                                onClick={generateCodes}
                                disabled={loading || Object.keys(validationErrors).length > 0}
                            >
                                {loading ? <LoadingSpinner size="small" /> : t('admin.wizard.generate')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Step 1: Basic Configuration
 */
const Step1BasicConfig = ({ formData, validationErrors, onFieldChange, onLoadTemplate, t }) => (
    <div className="wizard-step">
        <div className="step-header">
            <h3>{t('admin.wizard.steps.basicConfig')}</h3>
            <p>{t('admin.wizard.steps.basicConfigDesc')}</p>
        </div>
        
        {/* Templates */}
        <div className="templates-section">
            <h4>{t('admin.wizard.templates.title')}</h4>
            <div className="template-buttons">
                <button 
                    className="template-btn"
                    onClick={() => onLoadTemplate('newCustomerDiscount')}
                >
                    {t('admin.wizard.templates.newCustomer')}
                </button>
                <button 
                    className="template-btn"
                    onClick={() => onLoadTemplate('timeExtension')}
                >
                    {t('admin.wizard.templates.timeExtension')}
                </button>
                <button 
                    className="template-btn"
                    onClick={() => onLoadTemplate('bulkDiscount')}
                >
                    {t('admin.wizard.templates.bulkDiscount')}
                </button>
            </div>
        </div>
        
        <div className="form-grid">
            <div className="form-group">
                <label>{t('admin.wizard.codeType')} *</label>
                <select
                    value={formData.codeType}
                    onChange={(e) => onFieldChange('codeType', e.target.value)}
                    className={validationErrors.codeType ? 'error' : ''}
                >
                    <option value="PERCENTAGE_DISCOUNT">{t('admin.codes.types.percentageDiscount')}</option>
                    <option value="FIXED_AMOUNT_DISCOUNT">{t('admin.codes.types.fixedAmountDiscount')}</option>
                    <option value="TIME_EXTENSION">{t('admin.codes.types.timeExtension')}</option>
                </select>
                {validationErrors.codeType && (
                    <span className="error-message">{validationErrors.codeType}</span>
                )}
            </div>
            
            {formData.codeType === 'PERCENTAGE_DISCOUNT' && (
                <div className="form-group">
                    <label>{t('admin.wizard.discountPercentage')} *</label>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.discountPercentage}
                        onChange={(e) => onFieldChange('discountPercentage', e.target.value ? parseInt(e.target.value) : '')}
                        className={validationErrors.discountPercentage ? 'error' : ''}
                    />
                    {validationErrors.discountPercentage && (
                        <span className="error-message">{validationErrors.discountPercentage}</span>
                    )}
                </div>
            )}
            
            {formData.codeType === 'FIXED_AMOUNT_DISCOUNT' && (
                <>
                    <div className="form-group">
                        <label>{t('admin.wizard.discountAmount')} *</label>
                        <input
                            type="number"
                            min="1"
                            value={formData.discountAmount}
                            onChange={(e) => onFieldChange('discountAmount', e.target.value ? parseInt(e.target.value) : '')}
                            className={validationErrors.discountAmount ? 'error' : ''}
                        />
                        {validationErrors.discountAmount && (
                            <span className="error-message">{validationErrors.discountAmount}</span>
                        )}
                    </div>
                    
                    <div className="form-group">
                        <label>{t('admin.wizard.currency')}</label>
                        <select
                            value={formData.discountCurrency}
                            onChange={(e) => onFieldChange('discountCurrency', e.target.value)}
                        >
                            <option value="TWD">TWD</option>
                            <option value="USD">USD</option>
                        </select>
                    </div>
                </>
            )}
            
            {formData.codeType === 'TIME_EXTENSION' && (
                <>
                    <div className="form-group">
                        <label>{t('admin.wizard.extensionDuration')} *</label>
                        <input
                            type="number"
                            min="1"
                            value={formData.extensionDuration}
                            onChange={(e) => onFieldChange('extensionDuration', e.target.value ? parseInt(e.target.value) : '')}
                            className={validationErrors.extensionDuration ? 'error' : ''}
                        />
                        {validationErrors.extensionDuration && (
                            <span className="error-message">{validationErrors.extensionDuration}</span>
                        )}
                    </div>
                    
                    <div className="form-group">
                        <label>{t('admin.wizard.extensionUnit')} *</label>
                        <select
                            value={formData.extensionUnit}
                            onChange={(e) => onFieldChange('extensionUnit', e.target.value)}
                            className={validationErrors.extensionUnit ? 'error' : ''}
                        >
                            <option value="DAY">{t('admin.wizard.units.day')}</option>
                            <option value="MONTH">{t('admin.wizard.units.month')}</option>
                            <option value="YEAR">{t('admin.wizard.units.year')}</option>
                        </select>
                        {validationErrors.extensionUnit && (
                            <span className="error-message">{validationErrors.extensionUnit}</span>
                        )}
                    </div>
                </>
            )}
            
            <div className="form-group">
                <label>{t('admin.wizard.targetPlan')}</label>
                <select
                    value={formData.targetPlan}
                    onChange={(e) => onFieldChange('targetPlan', e.target.value)}
                >
                    <option value="free">{t('admin.wizard.plans.free')}</option>
                    <option value="pro">{t('admin.wizard.plans.pro')}</option>
                </select>
            </div>
        </div>
    </div>
);

/**
 * Step 2: Usage Limits and Eligibility
 */
const Step2UsageLimits = ({ formData, validationErrors, onFieldChange, t }) => (
    <div className="wizard-step">
        <div className="step-header">
            <h3>{t('admin.wizard.steps.usageLimits')}</h3>
            <p>{t('admin.wizard.steps.usageLimitsDesc')}</p>
        </div>
        
        <div className="form-grid">
            <div className="form-group">
                <label>{t('admin.wizard.maxTotalUses')} *</label>
                <input
                    type="number"
                    min="1"
                    value={formData.maxTotalUses}
                    onChange={(e) => onFieldChange('maxTotalUses', e.target.value ? parseInt(e.target.value) : '')}
                    className={validationErrors.maxTotalUses ? 'error' : ''}
                />
                {validationErrors.maxTotalUses && (
                    <span className="error-message">{validationErrors.maxTotalUses}</span>
                )}
            </div>
            
            <div className="form-group">
                <label>{t('admin.wizard.maxUsesPerUser')} *</label>
                <input
                    type="number"
                    min="1"
                    value={formData.maxUsesPerUser}
                    onChange={(e) => onFieldChange('maxUsesPerUser', e.target.value ? parseInt(e.target.value) : '')}
                    className={validationErrors.maxUsesPerUser ? 'error' : ''}
                />
                {validationErrors.maxUsesPerUser && (
                    <span className="error-message">{validationErrors.maxUsesPerUser}</span>
                )}
            </div>
            
            <div className="form-group full-width">
                <label>{t('admin.wizard.eligibilityType')} *</label>
                <select
                    value={formData.eligibilityType}
                    onChange={(e) => onFieldChange('eligibilityType', e.target.value)}
                >
                    <option value="ALL_USERS">{t('admin.wizard.eligibility.allUsers')}</option>
                    <option value="NEW_CUSTOMERS_ONLY">{t('admin.wizard.eligibility.newCustomers')}</option>
                    <option value="SPECIFIC_PLANS">{t('admin.wizard.eligibility.specificPlans')}</option>
                    <option value="FIRST_TIME_USERS">{t('admin.wizard.eligibility.firstTime')}</option>
                </select>
            </div>
            
            {formData.eligibilityType === 'SPECIFIC_PLANS' && (
                <div className="form-group full-width">
                    <label>{t('admin.wizard.eligiblePlans')} *</label>
                    <div className="checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.eligiblePlans.includes('free')}
                                onChange={(e) => {
                                    const plans = e.target.checked 
                                        ? [...formData.eligiblePlans, 'free']
                                        : formData.eligiblePlans.filter(p => p !== 'free');
                                    onFieldChange('eligiblePlans', plans);
                                }}
                            />
                            {t('admin.wizard.plans.free')}
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.eligiblePlans.includes('pro')}
                                onChange={(e) => {
                                    const plans = e.target.checked 
                                        ? [...formData.eligiblePlans, 'pro']
                                        : formData.eligiblePlans.filter(p => p !== 'pro');
                                    onFieldChange('eligiblePlans', plans);
                                }}
                            />
                            {t('admin.wizard.plans.pro')}
                        </label>
                    </div>
                    {validationErrors.eligiblePlans && (
                        <span className="error-message">{validationErrors.eligiblePlans}</span>
                    )}
                </div>
            )}
            
            <div className="form-group full-width">
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={formData.requiresPaymentMethod}
                        onChange={(e) => onFieldChange('requiresPaymentMethod', e.target.checked)}
                    />
                    {t('admin.wizard.requiresPaymentMethod')}
                </label>
            </div>
        </div>
    </div>
);

/**
 * Step 3: Advanced Options
 */
const Step3Advanced = ({ formData, validationErrors, onFieldChange, t }) => (
    <div className="wizard-step">
        <div className="step-header">
            <h3>{t('admin.wizard.steps.advanced')}</h3>
            <p>{t('admin.wizard.steps.advancedDesc')}</p>
        </div>
        
        <div className="form-grid">
            <div className="form-group">
                <label>{t('admin.wizard.expiresAt')} *</label>
                <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => onFieldChange('expiresAt', e.target.value)}
                    className={validationErrors.expiresAt ? 'error' : ''}
                />
                {validationErrors.expiresAt && (
                    <span className="error-message">{validationErrors.expiresAt}</span>
                )}
            </div>
            
            <div className="form-group">
                <label>{t('admin.wizard.activatesAt')}</label>
                <input
                    type="date"
                    value={formData.activatesAt}
                    onChange={(e) => onFieldChange('activatesAt', e.target.value)}
                    className={validationErrors.activatesAt ? 'error' : ''}
                />
                {validationErrors.activatesAt && (
                    <span className="error-message">{validationErrors.activatesAt}</span>
                )}
            </div>
            
            <div className="form-group full-width">
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={formData.allowStacking}
                        onChange={(e) => onFieldChange('allowStacking', e.target.checked)}
                    />
                    {t('admin.wizard.allowStacking')}
                </label>
            </div>
            
            {formData.allowStacking && (
                <div className="form-group full-width">
                    <label>{t('admin.wizard.stackingGroup')}</label>
                    <input
                        type="text"
                        value={formData.stackingGroup}
                        onChange={(e) => onFieldChange('stackingGroup', e.target.value)}
                        placeholder={t('admin.wizard.stackingGroupPlaceholder')}
                        className={validationErrors.stackingGroup ? 'error' : ''}
                    />
                    {validationErrors.stackingGroup && (
                        <span className="error-message">{validationErrors.stackingGroup}</span>
                    )}
                </div>
            )}
        </div>
    </div>
);

/**
 * Step 4: Review and Generate
 */
const Step4Review = ({ formData, validationErrors, previewData, onFieldChange, t }) => (
    <div className="wizard-step">
        <div className="step-header">
            <h3>{t('admin.wizard.steps.review')}</h3>
            <p>{t('admin.wizard.steps.reviewDesc')}</p>
        </div>
        
        <div className="form-grid">
            <div className="form-group">
                <label>{t('admin.wizard.campaignName')} *</label>
                <input
                    type="text"
                    value={formData.campaignName}
                    onChange={(e) => onFieldChange('campaignName', e.target.value)}
                    placeholder={t('admin.wizard.campaignNamePlaceholder')}
                    className={validationErrors.campaignName ? 'error' : ''}
                />
                {validationErrors.campaignName && (
                    <span className="error-message">{validationErrors.campaignName}</span>
                )}
            </div>
            
            <div className="form-group">
                <label>{t('admin.wizard.count')} *</label>
                <input
                    type="number"
                    min="1"
                    max="10000"
                    value={formData.count}
                    onChange={(e) => onFieldChange('count', e.target.value ? parseInt(e.target.value) : '')}
                    className={validationErrors.count ? 'error' : ''}
                />
                {validationErrors.count && (
                    <span className="error-message">{validationErrors.count}</span>
                )}
            </div>
            
            {formData.count > 1 && (
                <div className="form-group">
                    <label>{t('admin.wizard.prefix')} *</label>
                    <input
                        type="text"
                        value={formData.prefix}
                        onChange={(e) => onFieldChange('prefix', e.target.value.toUpperCase())}
                        placeholder={t('admin.wizard.prefixPlaceholder')}
                        className={validationErrors.prefix ? 'error' : ''}
                    />
                    {validationErrors.prefix && (
                        <span className="error-message">{validationErrors.prefix}</span>
                    )}
                </div>
            )}
            
            <div className="form-group">
                <label>{t('admin.wizard.codeLength')}</label>
                <input
                    type="number"
                    min="8"
                    max="32"
                    value={formData.codeLength}
                    onChange={(e) => onFieldChange('codeLength', e.target.value ? parseInt(e.target.value) : '')}
                    className={validationErrors.codeLength ? 'error' : ''}
                />
                {validationErrors.codeLength && (
                    <span className="error-message">{validationErrors.codeLength}</span>
                )}
            </div>
            
            <div className="form-group full-width">
                <label>{t('admin.wizard.internalNotes')}</label>
                <textarea
                    value={formData.internalNotes}
                    onChange={(e) => onFieldChange('internalNotes', e.target.value)}
                    placeholder={t('admin.wizard.internalNotesPlaceholder')}
                    rows="3"
                />
            </div>
        </div>
        
        {/* Configuration Preview */}
        {previewData && (
            <div className="preview-section">
                <h4>{t('admin.wizard.preview.title')}</h4>
                
                <div className="preview-grid">
                    <div className="preview-card">
                        <h5>{t('admin.wizard.preview.configuration')}</h5>
                        <div className="preview-items">
                            <div className="preview-item">
                                <span className="label">{t('admin.wizard.preview.type')}</span>
                                <span className="value">{previewData.configuration.type}</span>
                            </div>
                            <div className="preview-item">
                                <span className="label">{t('admin.wizard.preview.value')}</span>
                                <span className="value">{previewData.configuration.value}</span>
                            </div>
                            <div className="preview-item">
                                <span className="label">{t('admin.wizard.preview.usage')}</span>
                                <span className="value">{previewData.configuration.usageLimits}</span>
                            </div>
                            <div className="preview-item">
                                <span className="label">{t('admin.wizard.preview.eligibility')}</span>
                                <span className="value">{previewData.configuration.eligibility}</span>
                            </div>
                            <div className="preview-item">
                                <span className="label">{t('admin.wizard.preview.expiration')}</span>
                                <span className="value">{previewData.configuration.expiration}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="preview-card">
                        <h5>{t('admin.wizard.preview.generation')}</h5>
                        <div className="preview-items">
                            <div className="preview-item">
                                <span className="label">{t('admin.wizard.preview.method')}</span>
                                <span className="value">{previewData.generation.method}</span>
                            </div>
                            <div className="preview-item">
                                <span className="label">{t('admin.wizard.preview.count')}</span>
                                <span className="value">{previewData.generation.count}</span>
                            </div>
                            <div className="preview-item">
                                <span className="label">{t('admin.wizard.preview.prefix')}</span>
                                <span className="value">{previewData.generation.prefix}</span>
                            </div>
                            <div className="preview-item">
                                <span className="label">{t('admin.wizard.preview.campaign')}</span>
                                <span className="value">{previewData.generation.campaign}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="sample-codes">
                    <h5>{t('admin.wizard.preview.sampleCodes')}</h5>
                    <div className="codes-preview">
                        {previewData.estimatedCodes.map((code, index) => (
                            <span key={index} className="sample-code">{code}</span>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
);

export default CodeGenerationWizard;