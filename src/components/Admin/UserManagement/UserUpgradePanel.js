/**
 * UserUpgradePanel - Admin tool for upgrading users to Pro status
 * 
 * Features:
 * - Search users by email
 * - Display user current status
 * - Upgrade to Pro with custom duration
 * - View upgrade history
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../../Common/LoadingSpinner';
import apiClient from '../../../api/apiClient';
import './UserUpgradePanel.css';

const UserUpgradePanel = () => {
    const { t } = useTranslation();
    
    // State management
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [upgradeConfig, setUpgradeConfig] = useState({
        duration: 30,
        unit: 'days',
        reason: ''
    });
    
    // Loading states
    const [isSearching, setIsSearching] = useState(false);
    const [isUpgrading, setIsUpgrading] = useState(false);
    
    // UI states
    const [searchError, setSearchError] = useState('');
    const [upgradeSuccess, setUpgradeSuccess] = useState('');
    const [upgradeError, setUpgradeError] = useState('');

    /**
     * Search for user by email
     */
    const handleSearchUser = useCallback(async () => {
        if (!searchEmail.trim()) {
            setSearchError(t('admin.userManagement.search.errors.emailRequired'));
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(searchEmail.trim())) {
            setSearchError(t('admin.userManagement.search.errors.invalidEmail'));
            return;
        }

        setIsSearching(true);
        setSearchError('');
        setSearchResults(null);
        setSelectedUser(null);

        try {
            const response = await apiClient.get(`/api/admin/users/search?email=${encodeURIComponent(searchEmail.trim())}`);
            const data = response.data;

            // apiClient automatically handles response status
            if (data.status === 'success') {
                setSearchResults(data.data);
                if (data.data.user) {
                    setSelectedUser(data.data.user);
                }
            } else {
                throw new Error(data.message || t('admin.userManagement.search.errors.searchFailed'));
            }

        } catch (error) {
            console.error('Search user error:', error);
            // Handle API client errors
            const errorMessage = error.response?.data?.message || error.message || t('admin.userManagement.search.errors.networkError');
            setSearchError(errorMessage);
        } finally {
            setIsSearching(false);
        }
    }, [searchEmail]);

    /**
     * Handle upgrade user to Pro
     */
    const handleUpgradeUser = useCallback(async () => {
        if (!selectedUser) {
            setUpgradeError(t('admin.userManagement.upgrade.errors.noUserSelected'));
            return;
        }

        if (!upgradeConfig.duration || upgradeConfig.duration < 1) {
            setUpgradeError(t('admin.userManagement.upgrade.errors.invalidDuration'));
            return;
        }

        setIsUpgrading(true);
        setUpgradeError('');
        setUpgradeSuccess('');

        try {
            const response = await apiClient.post('/api/admin/users/upgrade', {
                userId: selectedUser.id,
                email: selectedUser.email,
                duration: parseInt(upgradeConfig.duration),
                unit: upgradeConfig.unit,
                reason: upgradeConfig.reason || 'Admin manual upgrade'
            });

            const data = response.data;

            // apiClient automatically handles response status
            if (data.status === 'success') {
                const unitText = t(`admin.userManagement.upgrade.units.${upgradeConfig.unit}`);
                setUpgradeSuccess(t('admin.userManagement.upgrade.success', {
                    email: selectedUser.email,
                    duration: upgradeConfig.duration,
                    unit: unitText
                }));
                
                // Refresh user data
                await handleSearchUser();
                
                // Reset upgrade config
                setUpgradeConfig({
                    duration: 30,
                    unit: 'days',
                    reason: ''
                });
            } else {
                throw new Error(data.message || t('admin.userManagement.upgrade.errors.upgradeFailed'));
            }

        } catch (error) {
            console.error('Upgrade user error:', error);
            // Handle API client errors
            const errorMessage = error.response?.data?.message || error.message || t('admin.userManagement.upgrade.errors.networkError');
            setUpgradeError(errorMessage);
        } finally {
            setIsUpgrading(false);
        }
    }, [selectedUser, upgradeConfig, handleSearchUser]);

    /**
     * Handle Enter key press in search input
     */
    const handleSearchKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearchUser();
        }
    };

    /**
     * Format date for display
     */
    const formatDate = (dateString) => {
        if (!dateString) return t('admin.userManagement.userInfo.noLastLogin');
        return new Date(dateString).toLocaleString();
    };

    /**
     * Get plan display name
     */
    const getPlanDisplayName = (plan) => {
        return t(`admin.userManagement.plans.${plan}`) || plan;
    };

    /**
     * Get subscription status display
     */
    const getSubscriptionStatusDisplay = (subscription) => {
        if (!subscription) return t('admin.userManagement.userInfo.noSubscription');
        
        const status = t(`admin.userManagement.subscriptionStatus.${subscription.status}`) || subscription.status;
        const endDate = subscription.currentPeriodEnd ? 
            new Date(subscription.currentPeriodEnd).toLocaleDateString() : '';
        
        return `${status}${endDate ? ` (${t('admin.userManagement.subscriptionStatus.until')} ${endDate})` : ''}`;
    };

    return (
        <div className="user-upgrade-panel">
            {/* Header */}
            <div className="panel-header">
                <h2>{t('admin.userManagement.title')}</h2>
                <p>{t('admin.userManagement.description')}</p>
            </div>

            {/* Search Section */}
            <div className="search-section">
                <div className="search-form">
                    <div className="search-input-group">
                        <input
                            type="email"
                            value={searchEmail}
                            onChange={(e) => setSearchEmail(e.target.value)}
                            onKeyPress={handleSearchKeyPress}
                            placeholder={t('admin.userManagement.search.placeholder')}
                            className="search-input"
                            disabled={isSearching}
                        />
                        <button
                            onClick={handleSearchUser}
                            disabled={isSearching || !searchEmail.trim()}
                            className="search-button"
                        >
                            {isSearching ? <LoadingSpinner size="small" /> : t('admin.userManagement.search.button')}
                        </button>
                    </div>
                    
                    {searchError && (
                        <div className="error-message">
                            <span className="error-icon">⚠️</span>
                            {searchError}
                        </div>
                    )}
                </div>
            </div>

            {/* Search Results */}
            {searchResults && (
                <div className="search-results">
                    {searchResults.user ? (
                        <div className="user-card">
                            <div className="user-info">
                                <div className="user-header">
                                    <h3>{searchResults.user.username}</h3>
                                    <span className={`plan-badge ${searchResults.user.plan}`}>
                                        {getPlanDisplayName(searchResults.user.plan)}
                                    </span>
                                </div>
                                
                                <div className="user-details">
                                    <div className="detail-row">
                                        <span className="label">{t('admin.userManagement.userInfo.email')}:</span>
                                        <span className="value">{searchResults.user.email}</span>
                                    </div>
                                    
                                    <div className="detail-row">
                                        <span className="label">{t('admin.userManagement.userInfo.registeredAt')}:</span>
                                        <span className="value">{formatDate(searchResults.user.createdAt)}</span>
                                    </div>
                                    
                                    <div className="detail-row">
                                        <span className="label">{t('admin.userManagement.userInfo.lastLogin')}:</span>
                                        <span className="value">{formatDate(searchResults.user.lastLoginAt)}</span>
                                    </div>
                                    
                                    {searchResults.subscription && (
                                        <div className="detail-row">
                                            <span className="label">{t('admin.userManagement.userInfo.subscriptionStatus')}:</span>
                                            <span className="value">{getSubscriptionStatusDisplay(searchResults.subscription)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Upgrade Section */}
                            {selectedUser && (
                                <div className="upgrade-section">
                                    <h4>{t('admin.userManagement.upgrade.title')}</h4>
                                    
                                    <div className="upgrade-form">
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>{t('admin.userManagement.upgrade.duration')}:</label>
                                                <div className="duration-input">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="365"
                                                        value={upgradeConfig.duration}
                                                        onChange={(e) => setUpgradeConfig(prev => ({
                                                            ...prev,
                                                            duration: e.target.value
                                                        }))}
                                                        className="duration-number"
                                                    />
                                                    <select
                                                        value={upgradeConfig.unit}
                                                        onChange={(e) => setUpgradeConfig(prev => ({
                                                            ...prev,
                                                            unit: e.target.value
                                                        }))}
                                                        className="duration-unit"
                                                    >
                                                        <option value="days">{t('admin.userManagement.upgrade.units.days')}</option>
                                                        <option value="months">{t('admin.userManagement.upgrade.units.months')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>{t('admin.userManagement.upgrade.reason')}:</label>
                                                <input
                                                    type="text"
                                                    value={upgradeConfig.reason}
                                                    onChange={(e) => setUpgradeConfig(prev => ({
                                                        ...prev,
                                                        reason: e.target.value
                                                    }))}
                                                    placeholder={t('admin.userManagement.upgrade.reasonPlaceholder')}
                                                    className="reason-input"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="form-actions">
                                            <button
                                                onClick={handleUpgradeUser}
                                                disabled={isUpgrading || selectedUser.plan === 'pro'}
                                                className="upgrade-button"
                                            >
                                                {isUpgrading ? (
                                                    <>
                                                        <LoadingSpinner size="small" />
                                                        {t('admin.userManagement.upgrade.buttonUpgrading')}
                                                    </>
                                                ) : (
                                                    selectedUser.plan === 'pro' ? 
                                                        t('admin.userManagement.upgrade.buttonAlreadyPro') : 
                                                        t('admin.userManagement.upgrade.button')
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {upgradeSuccess && (
                                        <div className="success-message">
                                            <span className="success-icon">✅</span>
                                            {upgradeSuccess}
                                        </div>
                                    )}
                                    
                                    {upgradeError && (
                                        <div className="error-message">
                                            <span className="error-icon">⚠️</span>
                                            {upgradeError}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-results">
                            <span className="no-results-icon">{t('admin.userManagement.noResults.icon')}</span>
                            <p>{t('admin.userManagement.noResults.title')}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserUpgradePanel;