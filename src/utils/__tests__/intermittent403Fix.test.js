/**
 * 間歇性 403 錯誤修復測試
 */

// Mock axios before importing modules
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }))
}));

// Mock fetch
global.fetch = jest.fn();

// Mock authStatusFix
jest.mock('../authStatusFix', () => ({
  checkAuthStatus: jest.fn(() => Promise.resolve({ isAuthenticated: false }))
}));

// Mock authDiagnostics
jest.mock('../authDiagnostics', () => ({
  authDiagnostics: {
    logAuthState: jest.fn()
  }
}));

describe('Intermittent 403 Error Fix', () => {
  let authStateManager;
  let requestTracker;
  let csrfClient;
  let authGuard;

  beforeAll(async () => {
    // Import modules after mocking
    authStateManager = (await import('../authStateManager')).default;
    requestTracker = (await import('../requestTracker')).default;
    csrfClient = (await import('../csrfClient')).default;
    authGuard = (await import('../authGuard')).default;
  });

  beforeEach(() => {
    // Reset all modules before each test
    authStateManager.reset();
    requestTracker.clearTracking();
    csrfClient.clearCSRFToken();
    authGuard.reset();
    
    // Clear fetch mock
    fetch.mockClear();
  });

  describe('AuthStateManager', () => {
    test('should initialize with correct default state', () => {
      const cacheInfo = authStateManager.getCacheInfo();
      
      expect(cacheInfo.hasCache).toBe(false);
      expect(cacheInfo.isValid).toBe(false);
      expect(cacheInfo.consecutiveFailures).toBe(0);
    });

    test('should handle state subscription correctly', () => {
      let receivedState = null;
      
      const unsubscribe = authStateManager.subscribe((state) => {
        receivedState = state;
      });
      
      // Set a test state
      const testState = { isAuthenticated: true, source: 'test' };
      authStateManager.setAuthState(testState);
      
      expect(receivedState).toBeTruthy();
      expect(receivedState.isAuthenticated).toBe(true);
      expect(receivedState.source).toBe('direct');
      
      unsubscribe();
    });

    test('should provide health status', () => {
      const healthStatus = authStateManager.getHealthStatus();
      
      expect(healthStatus).toHaveProperty('status');
      expect(healthStatus).toHaveProperty('consecutiveFailures');
      expect(healthStatus).toHaveProperty('isReliable');
      expect(['healthy', 'warning', 'critical']).toContain(healthStatus.status);
    });

    test('should handle cache invalidation', () => {
      // Set initial state
      authStateManager.setAuthState({ isAuthenticated: true, source: 'test' });
      
      let cacheInfo = authStateManager.getCacheInfo();
      expect(cacheInfo.hasCache).toBe(true);
      
      // Invalidate cache
      authStateManager.invalidateCache();
      
      cacheInfo = authStateManager.getCacheInfo();
      expect(cacheInfo.hasCache).toBe(false);
    });

    test('should track state history', () => {
      // Set initial state
      authStateManager.setAuthState({ isAuthenticated: true, source: 'test' });
      
      const history = authStateManager.getStateHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[0]).toHaveProperty('isAuthenticated');
    });
  });

  describe('RequestTracker', () => {
    test('should track requests correctly', () => {
      const requestId = requestTracker.startTracking('/api/test', {
        method: 'GET',
        credentials: 'include'
      });
      
      expect(requestId).toBeTruthy();
      expect(requestId).toMatch(/^req_\d+_\d+$/);
      
      // Complete the request
      requestTracker.completeTracking(requestId, {
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']])
      });
      
      const stats = requestTracker.getErrorStats();
      expect(stats.total).toBe(1);
      expect(stats.errors).toBe(0);
    });

    test('should detect 403 errors', () => {
      const requestId = requestTracker.startTracking('/api/test-403', {
        method: 'POST',
        credentials: 'include'
      });
      
      requestTracker.completeTracking(requestId, {
        status: 403,
        statusText: 'Forbidden',
        headers: new Map([['content-type', 'application/json']])
      });
      
      const stats = requestTracker.getErrorStats();
      expect(stats.total).toBe(1);
      expect(stats.error403).toBe(1);
      expect(stats.errors).toBe(1);
      
      // Check if analysis was performed
      const requestDetails = requestTracker.getRequestDetails(requestId);
      expect(requestDetails).toBeTruthy();
      expect(requestDetails.analysis).toBeTruthy();
    });

    test('should provide error statistics', () => {
      const stats = requestTracker.getErrorStats();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('error403');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('averageDuration');
    });
  });

  describe('CSRFClient', () => {
    test('should initialize with correct default state', () => {
      expect(csrfClient.isTokenInitialized()).toBe(false);
      expect(csrfClient.getCSRFToken()).toBe(null);
    });

    test('should provide health status', () => {
      const healthStatus = csrfClient.getHealthStatus();
      
      expect(healthStatus).toHaveProperty('status');
      expect(healthStatus).toHaveProperty('isInitialized');
      expect(healthStatus).toHaveProperty('hasToken');
      expect(healthStatus).toHaveProperty('consecutiveFailures');
      expect(['healthy', 'warning', 'critical']).toContain(healthStatus.status);
    });

    test('should provide error statistics', () => {
      const errorStats = csrfClient.getErrorStats();
      
      expect(errorStats).toHaveProperty('initializationFailures');
      expect(errorStats).toHaveProperty('tokenRefreshFailures');
      expect(errorStats).toHaveProperty('consecutiveFailures');
      expect(errorStats).toHaveProperty('isInitialized');
      expect(errorStats).toHaveProperty('hasToken');
    });

    test('should handle token setting', () => {
      const testToken = 'test-csrf-token-123';
      
      csrfClient.setCSRFToken(testToken);
      
      expect(csrfClient.isTokenInitialized()).toBe(true);
      expect(csrfClient.getCSRFToken()).toBe(testToken);
    });

    test('should clear token correctly', () => {
      csrfClient.setCSRFToken('test-token');
      expect(csrfClient.isTokenInitialized()).toBe(true);
      
      csrfClient.clearCSRFToken();
      
      expect(csrfClient.isTokenInitialized()).toBe(false);
      expect(csrfClient.getCSRFToken()).toBe(null);
    });
  });

  describe('AuthGuard', () => {
    test('should provide health status', () => {
      const healthStatus = authGuard.getHealthStatus();
      
      expect(healthStatus).toHaveProperty('status');
      expect(healthStatus).toHaveProperty('consecutiveFailures');
      expect(healthStatus).toHaveProperty('isInitializing');
      expect(healthStatus).toHaveProperty('authStateReliable');
      expect(healthStatus).toHaveProperty('csrfTokenReady');
      expect(['healthy', 'warning', 'critical']).toContain(healthStatus.status);
    });

    test('should handle reset correctly', () => {
      authGuard.reset();
      
      const healthStatus = authGuard.getHealthStatus();
      expect(healthStatus.consecutiveFailures).toBe(0);
      expect(healthStatus.isInitializing).toBe(false);
    });

    test('should provide error statistics', () => {
      const errorStats = authGuard.getErrorStats();
      
      expect(errorStats).toHaveProperty('initializationFailures');
      expect(errorStats).toHaveProperty('requestFailures');
      expect(errorStats).toHaveProperty('consecutiveFailures');
      expect(errorStats).toHaveProperty('authStateReliable');
      expect(errorStats).toHaveProperty('csrfTokenInitialized');
    });
  });

  describe('Integration Tests', () => {
    test('should handle system reset correctly', () => {
      // Set some initial state
      authStateManager.setAuthState({ isAuthenticated: true, source: 'test' });
      csrfClient.setCSRFToken('test-token');
      
      // Reset all systems
      authStateManager.reset();
      csrfClient.clearCSRFToken();
      authGuard.reset();
      
      // Check that everything is reset
      expect(authStateManager.getCacheInfo().hasCache).toBe(false);
      expect(csrfClient.isTokenInitialized()).toBe(false);
      expect(authGuard.getHealthStatus().consecutiveFailures).toBe(0);
    });

    test('should provide comprehensive health information', () => {
      const authStateHealth = authStateManager.getHealthStatus();
      const csrfHealth = csrfClient.getHealthStatus();
      const authGuardHealth = authGuard.getHealthStatus();
      
      // All health objects should have required properties
      expect(authStateHealth.status).toBeTruthy();
      expect(csrfHealth.status).toBeTruthy();
      expect(authGuardHealth.status).toBeTruthy();
      
      // Health statuses should be valid
      const validStatuses = ['healthy', 'warning', 'critical'];
      expect(validStatuses).toContain(authStateHealth.status);
      expect(validStatuses).toContain(csrfHealth.status);
      expect(validStatuses).toContain(authGuardHealth.status);
    });

    test('should handle subscription mechanism', () => {
      let notificationCount = 0;
      
      const unsubscribe = authStateManager.subscribe(() => {
        notificationCount++;
      });
      
      // Trigger state changes
      authStateManager.setAuthState({ isAuthenticated: true, source: 'test1' });
      authStateManager.setAuthState({ isAuthenticated: false, source: 'test2' });
      
      expect(notificationCount).toBeGreaterThan(0);
      
      unsubscribe();
    });

    test('should track consecutive failures', () => {
      const initialHealth = authStateManager.getHealthStatus();
      expect(initialHealth.consecutiveFailures).toBe(0);
      
      // Simulate failures by directly setting the counter
      authStateManager.consecutiveFailures = 2;
      
      const updatedHealth = authStateManager.getHealthStatus();
      expect(updatedHealth.consecutiveFailures).toBe(2);
      expect(updatedHealth.status).not.toBe('healthy');
    });
  });
});