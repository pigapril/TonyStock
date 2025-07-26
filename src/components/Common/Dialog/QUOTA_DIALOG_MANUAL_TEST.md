# Quota Exceeded Dialog - Manual Testing Guide

This guide provides instructions for manually testing the quota exceeded dialog functionality.

## Overview

The quota exceeded dialog is triggered when the API client receives a 429 (Too Many Requests) response from the backend. It provides user-friendly feedback about quota violations and offers upgrade options.

## Testing Methods

### Method 1: Using Browser Developer Tools

1. **Open the application** in your browser
2. **Open Developer Tools** (F12 or right-click → Inspect)
3. **Go to the Console tab**
4. **Execute the following code** to manually trigger the quota dialog:

```javascript
// Get the dialog context (assuming it's available globally)
// This simulates receiving a 429 error from the API
const event = new CustomEvent('quotaExceeded', {
  detail: {
    quota: 1000,
    usage: 1000,
    resetTime: '2024-01-01T12:00:00Z',
    upgradeUrl: 'https://example.com/pricing'
  }
});

// If the app has a global dialog opener, use it
if (window.openDialog) {
  window.openDialog('quotaExceeded', {
    quota: 1000,
    usage: 1000,
    resetTime: '2024-01-01T12:00:00Z',
    upgradeUrl: 'https://example.com/pricing',
    message: 'You have exceeded your daily usage limit.'
  });
}
```

### Method 2: Using Network Tab to Mock 429 Response

1. **Open Developer Tools** → **Network tab**
2. **Make an API request** that would normally succeed
3. **Right-click on the request** in the Network tab
4. **Select "Edit and Resend"** (Chrome) or similar option
5. **Modify the response** to return status 429 with appropriate body:

```json
{
  "error": "Too Many Requests",
  "data": {
    "quota": 1000,
    "usage": 1000,
    "resetTime": "2024-01-01T12:00:00Z",
    "upgradeUrl": "https://example.com/pricing"
  }
}
```

### Method 3: Using Storybook (if available)

1. **Start Storybook**: `npm run storybook`
2. **Navigate to**: Components → Dialog → QuotaExceededDialog
3. **View different scenarios**:
   - Default dialog
   - With quota details
   - With custom upgrade URL
   - Minimal message

### Method 4: Backend Integration Test

1. **Temporarily modify** the quota limits in your backend configuration
2. **Set a very low limit** (e.g., 1 request per day)
3. **Make multiple API requests** to trigger the quota
4. **Verify the dialog appears** with correct information

## Test Scenarios

### Scenario 1: Basic Quota Exceeded
- **Expected**: Dialog shows with warning icon and default message
- **Verify**: "Usage Limit Reached" title appears
- **Verify**: Default message is displayed
- **Verify**: Close and Upgrade buttons are present

### Scenario 2: Quota with Details
- **Setup**: Include quota, usage, and resetTime in the response
- **Expected**: Dialog shows usage information (e.g., "Usage: 1000/1000")
- **Expected**: Reset time is displayed (e.g., "Resets at: 2024-01-01T12:00:00Z")

### Scenario 3: Custom Upgrade URL
- **Setup**: Include upgradeUrl in the response
- **Expected**: Upgrade button opens the custom URL
- **Verify**: Click upgrade button opens correct URL in new tab

### Scenario 4: Internationalization
- **Setup**: Switch language to Chinese (zh-TW)
- **Expected**: All text appears in Chinese
- **Verify**: Title, message, and buttons are translated

### Scenario 5: Mobile Responsiveness
- **Setup**: Use mobile device or responsive mode in DevTools
- **Expected**: Dialog adapts to mobile screen size
- **Verify**: Buttons stack vertically on mobile
- **Verify**: Text remains readable

### Scenario 6: Accessibility
- **Setup**: Use screen reader or accessibility tools
- **Expected**: Dialog is properly announced
- **Verify**: All interactive elements are keyboard accessible
- **Verify**: ARIA labels are present and correct

## Expected Behavior

### Visual Elements
- ⚠️ Warning icon with subtle animation
- Clear, non-technical error message
- Usage details (if provided)
- Reset time information (if provided)
- Two action buttons: Close and Upgrade

### Interactions
- **Close button**: Closes the dialog
- **Upgrade button**: Opens pricing/upgrade page in new tab
- **Background click**: Closes the dialog
- **Escape key**: Closes the dialog (inherited from base Dialog)

### Analytics
- Dialog open event is tracked
- Dialog close event is tracked
- Upgrade button click is tracked with URL

## Troubleshooting

### Dialog Not Appearing
1. Check that the API client interceptors are properly initialized
2. Verify that the DialogProvider is wrapping the app
3. Check console for JavaScript errors
4. Ensure the 429 response has the correct format

### Styling Issues
1. Verify that QuotaExceededDialog.css is imported
2. Check for CSS conflicts in browser DevTools
3. Test in different browsers for compatibility

### Translation Issues
1. Verify that translation keys exist in both en and zh-TW files
2. Check that i18next is properly configured
3. Test language switching functionality

## Integration Points

The quota dialog integrates with several system components:

1. **API Client** (`apiClient.js`): Handles 429 responses and triggers dialog
2. **Dialog System** (`DialogContext.js`): Manages dialog state
3. **Translation System** (`i18next`): Provides internationalization
4. **Analytics** (`analytics.js`): Tracks user interactions
5. **Toast System**: Shows additional notifications

## Performance Considerations

- Dialog prevents multiple simultaneous 429 error handling
- CSS animations respect `prefers-reduced-motion`
- Component only renders when dialog type is 'quotaExceeded'
- Proper cleanup prevents memory leaks

## Browser Compatibility

Tested and supported in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Notes for Developers

- The dialog uses the existing Dialog base component for consistency
- All text is internationalized using react-i18next
- The component follows accessibility best practices
- CSS includes dark mode and high contrast support
- Component is fully tested with Jest and React Testing Library