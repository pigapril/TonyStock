import authStatusFix from './authStatusFix';

test('auth status GET uses credentials without non-safelisted headers or CORS preflight triggers', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    url: 'https://api.example.test/api/auth/status',
    redirected: false,
    headers: { get: () => 'application/json; charset=utf-8' },
    json: async () => ({ status: 'success', data: { isAuthenticated: false, user: null } })
  });

  try {
    await expect(authStatusFix.checkAuthStatus()).resolves.toEqual({ isAuthenticated: false, user: null });
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/status'), {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
  } finally {
    global.fetch = originalFetch;
  }
});
