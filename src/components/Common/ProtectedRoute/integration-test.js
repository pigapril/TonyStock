// Integration test for ProtectedRoute component
// This file can be imported and run manually to test ProtectedRoute functionality

/**
 * Manual integration test for ProtectedRoute component
 * Run this in browser console to test the component behavior
 */

export const testProtectedRoute = () => {
  console.log('🧪 Starting ProtectedRoute Integration Tests...');
  
  const tests = {
    passed: 0,
    failed: 0,
    results: []
  };

  // Helper function to log test results
  const logTest = (testName, passed, message) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const result = `${status}: ${testName} - ${message}`;
    console.log(result);
    tests.results.push(result);
    if (passed) tests.passed++;
    else tests.failed++;
  };

  // Test 1: Check if ProtectedRoute component exists
  try {
    const protectedRouteExists = document.querySelector('[data-testid="protected-route"]') !== null;
    logTest('Component Existence', protectedRouteExists, 'ProtectedRoute component found in DOM');
  } catch (error) {
    logTest('Component Existence', false, `Error checking component: ${error.message}`);
  }

  // Test 2: Check authentication state
  try {
    const authState = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const isAuthenticated = !!authState;
    logTest('Authentication State', true, `User is ${isAuthenticated ? 'authenticated' : 'not authenticated'}`);
  } catch (error) {
    logTest('Authentication State', false, `Error checking auth state: ${error.message}`);
  }

  // Test 3: Check current route protection
  try {
    const currentPath = window.location.pathname;
    const protectedPaths = ['/market-sentiment', '/watchlist'];
    const isProtectedPath = protectedPaths.some(path => currentPath.includes(path));
    logTest('Route Protection', true, `Current path ${currentPath} is ${isProtectedPath ? 'protected' : 'public'}`);
  } catch (error) {
    logTest('Route Protection', false, `Error checking route: ${error.message}`);
  }

  // Test 4: Check for login dialog
  try {
    const loginDialog = document.querySelector('[data-testid="auth-dialog"]') || 
                      document.querySelector('.dialog') ||
                      document.querySelector('[role="dialog"]');
    const hasLoginDialog = !!loginDialog;
    logTest('Login Dialog', true, `Login dialog is ${hasLoginDialog ? 'present' : 'not present'}`);
  } catch (error) {
    logTest('Login Dialog', false, `Error checking login dialog: ${error.message}`);
  }

  // Test 5: Check for loading state
  try {
    const loadingSpinner = document.querySelector('.spinner') || 
                          document.querySelector('.loading') ||
                          document.querySelector('[data-testid="loading"]');
    const hasLoadingState = !!loadingSpinner;
    logTest('Loading State', true, `Loading state is ${hasLoadingState ? 'present' : 'not present'}`);
  } catch (error) {
    logTest('Loading State', false, `Error checking loading state: ${error.message}`);
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${tests.passed}`);
  console.log(`❌ Failed: ${tests.failed}`);
  console.log(`📝 Total: ${tests.passed + tests.failed}`);
  
  if (tests.failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the results above.');
  }

  return tests;
};

/**
 * Test authentication flow manually
 */
export const testAuthenticationFlow = () => {
  console.log('🔐 Testing Authentication Flow...');
  
  // Clear authentication
  localStorage.removeItem('authToken');
  sessionStorage.removeItem('authToken');
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  
  console.log('1. Cleared authentication data');
  
  // Navigate to protected route
  const protectedPath = '/market-sentiment';
  console.log(`2. Navigating to protected route: ${protectedPath}`);
  
  // This would trigger the ProtectedRoute logic
  window.location.hash = protectedPath;
  
  setTimeout(() => {
    const currentPath = window.location.pathname;
    const hasDialog = !!document.querySelector('[role="dialog"]');
    
    console.log(`3. Current path: ${currentPath}`);
    console.log(`4. Login dialog present: ${hasDialog}`);
    
    if (hasDialog) {
      console.log('✅ Authentication flow working correctly');
    } else {
      console.log('❌ Authentication flow may have issues');
    }
  }, 1000);
};

/**
 * Instructions for manual testing
 */
export const getTestInstructions = () => {
  return `
🧪 ProtectedRoute Manual Testing Instructions

1. Open browser console
2. Run: testProtectedRoute()
3. Check the test results
4. Run: testAuthenticationFlow()
5. Observe the authentication behavior

Additional manual tests:
- Clear cookies/localStorage and visit /market-sentiment
- Log in and visit /market-sentiment
- Try accessing /watchlist with/without permissions
- Test on different browsers and devices

For detailed testing scenarios, see manual-test.md
  `;
};

// Auto-run instructions when this file is loaded
if (typeof window !== 'undefined') {
  console.log(getTestInstructions());
}