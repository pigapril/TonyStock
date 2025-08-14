/**
 * 付款錯誤處理 React Hook
 * 
 * 提供 React 組件中使用的錯誤處理功能
 * 
 * @author ECPay Integration Team
 * @version 1.0.0
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import paymentErrorHandler from '../utils/paymentErrorHandler';
import { systemLogger } from '../utils/logger';

/**
 * 付款錯誤處理 Hook
 * @param {Object} options - 配置選項
 * @returns {Object} 錯誤處理相關的狀態和方法
 */
export const usePaymentErrorHandler = (options = {}) => {
    const { t } = useTranslation();
    const {
        context = 'payment',
        autoRetry = false,
        maxRetries = 3,
        retryDelay = 2000,
        onError,
        onRecovery,
        enableAnalytics = true
    } = options;

    // 錯誤狀態
    const [error, setError] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [isRecovering, setIsRecovering] = useState(false);

    // 引用
    const retryTimeoutRef = useRef(null);
    const operationRef = useRef(null);

    /**
     * 處理錯誤
     */
    const handleError = useCallback((error, customContext) => {
        const errorInfo = paymentErrorHandler.handleError(error, customContext || context);
        setError(errorInfo);
        setIsRetrying(false);
        setIsRecovering(false);

        // 觸發外部錯誤回調
        if (onError) {
            onError(errorInfo);
        }

        // 檢查是否需要自動重試
        if (autoRetry && errorInfo.autoRecoverable && retryCount < maxRetries) {
            scheduleRetry();
        }

        return errorInfo;
    }, [context, autoRetry, maxRetries, retryCount, onError]);

    /**
     * 安排重試
     */
    const scheduleRetry = useCallback(() => {
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
        }

        setIsRetrying(true);
        
        const delay = error?.retryDelay || retryDelay;
        retryTimeoutRef.current = setTimeout(() => {
            if (operationRef.current) {
                retry();
            }
        }, delay);
    }, [error, retryDelay]);

    /**
     * 手動重試
     */
    const retry = useCallback(async () => {
        if (!operationRef.current || retryCount >= maxRetries) {
            return;
        }

        setIsRetrying(true);
        setRetryCount(prev => prev + 1);

        try {
            const result = await operationRef.current();
            
            // 重試成功
            clearError();
            if (onRecovery) {
                onRecovery(result);
            }
            
            return result;
        } catch (retryError) {
            const errorInfo = handleError(retryError);
            
            // 如果還有重試機會且錯誤可恢復，繼續重試
            if (retryCount < maxRetries - 1 && errorInfo.autoRecoverable) {
                scheduleRetry();
            } else {
                setIsRetrying(false);
            }
            
            throw retryError;
        }
    }, [retryCount, maxRetries, handleError, onRecovery]);

    /**
     * 智能恢復
     */
    const smartRecover = useCallback(async (operation) => {
        if (!error || !error.recoverable) {
            throw new Error('Current error is not recoverable');
        }

        setIsRecovering(true);
        operationRef.current = operation;

        try {
            const result = await paymentErrorHandler.smartRecovery(error, operation, {
                maxRetries,
                retryDelay
            });
            
            clearError();
            if (onRecovery) {
                onRecovery(result);
            }
            
            return result;
        } catch (recoveryError) {
            handleError(recoveryError);
            throw recoveryError;
        } finally {
            setIsRecovering(false);
        }
    }, [error, maxRetries, retryDelay, handleError, onRecovery]);

    /**
     * 執行帶錯誤處理的操作
     */
    const executeWithErrorHandling = useCallback(async (operation, operationContext) => {
        operationRef.current = operation;
        clearError();
        setRetryCount(0);

        try {
            return await operation();
        } catch (error) {
            handleError(error, operationContext);
            throw error;
        }
    }, [handleError]);

    /**
     * 清除錯誤
     */
    const clearError = useCallback(() => {
        setError(null);
        setIsRetrying(false);
        setIsRecovering(false);
        setRetryCount(0);
        
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }
        
        operationRef.current = null;
    }, []);

    /**
     * 獲取錯誤訊息（支援多語言）
     */
    const getErrorMessage = useCallback((errorInfo = error) => {
        if (!errorInfo) return null;

        // 嘗試獲取翻譯後的訊息
        const translationKey = `errors.${errorInfo.code}`;
        const translatedMessage = t(translationKey);
        
        // 如果翻譯存在且不等於 key，使用翻譯
        if (translatedMessage !== translationKey) {
            return translatedMessage;
        }
        
        // 否則使用預設訊息
        return errorInfo.message;
    }, [error, t]);

    /**
     * 獲取錯誤標題（支援多語言）
     */
    const getErrorTitle = useCallback((errorInfo = error) => {
        if (!errorInfo) return null;

        const translationKey = `errors.${errorInfo.code}_title`;
        const translatedTitle = t(translationKey);
        
        if (translatedTitle !== translationKey) {
            return translatedTitle;
        }
        
        return errorInfo.title;
    }, [error, t]);

    /**
     * 獲取操作建議
     */
    const getActionSuggestion = useCallback((errorInfo = error) => {
        if (!errorInfo) return null;
        
        const suggestion = paymentErrorHandler.getActionSuggestion(errorInfo.action);
        
        // 翻譯操作文字
        const translationKey = `actions.${errorInfo.action}`;
        const translatedText = t(translationKey);
        
        if (translatedText !== translationKey) {
            suggestion.text = translatedText;
        }
        
        return suggestion;
    }, [error, t]);

    /**
     * 檢查錯誤是否可恢復
     */
    const isRecoverable = useCallback((errorInfo = error) => {
        return errorInfo?.recoverable || false;
    }, [error]);

    /**
     * 檢查是否可以重試
     */
    const canRetry = useCallback((errorInfo = error) => {
        return errorInfo?.recoverable && retryCount < maxRetries;
    }, [error, retryCount, maxRetries]);

    /**
     * 獲取重試進度
     */
    const getRetryProgress = useCallback(() => {
        if (maxRetries === 0) return 0;
        return Math.min((retryCount / maxRetries) * 100, 100);
    }, [retryCount, maxRetries]);

    // 清理定時器
    useEffect(() => {
        return () => {
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, []);

    // 錯誤統計（開發模式）
    useEffect(() => {
        if (process.env.NODE_ENV === 'development' && error) {
            systemLogger.debug('Error handled by hook:', {
                error,
                context,
                retryCount,
                isRetrying,
                isRecovering
            });
        }
    }, [error, context, retryCount, isRetrying, isRecovering]);

    return {
        // 錯誤狀態
        error,
        isRetrying,
        isRecovering,
        retryCount,
        
        // 錯誤處理方法
        handleError,
        clearError,
        retry,
        smartRecover,
        executeWithErrorHandling,
        
        // 錯誤資訊獲取
        getErrorMessage,
        getErrorTitle,
        getActionSuggestion,
        
        // 狀態檢查
        isRecoverable,
        canRetry,
        getRetryProgress,
        
        // 便利屬性
        hasError: !!error,
        errorCode: error?.code,
        errorSeverity: error?.severity,
        isNetworkError: error?.code === 'NETWORK_ERROR',
        isAuthError: error?.code === 'USER_NOT_AUTHENTICATED',
        isValidationError: error?.code === 'VALIDATION_ERROR'
    };
};

/**
 * 錯誤邊界 Hook
 * 用於捕獲組件樹中的 JavaScript 錯誤
 */
export const useErrorBoundary = () => {
    const [hasError, setHasError] = useState(false);
    const [error, setError] = useState(null);

    const resetError = useCallback(() => {
        setHasError(false);
        setError(null);
    }, []);

    const captureError = useCallback((error, errorInfo) => {
        setHasError(true);
        setError({ error, errorInfo });
        
        // 記錄到錯誤處理器
        paymentErrorHandler.handleError(error, 'error_boundary');
    }, []);

    return {
        hasError,
        error,
        resetError,
        captureError
    };
};

export default usePaymentErrorHandler;