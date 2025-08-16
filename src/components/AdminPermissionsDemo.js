/**
 * AdminPermissionsDemo - Demo component to test admin permissions functionality
 * 
 * This component demonstrates the admin permissions system in action.
 * It shows different content based on admin status and provides debug information.
 */

import React from 'react';
import { useAdminPermissions } from '../hooks/useAdminPermissions';
import { useAuth } from './Auth/useAuth';
import AdminOnly from './AdminOnly';
import adminPermissions from '../utils/adminPermissions';

const AdminPermissionsDemo = () => {
    const { user, isAuthenticated } = useAuth();
    const {
        isAdmin,
        loading,
        error,
        shouldShowAdminFeatures,
        checkAdminStatus,
        refreshAdminStatus,
        getDebugInfo
    } = useAdminPermissions();

    const handleRefreshAdminStatus = async () => {
        try {
            await refreshAdminStatus();
        } catch (err) {
            console.error('Failed to refresh admin status:', err);
        }
    };

    const handleCheckAdminStatus = async () => {
        try {
            const status = await checkAdminStatus();
            console.log('Admin status check result:', status);
        } catch (err) {
            console.error('Failed to check admin status:', err);
        }
    };

    const debugInfo = getDebugInfo();

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Admin Permissions Demo</h1>
            
            {/* Authentication Status */}
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
                <h2>Authentication Status</h2>
                <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
                <p><strong>User:</strong> {user ? user.email : 'Not logged in'}</p>
            </div>

            {/* Admin Status */}
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
                <h2>Admin Status</h2>
                <p><strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}</p>
                <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
                <p><strong>Should Show Admin Features:</strong> {shouldShowAdminFeatures ? 'Yes' : 'No'}</p>
                {error && <p style={{ color: 'red' }}><strong>Error:</strong> {error.message}</p>}
                
                <div style={{ marginTop: '10px' }}>
                    <button 
                        onClick={handleCheckAdminStatus}
                        style={{ marginRight: '10px', padding: '5px 10px' }}
                    >
                        Check Admin Status
                    </button>
                    <button 
                        onClick={handleRefreshAdminStatus}
                        style={{ padding: '5px 10px' }}
                    >
                        Refresh Admin Status
                    </button>
                </div>
            </div>

            {/* AdminOnly Component Demo */}
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
                <h2>AdminOnly Component Demo</h2>
                
                <h3>Basic Admin Content</h3>
                <AdminOnly>
                    <div style={{ padding: '10px', backgroundColor: '#e8f5e8', border: '1px solid #4caf50', borderRadius: '3px' }}>
                        🔒 This content is only visible to administrators!
                    </div>
                </AdminOnly>
                
                <h3>Admin Content with Fallback</h3>
                <AdminOnly 
                    fallback={
                        <div style={{ padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '3px' }}>
                            ⚠️ You need admin privileges to see the admin content.
                        </div>
                    }
                >
                    <div style={{ padding: '10px', backgroundColor: '#e8f5e8', border: '1px solid #4caf50', borderRadius: '3px' }}>
                        🔒 Admin content with fallback message for non-admins.
                    </div>
                </AdminOnly>
                
                <h3>Admin Content with Loading</h3>
                <AdminOnly 
                    showLoading={true}
                    fallback={
                        <div style={{ padding: '10px', backgroundColor: '#f8d7da', border: '1px solid #dc3545', borderRadius: '3px' }}>
                            ❌ Access denied - Admin only area.
                        </div>
                    }
                >
                    <div style={{ padding: '10px', backgroundColor: '#e8f5e8', border: '1px solid #4caf50', borderRadius: '3px' }}>
                        🔒 Admin content with loading state support.
                    </div>
                </AdminOnly>
            </div>

            {/* Utility Functions Demo */}
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
                <h2>Utility Functions Demo</h2>
                <p><strong>adminPermissions.isCurrentUserAdmin():</strong> {adminPermissions.isCurrentUserAdmin() ? 'Yes' : 'No'}</p>
                <p><strong>adminPermissions.shouldShowAdminFeatures():</strong> {adminPermissions.shouldShowAdminFeatures() ? 'Yes' : 'No'}</p>
                <p><strong>adminPermissions.isLoading():</strong> {adminPermissions.isLoading() ? 'Yes' : 'No'}</p>
                <p><strong>adminPermissions.isCacheValid():</strong> {adminPermissions.isCacheValid() ? 'Yes' : 'No'}</p>
                
                <div style={{ marginTop: '10px' }}>
                    <button 
                        onClick={() => adminPermissions.clearCache()}
                        style={{ marginRight: '10px', padding: '5px 10px' }}
                    >
                        Clear Cache
                    </button>
                    <button 
                        onClick={async () => {
                            try {
                                const status = await adminPermissions.checkIsAdmin();
                                console.log('Direct utility check result:', status);
                            } catch (err) {
                                console.error('Direct utility check failed:', err);
                            }
                        }}
                        style={{ padding: '5px 10px' }}
                    >
                        Direct Utility Check
                    </button>
                </div>
            </div>

            {/* Debug Information */}
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
                <h2>Debug Information</h2>
                <pre style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '3px', overflow: 'auto' }}>
                    {JSON.stringify(debugInfo, null, 2)}
                </pre>
            </div>

            {/* Instructions */}
            <div style={{ padding: '15px', backgroundColor: '#d1ecf1', border: '1px solid #bee5eb', borderRadius: '5px' }}>
                <h2>Instructions</h2>
                <ol>
                    <li>Log in with an admin account (pigapril@gmail.com) to see admin content</li>
                    <li>Log in with a regular account to see fallback content</li>
                    <li>Try the buttons to test different admin permission functions</li>
                    <li>Check the browser console for detailed logs</li>
                    <li>Use the debug information to understand the internal state</li>
                </ol>
            </div>
        </div>
    );
};

export default AdminPermissionsDemo;