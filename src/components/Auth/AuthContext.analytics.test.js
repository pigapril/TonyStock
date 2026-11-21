import React, { useContext } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthContext, AuthProvider } from './AuthContext';
import apiClient from '../../api/apiClient';
import authStateManager from '../../utils/authStateManager';
import authStateCache from '../../utils/authStateCache';
import csrfClient from '../../utils/csrfClient';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('../../api/apiClient', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('../../utils/enhancedApiClient', () => ({}));
jest.mock('../../utils/errorHandler', () => ({ handleApiError: error => error }));
jest.mock('../../utils/authDiagnostics', () => ({ authDiagnostics: { diagnoseAuthIssue: jest.fn() } }));
jest.mock('../../utils/authStateManager', () => ({
  getAuthState: jest.fn().mockResolvedValue({ isAuthenticated: false, user: null }),
  setAuthState: jest.fn(),
  invalidateCache: jest.fn()
}));
jest.mock('../../utils/authStateCache', () => ({
  loadAuthState: () => ({ user: null, confidence: 'high', cacheAge: 0 }),
  saveAuthState: jest.fn(),
  clearAuthState: jest.fn()
}));
jest.mock('../../utils/csrfClient', () => ({
  setCSRFToken: jest.fn(), clearCSRFToken: jest.fn(), initializeCSRFToken: jest.fn(), isTokenInitialized: () => false
}));
jest.mock('../../utils/logger', () => ({
  systemLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

const Consumer = () => {
  const { user, logout, clearAuthState } = useContext(AuthContext);
  return <>
    <span>{user ? 'Signed in' : 'Signed out'}</span>
    <button onClick={logout}>Sign out</button>
    <button onClick={clearAuthState}>Clear expired session</button>
  </>;
};

const authEvents = eventName => (window.dataLayer || []).filter(event => event.event === eventName);

beforeEach(() => {
  jest.clearAllMocks();
  mockNavigate.mockClear();
  authStateManager.getAuthState.mockResolvedValue({ isAuthenticated: false, user: null });
  sessionStorage.clear();
  delete window.dataLayer;
  window.google = { accounts: { id: { initialize: jest.fn(), disableAutoSelect: jest.fn() } } };
  apiClient.get.mockImplementation(url => Promise.resolve({
    data: { data: url.includes('admin-status') ? { isAdmin: false } : { user: null } }
  }));
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  delete window.google;
  jest.restoreAllMocks();
});

async function mountAndGetCredentialCallback() {
  render(<AuthProvider><Consumer /></AuthProvider>);
  await waitFor(() => expect(window.google.accounts.id.initialize).toHaveBeenCalled());
  // Let the initial session check settle before simulating a user login.
  await act(async () => {});
  return window.google.accounts.id.initialize.mock.calls[0][0].callback;
}

it('bootstraps through one shared AuthStateManager check and does not call authService.checkStatus directly', async () => {
  render(<AuthProvider><Consumer /></AuthProvider>);

  await waitFor(() => expect(authStateManager.getAuthState).toHaveBeenCalledTimes(1));
  expect(authStateManager.getAuthState).toHaveBeenCalledWith(false);
  expect(apiClient.get).not.toHaveBeenCalledWith('/api/auth/status', expect.anything());
});

it('defers CSRF token retrieval for an existing session until a state-changing request', async () => {
  authStateManager.getAuthState.mockResolvedValueOnce({
    isAuthenticated: true,
    user: { id: 'existing-user', plan: 'pro' },
    confidence: 'high'
  });

  render(<AuthProvider><Consumer /></AuthProvider>);
  expect(await screen.findByText('Signed in')).toBeInTheDocument();
  expect(csrfClient.initializeCSRFToken).not.toHaveBeenCalled();
});

it('records exactly one login and logout while applying the auth state', async () => {
  apiClient.post.mockResolvedValueOnce({ data: { data: { user: { id: 'test-user' }, csrfToken: 'test-csrf' } } });
  apiClient.post.mockResolvedValueOnce({ data: { data: {} } });
  const credentialCallback = await mountAndGetCredentialCallback();

  await act(async () => { await credentialCallback({ credential: 'test-credential' }); });
  expect(screen.getByText('Signed in')).toBeInTheDocument();
  expect(authEvents('auth_login')).toHaveLength(1);
  expect(authEvents('auth_login')[0]).toMatchObject({ status: 'success', method: 'google', variant: 'identity_service' });

  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(screen.getByText('Signed out')).toBeInTheDocument());
  expect(authEvents('auth_logout')).toHaveLength(1);
  expect(authEvents('auth_logout')[0]).toMatchObject({ status: 'success', trigger_source: 'user_action' });
  expect(mockNavigate).toHaveBeenCalledWith('/');
});

it('clears an expired session without calling the logout endpoint or redirecting', async () => {
  authStateManager.getAuthState.mockResolvedValueOnce({
    isAuthenticated: true,
    user: { id: 'expired-user', plan: 'pro' },
    confidence: 'high'
  });

  render(<AuthProvider><Consumer /></AuthProvider>);
  expect(await screen.findByText('Signed in')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Clear expired session' }));

  await waitFor(() => expect(screen.getByText('Signed out')).toBeInTheDocument());
  expect(authStateCache.clearAuthState).toHaveBeenCalled();
  expect(authStateManager.invalidateCache).toHaveBeenCalled();
  expect(csrfClient.clearCSRFToken).toHaveBeenCalled();
  expect(apiClient.post).not.toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalled();
});

it('records a rejected login once and never counts it as a successful login', async () => {
  apiClient.post.mockRejectedValueOnce(new Error('Login rejected'));
  const credentialCallback = await mountAndGetCredentialCallback();

  await act(async () => { await credentialCallback({ credential: 'test-credential' }); });
  expect(screen.getByText('Signed out')).toBeInTheDocument();
  expect(authEvents('auth_login')).toHaveLength(1);
  expect(authEvents('auth_login')[0]).toMatchObject({ status: 'error', method: 'google' });
});
