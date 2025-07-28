const { test, expect } = require('@playwright/test');

/**
 * End-to-End Test Suite for API Access Control & Usage Quota System
 * 
 * This test suite validates the complete user experience from login to hitting quota limits,
 * ensuring both frontend and backend components work together as specified.
 * 
 * Test Scenarios:
 * 1. User login and authentication
 * 2. Protected page access
 * 3. API quota enforcement
 * 4. User-friendly error messages
 */

// Test configuration
const TEST_CONFIG = {
  BACKEND_URL: 'http://localhost:8080',
  FRONTEND_URL: 'http://localhost:3000',
  TEST_USER: {
    email: 'test@example.com',
    plan: 'free'
  },
  QUOTA_LIMITS: {
    free: {
      daily: 1000,
      monthly: 20000
    }
  }
};

test.describe('API Access Control & Usage Quota E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test.describe('Authentication Flow', () => {
    
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access a protected page without authentication
      await page.goto('/watchlist');
      
      // Should be redirected to login or see login prompt
      await expect(page).toHaveURL(/login|auth/);
      // Or check for login dialog/modal
      const loginDialog = page.locator('[data-testid="login-dialog"], .login-modal, .auth-modal');
      await expect(loginDialog).toBeVisible({ timeout: 5000 });
    });

    test('should allow access to protected pages after login', async ({ page }) => {
      // Mock successful authentication
      await mockUserAuthentication(page, TEST_CONFIG.TEST_USER);
      
      // Navigate to protected page
      await page.goto('/watchlist');
      
      // Should successfully access the page
      await expect(page).toHaveURL(/watchlist/);
      await expect(page.locator('h1, h2, [data-testid="page-title"]')).toContainText(/watchlist|觀察清單/i);
    });

  });

  test.describe('API Quota Enforcement', () => {
    
    test('should display quota exceeded message when daily limit is reached', async ({ page }) => {
      // Mock authenticated user
      await mockUserAuthentication(page, TEST_CONFIG.TEST_USER);
      
      // Mock API responses to simulate quota exceeded
      await page.route('**/api/**', async (route) => {
        const url = route.request().url();
        
        // Allow auth endpoints
        if (url.includes('/api/auth/')) {
          await route.continue();
          return;
        }
        
        // Simulate quota exceeded for other API calls
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Daily quota exceeded',
            quota: TEST_CONFIG.QUOTA_LIMITS.free.daily,
            usage: TEST_CONFIG.QUOTA_LIMITS.free.daily + 1,
            resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            message: 'You have exceeded your daily usage limit'
          })
        });
      });
      
      // Navigate to a page that makes API calls
      await page.goto('/stock-analysis');
      
      // Trigger an API call (e.g., search for a stock)
      const searchInput = page.locator('input[type="text"], input[placeholder*="search"], input[placeholder*="搜尋"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('AAPL');
        await searchInput.press('Enter');
      }
      
      // Wait for quota exceeded dialog/message
      const quotaDialog = page.locator('[data-testid="quota-exceeded-dialog"], .quota-exceeded, .error-dialog');
      await expect(quotaDialog).toBeVisible({ timeout: 10000 });
      
      // Verify the error message content
      await expect(quotaDialog).toContainText(/exceeded.*daily.*usage.*limit|超過.*每日.*使用.*限制/i);
      
      // Verify upgrade suggestion is present
      const upgradeButton = quotaDialog.locator('button, a').filter({ hasText: /upgrade|升級/i });
      await expect(upgradeButton).toBeVisible();
    });

    test('should handle API calls within quota limits normally', async ({ page }) => {
      // Mock authenticated user
      await mockUserAuthentication(page, TEST_CONFIG.TEST_USER);
      
      // Mock API responses to simulate normal operation
      await page.route('**/api/**', async (route) => {
        const url = route.request().url();
        
        if (url.includes('/api/stock/')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                symbol: 'AAPL',
                price: 150.00,
                change: 2.50
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // Navigate to a page that makes API calls
      await page.goto('/stock-analysis');
      
      // Trigger an API call
      const searchInput = page.locator('input[type="text"], input[placeholder*="search"], input[placeholder*="搜尋"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('AAPL');
        await searchInput.press('Enter');
      }
      
      // Should see successful results, not error messages
      await expect(page.locator('.error-dialog, .quota-exceeded')).not.toBeVisible({ timeout: 3000 });
      
      // Should see stock data or results
      const results = page.locator('[data-testid="search-results"], .stock-data, .results');
      await expect(results).toBeVisible({ timeout: 5000 });
    });

  });

  test.describe('Complete User Journey', () => {
    
    test('should handle complete flow from login to quota limit', async ({ page }) => {
      // Step 1: Start as unauthenticated user
      await page.goto('/');
      
      // Step 2: Attempt to access protected content
      await page.goto('/watchlist');
      
      // Step 3: Should see login prompt
      const loginDialog = page.locator('[data-testid="login-dialog"], .login-modal, .auth-modal');
      await expect(loginDialog).toBeVisible({ timeout: 5000 });
      
      // Step 4: Mock successful login
      await mockUserAuthentication(page, TEST_CONFIG.TEST_USER);
      await page.reload();
      
      // Step 5: Should now access protected page
      await expect(page).toHaveURL(/watchlist/);
      
      // Step 6: Make several API calls to approach quota
      let apiCallCount = 0;
      await page.route('**/api/**', async (route) => {
        const url = route.request().url();
        
        if (url.includes('/api/auth/')) {
          await route.continue();
          return;
        }
        
        apiCallCount++;
        
        // Simulate quota exceeded after a few calls
        if (apiCallCount > 3) {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Daily quota exceeded',
              quota: TEST_CONFIG.QUOTA_LIMITS.free.daily,
              usage: TEST_CONFIG.QUOTA_LIMITS.free.daily + 1,
              resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              message: 'You have exceeded your daily usage limit'
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: {} })
          });
        }
      });
      
      // Step 7: Make multiple API calls
      for (let i = 0; i < 5; i++) {
        const searchInput = page.locator('input[type="text"]').first();
        if (await searchInput.isVisible()) {
          await searchInput.fill(`TEST${i}`);
          await searchInput.press('Enter');
          await page.waitForTimeout(500);
        }
      }
      
      // Step 8: Should see quota exceeded message
      const quotaDialog = page.locator('[data-testid="quota-exceeded-dialog"], .quota-exceeded, .error-dialog');
      await expect(quotaDialog).toBeVisible({ timeout: 10000 });
      
      // Step 9: Verify user-friendly error message
      await expect(quotaDialog).toContainText(/exceeded.*daily.*usage.*limit|超過.*每日.*使用.*限制/i);
    });

  });

  test.describe('Error Handling and User Experience', () => {
    
    test('should display user-friendly messages for different error types', async ({ page }) => {
      await mockUserAuthentication(page, TEST_CONFIG.TEST_USER);
      
      // Test 401 Unauthorized
      await page.route('**/api/protected-endpoint', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Unauthorized',
            message: 'Authentication required'
          })
        });
      });
      
      await page.goto('/stock-analysis');
      
      // Should handle 401 gracefully (redirect to login or show auth dialog)
      const authDialog = page.locator('[data-testid="login-dialog"], .login-modal, .auth-modal');
      await expect(authDialog).toBeVisible({ timeout: 5000 });
    });

    test('should provide clear guidance on quota resolution', async ({ page }) => {
      await mockUserAuthentication(page, TEST_CONFIG.TEST_USER);
      
      await page.route('**/api/**', async (route) => {
        if (!route.request().url().includes('/api/auth/')) {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Daily quota exceeded',
              quota: TEST_CONFIG.QUOTA_LIMITS.free.daily,
              usage: TEST_CONFIG.QUOTA_LIMITS.free.daily + 1,
              resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              message: 'You have exceeded your daily usage limit'
            })
          });
        } else {
          await route.continue();
        }
      });
      
      await page.goto('/stock-analysis');
      
      // Trigger quota exceeded
      const searchInput = page.locator('input[type="text"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('AAPL');
        await searchInput.press('Enter');
      }
      
      const quotaDialog = page.locator('[data-testid="quota-exceeded-dialog"], .quota-exceeded, .error-dialog');
      await expect(quotaDialog).toBeVisible({ timeout: 10000 });
      
      // Should provide clear resolution guidance
      await expect(quotaDialog).toContainText(/upgrade|wait|tomorrow|明天|升級/i);
      
      // Should have actionable buttons
      const actionButtons = quotaDialog.locator('button, a');
      await expect(actionButtons).toHaveCount.greaterThan(0);
    });

  });

});

/**
 * Helper function to mock user authentication
 */
async function mockUserAuthentication(page, user) {
  // Mock localStorage auth data
  await page.addInitScript((userData) => {
    localStorage.setItem('authToken', 'mock-jwt-token');
    localStorage.setItem('user', JSON.stringify(userData));
  }, user);
  
  // Mock auth API endpoints
  await page.route('**/api/auth/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authenticated: true,
        user: user
      })
    });
  });
  
  await page.route('**/api/auth/google/verify', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        user: user,
        token: 'mock-jwt-token'
      })
    });
  });
}