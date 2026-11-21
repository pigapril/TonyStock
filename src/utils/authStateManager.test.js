import authStateManager from './authStateManager';
import authStatusFix from './authStatusFix';

jest.mock('./authStatusFix', () => ({
  __esModule: true,
  default: { checkAuthStatus: jest.fn() }
}));
jest.mock('./requestTracker', () => ({
  __esModule: true,
  default: {
    startTracking: jest.fn(() => 'auth-status-request'),
    completeTracking: jest.fn()
  }
}));
jest.mock('./logger', () => ({
  systemLogger: {
    debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()
  }
}));

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

beforeEach(() => {
  authStateManager.reset();
  authStateManager.cacheTimeout = 30000;
  authStateManager.maxRetries = 1;
  authStateManager._delay = jest.fn(() => Promise.resolve());
  authStatusFix.checkAuthStatus.mockReset();
});

test('concurrent normal and forced callers share one auth/status request', async () => {
  const request = deferred();
  authStatusFix.checkAuthStatus.mockReturnValue(request.promise);

  const normal = authStateManager.getAuthState(false);
  const forced = authStateManager.getAuthState(true);
  expect(authStatusFix.checkAuthStatus).toHaveBeenCalledTimes(1);

  request.resolve({ isAuthenticated: true, user: { id: 'u-1', plan: 'pro' } });
  const [normalState, forcedState] = await Promise.all([normal, forced]);

  expect(normalState).toBe(forcedState);
  expect(normalState).toMatchObject({ isAuthenticated: true, user: { id: 'u-1' }, confidence: 'high' });
  expect(await authStateManager.getAuthState(false)).toBe(normalState);
  expect(authStatusFix.checkAuthStatus).toHaveBeenCalledTimes(1);
});

test('a response started before login cannot overwrite the direct authenticated state', async () => {
  const request = deferred();
  authStatusFix.checkAuthStatus.mockReturnValue(request.promise);

  const pending = authStateManager.getAuthState(false);
  const loggedInState = { isAuthenticated: true, user: { id: 'u-2', plan: 'pro' } };
  authStateManager.setAuthState(loggedInState);
  request.resolve({ isAuthenticated: false, user: null });

  const resolved = await pending;
  expect(resolved).toMatchObject({ isAuthenticated: true, user: { id: 'u-2' }, source: 'direct' });
  expect(authStateManager.getCacheInfo().authState).toMatchObject({ isAuthenticated: true, user: { id: 'u-2' } });
});

test('a transport failure preserves a recent known session as stale instead of logging it out', async () => {
  authStateManager.setAuthState({ isAuthenticated: true, user: { id: 'u-3', plan: 'pro' } });
  authStatusFix.checkAuthStatus.mockResolvedValue({ isAuthenticated: false, error: 'Network Error' });

  const result = await authStateManager.getAuthState(true);
  expect(result).toMatchObject({ isAuthenticated: true, user: { id: 'u-3' }, stale: true, confidence: 'low' });
});
