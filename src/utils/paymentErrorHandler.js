/**
 * 付款錯誤處理工具 - Phase 7 增強版
 * 
 * 提供以下功能：
 * 1. 用戶友好的錯誤訊息顯示
 * 2. 錯誤重試和恢復機制
 * 3. 錯誤狀態的視覺反饋
 * 4. 錯誤統計和分析
 * 5. 多語言錯誤訊息支援
 * 
 * @author ECPay Integration Team
 * @version 2.0.0 (Phase 7 Enhanced)
 */

import { systemLogger } from './logger';
import { useTranslation } from 'react-i18next';

class PaymentErrorHandler {
    constructor() {
        // 錯誤統計
        this.errorStats = {
            totalErrors: 0,
            errorsByType: {},
            errorsByContext: {},
            recentErrors: []
        };

        // 錯誤恢復策略
        this.recoveryStrategies = new Map();
        
        // 錯誤通知回調
        this.notificationCallbacks = [];
        
        // 初始化恢復策略
        this.initializeRecoveryStrategies();

        this.errorMessages = {
            // 認證相關錯誤
            'USER_NOT_AUTHENTICATED': {
                title: '請先登入',
                message: '您需要登入後才能進行付款',
                action: 'login',
                severity: 'warning'
            },
            'USER_NOT_FOUND': {
                title: '用戶不存在',
                message: '找不到您的帳戶資訊，請重新登入',
                action: 'login',
                severity: 'error'
            },

            // 訂單相關錯誤
            'MISSING_REQUIRED_PARAMS': {
                title: '資料不完整',
                message: '付款資料不完整，請重新選擇方案',
                action: 'retry',
                severity: 'warning'
            },
            'CREATE_ORDER_FAILED': {
                title: '創建訂單失敗',
                message: '無法創建付款訂單，請稍後再試',
                action: 'retry',
                severity: 'error'
            },
            'ORDER_NOT_FOUND': {
                title: '找不到訂單',
                message: '找不到對應的訂單資訊',
                action: 'back',
                severity: 'error'
            },
            'ORDER_EXPIRED': {
                title: '訂單已過期',
                message: '訂單已超過付款時限，請重新下單',
                action: 'retry',
                severity: 'warning'
            },
            'DUPLICATE_ORDER': {
                title: '重複訂單',
                message: '您已有進行中的訂單，請先完成或取消',
                action: 'check',
                severity: 'warning'
            },

            // 付款相關錯誤
            'PAYMENT_FAILED': {
                title: '付款失敗',
                message: '付款過程中發生問題，請檢查付款資訊後重試',
                action: 'retry',
                severity: 'error'
            },
            'INSUFFICIENT_FUNDS': {
                title: '餘額不足',
                message: '您的帳戶餘額不足，請檢查後重試',
                action: 'retry',
                severity: 'warning'
            },
            'PAYMENT_CANCELLED': {
                title: '付款已取消',
                message: '您已取消付款，如需升級請重新選擇方案',
                action: 'back',
                severity: 'info'
            },
            'INVALID_CALLBACK': {
                title: '付款驗證失敗',
                message: '付款資訊驗證失敗，請聯繫客服',
                action: 'contact',
                severity: 'error'
            },

            // 訂閱相關錯誤
            'SUBSCRIPTION_NOT_FOUND': {
                title: '找不到訂閱',
                message: '找不到有效的訂閱資訊',
                action: 'back',
                severity: 'warning'
            },
            'SUBSCRIPTION_ALREADY_CANCELLED': {
                title: '訂閱已取消',
                message: '您的訂閱已經取消',
                action: 'back',
                severity: 'info'
            },
            'SUBSCRIPTION_EXPIRED': {
                title: '訂閱已過期',
                message: '您的訂閱已過期，無法進行此操作',
                action: 'renew',
                severity: 'warning'
            },

            // 網路和系統錯誤
            'NETWORK_ERROR': {
                title: '網路連線異常',
                message: '網路連線不穩定，請檢查網路後重試',
                action: 'retry',
                severity: 'warning',
                recoverable: true,
                autoRetry: true
            },
            'VALIDATION_ERROR': {
                title: '資料驗證失敗',
                message: '提交的資料格式不正確，請檢查後重試',
                action: 'retry',
                severity: 'warning',
                recoverable: true,
                autoRetry: false
            },
            'INTERNAL_ERROR': {
                title: '系統異常',
                message: '系統暫時異常，請稍後再試或聯繫客服',
                action: 'contact',
                severity: 'error',
                recoverable: true,
                autoRetry: false
            },

            // Phase 7 新增錯誤類型
            'RATE_LIMIT_EXCEEDED': {
                title: '請求過於頻繁',
                message: '您的操作過於頻繁，請稍後再試',
                action: 'wait',
                severity: 'warning',
                recoverable: true,
                autoRetry: true,
                retryDelay: 5000
            },
            'IP_NOT_ALLOWED': {
                title: '存取被拒絕',
                message: '您的網路環境無法存取此服務，請聯繫客服',
                action: 'contact',
                severity: 'error',
                recoverable: false,
                autoRetry: false
            },
            'SECURITY_CHECK_FAILED': {
                title: '安全檢查失敗',
                message: '安全驗證失敗，請重新嘗試',
                action: 'retry',
                severity: 'error',
                recoverable: true,
                autoRetry: false
            },
            'SESSION_EXPIRED': {
                title: '登入已過期',
                message: '您的登入已過期，請重新登入',
                action: 'login',
                severity: 'warning',
                recoverable: true,
                autoRetry: false
            },
            'MAINTENANCE_MODE': {
                title: '系統維護中',
                message: '系統正在維護，請稍後再試',
                action: 'wait',
                severity: 'info',
                recoverable: true,
                autoRetry: true,
                retryDelay: 30000
            }
        };
    }

    /**
     * 初始化錯誤恢復策略
     */
    initializeRecoveryStrategies() {
        // 網路錯誤恢復策略
        this.recoveryStrategies.set('NETWORK_ERROR', {
            maxRetries: 3,
            retryDelay: 2000,
            backoffMultiplier: 1.5,
            beforeRetry: () => this.checkNetworkStatus(),
            onMaxRetriesReached: () => this.showOfflineMode()
        });

        // 認證錯誤恢復策略
        this.recoveryStrategies.set('USER_NOT_AUTHENTICATED', {
            maxRetries: 1,
            retryDelay: 0,
            beforeRetry: () => this.refreshAuthToken(),
            onMaxRetriesReached: () => this.redirectToLogin()
        });

        // 頻率限制恢復策略
        this.recoveryStrategies.set('RATE_LIMIT_EXCEEDED', {
            maxRetries: 2,
            retryDelay: 5000,
            backoffMultiplier: 2,
            beforeRetry: () => this.showRateLimitWarning(),
            onMaxRetriesReached: () => this.showCooldownTimer()
        });

        // 系統維護恢復策略
        this.recoveryStrategies.set('MAINTENANCE_MODE', {
            maxRetries: 5,
            retryDelay: 30000,
            backoffMultiplier: 1,
            beforeRetry: () => this.checkMaintenanceStatus(),
            onMaxRetriesReached: () => this.showMaintenanceNotice()
        });
    }

    /**
     * 處理錯誤並返回用戶友好的錯誤資訊
     * @param {Error|string} error - 錯誤物件或錯誤代碼
     * @param {string} context - 錯誤發生的上下文
     * @returns {Object} 格式化的錯誤資訊
     */
    handleError(error, context = 'unknown') {
        let errorCode = 'INTERNAL_ERROR';
        let originalMessage = '未知錯誤';

        // 解析錯誤
        if (typeof error === 'string') {
            errorCode = error;
        } else if (error && error.response && error.response.data) {
            errorCode = error.response.data.errorCode || 'INTERNAL_ERROR';
            originalMessage = error.response.data.message || error.message;
        } else if (error && error.message) {
            originalMessage = error.message;
            
            // 嘗試從錯誤訊息推斷錯誤類型
            if (error.message.includes('網路') || error.message.includes('network')) {
                errorCode = 'NETWORK_ERROR';
            } else if (error.message.includes('認證') || error.message.includes('auth')) {
                errorCode = 'USER_NOT_AUTHENTICATED';
            }
        }

        const errorInfo = this.errorMessages[errorCode] || this.errorMessages['INTERNAL_ERROR'];

        const formattedError = {
            code: errorCode,
            title: errorInfo.title,
            message: errorInfo.message,
            originalMessage,
            action: errorInfo.action,
            severity: errorInfo.severity,
            context,
            timestamp: new Date().toISOString()
        };

        systemLogger.error('Payment error handled:', formattedError);

        return formattedError;
    }

    /**
     * 獲取錯誤的建議操作
     * @param {string} action - 操作類型
     * @returns {Object} 操作建議
     */
    getActionSuggestion(action) {
        const actions = {
            'login': {
                text: '前往登入',
                url: '/login',
                variant: 'primary'
            },
            'retry': {
                text: '重試',
                action: 'retry',
                variant: 'primary'
            },
            'back': {
                text: '返回',
                action: 'back',
                variant: 'secondary'
            },
            'check': {
                text: '檢查訂單',
                url: '/account',
                variant: 'primary'
            },
            'contact': {
                text: '聯繫客服',
                url: 'mailto:support@example.com',
                variant: 'secondary'
            },
            'renew': {
                text: '重新訂閱',
                url: '/subscription',
                variant: 'primary'
            }
        };

        return actions[action] || actions['back'];
    }

    /**
     * 顯示錯誤通知
     * @param {Object} errorInfo - 錯誤資訊
     * @param {Function} onAction - 操作回調
     */
    showErrorNotification(errorInfo, onAction) {
        // 這裡可以整合通知系統，例如 toast、modal 等
        console.error('Payment Error:', errorInfo);
        
        if (onAction) {
            const suggestion = this.getActionSuggestion(errorInfo.action);
            onAction(suggestion);
        }
    }

    /**
     * 創建錯誤重試機制
     * @param {Function} operation - 要重試的操作
     * @param {Object} options - 重試選項
     * @returns {Function} 帶重試的操作函數
     */
    createRetryableOperation(operation, options = {}) {
        const { maxRetries = 3, delay = 1000, backoff = 2 } = options;

        return async (...args) => {
            let lastError;
            let currentDelay = delay;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    return await operation(...args);
                } catch (error) {
                    lastError = error;
                    
                    systemLogger.warn(`Operation failed, attempt ${attempt}/${maxRetries}:`, {
                        error: error.message,
                        attempt,
                        maxRetries
                    });

                    if (attempt < maxRetries && this.shouldRetry(error)) {
                        await new Promise(resolve => setTimeout(resolve, currentDelay));
                        currentDelay *= backoff;
                    } else {
                        break;
                    }
                }
            }

            throw lastError;
        };
    }

    /**
     * 判斷錯誤是否應該重試
     * @param {Error} error - 錯誤物件
     * @returns {boolean} 是否應該重試
     */
    shouldRetry(error) {
        if (!error.response) {
            return true; // 網路錯誤
        }

        const status = error.response.status;
        const retryableStatuses = [408, 429, 500, 502, 503, 504];
        
        return retryableStatuses.includes(status);
    }

    /**
     * 獲取錯誤的嚴重程度顏色
     * @param {string} severity - 嚴重程度
     * @returns {string} CSS 類名
     */
    getSeverityColor(severity) {
        const colors = {
            'info': 'text-blue-600 bg-blue-50 border-blue-200',
            'warning': 'text-yellow-600 bg-yellow-50 border-yellow-200',
            'error': 'text-red-600 bg-red-50 border-red-200'
        };

        return colors[severity] || colors['error'];
    }

    // ==================== Phase 7 新增功能 ====================

    /**
     * 記錄錯誤統計
     * @param {Object} errorInfo - 錯誤資訊
     */
    recordErrorStats(errorInfo) {
        this.errorStats.totalErrors++;
        
        // 按類型統計
        if (!this.errorStats.errorsByType[errorInfo.code]) {
            this.errorStats.errorsByType[errorInfo.code] = 0;
        }
        this.errorStats.errorsByType[errorInfo.code]++;

        // 按上下文統計
        if (!this.errorStats.errorsByContext[errorInfo.context]) {
            this.errorStats.errorsByContext[errorInfo.context] = 0;
        }
        this.errorStats.errorsByContext[errorInfo.context]++;

        // 記錄最近錯誤（保留最近 50 個）
        this.errorStats.recentErrors.unshift({
            ...errorInfo,
            id: Date.now() + Math.random()
        });
        
        if (this.errorStats.recentErrors.length > 50) {
            this.errorStats.recentErrors = this.errorStats.recentErrors.slice(0, 50);
        }

        // 發送錯誤統計到後端（可選）
        this.sendErrorAnalytics(errorInfo);
    }

    /**
     * 獲取錯誤統計資訊
     * @returns {Object} 錯誤統計
     */
    getErrorStats() {
        return { ...this.errorStats };
    }

    /**
     * 清除錯誤統計
     */
    clearErrorStats() {
        this.errorStats = {
            totalErrors: 0,
            errorsByType: {},
            errorsByContext: {},
            recentErrors: []
        };
    }

    /**
     * 智能錯誤恢復
     * @param {Object} errorInfo - 錯誤資訊
     * @param {Function} operation - 原始操作
     * @param {Object} options - 恢復選項
     * @returns {Promise} 恢復結果
     */
    async smartRecovery(errorInfo, operation, options = {}) {
        const strategy = this.recoveryStrategies.get(errorInfo.code);
        
        if (!strategy || !this.errorMessages[errorInfo.code]?.recoverable) {
            throw new Error(`Error ${errorInfo.code} is not recoverable`);
        }

        const {
            maxRetries = strategy.maxRetries || 3,
            retryDelay = strategy.retryDelay || 1000,
            backoffMultiplier = strategy.backoffMultiplier || 2
        } = { ...strategy, ...options };

        let currentDelay = retryDelay;
        let lastError = errorInfo;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // 執行恢復前的準備工作
                if (strategy.beforeRetry) {
                    await strategy.beforeRetry();
                }

                // 等待重試延遲
                if (attempt > 1) {
                    await this.delay(currentDelay);
                    currentDelay *= backoffMultiplier;
                }

                // 重新執行操作
                const result = await operation();
                
                // 恢復成功，記錄統計
                this.recordRecoverySuccess(errorInfo.code, attempt);
                
                return result;
            } catch (error) {
                lastError = this.handleError(error, errorInfo.context);
                
                systemLogger.warn(`Recovery attempt ${attempt}/${maxRetries} failed:`, {
                    errorCode: errorInfo.code,
                    attempt,
                    error: error.message
                });

                // 如果是最後一次嘗試或錯誤類型改變，停止重試
                if (attempt === maxRetries || lastError.code !== errorInfo.code) {
                    break;
                }
            }
        }

        // 達到最大重試次數，執行最終處理
        if (strategy.onMaxRetriesReached) {
            await strategy.onMaxRetriesReached();
        }

        this.recordRecoveryFailure(errorInfo.code, maxRetries);
        throw lastError;
    }

    /**
     * 延遲函數
     * @param {number} ms - 延遲毫秒數
     * @returns {Promise} 延遲 Promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 記錄恢復成功統計
     * @param {string} errorCode - 錯誤代碼
     * @param {number} attempts - 嘗試次數
     */
    recordRecoverySuccess(errorCode, attempts) {
        systemLogger.info('Error recovery successful:', {
            errorCode,
            attempts,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 記錄恢復失敗統計
     * @param {string} errorCode - 錯誤代碼
     * @param {number} maxAttempts - 最大嘗試次數
     */
    recordRecoveryFailure(errorCode, maxAttempts) {
        systemLogger.error('Error recovery failed:', {
            errorCode,
            maxAttempts,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 註冊錯誤通知回調
     * @param {Function} callback - 通知回調函數
     */
    onError(callback) {
        if (typeof callback === 'function') {
            this.notificationCallbacks.push(callback);
        }
    }

    /**
     * 移除錯誤通知回調
     * @param {Function} callback - 要移除的回調函數
     */
    offError(callback) {
        const index = this.notificationCallbacks.indexOf(callback);
        if (index > -1) {
            this.notificationCallbacks.splice(index, 1);
        }
    }

    /**
     * 觸發錯誤通知
     * @param {Object} errorInfo - 錯誤資訊
     */
    triggerErrorNotifications(errorInfo) {
        this.notificationCallbacks.forEach(callback => {
            try {
                callback(errorInfo);
            } catch (error) {
                systemLogger.error('Error notification callback failed:', error);
            }
        });
    }

    /**
     * 發送錯誤分析資料到後端
     * @param {Object} errorInfo - 錯誤資訊
     */
    async sendErrorAnalytics(errorInfo) {
        try {
            // 只在生產環境發送分析資料
            if (process.env.NODE_ENV !== 'production') {
                return;
            }

            const analyticsData = {
                errorCode: errorInfo.code,
                severity: errorInfo.severity,
                context: errorInfo.context,
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: errorInfo.timestamp,
                sessionId: this.getSessionId()
            };

            // 使用 beacon API 發送（不阻塞主線程）
            if (navigator.sendBeacon) {
                navigator.sendBeacon('/api/analytics/error', JSON.stringify(analyticsData));
            }
        } catch (error) {
            // 靜默處理分析發送錯誤
            systemLogger.debug('Failed to send error analytics:', error);
        }
    }

    /**
     * 獲取會話 ID
     * @returns {string} 會話 ID
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('payment_session_id');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('payment_session_id', sessionId);
        }
        return sessionId;
    }

    // ==================== 恢復策略輔助方法 ====================

    /**
     * 檢查網路狀態
     */
    async checkNetworkStatus() {
        if (!navigator.onLine) {
            throw new Error('Network is offline');
        }
        
        // 嘗試 ping 一個輕量級端點
        try {
            await fetch('/api/health', { 
                method: 'HEAD',
                cache: 'no-cache',
                timeout: 5000 
            });
        } catch (error) {
            throw new Error('Network connectivity check failed');
        }
    }

    /**
     * 顯示離線模式
     */
    showOfflineMode() {
        this.triggerErrorNotifications({
            type: 'offline_mode',
            message: '網路連線中斷，已切換到離線模式'
        });
    }

    /**
     * 刷新認證令牌
     */
    async refreshAuthToken() {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Token refresh failed');
            }
            
            return await response.json();
        } catch (error) {
            throw new Error('Unable to refresh authentication token');
        }
    }

    /**
     * 重定向到登入頁面
     */
    redirectToLogin() {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
    }

    /**
     * 顯示頻率限制警告
     */
    showRateLimitWarning() {
        this.triggerErrorNotifications({
            type: 'rate_limit_warning',
            message: '請求過於頻繁，正在等待重試...'
        });
    }

    /**
     * 顯示冷卻計時器
     */
    showCooldownTimer() {
        this.triggerErrorNotifications({
            type: 'cooldown_timer',
            message: '請求頻率過高，請等待 30 秒後再試'
        });
    }

    /**
     * 檢查維護狀態
     */
    async checkMaintenanceStatus() {
        try {
            const response = await fetch('/api/system/status');
            const status = await response.json();
            
            if (status.maintenance) {
                throw new Error('System is still under maintenance');
            }
        } catch (error) {
            throw new Error('Maintenance status check failed');
        }
    }

    /**
     * 顯示維護通知
     */
    showMaintenanceNotice() {
        this.triggerErrorNotifications({
            type: 'maintenance_notice',
            message: '系統維護中，請稍後再試'
        });
    }

    /**
     * 增強版錯誤處理（覆蓋原方法）
     */
    handleError(error, context = 'unknown') {
        // 調用原始處理邏輯
        const errorInfo = this.originalHandleError(error, context);
        
        // 記錄統計
        this.recordErrorStats(errorInfo);
        
        // 觸發通知
        this.triggerErrorNotifications(errorInfo);
        
        // 檢查是否需要自動恢復
        const errorConfig = this.errorMessages[errorInfo.code];
        if (errorConfig?.autoRetry && errorConfig?.recoverable) {
            errorInfo.autoRecoverable = true;
            errorInfo.retryDelay = errorConfig.retryDelay || 2000;
        }
        
        return errorInfo;
    }

    /**
     * 保存原始錯誤處理方法
     */
    originalHandleError(error, context = 'unknown') {
        let errorCode = 'INTERNAL_ERROR';
        let originalMessage = '未知錯誤';

        // 解析錯誤
        if (typeof error === 'string') {
            errorCode = error;
        } else if (error && error.response && error.response.data) {
            errorCode = error.response.data.errorCode || error.response.data.code || 'INTERNAL_ERROR';
            originalMessage = error.response.data.message || error.message;
        } else if (error && error.message) {
            originalMessage = error.message;
            
            // 嘗試從錯誤訊息推斷錯誤類型
            if (error.message.includes('網路') || error.message.includes('network')) {
                errorCode = 'NETWORK_ERROR';
            } else if (error.message.includes('認證') || error.message.includes('auth')) {
                errorCode = 'USER_NOT_AUTHENTICATED';
            }
        }

        const errorInfo = this.errorMessages[errorCode] || this.errorMessages['INTERNAL_ERROR'];

        const formattedError = {
            code: errorCode,
            title: errorInfo.title,
            message: errorInfo.message,
            originalMessage,
            action: errorInfo.action,
            severity: errorInfo.severity,
            context,
            timestamp: new Date().toISOString(),
            recoverable: errorInfo.recoverable || false,
            autoRetry: errorInfo.autoRetry || false
        };

        systemLogger.error('Payment error handled:', formattedError);

        return formattedError;
    }
}

// 創建單例實例
const paymentErrorHandler = new PaymentErrorHandler();

export default paymentErrorHandler;