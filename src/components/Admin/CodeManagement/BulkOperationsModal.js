/**
 * BulkOperationsModal - Bulk operations interface for multiple redemption codes
 * 
 * Features:
 * - Multiple operation types (activate, deactivate, update)
 * - Batch processing with progress tracking
 * - Error handling and retry logic
 * - Operation preview and confirmation
 * - Results summary and reporting
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './BulkOperationsModal.css';
import LoadingSpinner from '../../Common/LoadingSpinner';
import ErrorDisplay from '../../Common/ErrorDisplay';
import AdminRedemptionService from '../../../services/adminRedemptionService';
import { systemLogger } from '../../../utils/logger';

const BulkOperationsModal = ({ selectedCodes, codes, onClose, onComplete }) => {
    const { t } = useTranslation();
    
    // State management
    const [operation, setOperation] = useState('activate');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [step, setStep] = useState('select'); // 'select', 'confirm', 'processing', 'results'
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [results, setResults] = useState(null);
    
    // Operation-specific options
    const [options, setOptions] = useState({
        reason: '',
        activationDate: '',
        updates: {
            expiresAt: '',
            maxTotalUses: '',
            maxUsesPerUser: '',
            campaignName: '',
            internalNotes: ''
        }
    });
    
    // Validation errors
    const [validationErrors, setValidationErrors] = useState({});

    const selectedCodesData = codes.filter(code => selectedCodes.includes(code.id));

    /**
     * Handle option changes
     */
    const handleOptionChange = useCallback((field, value) => {
        if (field.startsWith('updates.')) {
            const updateField = field.replace('updates.', '');
            setOptions(prev => ({
                ...prev,
                updates: {
                    ...prev.updates,
                    [updateField]: value
                }
            }));
        } else {
            setOptions(prev => ({
                ...prev,
                [field]: value
            }));
        }
        
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
     * Validate operation options
     */
    const validateOptions = useCallback(() => {
        const errors = {};
        
        switch (operation) {
            case 'deactivate':
                if (!options.reason || options.reason.trim().length < 5) {
                    errors.reason = t('admin.bulkOps.validation.reasonRequired');
                }
                break;
                
            case 'activate':
                if (options.activationDate) {
                    const activationDate = new Date(options.activationDate);
                    const now = new Date();
                    if (activationDate <= now) {
                        errors.activationDate = t('admin.bulkOps.validation.activationInPast');
                    }
                }
                break;
                
            case 'update':
                if (options.updates.expiresAt) {
                    const expirationDate = new Date(options.updates.expiresAt);
                    const now = new Date();
                    if (expirationDate <= now) {
                        errors['updates.expiresAt'] = t('admin.bulkOps.validation.expirationInPast');
                    }
                }
                
                if (options.updates.maxTotalUses && options.updates.maxTotalUses <= 0) {
                    errors['updates.maxTotalUses'] = t('admin.bulkOps.validation.invalidTotalUses');
                }
                
                if (options.updates.maxUsesPerUser && options.updates.maxUsesPerUser <= 0) {
                    errors['updates.maxUsesPerUser'] = t('admin.bulkOps.validation.invalidUserUses');
                }
                
                if (options.updates.maxUsesPerUser && options.updates.maxTotalUses && 
                    options.updates.maxUsesPerUser > options.updates.maxTotalUses) {
                    errors['updates.maxUsesPerUser'] = t('admin.bulkOps.validation.userUsesExceedsTotal');
                }
                
                // Check if at least one update field is provided
                const hasUpdates = Object.values(options.updates).some(value => 
                    value !== null && value !== undefined && value !== ''
                );
                if (!hasUpdates) {
                    errors.updates = t('admin.bulkOps.validation.noUpdatesProvided');
                }
                break;
        }
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }, [operation, options, t]);

    /**
     * Proceed to confirmation step
     */
    const proceedToConfirm = useCallback(() => {
        if (validateOptions()) {
            setStep('confirm');
        }
    }, [validateOptions]);

    /**
     * Execute bulk operation
     */
    const executeBulkOperation = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setStep('processing');
            setProgress({ current: 0, total: selectedCodes.length });
            
            systemLogger.info('Starting bulk operation', {
                operation,
                codeCount: selectedCodes.length,
                options
            });
            
            // Prepare operation options
            let operationOptions = {};
            
            switch (operation) {
                case 'activate':
                    operationOptions = {
                        activationDate: options.activationDate ? new Date(options.activationDate) : null
                    };
                    break;
                    
                case 'deactivate':
                    operationOptions = {
                        reason: options.reason
                    };
                    break;
                    
                case 'update':
                    operationOptions = {
                        updates: Object.fromEntries(
                            Object.entries(options.updates).filter(([key, value]) => 
                                value !== null && value !== undefined && value !== ''
                            )
                        )
                    };
                    break;
            }
            
            // Execute bulk operation
            const response = await AdminRedemptionService.bulkOperation(
                selectedCodes,
                operation,
                operationOptions
            );
            
            if (response.success) {
                setResults(response.data);
                setStep('results');
                
                systemLogger.info('Bulk operation completed', {
                    operation,
                    total: response.data.total,
                    successful: response.data.successful,
                    failed: response.data.failed
                });
            } else {
                throw new Error(response.error || 'Bulk operation failed');
            }
        } catch (err) {
            systemLogger.error('Bulk operation failed:', err);
            setError(err.message || 'Bulk operation failed');
            setStep('select');
        } finally {
            setLoading(false);
        }
    }, [operation, options, selectedCodes]);

    /**
     * Get operation description
     */
    const getOperationDescription = useCallback(() => {
        switch (operation) {
            case 'activate':
                return options.activationDate ? 
                    t('admin.bulkOps.descriptions.scheduleActivate', { date: new Date(options.activationDate).toLocaleDateString() }) :
                    t('admin.bulkOps.descriptions.activate');
            case 'deactivate':
                return t('admin.bulkOps.descriptions.deactivate');
            case 'update':
                const updateFields = Object.entries(options.updates)
                    .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                    .map(([key]) => t(`admin.bulkOps.fields.${key}`));
                return t('admin.bulkOps.descriptions.update', { fields: updateFields.join(', ') });
            default:
                return '';
        }
    }, [operation, options, t]);

    /**
     * Get affected codes summary
     */
    const getAffectedCodesSummary = useCallback(() => {
        const summary = {
            total: selectedCodesData.length,
            byStatus: {},
            byType: {},
            byCampaign: {}
        };
        
        selectedCodesData.forEach(code => {
            // By status
            summary.byStatus[code.status] = (summary.byStatus[code.status] || 0) + 1;
            
            // By type
            summary.byType[code.codeType] = (summary.byType[code.codeType] || 0) + 1;
            
            // By campaign
            const campaign = code.campaignName || 'No Campaign';
            summary.byCampaign[campaign] = (summary.byCampaign[campaign] || 0) + 1;
        });
        
        return summary;
    }, [selectedCodesData]);

    const affectedSummary = getAffectedCodesSummary();

    if (step === 'results' && results) {
        return (
            <div className="modal-overlay">
                <div className="bulk-operations-modal">
                    <div className="modal-header">
                        <h2>{t('admin.bulkOps.results.title')}</h2>
                        <button className="close-btn" onClick={onClose}>×</button>
                    </div>
                    
                    <div className="modal-content">
                        <div className="results-summary">
                            <div className="summary-header">
                                <div className="operation-info">
                                    <h3>{t(`admin.bulkOps.operations.${operation}`)}</h3>
                                    <p>{getOperationDescription()}</p>
                                </div>
                                
                                <div className="results-stats">
                                    <div className="stat-item success">
                                        <div className="stat-value">{results.successful}</div>
                                        <div className="stat-label">{t('admin.bulkOps.results.successful')}</div>
                                    </div>
                                    
                                    <div className="stat-item error">
                                        <div className="stat-value">{results.failed}</div>
                                        <div className="stat-label">{t('admin.bulkOps.results.failed')}</div>
                                    </div>
                                    
                                    <div className="stat-item total">
                                        <div className="stat-value">{results.total}</div>
                                        <div className="stat-label">{t('admin.bulkOps.results.total')}</div>
                                    </div>
                                </div>
                            </div>
                            
                            {results.failed > 0 && (
                                <div className="failed-operations">
                                    <h4>{t('admin.bulkOps.results.failedOperations')}</h4>
                                    <div className="failed-list">
                                        {results.failedCodes.map((failure, index) => (
                                            <div key={index} className="failed-item">
                                                <span className="code-id">{failure.codeId}</span>
                                                <span className="error-message">{failure.error}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="modal-footer">
                        <button className="btn btn-primary" onClick={onComplete}>
                            {t('admin.bulkOps.results.done')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'processing') {
        return (
            <div className="modal-overlay">
                <div className="bulk-operations-modal">
                    <div className="modal-header">
                        <h2>{t('admin.bulkOps.processing.title')}</h2>
                    </div>
                    
                    <div className="modal-content">
                        <div className="processing-display">
                            <LoadingSpinner />
                            <h3>{t(`admin.bulkOps.operations.${operation}`)}</h3>
                            <p>{t('admin.bulkOps.processing.description')}</p>
                            
                            <div className="progress-info">
                                <div className="progress-text">
                                    {t('admin.bulkOps.processing.progress', {
                                        current: progress.current,
                                        total: progress.total
                                    })}
                                </div>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill"
                                        style={{ 
                                            width: progress.total > 0 ? 
                                                `${(progress.current / progress.total) * 100}%` : 
                                                '0%' 
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <div className="bulk-operations-modal">
                <div className="modal-header">
                    <h2>{t('admin.bulkOps.title')}</h2>
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
                    {step === 'select' && (
                        <>
                            {/* Operation Selection */}
                            <div className="section">
                                <h3>{t('admin.bulkOps.selectOperation')}</h3>
                                
                                <div className="operation-options">
                                    <label className="operation-option">
                                        <input
                                            type="radio"
                                            name="operation"
                                            value="activate"
                                            checked={operation === 'activate'}
                                            onChange={(e) => setOperation(e.target.value)}
                                        />
                                        <div className="option-content">
                                            <div className="option-title">{t('admin.bulkOps.operations.activate')}</div>
                                            <div className="option-description">{t('admin.bulkOps.descriptions.activate')}</div>
                                        </div>
                                    </label>
                                    
                                    <label className="operation-option">
                                        <input
                                            type="radio"
                                            name="operation"
                                            value="deactivate"
                                            checked={operation === 'deactivate'}
                                            onChange={(e) => setOperation(e.target.value)}
                                        />
                                        <div className="option-content">
                                            <div className="option-title">{t('admin.bulkOps.operations.deactivate')}</div>
                                            <div className="option-description">{t('admin.bulkOps.descriptions.deactivate')}</div>
                                        </div>
                                    </label>
                                    
                                    <label className="operation-option">
                                        <input
                                            type="radio"
                                            name="operation"
                                            value="update"
                                            checked={operation === 'update'}
                                            onChange={(e) => setOperation(e.target.value)}
                                        />
                                        <div className="option-content">
                                            <div className="option-title">{t('admin.bulkOps.operations.update')}</div>
                                            <div className="option-description">{t('admin.bulkOps.descriptions.updateGeneric')}</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Operation Options */}
                            <div className="section">
                                <h3>{t('admin.bulkOps.options')}</h3>
                                
                                {operation === 'activate' && (
                                    <div className="options-form">
                                        <div className="form-group">
                                            <label>{t('admin.bulkOps.activationDate')}</label>
                                            <input
                                                type="date"
                                                value={options.activationDate}
                                                onChange={(e) => handleOptionChange('activationDate', e.target.value)}
                                                className={validationErrors.activationDate ? 'error' : ''}
                                            />
                                            <small>{t('admin.bulkOps.activationDateHelp')}</small>
                                            {validationErrors.activationDate && (
                                                <span className="error-message">{validationErrors.activationDate}</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                {operation === 'deactivate' && (
                                    <div className="options-form">
                                        <div className="form-group">
                                            <label>{t('admin.bulkOps.reason')} *</label>
                                            <textarea
                                                value={options.reason}
                                                onChange={(e) => handleOptionChange('reason', e.target.value)}
                                                placeholder={t('admin.bulkOps.reasonPlaceholder')}
                                                rows="3"
                                                className={validationErrors.reason ? 'error' : ''}
                                            />
                                            {validationErrors.reason && (
                                                <span className="error-message">{validationErrors.reason}</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                {operation === 'update' && (
                                    <div className="options-form">
                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label>{t('admin.bulkOps.fields.expiresAt')}</label>
                                                <input
                                                    type="date"
                                                    value={options.updates.expiresAt}
                                                    onChange={(e) => handleOptionChange('updates.expiresAt', e.target.value)}
                                                    className={validationErrors['updates.expiresAt'] ? 'error' : ''}
                                                />
                                                {validationErrors['updates.expiresAt'] && (
                                                    <span className="error-message">{validationErrors['updates.expiresAt']}</span>
                                                )}
                                            </div>
                                            
                                            <div className="form-group">
                                                <label>{t('admin.bulkOps.fields.maxTotalUses')}</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={options.updates.maxTotalUses}
                                                    onChange={(e) => handleOptionChange('updates.maxTotalUses', parseInt(e.target.value) || '')}
                                                    className={validationErrors['updates.maxTotalUses'] ? 'error' : ''}
                                                />
                                                {validationErrors['updates.maxTotalUses'] && (
                                                    <span className="error-message">{validationErrors['updates.maxTotalUses']}</span>
                                                )}
                                            </div>
                                            
                                            <div className="form-group">
                                                <label>{t('admin.bulkOps.fields.maxUsesPerUser')}</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={options.updates.maxUsesPerUser}
                                                    onChange={(e) => handleOptionChange('updates.maxUsesPerUser', parseInt(e.target.value) || '')}
                                                    className={validationErrors['updates.maxUsesPerUser'] ? 'error' : ''}
                                                />
                                                {validationErrors['updates.maxUsesPerUser'] && (
                                                    <span className="error-message">{validationErrors['updates.maxUsesPerUser']}</span>
                                                )}
                                            </div>
                                            
                                            <div className="form-group">
                                                <label>{t('admin.bulkOps.fields.campaignName')}</label>
                                                <input
                                                    type="text"
                                                    value={options.updates.campaignName}
                                                    onChange={(e) => handleOptionChange('updates.campaignName', e.target.value)}
                                                />
                                            </div>
                                            
                                            <div className="form-group full-width">
                                                <label>{t('admin.bulkOps.fields.internalNotes')}</label>
                                                <textarea
                                                    value={options.updates.internalNotes}
                                                    onChange={(e) => handleOptionChange('updates.internalNotes', e.target.value)}
                                                    rows="3"
                                                />
                                            </div>
                                        </div>
                                        
                                        {validationErrors.updates && (
                                            <div className="error-message">{validationErrors.updates}</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Affected Codes Summary */}
                            <div className="section">
                                <h3>{t('admin.bulkOps.affectedCodes')}</h3>
                                
                                <div className="affected-summary">
                                    <div className="summary-stats">
                                        <div className="stat-item">
                                            <div className="stat-value">{affectedSummary.total}</div>
                                            <div className="stat-label">{t('admin.bulkOps.totalCodes')}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="summary-breakdown">
                                        <div className="breakdown-section">
                                            <h4>{t('admin.bulkOps.byStatus')}</h4>
                                            <div className="breakdown-items">
                                                {Object.entries(affectedSummary.byStatus).map(([status, count]) => (
                                                    <span key={status} className={`breakdown-item status-${status}`}>
                                                        {t(`admin.codes.statuses.${status}`)}: {count}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="breakdown-section">
                                            <h4>{t('admin.bulkOps.byType')}</h4>
                                            <div className="breakdown-items">
                                                {Object.entries(affectedSummary.byType).map(([type, count]) => (
                                                    <span key={type} className="breakdown-item">
                                                        {t(`admin.codes.types.${type.toLowerCase()}`)}: {count}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 'confirm' && (
                        <div className="confirmation-step">
                            <div className="confirmation-header">
                                <h3>{t('admin.bulkOps.confirm.title')}</h3>
                                <p>{t('admin.bulkOps.confirm.description')}</p>
                            </div>
                            
                            <div className="confirmation-details">
                                <div className="detail-item">
                                    <label>{t('admin.bulkOps.confirm.operation')}</label>
                                    <span>{t(`admin.bulkOps.operations.${operation}`)}</span>
                                </div>
                                
                                <div className="detail-item">
                                    <label>{t('admin.bulkOps.confirm.description')}</label>
                                    <span>{getOperationDescription()}</span>
                                </div>
                                
                                <div className="detail-item">
                                    <label>{t('admin.bulkOps.confirm.affectedCodes')}</label>
                                    <span>{selectedCodes.length} {t('admin.bulkOps.confirm.codes')}</span>
                                </div>
                            </div>
                            
                            <div className="confirmation-warning">
                                <div className="warning-icon">⚠️</div>
                                <div className="warning-text">
                                    <strong>{t('admin.bulkOps.confirm.warning')}</strong>
                                    <p>{t('admin.bulkOps.confirm.warningText')}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    {step === 'select' && (
                        <>
                            <button className="btn btn-secondary" onClick={onClose}>
                                {t('admin.bulkOps.cancel')}
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={proceedToConfirm}
                                disabled={Object.keys(validationErrors).length > 0}
                            >
                                {t('admin.bulkOps.continue')}
                            </button>
                        </>
                    )}
                    
                    {step === 'confirm' && (
                        <>
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setStep('select')}
                            >
                                {t('admin.bulkOps.back')}
                            </button>
                            <button 
                                className="btn btn-danger"
                                onClick={executeBulkOperation}
                                disabled={loading}
                            >
                                {loading ? <LoadingSpinner size="small" /> : t('admin.bulkOps.confirm.execute')}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkOperationsModal;