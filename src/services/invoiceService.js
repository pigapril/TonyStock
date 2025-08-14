import apiClient from './apiClient';
import { logger } from '../utils/logger';

/**
 * Invoice Service
 * 處理發票相關的 API 請求
 * 包含發票列表、詳情、下載和重新發送功能
 */
class InvoiceService {
    constructor() {
        this.baseURL = '/api/invoice';
    }

    /**
     * 獲取發票列表
     * @param {Object} params - 查詢參數
     * @param {number} params.page - 頁碼
     * @param {number} params.limit - 每頁數量
     * @param {string} params.status - 發票狀態篩選
     * @returns {Promise<Object>} API 響應
     */
    async getInvoiceList(params = {}) {
        try {
            logger.info('Getting invoice list', { params });

            const queryParams = new URLSearchParams();
            
            if (params.page) queryParams.append('page', params.page);
            if (params.limit) queryParams.append('limit', params.limit);
            if (params.status) queryParams.append('status', params.status);

            const url = `${this.baseURL}/list${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            const response = await apiClient.get(url);

            if (response.data.status === 'success') {
                logger.info('Invoice list retrieved successfully', {
                    count: response.data.data.invoices.length,
                    total: response.data.data.pagination.total
                });

                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || '獲取發票列表失敗');
            }
        } catch (error) {
            logger.error('Failed to get invoice list:', error);
            
            return {
                success: false,
                error: error.response?.data?.message || error.message || '獲取發票列表失敗'
            };
        }
    }

    /**
     * 獲取發票詳情
     * @param {string} invoiceId - 發票 ID
     * @returns {Promise<Object>} API 響應
     */
    async getInvoiceDetails(invoiceId) {
        try {
            if (!invoiceId) {
                throw new Error('發票 ID 不能為空');
            }

            logger.info('Getting invoice details', { invoiceId });

            const response = await apiClient.get(`${this.baseURL}/${invoiceId}`);

            if (response.data.status === 'success') {
                logger.info('Invoice details retrieved successfully', {
                    invoiceId,
                    invoiceNumber: response.data.data.invoice.invoiceNumber
                });

                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || '獲取發票詳情失敗');
            }
        } catch (error) {
            logger.error('Failed to get invoice details:', error);
            
            return {
                success: false,
                error: error.response?.data?.message || error.message || '獲取發票詳情失敗'
            };
        }
    }

    /**
     * 下載發票 PDF
     * @param {string} invoiceId - 發票 ID
     * @returns {Promise<Object>} API 響應
     */
    async downloadInvoicePDF(invoiceId) {
        try {
            if (!invoiceId) {
                throw new Error('發票 ID 不能為空');
            }

            logger.info('Downloading invoice PDF', { invoiceId });

            const response = await apiClient.get(`${this.baseURL}/${invoiceId}/download`, {
                responseType: 'blob' // 重要：設置響應類型為 blob
            });

            // 檢查響應是否為 PDF
            if (response.data.type === 'application/pdf' || response.headers['content-type']?.includes('application/pdf')) {
                logger.info('Invoice PDF downloaded successfully', { invoiceId });

                return {
                    success: true,
                    data: response.data
                };
            } else {
                // 如果不是 PDF，可能是錯誤響應
                const text = await response.data.text();
                let errorData;
                
                try {
                    errorData = JSON.parse(text);
                } catch {
                    errorData = { message: '下載發票 PDF 失敗' };
                }

                throw new Error(errorData.message || '下載發票 PDF 失敗');
            }
        } catch (error) {
            logger.error('Failed to download invoice PDF:', error);
            
            return {
                success: false,
                error: error.response?.data?.message || error.message || '下載發票 PDF 失敗'
            };
        }
    }

    /**
     * 重新發送發票
     * @param {string} invoiceId - 發票 ID
     * @returns {Promise<Object>} API 響應
     */
    async resendInvoice(invoiceId) {
        try {
            if (!invoiceId) {
                throw new Error('發票 ID 不能為空');
            }

            logger.info('Resending invoice', { invoiceId });

            const response = await apiClient.post(`${this.baseURL}/${invoiceId}/resend`);

            if (response.data.status === 'success') {
                logger.info('Invoice resent successfully', {
                    invoiceId,
                    invoiceNumber: response.data.data.invoiceNumber
                });

                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message
                };
            } else {
                throw new Error(response.data.message || '重新發送發票失敗');
            }
        } catch (error) {
            logger.error('Failed to resend invoice:', error);
            
            return {
                success: false,
                error: error.response?.data?.message || error.message || '重新發送發票失敗'
            };
        }
    }

    /**
     * 管理員獲取所有發票列表
     * @param {Object} params - 查詢參數
     * @param {number} params.page - 頁碼
     * @param {number} params.limit - 每頁數量
     * @param {string} params.status - 發票狀態篩選
     * @param {string} params.userId - 用戶 ID 篩選
     * @param {string} params.startDate - 開始日期篩選
     * @param {string} params.endDate - 結束日期篩選
     * @returns {Promise<Object>} API 響應
     */
    async getAdminInvoiceList(params = {}) {
        try {
            logger.info('Getting admin invoice list', { params });

            const queryParams = new URLSearchParams();
            
            if (params.page) queryParams.append('page', params.page);
            if (params.limit) queryParams.append('limit', params.limit);
            if (params.status) queryParams.append('status', params.status);
            if (params.userId) queryParams.append('userId', params.userId);
            if (params.startDate) queryParams.append('startDate', params.startDate);
            if (params.endDate) queryParams.append('endDate', params.endDate);

            const url = `/api/admin/invoices${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            const response = await apiClient.get(url);

            if (response.data.status === 'success') {
                logger.info('Admin invoice list retrieved successfully', {
                    count: response.data.data.invoices.length,
                    total: response.data.data.pagination.total
                });

                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || '獲取管理員發票列表失敗');
            }
        } catch (error) {
            logger.error('Failed to get admin invoice list:', error);
            
            return {
                success: false,
                error: error.response?.data?.message || error.message || '獲取管理員發票列表失敗'
            };
        }
    }

    /**
     * 批量下載發票 PDF
     * @param {Array<string>} invoiceIds - 發票 ID 陣列
     * @returns {Promise<Object>} API 響應
     */
    async batchDownloadInvoices(invoiceIds) {
        try {
            if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
                throw new Error('發票 ID 陣列不能為空');
            }

            logger.info('Batch downloading invoices', { count: invoiceIds.length });

            const downloadPromises = invoiceIds.map(invoiceId => 
                this.downloadInvoicePDF(invoiceId)
            );

            const results = await Promise.allSettled(downloadPromises);
            
            const successful = results.filter(result => 
                result.status === 'fulfilled' && result.value.success
            );
            
            const failed = results.filter(result => 
                result.status === 'rejected' || !result.value.success
            );

            logger.info('Batch download completed', {
                total: invoiceIds.length,
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
                        total: invoiceIds.length,
                        successful: successful.length,
                        failed: failed.length
                    }
                }
            };
        } catch (error) {
            logger.error('Failed to batch download invoices:', error);
            
            return {
                success: false,
                error: error.message || '批量下載發票失敗'
            };
        }
    }

    /**
     * 檢查發票狀態
     * @param {string} invoiceId - 發票 ID
     * @returns {Promise<Object>} API 響應
     */
    async checkInvoiceStatus(invoiceId) {
        try {
            if (!invoiceId) {
                throw new Error('發票 ID 不能為空');
            }

            logger.info('Checking invoice status', { invoiceId });

            const response = await this.getInvoiceDetails(invoiceId);
            
            if (response.success) {
                const invoice = response.data.invoice;
                
                return {
                    success: true,
                    data: {
                        invoiceId: invoice.id,
                        invoiceNumber: invoice.invoiceNumber,
                        status: invoice.status,
                        amount: invoice.totalAmount,
                        currency: invoice.currency,
                        issueDate: invoice.issueDate,
                        dueDate: invoice.dueDate,
                        isOverdue: invoice.dueDate && new Date() > new Date(invoice.dueDate) && invoice.status !== 'paid'
                    }
                };
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            logger.error('Failed to check invoice status:', error);
            
            return {
                success: false,
                error: error.message || '檢查發票狀態失敗'
            };
        }
    }

    /**
     * 獲取發票統計資訊
     * @param {Object} params - 查詢參數
     * @param {string} params.startDate - 開始日期
     * @param {string} params.endDate - 結束日期
     * @returns {Promise<Object>} API 響應
     */
    async getInvoiceStats(params = {}) {
        try {
            logger.info('Getting invoice statistics', { params });

            // 獲取發票列表來計算統計資訊
            const response = await this.getInvoiceList({
                limit: 1000, // 獲取大量資料來計算統計
                ...params
            });

            if (response.success) {
                const invoices = response.data.invoices;
                
                const stats = {
                    total: invoices.length,
                    byStatus: {
                        draft: invoices.filter(inv => inv.status === 'draft').length,
                        sent: invoices.filter(inv => inv.status === 'sent').length,
                        paid: invoices.filter(inv => inv.status === 'paid').length,
                        cancelled: invoices.filter(inv => inv.status === 'cancelled').length
                    },
                    totalAmount: invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0),
                    paidAmount: invoices
                        .filter(inv => inv.status === 'paid')
                        .reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0),
                    overdue: invoices.filter(inv => 
                        inv.dueDate && 
                        new Date() > new Date(inv.dueDate) && 
                        inv.status !== 'paid'
                    ).length
                };

                logger.info('Invoice statistics calculated', stats);

                return {
                    success: true,
                    data: stats
                };
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            logger.error('Failed to get invoice statistics:', error);
            
            return {
                success: false,
                error: error.message || '獲取發票統計失敗'
            };
        }
    }
}

// 創建並導出服務實例
export const invoiceService = new InvoiceService();
export default invoiceService;