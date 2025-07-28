/**
 * Subscription Error Handler
 * 
 * Provides centralized error handling for subscription-related API calls
 * with retry mechanisms and user-friendly error messages.
 */

/**
 * Error types for subscription operations
 */
export const SUBSCRIPTION_ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
  INVALID_PLAN: 'INVALID_PLAN',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Classify error based on response status and message
 * @param {Error} error - The error object
 * @param {Response} response - The fetch response (if available)
 * @returns {string} Error type
 */
export const classifyError = (error, response = null) => {
  if (!navigator.onLine) {
    return SUBSCRIPTION_ERROR_TYPES.NETWORK_ERROR;
  }

  if (response) {
    switch (response.status) {
      case 401:
      case 403:
        return SUBSCRIPTION_ERROR_TYPES.AUTH_ERROR;
      case 429:
        return SUBSCRIPTION_ERROR_TYPES.QUOTA_EXCEEDED;
      case 404:
        return SUBSCRIPTION_ERROR_TYPES.PLAN_NOT_FOUND;
      case 400:
        return SUBSCRIPTION_ERROR_TYPES.INVALID_PLAN;
      case 500:
      case 502:
      case 503:
        return SUBSCRIPTION_ERROR_TYPES.SERVER_ERROR;
      case 408:
        return SUBSCRIPTION_ERROR_TYPES.TIMEOUT_ERROR;
      default:
        return SUBSCRIPTION_ERROR_TYPES.UNKNOWN_ERROR;
    }
  }

  // Check error message for specific patterns
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return SUBSCRIPTION_ERROR_TYPES.NETWORK_ERROR;
  }
  
  if (errorMessage.includes('timeout')) {
    return SUBSCRIPTION_ERROR_TYPES.TIMEOUT_ERROR;
  }
  
  if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
    return SUBSCRIPTION_ERROR_TYPES.AUTH_ERROR;
  }

  return SUBSCRIPTION_ERROR_TYPES.UNKNOWN_ERROR;
};

/**
 * Get user-friendly error message based on error type
 * @param {string} errorType - The error type
 * @param {function} t - Translation function
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (errorType, t) => {
  const errorMessages = {
    [SUBSCRIPTION_ERROR_TYPES.NETWORK_ERROR]: t('errors.NETWORK_ERROR', '網路連線失敗，請檢查您的網路連線'),
    [SUBSCRIPTION_ERROR_TYPES.AUTH_ERROR]: t('errors.AUTH_ERROR', '登入失敗，請稍後再試'),
    [SUBSCRIPTION_ERROR_TYPES.QUOTA_EXCEEDED]: t('errors.QUOTA_EXCEEDED', '您已超過每日使用限額，請稍後再試或升級您的方案'),
    [SUBSCRIPTION_ERROR_TYPES.PLAN_NOT_FOUND]: t('errors.PLAN_NOT_FOUND', '找不到指定的方案'),
    [SUBSCRIPTION_ERROR_TYPES.INVALID_PLAN]: t('errors.INVALID_PLAN', '無效的方案選擇'),
    [SUBSCRIPTION_ERROR_TYPES.SERVER_ERROR]: t('errors.SERVER_ERROR', '伺服器錯誤，請稍後再試'),
    [SUBSCRIPTION_ERROR_TYPES.TIMEOUT_ERROR]: t('errors.TIMEOUT_ERROR', '請求超時，請稍後再試'),
    [SUBSCRIPTION_ERROR_TYPES.UNKNOWN_ERROR]: t('errors.UNKNOWN_ERROR', '發生未知錯誤，若問題持續發生請聯繫客服')
  };

  return errorMessages[errorType] || errorMessages[SUBSCRIPTION_ERROR_TYPES.UNKNOWN_ERROR];
};

/**
 * Retry configuration for different error types
 */
const RETRY_CONFIG = {
  [SUBSCRIPTION_ERROR_TYPES.NETWORK_ERROR]: { maxRetries: 3, delay: 1000 },
  [SUBSCRIPTION_ERROR_TYPES.SERVER_ERROR]: { maxRetries: 2, delay: 2000 },
  [SUBSCRIPTION_ERROR_TYPES.TIMEOUT_ERROR]: { maxRetries: 2, delay: 1500 },
  [SUBSCRIPTION_ERROR_TYPES.UNKNOWN_ERROR]: { maxRetries: 1, delay: 1000 }
};

/**
 * Sleep function for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry wrapper for API calls with exponential backoff
 * @param {function} apiCall - The API call function to retry
 * @param {string} errorType - The type of error that occurred
 * @param {number} attempt - Current attempt number (starts at 1)
 * @returns {Promise} Promise that resolves with API result or rejects
 */
export const retryApiCall = async (apiCall, errorType, attempt = 1) => {
  const config = RETRY_CONFIG[errorType];
  
  if (!config || attempt > config.maxRetries) {
    throw new Error(`Max retries exceeded for error type: ${errorType}`);
  }

  try {
    return await apiCall();
  } catch (error) {
    if (attempt < config.maxRetries) {
      const delay = config.delay * Math.pow(2, attempt - 1); // Exponential backoff
      console.warn(`API call failed (attempt ${attempt}), retrying in ${delay}ms...`, error.message);
      
      await sleep(delay);
      return retryApiCall(apiCall, errorType, attempt + 1);
    }
    
    throw error;
  }
};

/**
 * Enhanced API call wrapper with error handling and retry logic
 * @param {function} apiCall - The API call function
 * @param {object} options - Options for error handling
 * @param {function} options.onError - Error callback function
 * @param {function} options.t - Translation function
 * @param {boolean} options.enableRetry - Whether to enable retry logic
 * @returns {Promise} Promise that resolves with API result
 */
export const withErrorHandling = async (apiCall, options = {}) => {
  const { onError, t, enableRetry = true } = options;

  try {
    return await apiCall();
  } catch (error) {
    const errorType = classifyError(error);
    const userMessage = getErrorMessage(errorType, t || ((key, fallback) => fallback));

    console.error('Subscription API error:', {
      type: errorType,
      message: error.message,
      stack: error.stack
    });

    // Call error callback if provided
    if (onError) {
      onError({
        type: errorType,
        message: userMessage,
        originalError: error
      });
    }

    // Attempt retry for retryable errors
    if (enableRetry && RETRY_CONFIG[errorType]) {
      try {
        return await retryApiCall(apiCall, errorType);
      } catch (retryError) {
        console.error('All retry attempts failed:', retryError.message);
        throw new Error(userMessage);
      }
    }

    throw new Error(userMessage);
  }
};

/**
 * Loading state manager for subscription operations
 */
export class LoadingStateManager {
  constructor() {
    this.loadingStates = new Map();
    this.listeners = new Set();
  }

  /**
   * Set loading state for an operation
   * @param {string} operation - Operation name
   * @param {boolean} isLoading - Loading state
   */
  setLoading(operation, isLoading) {
    this.loadingStates.set(operation, isLoading);
    this.notifyListeners();
  }

  /**
   * Get loading state for an operation
   * @param {string} operation - Operation name
   * @returns {boolean} Loading state
   */
  isLoading(operation) {
    return this.loadingStates.get(operation) || false;
  }

  /**
   * Check if any operation is loading
   * @returns {boolean} True if any operation is loading
   */
  isAnyLoading() {
    return Array.from(this.loadingStates.values()).some(loading => loading);
  }

  /**
   * Add listener for loading state changes
   * @param {function} listener - Listener function
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Remove listener
   * @param {function} listener - Listener function
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state changes
   */
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.loadingStates));
  }
}

export default {
  SUBSCRIPTION_ERROR_TYPES,
  classifyError,
  getErrorMessage,
  retryApiCall,
  withErrorHandling,
  LoadingStateManager
};