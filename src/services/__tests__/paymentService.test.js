/**
 * PaymentService 測試
 */

import paymentService from '../paymentService';
import apiClient from '../../api/apiClient';

// Mock API client
jest.mock('../../api/apiClient');
jest.mock('../../utils/logger');

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('creates order successfully', async () => {
      const mockOrderData = {
        planType: 'pro',
        billingPeriod: 'monthly',
        paymentMethod: 'credit_card'
      };

      const mockResponse = {
        data: {
          id: 'order-123',
          merchantTradeNo: 'TN123456789',
          paymentUrl: 'https://payment.ecpay.com.tw/test',
          amount: 299
        }
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await paymentService.createOrder(mockOrderData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/payment/orders', mockOrderData);
      expect(result).toEqual(mockResponse.data);
    });

    it('handles create order error', async () => {
      const mockError = new Error('Network error');
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(paymentService.createOrder({
        planType: 'pro',
        billingPeriod: 'monthly',
        paymentMethod: 'credit_card'
      })).rejects.toThrow('Network error');
    });
  });

  describe('queryPaymentStatus', () => {
    it('queries payment status successfully', async () => {
      const merchantTradeNo = 'TN123456789';
      const mockResponse = {
        data: {
          status: 'paid',
          subscription: {
            id: 'sub-123',
            planType: 'pro',
            status: 'active'
          }
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await paymentService.queryPaymentStatus(merchantTradeNo);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/payment/status/${merchantTradeNo}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('handles query status error', async () => {
      const mockError = new Error('Payment not found');
      mockApiClient.get.mockRejectedValue(mockError);

      await expect(paymentService.queryPaymentStatus('invalid')).rejects.toThrow('Payment not found');
    });
  });

  describe('getPaymentHistory', () => {
    it('gets payment history successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 'payment-1',
            merchantTradeNo: 'TN123456789',
            amount: 299,
            status: 'paid',
            paymentMethod: 'credit_card',
            createdAt: '2024-01-15T10:00:00Z'
          }
        ]
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await paymentService.getPaymentHistory();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/payment/history');
      expect(result).toEqual(mockResponse.data);
    });

    it('handles get history error', async () => {
      const mockError = new Error('Unauthorized');
      mockApiClient.get.mockRejectedValue(mockError);

      await expect(paymentService.getPaymentHistory()).rejects.toThrow('Unauthorized');
    });
  });

  describe('cancelPayment', () => {
    it('cancels payment successfully', async () => {
      const orderId = 'order-123';
      const mockResponse = {
        data: {
          success: true,
          message: 'Payment cancelled'
        }
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await paymentService.cancelPayment(orderId);

      expect(mockApiClient.post).toHaveBeenCalledWith(`/api/payment/cancel/${orderId}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('handles cancel payment error', async () => {
      const mockError = new Error('Cannot cancel paid order');
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(paymentService.cancelPayment('order-123')).rejects.toThrow('Cannot cancel paid order');
    });
  });

  describe('retryPayment', () => {
    it('retries payment successfully', async () => {
      const orderId = 'order-123';
      const mockResponse = {
        data: {
          paymentUrl: 'https://payment.ecpay.com.tw/retry',
          merchantTradeNo: 'TN987654321'
        }
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await paymentService.retryPayment(orderId);

      expect(mockApiClient.post).toHaveBeenCalledWith(`/api/payment/retry/${orderId}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('handles retry payment error', async () => {
      const mockError = new Error('Order already paid');
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(paymentService.retryPayment('order-123')).rejects.toThrow('Order already paid');
    });
  });
});