import apiClient from './apiClient';
import { logger } from '../utils/logger';

/**
 * Refund Service
 * 處理退款相關的 API 請求
 * 包含退款申請、狀態查詢、歷史記錄和取消功能
 */
class RefundService {
    constructor() {
        this.baseURL = '/api/refund';
    }

    /**
     * 申請退款
     * @param {Object} refundData - 退款資料
     * @param {string} refundData.paymentId - 付款記錄 ID
     * @param {number} refundData.amount - 退款金額
     * @param {string} refundData.reason - 退款原因
     * @returns {Promise<Object>} API 響應
     */
    async requestRefund(refundData) {
        try {
            const { paymentId, amount, reason } = refundData;

            // 驗證必要參數
            if (!paymentId) {
                throw new Error('付款記錄 ID 不能為空');
            }
            if (!amount || amount <= 0) {
                throw new Error('退款金額必須大於 0');
            }
            if (!reason || reason.trim().length < 10) {
                throw new Error('退款原因至少需要 10 個字符');
            }

            logger.info('Requesting refund', {
                paymentId,
                amount,
                reasonLength: reason.length
            });

            const response = await apiClient.post(`${this.baseURL}/request`, {
                paymentId,
                amount: parseFloat(amount),
                reason: reason.trim()
            });

            if (response.data.status === 'success') {
                logger.info('Refund request submitted successfully', {
                    refundId: response.data.data.refund.id,
                    paymentId,
                    amount
                });

                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message
                };
            } else {
                throw new Error(response.data.message || '申請退款失敗');
            }
        } catch (error) {
            logger.error('Failed to request refund:', error);
            
            return {
                success: false,
                error: error.response?.data?.message || error.message || '申請退款失敗'
            };
        }
    }

    /**
     * 查詢退款狀態
     * @param {string} refundId - 退款記錄 ID
     * @returns {Promise<Object>} API 響應
     */
    async getRefundStatus(refundId) {
        try {
            if (!refundId) {
                throw new Error('退款記錄 ID 不能為空');
            }

            logger.info('Getting refund status', { refundId });

            const response = await apiClient.get(`${this.baseURL}/status/${refundId}`);

            if (response.data.status === 'success') {
                logger.info('Refund status retrieved successfully', {
                    refundId,
                    status: response.data.data.refund.status
                });

                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || '查詢退款狀態失敗');
            }
        } catch (error) {
            logger.error('Failed to get refund status:', error);
            
            return {
                success: false,
                error: error.response?.data?.message || error.message || '查詢退款狀態失敗'
            };
        }
    }

    /**
     * 獲取退款歷史
     * @param {Object} params - 查詢參數
     * @param {number} params.page - 頁碼
     * @param {number} params.limit - 每頁數量
     * @param {string} params.status - 退款狀態篩選
     * @returns {Promise<Object>} API 響應
     */
    async getRefundHistory(params = {}) {
        try {
            logger.info('Getting refund history', { params });

            const queryParams = new URLSearchParams();
            
            if (params.page) queryParams.append('page', params.page);
            if (params.limit) queryParams.append('limit', params.limit);
            if (params.status) queryParams.append('status', params.status);

            const url = `${this.baseURL}/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            const response = await apiClient.get(url);

            if (response.data.status === 'success') {
                logger.info('Refund history retrieved successfully', {
                    count: response.data.data.refunds.length,
                    total: response.data.data.pagination.total
                });

                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || '獲取退款歷史失敗');
            }
        } catch (error) {
            logger.error('Failed to get refund history:', error);
            
            return {
                success: false,
                error: error.response?.data?.message || error.message || '獲取退款歷史失敗'
            };
        }
    }

    /**
     * 取消退款申請
     * @param {string} refundId - 退款記錄 ID
     * @returns {Promise<Object>} API 響應
     */
    async cancelRefund(refundId) {
        try {
            if (!refundId) {
                throw new Error('退款記錄 ID 不能為空');
            }

            logger.info('Cancelling refund', { refundId });

            const response = await apiClient.post(`${this.baseURL}/cancel/${refundId}`);

            if (response.data.status === 'success') {
                logger.info('Refund cancelled successfully', { refundId });

                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message
                };
            } else {
                throw new Error(response.data.message || '取消退款申請失敗');
            }
        } catch (error) {
            logger.error('Failed to cancel refund:', error);
            
            return {
                success: false,
                error: error.response?.data?.message || error.message || '取消退款申請失敗'
            };
        }
    }

    /**
     * 管理員處理退款
     * @param {string} refundId - 退款記錄 ID
     * @returns {Promise<Object>} API 響應
     */
    async adminProcessRefund(refundId) {
        try {
            if (!refundId) {
                throw new Error('退款記錄 ID 不能為空');
            }

            logger.info('Admin processing refund', { refundId });

            const response = await apiClient.post(`${this.baseURL}/admin/process/${refundId}`);

            if (response.data.status === 'success') {
                logger.info('Refund processed by admin successfully', {
                    refundId,
                    processResult: response.data.data.processResult
                });

                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message
                };
            } else {
                throw new Error(response.data.message || '管理員處理退款失敗');
            }
        } catch (error) {
            logger.error('Failed to process refund as admin:', error);
            
            return {
                success: false,
                error: error.response?.data?.message || error.message || '管理員處理退款失敗'
            };
        }
    }

    /**
     * 管理員獲取所有退款記錄
     * @param {Object} params - 查詢參數
     * @param {number} params.page - 頁碼
     * @param {number} params.limit - 每頁數量
     * @param {string} params.status - 退款狀態篩選
     * @param {string} params.userId - 用戶 ID 篩選
     * @param {string} params.startDate - 開始日期篩選
     * @param {string} params.endDate - 結束日期篩選
     * @returns {Promise<Object>} API 響應
     */
    async getAdminRefundList(params = {}) {
        try {
            logger.info('Getting admin refund list', { params });

            const queryParams = new URLSearchParams();
            
            if (params.page) queryParams.append('page', params.page);
            if (params.limit) queryParams.append('limit', params.limit);
            if (params.status) queryParams.append('status', params.status);
            if (params.userId) queryParams.append('userId', params.userId);
            if (params.startDate) queryParams.append('startDate', params.startDate);
            if (params.endDate) queryParams.append('endDate', params.endDate);

            const url = `${this.baseURL}/admin/refunds${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            const response = await apiClient.get(url);

            if (response.data.status === 'success') {
                logger.info('Admin refund list retrieved successfully', {
                    count: response.data.data.refunds.length,
                    total: response.data.data.pagination.total
                });

                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || '獲取管理員退款列表失敗');
            }
        } catch (error) {
            logger.error('Failed to get admin refund list:', error);
            
            return {
                success: false,
                error: error.response?.data?.message || error.message || '獲取管理員退款列表失敗'
            };
        }
    }

    /**
     * 批量處理退款申請
     * @param {Array<string>} refundIds - 退款記錄 ID 陣列
     * @param {string} action - 處理動作 ('approve' 或 'reject')
     * @returns {Promise<Object>} API 響應
     */
    async batchProcessRefunds(refundIds, action) {
        try {
            if (!Array.isArray(refundIds) || refundIds.length === 0) {
                throw new Error('退款記錄 ID 陣列不能為空');
            }

            if (!['approve', 'reject'].includes(action)) {
                throw new Error('處理動作必須是 approve 或 reject');
            }

            logger.info('Batch processing refunds', { 
                count: refundIds.length, 
                action 
            });

            const processPromises = refundIds.map(refundId => 
                this.adminProcessRefund(refundId)
            );

            const results = await Promise.allSettled(processPromises);
            
            const successful = results.filter(result => 
                result.status === 'fulfilled' && result.value.success
            );
            
            const failed = results.filter(result => 
                result.status === 'rejected' || !result.value.success
            );

            logger.info('Batch processing completed', {
                total: refundIds.length,
                successful: successful.length,
                failed: failed.length
            });

            return {
                success: true,
                data: {
                    successful: successful.map(result => result.value),
                    failed: failed.map(result => ({
                        error: result.status === 'rejected' 
                            ? result.reason.message 
                            : result.value.error
                    })),
                    summary: {
                        total: refundIds.length,
                        successful: successful.length,
                        failed: failed.length
                    }
                }
            };
        } catch (error) {
            logger.error('Failed to batch process refunds:', error);
            
            return {
                success: false,
                error: error.message || '批量處理退款失敗'
            };
        }
    }

    /**
     * 獲取退款統計資訊
     * @param {Object} params - 查詢參數
     * @param {string} params.startDate - 開始日期
     * @param {string} params.endDate - 結束日期
     * @returns {Promise<Object>} API 響應
     */
    async getRefundStats(params = {}) {
        try {
            logger.info('Getting refund statistics', { params });

            // 獲取退款列表來計算統計資訊
            const response = await this.getRefundHistory({
                limit: 1000, // 獲取大量資料來計算統計
                ...params
            });

            if (response.success) {
                const refunds = response.data.refunds;
                
                const stats = {
                    total: refunds.length,
                    byStatus: {
                        pending: refunds.filter(ref => ref.status === 'pending').length,
                        processing: refunds.filter(ref => ref.status === 'processing').length,
                        succeeded: refunds.filter(ref => ref.status === 'succeeded').length,
                        failed: refunds.filter(ref => ref.status === 'failed').length,
                        cancelled: refunds.filter(ref => ref.status === 'cancelled').length
                    },
                    totalAmount: refunds.reduce((sum, ref) => sum + parseFloat(ref.amount), 0),
                    succeededAmount: refunds
                        .filter(ref => ref.status === 'succeeded')
                        .reduce((sum, ref) => sum + parseFloat(ref.amount), 0),
                    averageAmount: refunds.length > 0 
                        ? refunds.reduce((sum, ref) => sum + parseFloat(ref.amount), 0) / refunds.length 
                        : 0,
                    byPaymentType: {}
                };

                // 按付款方式統計
                refunds.forEach(refund => {
                    const paymentType = refund.payment?.paymentType || 'unknown';
                    if (!stats.byPaymentType[paymentType]) {
                        stats.byPaymentType[paymentType] = {
                            count: 0,
                            amount: 0
                        };
                    }
                    stats.byPaymentType[paymentType].count++;
                    stats.byPaymentType[paymentType].amount += parseFloat(refund.amount);
                });

                logger.info('Refund statistics calculated', stats);

                return {
                    success: true,
                    data: stats
                };
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            logger.error('Failed to get refund statistics:', error);
            
            return {
                success: false,
                error: error.message || '獲取退款統計失敗'
            };
        }
    }

    /**
     * 檢查付款是否可以申請退款
     * @param {string} paymentId - 付款記錄 ID
     * @returns {Promise<Object>} API 響應
     */
    async checkRefundEligibility(paymentId) {
        try {
            if (!paymentId) {
                throw new Error('付款記錄 ID 不能為空');
            }

            logger.info('Checking refund eligibility', { paymentId });

            // 獲取該付款的退款歷史
            const refundHistory = await this.getRefundHistory();
            
            if (refundHistory.success) {
                const existingRefunds = refundHistory.data.refunds.filter(
                    refund => refund.payment.id === paymentId
                );

                const activeRefunds = existingRefunds.filter(refund =>
                    ['pending', 'processing', 'succeeded'].includes(refund.status)
                );

                const totalRefunded = activeRefunds.reduce(
                    (sum, refund) => sum + parseFloat(refund.amount), 0
                );

                return {
                    success: true,
                    data: {
                        paymentId,
                        hasActiveRefunds: activeRefunds.length > 0,
                        totalRefunded,
                        existingRefunds: existingRefunds.length,
                        canRequestRefund: activeRefunds.length === 0
                    }
                };
            } else {
                throw new Error(refundHistory.error);
            }
        } catch (error) {
            logger.error('Failed to check refund eligibility:', error);
            
            return {
                success: false,
                error: error.message || '檢查退款資格失敗'
            };
        }
    }

    /**
     * 獲取退款原因建議
     * @returns {Array<string>} 退款原因建議列表
     */
    getRefundReasonSuggestions() {
        return [
            '商品與描述不符',
            '商品品質問題',
            '未收到商品或服務',
            '重複扣款',
            '取消訂單',
            '服務不滿意',
            '技術問題導致無法使用',
            '誤操作購買',
            '價格錯誤',
            '其他原因'
        ];
    }

    /**
     * 驗證退款表單資料
     * @param {Object} formData - 表單資料
     * @param {string} formData.paymentId - 付款記錄 ID
     * @param {number} formData.amount - 退款金額
     * @param {string} formData.reason - 退款原因
     * @param {number} maxAmount - 最大可退款金額
     * @returns {Object} 驗證結果
     */
    validateRefundForm(formData, maxAmount) {
        const errors = [];

        if (!formData.paymentId) {
            errors.push('請選擇要退款的付款記錄');
        }

        if (!formData.amount || formData.amount <= 0) {
            errors.push('退款金額必須大於 0');
        } else if (formData.amount > maxAmount) {
            errors.push(`退款金額不能超過 ${maxAmount}`);
        }

        if (!formData.reason || formData.reason.trim().length < 10) {
            errors.push('退款原因至少需要 10 個字符');
        } else if (formData.reason.trim().length > 500) {
            errors.push('退款原因不能超過 500 個字符');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// 創建並導出服務實例
export const refundService = new RefundService();
export default refundService;