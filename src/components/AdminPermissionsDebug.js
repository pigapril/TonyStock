/**
 * AdminPermissionsDebug Component
 * 
 * A debug component to help diagnose admin permission issues
 */

import React, { useState, useEffect } from 'react';
import { useAdminPermissions } from '../hooks/useAdminPermissions';
import { useAuth } from './Auth/useAuth';
import adminPermissions from '../utils/adminPermissions';

const AdminPermissionsDebug = () => {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const { 
        isAdmin, 
        loading, 
        error, 
        lastChecked, 
        lastKnownStatus, 
        shouldShowAdminFeatures,
        checkAdminStatus,
        getDebugInfo 
    } = useAdminPermissions();
    
    const [debugInfo, setDebugInfo] = useState(null);
    const [utilityStatus, setUtilityStatus] = useState(null);

    // Update debug info only when admin status changes
    useEffect(() => {
        const updateDebugInfo = () => {
            try {
                const info = getDebugInfo ? getDebugInfo() : null;
                setDebugInfo(info);
                
                const utility = adminPermissions.isCurrentUserAdmin();
                setUtilityStatus(utility);
            } catch (error) {
                console.error('Failed to get debug info:', error);
            }
        };

        updateDebugInfo();
    }, [isAdmin, loading, getDebugInfo]); // Only update when admin status changes

    const handleForceCheck = async () => {
        try {
            console.log('Forcing admin check...');
            const result = await checkAdminStatus();
            console.log('Force check result:', result);
        } catch (error) {
            console.error('Force check failed:', error);
        }
    };

    const handleClearCache = () => {
        try {
            adminPermissions.clearCache();
            console.log('Cache cleared');
        } catch (error) {
            console.error('Failed to clear cache:', error);
        }
    };

    return (
        <div style={{ 
            position: 'fixed', 
            top: '10px', 
            right: '10px', 
            background: 'white', 
            border: '2px solid #ccc', 
            padding: '15px', 
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            zIndex: 9999,
            maxWidth: '400px',
            fontSize: '12px',
            fontFamily: 'monospace'
        }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Admin Permissions Debug</h3>
            
            <div style={{ marginBottom: '10px' }}>
                <strong>Authentication:</strong>
                <div>User: {user?.email || 'None'}</div>
                <div>Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
                <div>Auth Loading: {authLoading ? '⏳' : '✅'}</div>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <strong>Admin Status (Hook):</strong>
                <div>isAdmin: {isAdmin ? '✅' : '❌'}</div>
                <div>Loading: {loading ? '⏳' : '✅'}</div>
                <div>Last Known: {lastKnownStatus ? '✅' : '❌'}</div>
                <div>Should Show Features: {shouldShowAdminFeatures ? '✅' : '❌'}</div>
                <div>Last Checked: {lastChecked ? new Date(lastChecked).toLocaleTimeString() : 'Never'}</div>
                <div>Error: {error ? '❌ ' + error.message : '✅'}</div>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <strong>Admin Status (Utility):</strong>
                <div>isCurrentUserAdmin: {utilityStatus ? '✅' : '❌'}</div>
            </div>

            {debugInfo && (
                <div style={{ marginBottom: '10px' }}>
                    <strong>Cache State:</strong>
                    <div>Admin Status: {debugInfo.cacheState?.adminStatus ? '✅' : '❌'}</div>
                    <div>Last Known: {debugInfo.cacheState?.lastKnownStatus ? '✅' : '❌'}</div>
                    <div>Loading: {debugInfo.cacheState?.loading ? '⏳' : '✅'}</div>
                    <div>Grace Period: {debugInfo.errorHandling?.isInGracePeriod ? '⏳' : '✅'}</div>
                    <div>API Calls: {debugInfo.apiCalls?.totalCalls || 0}</div>
                    <div>Success Rate: {debugInfo.apiCalls?.successRate || '0%'}</div>
                </div>
            )}

            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                <button 
                    onClick={handleForceCheck}
                    style={{ 
                        padding: '5px 10px', 
                        fontSize: '11px',
                        background: '#007cba',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Force Check
                </button>
                <button 
                    onClick={handleClearCache}
                    style={{ 
                        padding: '5px 10px', 
                        fontSize: '11px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Clear Cache
                </button>
            </div>

            <div style={{ marginTop: '10px', fontSize: '10px', color: '#666' }}>
                Updated: {new Date().toLocaleTimeString()}
            </div>
        </div>
    );
};

export default AdminPermissionsDebug;