/**
 * Test React Imports
 * 
 * Simple test to verify React imports are working correctly
 */

// Test the useAdminPermissions hook import
try {
    const { useAdminPermissions } = require('./src/hooks/useAdminPermissions');
    console.log('✅ useAdminPermissions hook imported successfully');
} catch (error) {
    console.error('❌ useAdminPermissions hook import failed:', error.message);
}

// Test the AdminPage component import
try {
    const AdminPage = require('./src/pages/AdminPage');
    console.log('✅ AdminPage component imported successfully');
} catch (error) {
    console.error('❌ AdminPage component import failed:', error.message);
}

// Test the AdminPermissionsDebug component import
try {
    const AdminPermissionsDebug = require('./src/components/AdminPermissionsDebug');
    console.log('✅ AdminPermissionsDebug component imported successfully');
} catch (error) {
    console.error('❌ AdminPermissionsDebug component import failed:', error.message);
}

console.log('React imports test completed');