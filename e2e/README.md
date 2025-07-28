# End-to-End (E2E) Testing for API Access Control & Usage Quota System

This directory contains comprehensive end-to-end tests that validate the complete user experience from login to hitting quota limits, ensuring both frontend and backend components work together as specified in the acceptance criteria.

## Overview

The E2E tests cover the following scenarios:
1. **Authentication Flow**: Login, logout, and protected route access
2. **API Quota Enforcement**: Daily and monthly quota limits for different user plans
3. **Error Handling**: User-friendly messages for quota exceeded and authentication errors
4. **Complete User Journey**: Full workflow from signup to quota limit

## Test Framework

We use **Playwright** for E2E testing because it provides:
- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile viewport testing
- Network request mocking
- Screenshot and video recording
- Parallel test execution

## Running Tests

### Prerequisites

1. **Backend Server**: Ensure the backend server is running on `http://localhost:8080`
2. **Frontend Server**: Ensure the frontend development server is running on `http://localhost:3000`
3. **Database**: Ensure the test database is set up with appropriate test data

### Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests step by step
npm run test:e2e:debug

# Run specific test file
npx playwright test api-quota-e2e.spec.js

# Run tests in specific browser
npx playwright test --project=chromium
```

## Test Structure

### Main Test File: `api-quota-e2e.spec.js`

This file contains the comprehensive test suite with the following test groups:

#### 1. Authentication Flow
- **Unauthenticated Access**: Verifies that unauthenticated users are redirected to login
- **Authenticated Access**: Verifies that authenticated users can access protected pages

#### 2. API Quota Enforcement
- **Quota Exceeded**: Tests the 429 error handling when daily quota is exceeded
- **Within Quota**: Tests normal API operation when within quota limits
- **Different Plan Tiers**: Tests quota enforcement for free, pro, and ultra plans

#### 3. Complete User Journey
- **End-to-End Flow**: Tests the complete workflow from login to quota limit
- **Multiple API Calls**: Simulates realistic usage patterns

#### 4. Error Handling and User Experience
- **User-Friendly Messages**: Verifies that error messages are clear and actionable
- **Resolution Guidance**: Ensures users understand how to resolve quota issues

## Test Configuration

### Environment Variables

The tests use the following configuration:

```javascript
const TEST_CONFIG = {
  BACKEND_URL: 'http://localhost:8080',
  FRONTEND_URL: 'http://localhost:3000',
  TEST_USER: {
    email: 'test@example.com',
    plan: 'free'
  },
  QUOTA_LIMITS: {
    free: { daily: 1000, monthly: 20000 },
    pro: { daily: 10000, monthly: 200000 },
    ultra: { daily: -1, monthly: -1 } // unlimited
  }
};
```

### Browser Configuration

Tests run on multiple browsers:
- **Chromium** (Chrome/Edge)
- **Firefox**
- **WebKit** (Safari)

## Mocking Strategy

### Authentication Mocking

The tests use `mockUserAuthentication()` helper function to:
- Set localStorage auth tokens
- Mock `/api/auth/status` and `/api/auth/google/verify` endpoints
- Simulate different user plans and authentication states

### API Response Mocking

Tests mock API responses to simulate:
- **Successful API calls** (200 status)
- **Quota exceeded** (429 status with appropriate error message)
- **Authentication errors** (401 status)
- **Server errors** (500 status)

## Test Data Requirements

### User Test Data

The tests expect the following test users to exist in the database:

```javascript
// Free plan user
{
  email: 'test-free@example.com',
  plan: 'free',
  // ... other user fields
}

// Pro plan user
{
  email: 'test-pro@example.com',
  plan: 'pro',
  // ... other user fields
}

// Ultra plan user
{
  email: 'test-ultra@example.com',
  plan: 'ultra',
  // ... other user fields
}
```

### Redis Test Data

Tests may require Redis to be available for quota tracking. The tests will:
- Set up usage counters in Redis
- Simulate quota limits being reached
- Clean up test data after tests complete

## Assertions and Validations

### UI Assertions

Tests validate:
- **Page URLs**: Correct routing and redirects
- **Element Visibility**: Login dialogs, error messages, quota dialogs
- **Text Content**: Error messages, user guidance, button labels
- **User Interactions**: Form submissions, button clicks, navigation

### API Assertions

Tests validate:
- **HTTP Status Codes**: 200, 401, 429, 500
- **Response Bodies**: Error messages, quota information
- **Request Headers**: Authentication tokens, content types

### Error Message Validation

Tests ensure error messages are:
- **User-friendly**: Non-technical language
- **Actionable**: Clear guidance on resolution
- **Localized**: Support for multiple languages (English/Chinese)

## Debugging and Troubleshooting

### Common Issues

1. **Server Not Running**: Ensure both frontend and backend servers are running
2. **Database Issues**: Check that test database is properly set up
3. **Authentication Failures**: Verify mock authentication setup
4. **Timing Issues**: Use proper waits and timeouts

### Debug Tools

```bash
# Run with debug mode
npm run test:e2e:debug

# Generate test report
npx playwright show-report

# Record test execution
npx playwright test --video=on

# Take screenshots on failure
npx playwright test --screenshot=only-on-failure
```

### Logs and Reports

- **HTML Report**: Generated in `playwright-report/`
- **Screenshots**: Saved in `test-results/`
- **Videos**: Recorded test executions
- **Traces**: Detailed execution traces for debugging

## Continuous Integration

### CI Configuration

For CI/CD pipelines, use:

```bash
# Install dependencies
npm ci
npx playwright install --with-deps

# Run tests in CI mode
npm run test:e2e -- --reporter=junit
```

### Environment Setup

CI environments should:
- Start backend and frontend servers
- Set up test database
- Configure Redis for testing
- Set appropriate environment variables

## Maintenance

### Updating Tests

When updating the application:
1. **Update selectors** if UI elements change
2. **Update API mocks** if endpoints change
3. **Update assertions** if behavior changes
4. **Add new tests** for new features

### Performance Considerations

- Tests run in parallel by default
- Use `test.describe.serial()` for tests that must run sequentially
- Mock external services to avoid network delays
- Clean up test data to prevent interference

## Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [API Access Control Requirements](../../.kiro/specs/api-access-control-quota/requirements.md)
- [Frontend Testing Guide](../src/components/README.md)
- [Backend API Documentation](../../backend/docs/)