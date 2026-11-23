/**
 * 付款服務 - 處理所有付款相關的 API 呼叫
 * 
 * 功能包括：
 * - 創建訂單
 * - 查詢付款狀態
 * - 處理付款流程
 * - 錯誤處理和重試
 */

import apiClient from '../api/apiClient';
import { systemLogger } from '../utils/logger';

const serializeStable = (value) => {
    if (Array.isArray(value)) {
        return `[${value.map(serializeStable).join(',')}]`;
    }

    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map(key =>
            `${JSON.stringify(key)}:${serializeStable(value[key])}`
        ).join(',')}}`;
    }

    return JSON.stringify(value) ?? 'null';
};

class PaymentService {
    constructor() {
        this.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        // Coalesce concurrent identical checkout requests in this browser tab.
        // The backend Redis lock remains the cross-tab / cross-device guard.
        this.createOrderRequests = new Map();
    }

    /**
     * 創建付款訂單
     * @param {Object} orderData - 訂單資料
     * @param {string} orderData.planType - 方案類型 ('pro')
     * @param {string} orderData.billingPeriod - 計費週期 ('monthly' | 'yearly')
     * @param {string} orderData.paymentMethod - 付款方式 (可選)
     * @returns {Promise<Object>} 訂單創建結果
     */
    async createOrder(orderData) {
        const requestKey = serializeStable(orderData);
        const existingRequest = this.createOrderRequests.get(requestKey);
        if (existingRequest) {
            return existingRequest;
        }

        const request = this.performCreateOrder(orderData);
        this.createOrderRequests.set(requestKey, request);

        try {
            return await request;
        } finally {
            if (this.createOrderRequests.get(requestKey) === request) {
                this.createOrderRequests.delete(requestKey);
            }
        }
    }

    async performCreateOrder(orderData) {
        try {
            systemLogger.info('Creating payment order:', orderData);

            // A POST whose response is lost may already have created the order.
            // Do not blindly replay checkout creation on 5xx/network failures;
            // the page has explicit lock-contention retry and backend reuse.
            const response = await this.makeRequest(
                'POST',
                '/api/payment/create-order',
                orderData,
                1,
                { retryOn5xx: false, retryOnNetworkError: false }
            );

            if (response.data.status === 'success') {
                const responseData = response.data.data;
                
                systemLogger.info('Payment order created successfully:', {
                    orderId: responseData.orderId,
                    merchantTradeNo: responseData.merchantTradeNo,
                    amount: responseData.amount
                });

                return responseData;
            } else {
                throw new Error(response.data.message || '創建訂單失敗');
            }

        } catch (error) {
            systemLogger.error('Failed to create payment order:', {
                error: error.message,
                orderData
            });

            throw error;
        }
    }

    /**
     * Lock an order before the browser submits its signed payment form to
     * ECPay. The API is one-time so a concurrent or repeated browser submit
     * cannot send the same signed payment form twice.
     * @param {string} orderId
     * @returns {Promise<Object>}
     */
    async markPaymentSubmissionStarted(orderId) {
        try {
            const response = await this.makeRequest(
                'POST',
                `/api/payment/mark-submission/${orderId}`
            );

            if (response.data.status === 'success') {
                return response.data.data;
            }

            throw new Error(response.data.message || '無法確認付款狀態');
        } catch (error) {
            systemLogger.error('Failed to mark payment submission as started:', {
                error: error.message,
                orderId
            });
            throw error;
        }
    }

    /**
     * 查詢付款狀態
     * @param {string} orderId - 訂單 ID
     * @returns {Promise<Object>} 付款狀態
     */
    async checkPaymentStatus(orderId) {
        try {
            systemLogger.info('Checking payment status:', { orderId });

            const response = await this.makeRequest('GET', `/api/payment/check-status/${orderId}`);

            if (response.data.status === 'success') {
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || '查詢付款狀態失敗');
            }

        } catch (error) {
            systemLogger.error('Failed to check payment status:', {
                error: error.message,
                orderId
            });

            return {
                success: false,
                error: error.message,
                errorCode: error.response?.data?.errorCode || 'CHECK_STATUS_FAILED'
            };
        }
    }

    /**
     * 查詢付款狀態（通過 merchantTradeNo）
     * @param {string} merchantTradeNo - 綠界交易編號
     * @returns {Promise<Object>} 付款狀態
     */
    async queryPaymentStatus(merchantTradeNo) {
        try {
            systemLogger.info('Querying payment status by merchantTradeNo:', { merchantTradeNo });

            const response = await this.makeRequest('GET', `/api/payment/status/${merchantTradeNo}`);

            if (response.data.status === 'success') {
                return response.data.data;
            } else {
                throw new Error(response.data.message || '查詢付款狀態失敗');
            }

        } catch (error) {
            systemLogger.error('Failed to query payment status:', {
                error: error.message,
                merchantTradeNo
            });

            throw error;
        }
    }

    /**
     * 獲取付款歷史記錄
     * @returns {Promise<Array>} 付款歷史列表
     */
    async getPaymentHistory() {
        try {
            systemLogger.info('Getting payment history');

            const response = await this.makeRequest('GET', '/api/payment/history');

            if (response.data.status === 'success') {
                return response.data.data;
            } else {
                throw new Error(response.data.message || '獲取付款歷史失敗');
            }

        } catch (error) {
            systemLogger.error('Failed to get payment history:', {
                error: error.message
            });

            throw error;
        }
    }

    /**
     * 取消付款
     * @param {string} orderId - 訂單 ID
     * @returns {Promise<Object>} 取消結果
     */
    async cancelPayment(orderId) {
        try {
            systemLogger.info('Cancelling payment:', { orderId });

            const response = await this.makeRequest('POST', `/api/payment/cancel-order/${orderId}`);

            if (response.data.status === 'success') {
                return response.data.data;
            } else {
                throw new Error(response.data.message || '取消付款失敗');
            }

        } catch (error) {
            systemLogger.error('Failed to cancel payment:', {
                error: error.message,
                orderId
            });

            throw error;
        }
    }

    /**
     * 重試付款
     * @param {string} orderId - 訂單 ID
     * @returns {Promise<Object>} 重試結果
     */
    async retryPayment(orderId) {
        try {
            systemLogger.info('Retrying payment:', { orderId });

            // 重新創建訂單
            const response = await this.makeRequest('POST', `/api/payment/retry/${orderId}`);

            if (response.data.status === 'success') {
                return response.data.data;
            } else {
                throw new Error(response.data.message || '重試付款失敗');
            }

        } catch (error) {
            systemLogger.error('Failed to retry payment:', {
                error: error.message,
                orderId
            });

            throw error;
        }
    }

    /**
     * 查詢付款返回狀態（用戶從綠界返回後）
     * @param {string} orderId - 訂單 ID
     * @returns {Promise<Object>} 付款返回狀態
     */
    async getPaymentReturn(orderId) {
        try {
            systemLogger.info('Getting payment return status:', { orderId });

            const response = await this.makeRequest('GET', `/api/payment/check-status/${orderId}`);

            if (response.data.status === 'success') {
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || '查詢付款返回狀態失敗');
            }

        } catch (error) {
            systemLogger.error('Failed to get payment return status:', {
                error: error.message,
                orderId
            });

            return {
                success: false,
                error: error.message,
                errorCode: error.response?.data?.errorCode || 'GET_RETURN_FAILED'
            };
        }
    }

    /**
     * 取消訂單
     * @param {string} orderId - 訂單 ID
     * @returns {Promise<Object>} 取消結果
     */
    async cancelOrder(orderId) {
        try {
            systemLogger.info('Cancelling order:', { orderId });

            const response = await this.makeRequest('POST', `/api/payment/cancel-order/${orderId}`);

            if (response.data.status === 'success') {
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || '取消訂單失敗');
            }

        } catch (error) {
            systemLogger.error('Failed to cancel order:', {
                error: error.message,
                orderId
            });

            return {
                success: false,
                error: error.message,
                errorCode: error.response?.data?.errorCode || 'CANCEL_ORDER_FAILED'
            };
        }
    }

    /**
     * 輪詢付款狀態直到完成或超時（通過 merchantTradeNo）
     * @param {string} merchantTradeNo - ECPay 交易編號
     * @param {Object} options - 輪詢選項
     * @param {number} options.maxAttempts - 最大嘗試次數 (預設: 60)
     * @param {number} options.interval - 輪詢間隔毫秒 (預設: 5000)
     * @returns {Promise<Object>} 最終付款狀態
     */
    async pollPaymentStatusByMerchantTradeNo(merchantTradeNo, options = {}) {
        const { maxAttempts = 60, interval = 5000 } = options;
        let attempts = 0;

        systemLogger.info('Starting payment status polling by merchantTradeNo:', {
            merchantTradeNo,
            maxAttempts,
            interval
        });

        return new Promise((resolve) => {
            const poll = async () => {
                attempts++;

                try {
                    const result = await this.queryPaymentStatus(merchantTradeNo);

                    if (result) {
                        systemLogger.info('Payment status found:', {
                            merchantTradeNo,
                            attempts,
                            result
                        });

                        resolve({
                            success: true,
                            status: 'completed',
                            data: result
                        });
                        return;
                    }

                } catch (error) {
                    systemLogger.error('Query payment status error:', error);
                }

                // 繼續輪詢或超時
                if (attempts >= maxAttempts) {
                    systemLogger.warn('Payment status polling timeout:', {
                        merchantTradeNo,
                        attempts
                    });

                    resolve({
                        success: false,
                        status: 'timeout',
                        error: '付款狀態查詢超時'
                    });
                } else {
                    setTimeout(poll, interval);
                }
            };

            poll();
        });
    }

    /**
     * 輪詢付款狀態直到完成或超時
     * @param {string} orderId - 訂單 ID
     * @param {Object} options - 輪詢選項
     * @param {number} options.maxAttempts - 最大嘗試次數 (預設: 60)
     * @param {number} options.interval - 輪詢間隔毫秒 (預設: 5000)
     * @returns {Promise<Object>} 最終付款狀態
     */
    async pollPaymentStatus(orderId, options = {}) {
        const { maxAttempts = 60, interval = 5000 } = options;
        let attempts = 0;

        systemLogger.info('Starting payment status polling:', {
            orderId,
            maxAttempts,
            interval
        });

        return new Promise((resolve) => {
            const poll = async () => {
                attempts++;

                try {
                    const result = await this.checkPaymentStatus(orderId);

                    if (result.success) {
                        const { orderStatus, paymentStatus } = result.data;

                        // 付款完成狀態
                        if (orderStatus === 'paid' || paymentStatus === 'success') {
                            systemLogger.info('Payment completed:', {
                                orderId,
                                attempts,
                                orderStatus,
                                paymentStatus
                            });

                            resolve({
                                success: true,
                                status: 'completed',
                                data: result.data
                            });
                            return;
                        }

                        // 付款失敗狀態
                        if (orderStatus === 'failed' || paymentStatus === 'failed') {
                            systemLogger.info('Payment failed:', {
                                orderId,
                                attempts,
                                orderStatus,
                                paymentStatus
                            });

                            resolve({
                                success: false,
                                status: 'failed',
                                data: result.data
                            });
                            return;
                        }

                        // 訂單取消或過期
                        if (orderStatus === 'cancelled' || orderStatus === 'expired') {
                            systemLogger.info('Payment cancelled or expired:', {
                                orderId,
                                attempts,
                                orderStatus
                            });

                            resolve({
                                success: false,
                                status: orderStatus,
                                data: result.data
                            });
                            return;
                        }
                    }

                    // 達到最大嘗試次數
                    if (attempts >= maxAttempts) {
                        systemLogger.warn('Payment polling timeout:', {
                            orderId,
                            attempts,
                            maxAttempts
                        });

                        resolve({
                            success: false,
                            status: 'timeout',
                            error: '付款狀態查詢超時，請稍後再試'
                        });
                        return;
                    }

                    // 繼續輪詢
                    setTimeout(poll, interval);

                } catch (error) {
                    systemLogger.error('Payment polling error:', {
                        orderId,
                        attempts,
                        error: error.message
                    });

                    // 如果是網路錯誤，繼續重試
                    if (attempts < maxAttempts) {
                        setTimeout(poll, interval);
                    } else {
                        resolve({
                            success: false,
                            status: 'error',
                            error: error.message
                        });
                    }
                }
            };

            poll();
        });
    }

    /**
     * 處理付款表單提交到綠界
     * @param {Object} paymentData - 付款表單資料
     * @returns {void} 直接提交表單到綠界
     */
    submitPaymentForm(paymentData) {
        try {
            systemLogger.info('Submitting payment form to ECPay:', {
                orderId: paymentData.orderId,
                amount: paymentData.amount,
                paymentUrl: paymentData.paymentUrl
            });

            // 驗證 paymentUrl 是否為有效的 URL
            if (!paymentData.paymentUrl || 
                (!paymentData.paymentUrl.startsWith('http://') && 
                 !paymentData.paymentUrl.startsWith('https://'))) {
                throw new Error('Invalid payment URL: ' + paymentData.paymentUrl);
            }

            // 創建隱藏表單
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = paymentData.paymentUrl;
            form.style.display = 'none';

            // 添加表單欄位
            if (paymentData.formData) {
                Object.keys(paymentData.formData).forEach(key => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = paymentData.formData[key];
                    form.appendChild(input);
                });
            }

            // 提交表單
            document.body.appendChild(form);
            form.submit();

        } catch (error) {
            systemLogger.error('Failed to submit payment form:', {
                error: error.message,
                paymentData
            });
            throw error;
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
    async makeRequest(method, url, data = null, attempt = 1, retryOptions = {}) {
        const {
            retryOn5xx = true,
            retryOnNetworkError = true
        } = retryOptions;

        try {
            const config = {
                method,
                url,
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
            if (this.shouldRetry(error, { retryOn5xx, retryOnNetworkError }) && attempt < this.retryAttempts) {
                systemLogger.info(`Retrying request in ${this.retryDelay}ms...`, {
                    method,
                    url,
                    attempt: attempt + 1
                });

                await this.delay(this.retryDelay);
                return this.makeRequest(method, url, data, attempt + 1, retryOptions);
            }

            throw error;
        }
    }

    /**
     * 判斷是否應該重試請求
     * @param {Error} error - 錯誤物件
     * @returns {boolean} 是否應該重試
     */
    shouldRetry(error, { retryOn5xx = true, retryOnNetworkError = true } = {}) {
        // 網路錯誤或 5xx 伺服器錯誤才重試
        if (!error.response) {
            return retryOnNetworkError;
        }

        const status = error.response.status;
        return retryOn5xx && status >= 500 && status < 600;
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
            'USER_NOT_AUTHENTICATED': '請先登入後再進行付款',
            'MISSING_REQUIRED_PARAMS': '付款資料不完整，請重新選擇方案',
            'CREATE_ORDER_FAILED': '創建訂單失敗，請稍後再試',
            'ORDER_NOT_FOUND': '找不到訂單資訊',
            'ORDER_EXPIRED': '訂單已過期，請重新下單',
            'PAYMENT_FAILED': '付款失敗，請檢查付款資訊',
            'NETWORK_ERROR': '網路連線異常，請檢查網路後重試',
            'INTERNAL_ERROR': '系統暫時異常，請稍後再試'
        };

        return errorMessages[errorCode] || defaultMessage;
    }

    /**
     * 獲取付款方式選項
     * @returns {Array} 付款方式列表
     */
    getPaymentMethods() {
        return [
            {
                value: 'ALL',
                label: '不指定付款方式',
                description: '由綠界提供多種付款選項'
            },
            {
                value: 'Credit',
                label: '信用卡',
                description: '支援 Visa、MasterCard、JCB'
            },
            {
                value: 'ATM',
                label: 'ATM 轉帳',
                description: '虛擬帳號轉帳'
            },
            {
                value: 'CVS',
                label: '超商代碼',
                description: '7-11、全家、萊爾富、OK'
            }
        ];
    }

    /**
     * 清除舊的定價快取（如果存在）
     */
    clearLegacyPricingCache() {
        try {
            const legacyCacheKeys = [
                'plan_pricing_cache',      // 舊版本的快取
                'plan_pricing_version',    // 舊版本的版本
                'subscription_plans_cache',
                'pricing_data_cache'
            ];

            let clearedCount = 0;
            legacyCacheKeys.forEach(key => {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                    clearedCount++;
                }
                if (sessionStorage.getItem(key)) {
                    sessionStorage.removeItem(key);
                    clearedCount++;
                }
            });

            if (clearedCount > 0) {
                console.log(`🧹 PaymentService: 已清除 ${clearedCount} 個舊的定價快取項目`);
            }
        } catch (error) {
            console.warn('⚠️ PaymentService: 清除舊快取時發生錯誤', error);
        }
    }

    /**
     * 獲取方案價格資訊 (帶版本控制的智能快取)
     * @param {Object} options - 選項
     * @param {boolean} options.forceRefresh - 強制重新載入，忽略快取
     * @returns {Promise<Object>} 方案價格
     */
    async getPlanPricingFromAPI(options = {}) {
        const { forceRefresh = false } = options;
        const cacheKey = 'plan_pricing_cache_v2';
        const versionKey = 'plan_pricing_version_v2';
        
        // 清除可能存在的舊快取
        this.clearLegacyPricingCache();
        try {
            console.log('🌐 PaymentService: 從 Plans API 獲取定價資料 (智能快取)');
            
            // 如果不是強制重新載入，檢查版本控制的快取
            if (!forceRefresh) {
                const cachedPricing = localStorage.getItem(cacheKey);
                const cachedVersion = localStorage.getItem(versionKey);
                
                if (cachedPricing && cachedVersion) {
                    try {
                        // 先檢查伺服器版本
                        console.log('🔍 PaymentService: 檢查版本是否匹配');
                        const versionResponse = await this.makeRequest('GET', '/api/plans/pricing');
                        const serverVersion = versionResponse.data.data.version;
                        
                        if (serverVersion && serverVersion.toString() === cachedVersion) {
                            console.log('✅ PaymentService: 版本匹配，使用快取資料');
                            console.log('📊 版本資訊:', {
                                cached: cachedVersion,
                                server: serverVersion.toString(),
                                lastModified: new Date(parseInt(cachedVersion)).toLocaleString('zh-TW')
                            });
                            return JSON.parse(cachedPricing);
                        } else {
                            console.log('🔄 PaymentService: 版本不匹配，重新載入');
                            console.log('📊 版本比較:', {
                                cached: cachedVersion,
                                server: serverVersion?.toString(),
                                cacheTime: new Date(parseInt(cachedVersion)).toLocaleString('zh-TW'),
                                serverTime: serverVersion ? new Date(parseInt(serverVersion)).toLocaleString('zh-TW') : 'N/A'
                            });
                        }
                    } catch (versionError) {
                        console.warn('⚠️ PaymentService: 版本檢查失敗，使用快取資料', versionError);
                        return JSON.parse(cachedPricing);
                    }
                }
            }
            
            // 從 API 獲取最新資料
            const response = await this.makeRequest('GET', '/api/plans/pricing');
            
            if (response.data.success && response.data.data.plans) {
                const apiData = response.data.data;
                const apiPlans = apiData.plans;
                
                // 轉換為 PaymentService 期望的格式
                const formattedPricing = {};
                
                Object.keys(apiPlans).forEach(planId => {
                    const apiPlan = apiPlans[planId];
                    formattedPricing[planId] = {
                        monthly: {
                            price: apiPlan.pricing.monthly,
                            currency: apiPlan.pricing.currency,
                            period: '月'
                        },
                        yearly: {
                            price: apiPlan.pricing.yearly,
                            currency: apiPlan.pricing.currency,
                            period: '年',
                            discount: this.calculateYearlyDiscount(apiPlan.pricing.monthly, apiPlan.pricing.yearly)
                        }
                    };
                });
                
                // 儲存到版本控制的快取
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(formattedPricing));
                    if (apiData.version) {
                        localStorage.setItem(versionKey, apiData.version.toString());
                        console.log('💾 PaymentService: 已快取定價資料', {
                            version: apiData.version,
                            timestamp: new Date(parseInt(apiData.version)).toLocaleString('zh-TW')
                        });
                    }
                } catch (storageError) {
                    console.warn('⚠️ PaymentService: 無法儲存快取', storageError);
                }
                
                console.log('✅ PaymentService: API 定價資料獲取成功', formattedPricing);
                return formattedPricing;
                
            } else {
                throw new Error('API 回應格式不正確');
            }
            
        } catch (error) {
            console.error('❌ PaymentService: 從 API 獲取定價失敗，嘗試使用快取或 fallback', error);
            
            // 嘗試使用快取資料
            try {
                const cachedPricing = localStorage.getItem(cacheKey);
                if (cachedPricing) {
                    console.log('🔄 PaymentService: 使用快取的定價資料 (API 失敗)');
                    return JSON.parse(cachedPricing);
                }
            } catch (cacheError) {
                console.warn('⚠️ PaymentService: 快取資料也無法使用', cacheError);
            }
            
            // 使用 fallback 定價
            console.log('🔄 PaymentService: 使用 fallback 定價');
            return this.getPlanPricing();
        }
    }

    /**
     * 清除版本控制的定價快取
     * @returns {void}
     */
    clearVersionedPricingCache() {
        try {
            localStorage.removeItem('plan_pricing_cache_v2');
            localStorage.removeItem('plan_pricing_version_v2');
            console.log('🗑️ PaymentService: 版本控制的定價快取已清除');
        } catch (error) {
            console.warn('⚠️ PaymentService: 清除快取時發生錯誤', error);
        }
    }

    /**
     * 獲取快取狀態資訊
     * @returns {Object} 快取狀態
     */
    getCacheStatus() {
        try {
            const cachedPricing = localStorage.getItem('plan_pricing_cache_v2');
            const cachedVersion = localStorage.getItem('plan_pricing_version_v2');
            
            return {
                hasCachedData: !!cachedPricing,
                cachedVersion: cachedVersion,
                cacheSize: cachedPricing ? cachedPricing.length : 0,
                lastCached: cachedVersion ? new Date(parseInt(cachedVersion)).toLocaleString('zh-TW') : null
            };
        } catch (error) {
            console.warn('⚠️ PaymentService: 獲取快取狀態時發生錯誤', error);
            return {
                hasCachedData: false,
                cachedVersion: null,
                cacheSize: 0,
                lastCached: null,
                error: error.message
            };
        }
    }

    /**
     * 強制重新載入定價資料（忽略快取）
     * @returns {Promise<Object>} 方案價格
     */
    async forceRefreshPricing() {
        console.log('🔄 PaymentService: 強制重新載入定價資料');
        return this.getPlanPricingFromAPI({ forceRefresh: true });
    }

    /**
     * 計算年費折扣
     * @param {number} monthlyPrice - 月費
     * @param {number} yearlyPrice - 年費
     * @returns {string} 折扣描述
     */
    calculateYearlyDiscount(monthlyPrice, yearlyPrice) {
        if (!monthlyPrice || !yearlyPrice || monthlyPrice <= 0 || yearlyPrice <= 0) {
            return '';
        }
        
        const monthlyEquivalent = monthlyPrice * 12;
        const discountPercentage = Math.round((1 - (yearlyPrice / monthlyEquivalent)) * 100);
        
        if (discountPercentage > 0) {
            return `約 ${discountPercentage}% 折扣`;
        }
        
        return '';
    }

    /**
     * 獲取方案價格資訊 (同步 fallback 方法)
     * @returns {Object} 方案價格
     */
    getPlanPricing() {
        return {
            pro: {
                monthly: {
                    price: 399,
                    currency: 'TWD',
                    period: '月'
                },
                yearly: {
                    price: 3990,
                    currency: 'TWD',
                    period: '年',
                    discount: '約 17% 折扣'
                }
            }
        };
    }
}

// 創建單例實例
const paymentService = new PaymentService();

export default paymentService;
