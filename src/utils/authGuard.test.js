import authGuard from './authGuard';
import authStateManager from './authStateManager';

jest.mock('axios', () => ({ isCancel: jest.fn(() => false) }));
jest.mock('./authStateManager', () => ({
  __esModule: true,
  default: {
    subscribe: jest.fn(() => jest.fn()),
    getAuthState: jest.fn(),
    isAuthStateReliable: jest.fn(() => true),
    getHealthStatus: jest.fn(() => ({ status: 'healthy' })),
    reset: jest.fn()
  }
}));
jest.mock('./csrfClient', () => ({
  __esModule: true,
  default: { clearCSRFToken: jest.fn() }
}));
jest.mock('./authDiagnostics', () => ({
  authDiagnostics: { logAuthState: jest.fn() }
}));

beforeEach(() => {
  jest.clearAllMocks();
  authStateManager.getAuthState.mockResolvedValue({ isAuthenticated: true, user: { id: 'u-1' } });
});

test('AuthGuard uses the shared status result without a second validate-session request or CSRF bootstrap', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn();
  try {
    await expect(authGuard.ensureAuthenticated()).resolves.toBe(true);
    expect(authStateManager.getAuthState).toHaveBeenCalledTimes(1);
    expect(global.fetch).not.toHaveBeenCalled();
  } finally {
    global.fetch = originalFetch;
  }
});

test('AuthGuard still allows anonymous requests to reach the server for public endpoints', async () => {
  authStateManager.getAuthState.mockResolvedValue({ isAuthenticated: false, user: null });
  const request = jest.fn().mockResolvedValue('public-response');

  await expect(authGuard.makeAuthenticatedRequest(request)).resolves.toBe('public-response');
  expect(request).toHaveBeenCalledTimes(1);
});
