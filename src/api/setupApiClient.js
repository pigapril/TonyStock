// 檔案: src/api/setupApiClient.js
import { setupApiClientInterceptors } from './apiClient';

/**
 * Initialize API client with required dependencies
 * This should be called once during app initialization
 */
export const initializeApiClient = (dependencies) => {
  const {
    clearAuthState,
    showToast,
    openDialog,
    t
  } = dependencies;

  // Validate required dependencies
  if (!clearAuthState || typeof clearAuthState !== 'function') {
    console.warn('initializeApiClient: clearAuthState function is required for 401 handling');
  }
  
  if (!showToast || typeof showToast !== 'function') {
    console.warn('initializeApiClient: showToast function is required for error notifications');
  }
  
  if (!openDialog || typeof openDialog !== 'function') {
    console.warn('initializeApiClient: openDialog function is required for user interactions');
  }
  
  if (!t || typeof t !== 'function') {
    console.warn('initializeApiClient: t function is required for translations');
  }

  // Setup the interceptors
  setupApiClientInterceptors({
    clearAuthState,
    showToastFn: showToast,
    openDialogFn: openDialog,
    translateFn: t
  });

  console.log('API Client interceptors initialized successfully');
};
