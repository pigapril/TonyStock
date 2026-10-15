import React, { useContext } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthContext, AuthProvider } from './AuthContext';
import apiClient from '../../api/apiClient';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }));
jest.mock('../../api/apiClient', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('../../utils/enhancedApiClient', () => ({}));
jest.mock('../../utils/errorHandler', () => ({ handleApiError: error => error }));
jest.mock('../../utils/authDiagnostics', () => ({ authDiagnostics: { diagnoseAuthIssue: jest.fn() } }));
jest.mock('../../utils/authInitFix', () => ({ initialize: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../utils/authStateManager', () => ({ setAuthState: jest.fn(), invalidateCache: jest.fn() }));
jest.mock('../../utils/authPreloader', () => ({ waitForPreload: jest.fn().mockResolvedValue(null) }));
jest.mock('../../utils/authStateCache', () => ({
  loadAuthState: () => ({ user: null, confidence: 'high', cacheAge: 0 }),
  saveAuthState: jest.fn(),
  clearAuthState: jest.fn()
}));
jest.mock('../../utils/csrfClient', () => ({
  setCSRFToken: jest.fn(), clearCSRFToken: jest.fn(), isTokenInitialized: () => true
}));
jest.mock('../../utils/logger', () => ({
  systemLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

const Consumer = () => {
  const { user, logout } = useContext(AuthContext);
  return <><span>{user ? 'Signed in' : 'Signed out'}</span><button onClick={logout}>Sign out</button></>;
};

const authEvents = eventName => (window.dataLayer || []).filter(event => event.event === eventName);

beforeEach(() => {
  jest.clearAllMocks();
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
});

it('records a rejected login once and never counts it as a successful login', async () => {
  apiClient.post.mockRejectedValueOnce(new Error('Login rejected'));
  const credentialCallback = await mountAndGetCredentialCallback();

  await act(async () => { await credentialCallback({ credential: 'test-credential' }); });
  expect(screen.getByText('Signed out')).toBeInTheDocument();
  expect(authEvents('auth_login')).toHaveLength(1);
  expect(authEvents('auth_login')[0]).toMatchObject({ status: 'error', method: 'google' });
});
