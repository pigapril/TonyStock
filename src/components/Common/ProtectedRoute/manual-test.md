# ProtectedRoute Component Manual Test Guide

This document provides manual testing instructions for the ProtectedRoute component as specified in Task 10.

## Test Scenarios

### 1. Authentication Check Test

**Objective**: Verify that unauthenticated users are redirected to login

**Steps**:
1. Clear all authentication data (cookies/localStorage)
   - Open browser DevTools (F12)
   - Go to Application tab
   - Clear all cookies and localStorage
2. Navigate to a protected page: `/market-sentiment`, `/priceanalysis`, or `/watchlist`
3. **Expected Result**: 
   - Should be redirected to home page (`/`)
   - Login dialog should appear
   - Should see message about login being required

### 2. Authenticated User Test

**Objective**: Verify that authenticated users can access protected content

**Steps**:
1. Log in to the application using Google authentication
2. Navigate to a protected page: `/market-sentiment`, `/priceanalysis`, or `/watchlist`
3. **Expected Result**: 
   - Should see the page content (MarketSentimentIndex, PriceAnalysis, or WatchlistContainer)
   - No redirect should occur
   - No login dialog should appear

### 3. Loading State Test

**Objective**: Verify loading spinner appears during authentication check

**Steps**:
1. Clear authentication data
2. Navigate to `/market-sentiment`
3. Observe the initial loading state (may be brief)
4. **Expected Result**: 
   - Should briefly show loading spinner with text
   - Then redirect to login

### 4. Watchlist Access Control Test

**Objective**: Verify watchlist-specific access control

**Steps**:
1. Log in as a user without watchlist access
2. Navigate to `/watchlist`
3. **Expected Result**: 
   - Should be redirected to `/unauthorized` page
   - Should not see watchlist content

### 5. Component Rendering Test

**Objective**: Verify children are rendered correctly when authenticated

**Steps**:
1. Log in to the application
2. Navigate to `/market-sentiment`
3. **Expected Result**: 
   - Should see the complete MarketSentimentIndex component
   - All functionality should work normally

### 6. requireAuth=false Test

**Objective**: Verify component works when authentication is not required

**Steps**:
1. Clear authentication data
2. Navigate to a page that uses `<ProtectedRoute requireAuth={false}>`
3. **Expected Result**: 
   - Should render content without authentication
   - No redirect should occur

## Test Results Checklist

- [ ] Unauthenticated users are redirected from protected routes
- [ ] Login dialog appears for unauthenticated users
- [ ] Authenticated users can access protected content
- [ ] Loading state displays correctly
- [ ] Watchlist access control works properly
- [ ] Children components render correctly when authenticated
- [ ] requireAuth=false bypasses authentication check

## Browser Compatibility

Test the above scenarios in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## Mobile Testing

Test the above scenarios on:
- [ ] Mobile Chrome
- [ ] Mobile Safari
- [ ] Mobile Firefox

## Notes

- The ProtectedRoute component uses the existing authentication system
- It integrates with the dialog system for login prompts
- Analytics tracking is implemented for route protection events
- The component handles both general authentication and watchlist-specific access control