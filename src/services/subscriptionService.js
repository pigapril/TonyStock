/**
 * 訂閱服務 - 處理訂閱相關的 API 呼叫
 * 
 * 功能包括：
 * - 獲取當前訂閱
 * - 取消訂閱
 * - 重新啟用訂閱
 * - 獲取訂閱歷史
 * - 獲取付款歷史
 */

import apiClient from '../api/apiClient';
import { systemLogger } from '../utils/logger';

class SubscriptionService {
    constructor() {
        this.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    /**
     * 獲取用戶計劃資訊（別名方法）
     * @returns {Promise<Object>} 用戶計劃資訊
     */
    async getUserPlan() {
        const result = await this.getCurrentSubscription();
        return result.success ? result.data : null;
    }

    /**
     * 獲取當前訂閱
     * @returns {Promise<Object>} 當前訂閱資訊
     */
    async getCurrentSubscription() {
        try {
            systemLogger.info('Getting current subscription');

            const response = await this.makeRequest('GET', '/api/subscription/current');

            if (response.data.status === 'success') {
                return {
                    success: true,
                    data: response.data.data.subscription
                };
            } else {
                throw new Error(response.data.message || '獲取訂閱資訊失敗');
            }

        } catch (error) {
            systemLogger.error('Failed to get current subscription:', {
                error: error.message
            });

            return {
                success: false,
                error: error.message,
                errorCode: error.response?.data?.errorCode || 'GET_SUBSCRIPTION_FAILED'
            };
        }
    }

    /**
     * 取消訂閱
     * @param {Object} options - 取消選項
     * @param {boolean} options.cancelAtPeriodEnd - 是否在週期結束時取消
     * @param {string} options.reason - 取消原因
     * @returns {Promise<Object>} 取消結果
     */
    async cancelSubscription(options = {}) {
        try {
            const {
                cancelAtPeriodEnd = true,
                reason = 'user_requested'
            } = options;

            systemLogger.info('Cancelling subscription:', {
                cancelAtPeriodEnd,
                reason
            });

            const response = await this.makeRequest('POST', '/api/subscription/cancel', {
                cancelAtPeriodEnd,
                reason
            });

            if (response.data.status === 'success') {
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || '取消訂閱失敗');
            }

        } catch (error) {
            systemLogger.error('Failed to cancel subscription:', {
                error: error.message,
                options
            });

            return {
                success: false,
                error: error.message,
                errorCode: error.response?.data?.errorCode || 'CANCEL_SUBSCRIPTION_FAILED'
            };
        }
    }

    /**
     * 重新啟用訂閱
     * @returns {Promise<Object>} 重新啟用結果
     */
    async reactivateSubscription() {
        try {
            systemLogger.info('Reactivating subscription');

            const response = await this.makeRequest('POST', '/api/subscription/reactivate');

            if (response.data.status === 'success') {
                return {
                    success: true,
                    data: response.data.data.subscription
                };
            } else {
                throw new Error(response.data.message || '重新啟用訂閱失敗');
            }

        } catch (error) {
            systemLogger.error('Failed to reactivate subscription:', {
                error: error.message
            });

            return {
                success: false,
                error: error.message,
                errorCode: error.response?.data?.errorCode || 'REACTIVATE_SUBSCRIPTION_FAILED'
            };
        }
    }

    /**
     * 獲取訂閱歷史
     * @param {Object} options - 查詢選項
     * @param {number} options.limit - 限制數量
     * @param {number} options.offset - 偏移量
     * @returns {Promise<Object>} 訂閱歷史
     */
    async getSubscriptionHistory(options = {}) {
        try {
            const { limit = 10, offset = 0 } = options;

            systemLogger.info('Getting subscription history:', {
                limit,
                offset
            });

            const response = await this.makeRequest('GET', `/api/subscription/history?limit=${limit}&offset=${offset}`);

            // 添加詳細的響應日誌
            console.log('📊 Subscription API full response:', response);
            console.log('📊 Response data structure:', response.data);
            console.log('📊 Subscriptions array:', response.data?.data?.subscriptions);
            console.log('📊 Subscriptions length:', response.data?.data?.subscriptions?.length);

            if (response.data.status === 'success') {
                const result = {
                    success: true,
                    data: response.data.data.subscriptions,
                    pagination: response.data.data.pagination
                };
                
                console.log('📊 Final subscription result:', result);
                return result;
            } else {
                throw new Error(response.data.message || '獲取訂閱歷史失敗');
            }

        } catch (error) {
            systemLogger.error('Failed to get subscription history:', {
                error: error.message,
                options
            });

            return {
                success: false,
                error: error.message,
                errorCode: error.response?.data?.errorCode || 'GET_HISTORY_FAILED'
            };
        }
    }

    /**
     * 獲取付款歷史（模擬實作）
     * @param {Object} options - 查詢選項
     * @returns {Promise<Object>} 付款歷史
     */
    async getPaymentHistory(options = {}) {
        try {
            systemLogger.info('Getting payment history:', options);

            // 模擬 API 呼叫延遲
            await new Promise(resolve => setTimeout(resolve, 500));

            // 模擬付款歷史資料
            const mockPayments = [
                {
                    id: 'pay_001',
                    orderId: 'order_001',
                    amount: 299,
                    currency: 'TWD',
                    status: 'success',
                    paymentMethod: 'Credit Card',
                    planType: 'pro',
                    billingPeriod: 'monthly',
                    paymentDate: new Date('2025-01-01'),
                    description: 'Pro 方案 - 月付',
                    invoiceUrl: '/invoices/inv_001.pdf'
                },
                {
                    id: 'pay_002',
                    orderId: 'order_002',
                    amount: 2990,
                    currency: 'TWD',
                    status: 'success',
                    paymentMethod: 'Credit Card',
                    planType: 'pro',
                    billingPeriod: 'yearly',
                    paymentDate: new Date('2024-12-01'),
                    description: 'Pro 方案 - 年付',
                    invoiceUrl: '/invoices/inv_002.pdf'
                }
            ];

            return {
                success: true,
                data: mockPayments
            };

        } catch (error) {
            systemLogger.error('Failed to get payment history:', {
                error: error.message,
                options
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 發送 HTTP 請求（帶重試機制）
     * @param {string} method - HTTP 方法
     * @param {string} url - 請求 URL
     * @param {Object} data - 請求資料
     * @param {number} attempt - 當前嘗試次數
     * @returns {Promise<Object>} 響應資料
     */
    async makeRequest(method, url, data = null, attempt = 1) {
        try {
            const config = {
                method,
                url,
                headers: {
                    'Content-Type': 'application/json',
                },
                withCredentials: true, // 包含 cookies
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                config.data = data;
            }

            const response = await apiClient(config);
            return response;

        } catch (error) {
            systemLogger.error(`Request failed (attempt ${attempt}):`, {
                method,
                url,
                error: error.message,
                status: error.response?.status
            });

            // 如果是網路錯誤且還有重試次數，則重試
            if (this.shouldRetry(error) && attempt < this.retryAttempts) {
                systemLogger.info(`Retrying request in ${this.retryDelay}ms...`, {
                    method,
                    url,
                    attempt: attempt + 1
                });

                await this.delay(this.retryDelay);
                return this.makeRequest(method, url, data, attempt + 1);
            }

            throw error;
        }
    }

    /**
     * 判斷是否應該重試請求
     * @param {Error} error - 錯誤物件
     * @returns {boolean} 是否應該重試
     */
    shouldRetry(error) {
        // 網路錯誤或 5xx 伺服器錯誤才重試
        if (!error.response) {
            return true; // 網路錯誤
        }

        const status = error.response.status;
        return status >= 500 && status < 600; // 5xx 錯誤
    }

    /**
     * 延遲執行
     * @param {number} ms - 延遲毫秒數
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 格式化錯誤訊息
     * @param {string} errorCode - 錯誤代碼
     * @param {string} defaultMessage - 預設錯誤訊息
     * @returns {string} 格式化後的錯誤訊息
     */
    formatErrorMessage(errorCode, defaultMessage) {
        const errorMessages = {
            'USER_NOT_AUTHENTICATED': '請先登入後再進行操作',
            'SUBSCRIPTION_NOT_FOUND': '找不到有效的訂閱',
            'SUBSCRIPTION_ALREADY_CANCELLED': '訂閱已經取消',
            'SUBSCRIPTION_EXPIRED': '訂閱已過期',
            'NETWORK_ERROR': '網路連線異常，請檢查網路後重試',
            'INTERNAL_ERROR': '系統暫時異常，請稍後再試'
        };

        return errorMessages[errorCode] || defaultMessage;
    }
}

// 創建單例實例
const subscriptionService = new SubscriptionService();

export default subscriptionService;