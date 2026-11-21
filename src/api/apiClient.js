// 檔案: src/api/apiClient.js
import axios from 'axios';

// 根據環境變數建立一個預先設定好 baseURL 的 axios 實例
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  withCredentials: true, // 如果您的 API 需要處理 cookie 或 session，請保留此行
});

// Import CSRF client for token management
let csrfClient = null;

// Lazy load CSRF client to avoid circular dependencies
const getCSRFClient = async () => {
  if (!csrfClient) {
    const { default: CSRFClient } = await import('../utils/csrfClient');
    csrfClient = CSRFClient;
  }
  return csrfClient;
};

// Global error handling state
let isHandling401 = false;
let isHandling429 = false;

// Store references to external dependencies (will be set by setupInterceptors)
let clearAuthState = null;
let showToast = null;
let openDialog = null;
let t = null;

const requiresInlineAuthPrompt = (pathname = '') => {
  // PriceAnalysis is intentionally browseable without an account and does
  // not use ProtectedRoute; its auth-required API failures need an inline prompt.
  return /^\/[^/]+\/priceanalysis(?:\/|$)/.test(pathname);
};

/**
 * Setup interceptors with external dependencies
 * This should be called once in the app initialization
 */
export const setupApiClientInterceptors = (dependencies) => {
  const { 
    clearAuthState: clearAuthStateFn,
    showToastFn, 
    openDialogFn, 
    translateFn 
  } = dependencies;

  clearAuthState = clearAuthStateFn;
  showToast = showToastFn;
  openDialog = openDialogFn;
  t = translateFn;
};

// Request interceptor to add CSRF token
apiClient.interceptors.request.use(
  async (config) => {
    // Add CSRF token for state-changing requests
    const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    
    if (stateChangingMethods.includes(config.method?.toUpperCase())) {
      // Skip CSRF token for authentication endpoints (they don't need it)
      const authEndpoints = ['/api/auth/google/verify', '/api/auth/apple/verify'];
      if (authEndpoints.some(endpoint => config.url.includes(endpoint))) {
        console.log('🛡️ ApiClient: Skipping CSRF token for auth endpoint:', config.url);
        return config;
      }
      
      try {
        const csrf = await getCSRFClient();
        
        // Ensure CSRF token is initialized
        if (!csrf.isTokenInitialized()) {
          console.log('🛡️ ApiClient: Initializing CSRF token for request:', config.url);
          await csrf.initializeCSRFToken();
        }
        
        // Add CSRF token to headers
        const token = csrf.getCSRFToken();
        if (token) {
          config.headers['X-CSRF-Token'] = token;
          console.log('🛡️ ApiClient: Added CSRF token to request:', {
            url: config.url,
            method: config.method,
            tokenLength: token.length
          });
        } else {
          console.warn('⚠️ ApiClient: No CSRF token available for request:', {
            url: config.url,
            method: config.method
          });
        }
      } catch (error) {
        console.warn('⚠️ ApiClient: Failed to add CSRF token:', {
          url: config.url,
          method: config.method,
          error: error.message
        });
        // Don't fail the request if CSRF token is not available
        // Let the backend handle the authentication/authorization
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => {
    // Reset error handling flags on successful response
    isHandling401 = false;
    isHandling429 = false;
    return response;
  },
  async (error) => {
    const { response } = error;
    
    if (!response) {
      // Network error or other non-HTTP error
      return Promise.reject(error);
    }

    const { status, data } = response;

    // Handle 403 CSRF token errors with retry
    if (status === 403 && data?.message?.includes('CSRF')) {
      console.warn('API Client: 403 CSRF error - attempting to refresh token and retry');
      
      try {
        const csrf = await getCSRFClient();
        
        // Clear current token and reinitialize
        csrf.clearCSRFToken();
        await csrf.initializeCSRFToken();
        
        // Retry the original request with new token
        const newToken = csrf.getCSRFToken();
        if (newToken) {
          const originalRequest = error.config;
          originalRequest.headers['X-CSRF-Token'] = newToken;
          
          console.log('🔄 API Client: Retrying request with new CSRF token');
          return apiClient(originalRequest);
        }
      } catch (csrfError) {
        console.error('❌ API Client: Failed to refresh CSRF token:', csrfError);
        // Fall through to normal error handling
      }
    }

    // Handle 401 Unauthorized
    if (status === 401 && error.config?.skipAuthHandling) {
      return Promise.reject(error);
    }

    if (status === 401 && !isHandling401) {
      isHandling401 = true;
      
      console.warn('API Client: 401 Unauthorized - clearing the local session');
      
      try {
        // A rejected API request is not an intentional user logout. Clear
        // local auth state without calling /logout or redirecting to the home page.
        if (clearAuthState && typeof clearAuthState === 'function') {
          await clearAuthState();
        }
        
        const currentPath = `${window.location.pathname || '/'}${window.location.search || ''}${window.location.hash || ''}`;

        // Show user-friendly message
        if (showToast && typeof showToast === 'function') {
          const message = t && typeof t === 'function' 
            ? t('errors.SESSION_EXPIRED', 'Your session has expired. Please log in again.')
            : 'Your session has expired. Please log in again.';
          showToast(message, 'warning');
        }
        
        // ProtectedRoute handles its own prompt after clearAuthState updates
        // AuthContext. Only pages without a route-level guard prompt here.
        if (requiresInlineAuthPrompt(window.location.pathname || '') && openDialog && typeof openDialog === 'function') {
          openDialog('auth', {
            returnPath: currentPath,
            message: t && typeof t === 'function' 
              ? t('protectedRoute.loginRequired', 'Please log in to continue')
              : 'Please log in to continue'
          });
        }
        
      } catch (logoutError) {
        console.error('Error during 401 handling:', logoutError);
      }
      
      // Reset flag after a delay to prevent multiple simultaneous 401s
      setTimeout(() => {
        isHandling401 = false;
      }, 1000);
    }
    
    // Handle 429 Too Many Requests (Rate Limiting)
    else if (status === 429 && !isHandling429) {
      isHandling429 = true;
      
      console.warn('API Client: 429 Too Many Requests - rate limit exceeded');
      
      // Show user-friendly rate limit message
      if (showToast && typeof showToast === 'function') {
        const message = t && typeof t === 'function' 
          ? t('errors.RATE_LIMIT_EXCEEDED', 'Too many requests. Please wait a moment and try again.')
          : 'Too many requests. Please wait a moment and try again.';
        
        showToast(message, 'warning');
      }
      
      // Reset flag after a delay
      setTimeout(() => {
        isHandling429 = false;
      }, 2000);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
