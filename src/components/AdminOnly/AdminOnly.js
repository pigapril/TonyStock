/**
 * AdminOnly Component
 * 
 * Conditional rendering component for admin-only features.
 * Integrates with useAdminPermissions hook to show/hide content
 * based on user admin status.
 * 
 * Features:
 * - Conditional rendering based on admin status
 * - Graceful degradation during loading states
 * - Visual indicators for permission verification in progress
 * - Fallback content support
 * - Loading state handling
 * - Error boundary integration
 * - Debug mode for development
 * 
 * @author SentimentInsideOut Team
 * @version 1.1.0 - Enhanced with graceful degradation support
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import './AdminOnly.css';

/**
 * AdminOnly Component
 * Conditionally renders children based on admin permissions
 * 
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Content to show for admin users
 * @param {React.ReactNode} [props.fallback] - Content to show for non-admin users
 * @param {boolean} [props.showLoading] - Whether to show loading state
 * @param {React.ReactNode} [props.loadingComponent] - Custom loading component
 * @param {boolean} [props.showGracefulDegradation] - Enable graceful degradation during loading states
 * @param {boolean} [props.debug] - Enable debug mode (development only)
 * @param {string} [props.className] - CSS class name
 * @param {object} [props.style] - Inline styles
 * @returns {React.ReactElement|null} Rendered component or null
 */
const AdminOnly = ({
    children,
    fallback = null,
    showLoading = false,
    loadingComponent = null,
    showGracefulDegradation = true,
    debug = false,
    className = undefined,
    style = undefined,
    ...otherProps
}) => {
    const {
        isAdmin,
        loading,
        error,
        lastKnownStatus,
        shouldShowAdminFeatures,
        getDebugInfo
    } = useAdminPermissions();
    
    // Debug logging in development
    if (debug && process.env.NODE_ENV === 'development') {
        console.log('AdminOnly component render:', {
            isAdmin,
            loading,
            error: error?.message,
            lastKnownStatus,
            shouldShowAdminFeatures,
            showGracefulDegradation,
            hasChildren: !!children,
            hasFallback: !!fallback,
            debugInfo: getDebugInfo()
        });
    }
    
    // Graceful degradation: Show admin content during loading if last known status was admin
    if (loading && showGracefulDegradation && lastKnownStatus === true) {
        const containerClass = `admin-only-graceful ${className || ''}`;
        const content = (
            <>
                {children}
                <div className="admin-permission-indicator">
                    <div className="permission-status-bar">
                        <div className="permission-spinner"></div>
                        <span className="permission-text">Verifying permissions...</span>
                    </div>
                </div>
            </>
        );
        
        // Wrap in container if className or style is provided
        if (className || style) {
            return (
                <div 
                    className={containerClass}
                    style={style}
                    {...otherProps}
                >
                    {content}
                </div>
            );
        }
        
        return (
            <div className="admin-only-graceful">
                {content}
            </div>
        );
    }
    
    // Show loading state if requested and currently loading
    if (showLoading && loading) {
        if (loadingComponent) {
            return loadingComponent;
        }
        
        return (
            <div 
                className={`admin-only-loading ${className || ''}`}
                style={style}
                {...otherProps}
            >
                <div className="admin-loading-spinner">
                    <div className="spinner"></div>
                    <span>Checking permissions...</span>
                </div>
            </div>
        );
    }
    
    // Show admin content if user is admin
    if (shouldShowAdminFeatures) {
        // Wrap in container if className or style is provided
        if (className || style) {
            return (
                <div 
                    className={`admin-only-container ${className || ''}`}
                    style={style}
                    {...otherProps}
                >
                    {children}
                </div>
            );
        }
        
        return children;
    }
    
    // Show fallback content for non-admin users
    if (fallback !== null) {
        // Wrap in container if className or style is provided
        if (className || style) {
            return (
                <div 
                    className={`admin-only-fallback ${className || ''}`}
                    style={style}
                    {...otherProps}
                >
                    {fallback}
                </div>
            );
        }
        
        return fallback;
    }
    
    // Return null if no fallback and user is not admin
    return null;
};

AdminOnly.propTypes = {
    children: PropTypes.node.isRequired,
    fallback: PropTypes.node,
    showLoading: PropTypes.bool,
    loadingComponent: PropTypes.node,
    showGracefulDegradation: PropTypes.bool,
    debug: PropTypes.bool,
    className: PropTypes.string,
    style: PropTypes.object
};

// Default props are now handled by JavaScript default parameters

export default AdminOnly;