/**
 * Debug script for admin permissions issue
 * 
 * Run this in the browser console to debug the admin permissions state
 */

console.log('🔍 Starting Admin Permissions Debug...');

// Check if adminPermissions utility is available
if (window.adminPermissions) {
    console.log('✅ AdminPermissions utility found');
    
    // Get current state
    const debugInfo = window.adminPermissions.getDebugInfo();
    console.log('📊 Current AdminPermissions state:', debugInfo);
    
    // Check synchronous admin status
    const syncStatus = window.adminPermissions.isCurrentUserAdmin();
    console.log('🔄 Synchronous admin status:', syncStatus);
    
    // Check if there are any pending operations
    const hasPending = window.adminPermissions.hasPendingOperations();
    console.log('⏳ Has pending operations:', hasPending);
    
    // Force a fresh admin check
    console.log('🚀 Triggering fresh admin check...');
    window.adminPermissions.checkIsAdmin().then(result => {
        console.log('✅ Fresh admin check result:', result);
        
        // Check state after fresh check
        const newDebugInfo = window.adminPermissions.getDebugInfo();
        console.log('📊 State after fresh check:', newDebugInfo);
        
        // Check if React components are using the correct state
        console.log('🔍 Checking React component state...');
        
        // Look for AdminPage component in the DOM
        const adminPage = document.querySelector('[class*="admin-page"]');
        if (adminPage) {
            console.log('✅ AdminPage component found in DOM');
        } else {
            console.log('❌ AdminPage component NOT found in DOM');
        }
        
        // Look for access denied message
        const accessDenied = document.querySelector('[class*="access-denied"]');
        if (accessDenied) {
            console.log('❌ Access denied message found:', accessDenied.textContent);
        } else {
            console.log('✅ No access denied message found');
        }
        
        // Check for admin features
        const adminFeatures = document.querySelectorAll('[class*="admin"], [data-testid*="admin"]');
        console.log('🎯 Admin features found:', adminFeatures.length);
        
    }).catch(error => {
        console.error('❌ Fresh admin check failed:', error);
    });
    
} else {
    console.log('❌ AdminPermissions utility NOT found on window object');
    
    // Check if it's available in a different way
    console.log('🔍 Checking for adminPermissions in other locations...');
    
    // Check React DevTools or other possible locations
    if (window.React) {
        console.log('✅ React found on window');
    }
    
    // Try to find it in the module system
    try {
        const adminPermissions = require('./src/utils/adminPermissions');
        console.log('✅ Found adminPermissions via require:', adminPermissions);
    } catch (e) {
        console.log('❌ Could not require adminPermissions:', e.message);
    }
}

// Check current URL and routing
console.log('🌐 Current URL:', window.location.href);
console.log('📍 Current pathname:', window.location.pathname);

// Check if we're on the admin page
if (window.location.pathname.includes('nk-admin')) {
    console.log('✅ Currently on admin page');
} else {
    console.log('ℹ️ Not currently on admin page');
}

// Check authentication state
const authToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
if (authToken) {
    console.log('✅ Auth token found');
} else {
    console.log('❌ No auth token found');
}

// Check for any React error boundaries or errors
const reactErrors = document.querySelectorAll('[class*="error"], [class*="Error"]');
if (reactErrors.length > 0) {
    console.log('⚠️ Potential React errors found:', reactErrors);
} else {
    console.log('✅ No obvious React errors found');
}

console.log('🔍 Admin Permissions Debug Complete');

// Export debug function for manual use
window.debugAdminPermissions = function() {
    console.log('🔄 Manual debug triggered...');
    
    if (window.adminPermissions) {
        const state = window.adminPermissions.getDebugInfo();
        console.table({
            'Admin Status': state.cacheState?.adminStatus,
            'Last Known Status': state.cacheState?.lastKnownStatus,
            'Loading': state.cacheState?.loading,
            'Last Check': state.cacheState?.lastCheck ? new Date(state.cacheState.lastCheck).toLocaleString() : 'Never',
            'Grace Period': state.errorHandling?.isInGracePeriod,
            'API Calls': state.apiCalls?.totalCalls,
            'Success Rate': state.apiCalls?.successRate
        });
        
        return {
            isCurrentUserAdmin: window.adminPermissions.isCurrentUserAdmin(),
            debugInfo: state
        };
    } else {
        console.log('❌ AdminPermissions utility not available');
        return null;
    }
};

console.log('💡 Use window.debugAdminPermissions() to run manual debug');