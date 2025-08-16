# Admin Permissions Integration Tests

This directory contains integration tests for the admin permissions system, specifically testing the interaction between React hooks, components, and the utility class.

## Test Coverage

### adminPermissions.integration.test.js

Comprehensive integration tests covering:

#### Hook and Utility Class State Synchronization
- ✅ Synchronizes hook state with utility class when admin status changes
- ✅ Updates hook state when utility class notifies listeners
- ✅ Maintains state consistency during loading states
- ✅ Synchronizes lastKnownStatus between hook and utility class
- ✅ Handles cache clear synchronization

#### AdminOnly Component Integration with Hook
- ✅ Renders admin content when hook reports admin status
- ✅ Does not render admin content when hook reports non-admin status
- ✅ Shows graceful degradation when loading with lastKnownStatus true
- ✅ Does not show graceful degradation when loading with lastKnownStatus false
- ✅ Updates component rendering when hook state changes

#### State Consistency During Error Scenarios
- ✅ Maintains state consistency when API calls fail
- ✅ Synchronizes error states between hook and utility class

#### Multiple Component Integration
- ✅ Synchronizes state across multiple hook instances
- ✅ Handles simultaneous state changes across multiple instances

#### Performance and Memory Management
- ✅ Properly cleans up listeners when components unmount
- ✅ Handles rapid state changes without memory leaks

## Key Features Tested

### State Synchronization
The tests verify that the React hook (`useAdminPermissions`) properly synchronizes with the utility class (`adminPermissions`) through:
- Listener management for real-time updates
- Proper state propagation from utility class to React components
- Consistent state across multiple hook instances

### Graceful Degradation
Tests ensure that the system gracefully handles:
- Loading states with last known admin status
- Network errors while maintaining user experience
- Cache expiration scenarios

### Component Integration
Verifies that the `AdminOnly` component:
- Responds correctly to hook state changes
- Renders appropriate content based on admin status
- Shows loading indicators and graceful degradation when configured

### Error Handling
Tests confirm that error scenarios are handled properly:
- API failures don't break the user interface
- Error states are synchronized between hook and utility class
- Recovery mechanisms work as expected

## Running the Tests

```bash
# Run integration tests only
npm test -- --testPathPattern="adminPermissions.integration.test.js"

# Run with verbose output
npm test -- --testPathPattern="adminPermissions.integration.test.js" --verbose

# Run in watch mode for development
npm test -- --testPathPattern="adminPermissions.integration.test.js" --watch
```

## Test Architecture

The integration tests use a sophisticated mock system that:

1. **MockAdminPermissions Class**: A realistic mock that maintains state and implements the same interface as the real utility class
2. **Real React Components**: Tests use the actual `useAdminPermissions` hook and `AdminOnly` component
3. **State Synchronization**: Verifies that all parts of the system stay in sync during various scenarios

This approach ensures that the tests accurately reflect real-world usage patterns and catch integration issues that unit tests might miss.