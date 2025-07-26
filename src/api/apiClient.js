// 檔案: src/api/apiClient.js
import axios from 'axios';

// 根據環境變數建立一個預先設定好 baseURL 的 axios 實例
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  withCredentials: true, // 如果您的 API 需要處理 cookie 或 session，請保留此行
});

// Global error handling state
let isHandling401 = false;
let isHandling429 = false;

// Store references to external dependencies (will be set by setupInterceptors)
let authLogout = null;
let showToast = null;
let openDialog = null;
let navigate = null;
let t = null;

/**
 * Setup interceptors with external dependencies
 * This should be called once in the app initialization
 */
export const setupApiClientInterceptors = (dependencies) => {
  const { 
    logout, 
    showToastFn, 
    openDialogFn, 
    navigateFn, 
    translateFn 
  } = dependencies;

  authLogout = logout;
  showToast = showToastFn;
  openDialog = openDialogFn;
  navigate = navigateFn;
  t = translateFn;
};

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

    // Handle 401 Unauthorized
    if (status === 401 && !isHandling401) {
      isHandling401 = true;
      
      console.warn('API Client: 401 Unauthorized - clearing auth data and redirecting to login');
      
      try {
        // Clear authentication data
        if (authLogout && typeof authLogout === 'function') {
          await authLogout();
        }
        
        // Show user-friendly message
        if (showToast && typeof showToast === 'function') {
          const message = t && typeof t === 'function' 
            ? t('errors.SESSION_EXPIRED', 'Your session has expired. Please log in again.')
            : 'Your session has expired. Please log in again.';
          showToast(message, 'warning');
        }
        
        // Open login dialog
        if (openDialog && typeof openDialog === 'function') {
          openDialog('auth', {
            returnPath: window.location.pathname,
            message: t && typeof t === 'function' 
              ? t('protectedRoute.loginRequired', 'Please log in to continue')
              : 'Please log in to continue'
          });
        }
        
        // Navigate to home page
        if (navigate && typeof navigate === 'function') {
          navigate('/', { replace: true });
        }
        
      } catch (logoutError) {
        console.error('Error during 401 handling:', logoutError);
      }
      
      // Reset flag after a delay to prevent multiple simultaneous 401s
      setTimeout(() => {
        isHandling401 = false;
      }, 1000);
    }
    
    // Handle 429 Too Many Requests (Quota Exceeded)
    else if (status === 429 && !isHandling429) {
      isHandling429 = true;
      
      console.warn('API Client: 429 Too Many Requests - quota exceeded');
      
      // Extract quota information from response
      const quotaInfo = data?.data || data || {};
      const { quota, usage, resetTime, upgradeUrl } = quotaInfo;
      
      // Show user-friendly quota exceeded message
      if (showToast && typeof showToast === 'function') {
        let message;
        if (t && typeof t === 'function') {
          message = t('errors.QUOTA_EXCEEDED', 'You have exceeded your daily usage limit. Please try again later or upgrade your plan.');
        } else {
          message = 'You have exceeded your daily usage limit. Please try again later or upgrade your plan.';
        }
        
        // Add quota details if available
        if (quota && usage) {
          const quotaDetails = t && typeof t === 'function'
            ? t('errors.QUOTA_DETAILS', { usage, quota, defaultValue: `Usage: ${usage}/${quota}` })
            : `Usage: ${usage}/${quota}`;
          message += ` ${quotaDetails}`;
        }
        
        if (resetTime) {
          const resetDetails = t && typeof t === 'function'
            ? t('errors.QUOTA_RESET', { resetTime, defaultValue: `Resets at: ${resetTime}` })
            : `Resets at: ${resetTime}`;
          message += ` ${resetDetails}`;
        }
        
        showToast(message, 'warning');
      }
      
      // Open quota exceeded dialog if available
      if (openDialog && typeof openDialog === 'function') {
        openDialog('quotaExceeded', {
          quota,
          usage,
          resetTime,
          upgradeUrl,
          message: t && typeof t === 'function' 
            ? t('errors.QUOTA_EXCEEDED', 'You have exceeded your daily usage limit.')
            : 'You have exceeded your daily usage limit.'
        });
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