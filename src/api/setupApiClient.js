// 檔案: src/api/setupApiClient.js
import { setupApiClientInterceptors } from './apiClient';

/**
 * Initialize API client with required dependencies
 * This should be called once during app initialization
 */
export const initializeApiClient = (dependencies) => {
  const {
    authLogout,
    showToast,
    openDialog,
    navigate,
    t
  } = dependencies;

  // Validate required dependencies
  if (!authLogout || typeof authLogout !== 'function') {
    console.warn('initializeApiClient: authLogout function is required for 401 handling');
  }
  
  if (!showToast || typeof showToast !== 'function') {
    console.warn('initializeApiClient: showToast function is required for error notifications');
  }
  
  if (!openDialog || typeof openDialog !== 'function') {
    console.warn('initializeApiClient: openDialog function is required for user interactions');
  }
  
  if (!navigate || typeof navigate !== 'function') {
    console.warn('initializeApiClient: navigate function is required for redirects');
  }
  
  if (!t || typeof t !== 'function') {
    console.warn('initializeApiClient: t function is required for translations');
  }

  // Setup the interceptors
  setupApiClientInterceptors({
    logout: authLogout,
    showToastFn: showToast,
    openDialogFn: openDialog,
    navigateFn: navigate,
    translateFn: t
  });

  console.log('API Client interceptors initialized successfully');
};