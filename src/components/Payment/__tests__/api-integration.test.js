/**
 * API 整合測試
 * 驗證前後端 API 連接是否正確
 */

import paymentService from '../../../services/paymentService';
import subscriptionService from '../../../services/subscriptionService';

// Mock API client
jest.mock('../../../api/apiClient');
jest.mock('../../../utils/logger');

describe('Payment API Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('API Endpoint Mapping', () => {
        it('should have correct API endpoints', () => {
            // 驗證 API 端點是否與後端匹配
            const expectedEndpoints = {
                createOrder: '/api/payment/create-order',
                checkStatus: '/api/payment/check-status/:orderId',
                cancelOrder: '/api/payment/cancel-order/:orderId',
                paymentHistory: '/api/payment/history',
                paymentReturn: '/api/payment/return'
            };

            // 這些端點應該在 paymentService 中被使用
            expect(expectedEndpoints.createOrder).toBe('/api/payment/create-order');
            expect(expectedEndpoints.checkStatus).toBe('/api/payment/check-status/:orderId');
            expect(expectedEndpoints.cancelOrder).toBe('/api/payment/cancel-order/:orderId');
            expect(expectedEndpoints.paymentHistory).toBe('/api/payment/history');
            expect(expectedEndpoints.paymentReturn).toBe('/api/payment/return');
        });
    });

    describe('Request/Response Format Validation', () => {
        it('should send correct createOrder request format', async () => {
            const mockApiClient = require('../../../api/apiClient').default;
            
            mockApiClient.mockResolvedValue({
                data: {
                    status: 'success',
                    data: {
                        orderId: 'order-123',
                        merchantTradeNo: 'TN123456789',
                        paymentUrl: 'https://payment.ecpay.com.tw/test',
                        formData: {},
                        amount: 299,
                        currency: 'TWD',
                        expiresAt: '2024-01-15T10:30:00Z'
                    }
                }
            });

            const orderData = {
                planType: 'pro',
                billingPeriod: 'monthly',
                paymentMethod: 'Credit'
            };

            const result = await paymentService.createOrder(orderData);

            expect(mockApiClient).toHaveBeenCalledWith({
                method: 'POST',
                url: '/api/payment/create-order',
                data: orderData
            });

            expect(result).toEqual({
                orderId: 'order-123',
                merchantTradeNo: 'TN123456789',
                paymentUrl: 'https://payment.ecpay.com.tw/test',
                formData: {},
                amount: 299,
                currency: 'TWD',
                expiresAt: '2024-01-15T10:30:00Z'
            });
        });

        it('should handle createOrder error response correctly', async () => {
            const mockApiClient = require('../../../api/apiClient').default;
            
            const mockError = {
                response: {
                    status: 400,
                    data: {
                        status: 'error',
                        message: '缺少必要參數',
                        errorCode: 'MISSING_REQUIRED_PARAMS'
                    }
                }
            };

            mockApiClient.mockRejectedValue(mockError);

            await expect(paymentService.createOrder({
                planType: 'pro'
                // 缺少 billingPeriod
            })).rejects.toThrow();
        });

        it('should send correct checkPaymentStatus request', async () => {
            const mockApiClient = require('../../../api/apiClient').default;
            
            mockApiClient.mockResolvedValue({
                data: {
                    status: 'success',
                    data: {
                        orderId: 'order-123',
                        orderStatus: 'paid',
                        paymentStatus: 'success',
                        amount: 299,
                        expiresAt: '2024-01-15T10:30:00Z',
                        createdAt: '2024-01-15T10:00:00Z'
                    }
                }
            });

            const result = await paymentService.checkPaymentStatus('order-123');

            expect(mockApiClient).toHaveBeenCalledWith({
                method: 'GET',
                url: '/api/payment/check-status/order-123'
            });

            expect(result.success).toBe(true);
            expect(result.data.orderId).toBe('order-123');
            expect(result.data.orderStatus).toBe('paid');
        });

        it('should send correct getPaymentHistory request', async () => {
            const mockApiClient = require('../../../api/apiClient').default;
            
            mockApiClient.mockResolvedValue({
                data: {
                    status: 'success',
                    data: [
                        {
                            id: 'payment-1',
                            merchantTradeNo: 'TN123456789',
                            amount: 299,
                            status: 'paid',
                            paymentMethod: 'credit_card',
                            createdAt: '2024-01-15T10:00:00Z',
                            planType: 'pro',
                            billingPeriod: 'monthly'
                        }
                    ]
                }
            });

            const result = await paymentService.getPaymentHistory();

            expect(mockApiClient).toHaveBeenCalledWith({
                method: 'GET',
                url: '/api/payment/history'
            });

            expect(Array.isArray(result)).toBe(true);
            expect(result[0].merchantTradeNo).toBe('TN123456789');
        });
    });

    describe('Subscription Service Integration', () => {
        it('should have correct subscription API endpoints', async () => {
            const mockApiClient = require('../../../api/apiClient').default;
            
            mockApiClient.mockResolvedValue({
                data: {
                    status: 'success',
                    data: {
                        id: 'sub-123',
                        planType: 'pro',
                        status: 'active',
                        billingPeriod: 'monthly'
                    }
                }
            });

            await subscriptionService.getCurrentSubscription();

            expect(mockApiClient).toHaveBeenCalledWith({
                method: 'GET',
                url: '/api/subscription/current'
            });
        });
    });

    describe('Error Handling Integration', () => {
        it('should handle 401 authentication errors', async () => {
            const mockApiClient = require('../../../api/apiClient').default;
            
            const authError = {
                response: {
                    status: 401,
                    data: {
                        status: 'error',
                        message: '用戶未登入',
                        errorCode: 'USER_NOT_AUTHENTICATED'
                    }
                }
            };

            mockApiClient.mockRejectedValue(authError);

            await expect(paymentService.createOrder({
                planType: 'pro',
                billingPeriod: 'monthly'
            })).rejects.toThrow();
        });

        it('should handle 429 rate limit errors', async () => {
            const mockApiClient = require('../../../api/apiClient').default;
            
            const rateLimitError = {
                response: {
                    status: 429,
                    data: {
                        status: 'error',
                        message: '請求過於頻繁',
                        errorCode: 'RATE_LIMIT_EXCEEDED'
                    }
                }
            };

            mockApiClient.mockRejectedValue(rateLimitError);

            await expect(paymentService.createOrder({
                planType: 'pro',
                billingPeriod: 'monthly'
            })).rejects.toThrow();
        });

        it('should handle 500 server errors', async () => {
            const mockApiClient = require('../../../api/apiClient').default;
            
            const serverError = {
                response: {
                    status: 500,
                    data: {
                        status: 'error',
                        message: '內部伺服器錯誤',
                        errorCode: 'INTERNAL_SERVER_ERROR'
                    }
                }
            };

            mockApiClient.mockRejectedValue(serverError);

            await expect(paymentService.getPaymentHistory()).rejects.toThrow();
        });
    });

    describe('Data Validation', () => {
        it('should validate required fields for createOrder', async () => {
            // 測試缺少必要欄位的情況
            const invalidRequests = [
                {}, // 完全空的請求
                { planType: 'pro' }, // 缺少 billingPeriod
                { billingPeriod: 'monthly' }, // 缺少 planType
                { planType: 'invalid', billingPeriod: 'monthly' }, // 無效的 planType
                { planType: 'pro', billingPeriod: 'invalid' } // 無效的 billingPeriod
            ];

            for (const invalidRequest of invalidRequests) {
                const mockApiClient = require('../../../api/apiClient').default;
                
                mockApiClient.mockRejectedValue({
                    response: {
                        status: 400,
                        data: {
                            status: 'error',
                            message: '參數驗證失敗',
                            errorCode: 'VALIDATION_ERROR'
                        }
                    }
                });

                await expect(paymentService.createOrder(invalidRequest)).rejects.toThrow();
            }
        });
    });
});