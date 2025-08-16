/**
 * Live Admin Permissions Test Script
 * 
 * Run this in the browser console to test admin permissions in real-time
 * 
 * Usage:
 * 1. Open browser console
 * 2. Copy and paste this entire script
 * 3. Run: testAdminPermissions()
 */

window.testAdminPermissions = async function() {
    console.log('🚀 Starting Live Admin Permissions Test...');
    
    // Test 1: Check if adminPermissions utility is available
    console.log('\n📋 Test 1: AdminPermissions Utility Availability');
    if (window.adminPermissions) {
        console.log('✅ AdminPermissions utility found');
        
        // Get current state
        const debugInfo = window.adminPermissions.getDebugInfo();
        console.log('📊 Current state:', debugInfo);
        
        // Test synchronous check
        const syncResult = window.adminPermissions.isCurrentUserAdmin();
        console.log('🔄 Synchronous check result:', syncResult);
        
    } else {
        console.log('❌ AdminPermissions utility NOT found');
        return;
    }
    
    // Test 2: Force a fresh API call
    console.log('\n📋 Test 2: Fresh API Call');
    try {
        const freshResult = await window.adminPermissions.checkIsAdmin();
        console.log('✅ Fresh API call result:', freshResult);
        
        // Check state after API call
        const newDebugInfo = window.adminPermissions.getDebugInfo();
        console.log('📊 State after API call:', newDebugInfo);
        
    } catch (error) {
        console.log('❌ Fresh API call failed:', error);
    }
    
    // Test 3: Check DOM elements
    console.log('\n📋 Test 3: DOM Elements Check');
    
    // Look for admin page elements
    const adminPage = document.querySelector('.admin-page');
    console.log('Admin page element:', adminPage ? '✅ Found' : '❌ Not found');
    
    // Look for access denied elements
    const accessDenied = document.querySelector('.admin-access-denied');
    console.log('Access denied element:', accessDenied ? '❌ Found (showing access denied)' : '✅ Not found (good)');
    
    // Look for admin content
    const adminContent = document.querySelector('.admin-content');
    console.log('Admin content element:', adminContent ? '✅ Found' : '❌ Not found');
    
    // Test 4: Check React component state (if debug component is available)
    console.log('\n📋 Test 4: React Component State');
    
    // Try to find React component state through DOM
    const debugComponent = document.querySelector('[style*="position: fixed"]');
    if (debugComponent) {
        console.log('✅ Debug component found');
        console.log('Debug component content:', debugComponent.textContent);
    } else {
        console.log('❌ Debug component not found');
    }
    
    // Test 5: Manual API call to verify backend
    console.log('\n📋 Test 5: Manual Backend API Call');
    try {
        const response = await fetch('/api/auth/admin-status', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('✅ Manual API call response:', data);
        
        if (data.data && data.data.isAdmin) {
            console.log('✅ Backend confirms admin status: TRUE');
        } else {
            console.log('❌ Backend admin status: FALSE');
        }
        
    } catch (error) {
        console.log('❌ Manual API call failed:', error);
    }
    
    // Test 6: Check localStorage/sessionStorage
    console.log('\n📋 Test 6: Storage Check');
    const authToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    console.log('Auth token:', authToken ? '✅ Found' : '❌ Not found');
    
    const adminCache = localStorage.getItem('adminPermissions');
    console.log('Admin cache:', adminCache ? '✅ Found' : '❌ Not found');
    if (adminCache) {
        try {
            const parsed = JSON.parse(adminCache);
            console.log('Admin cache content:', parsed);
        } catch (e) {
            console.log('❌ Failed to parse admin cache');
        }
    }
    
    console.log('\n🎯 Test Summary:');
    console.log('If backend returns isAdmin: true but frontend shows access denied,');
    console.log('the issue is likely in the React state synchronization.');
    console.log('Check the debug component or console logs for state mismatches.');
    
    return {
        utilityAvailable: !!window.adminPermissions,
        currentState: window.adminPermissions ? window.adminPermissions.getDebugInfo() : null,
        syncResult: window.adminPermissions ? window.adminPermissions.isCurrentUserAdmin() : null
    };
};

// Auto-run if on admin page
if (window.location.pathname.includes('nk-admin')) {
    console.log('🎯 Auto-running admin permissions test (on admin page)...');
    setTimeout(() => {
        window.testAdminPermissions();
    }, 2000);
} else {
    console.log('💡 Run window.testAdminPermissions() to test admin permissions');
    console.log('💡 Or navigate to the admin page for auto-test');
}